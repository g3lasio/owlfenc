/**
 * STRIPE PRICE REGISTRY
 * Centralized mapping of subscription plans to Stripe Price IDs
 * 
 * Architecture:
 * - Code-first config for version control
 * - Environment variable overrides for emergency swaps
 * - Mode-aware (test vs live) price selection
 * - Startup validation against Stripe API
 * 
 * Usage:
 * ```typescript
 * const priceId = getPriceIdForPlan(9, 'monthly'); // Mero Patrón monthly
 * const priceId = getPriceIdForPlan(6, 'yearly');  // Master Contractor yearly
 * ```
 */

import { createStripeClient, getStripeSecretKey } from './stripe';

/**
 * Billing cycle types
 */
export type BillingCycle = 'monthly' | 'yearly';

/**
 * Price ID mapping for a single plan
 */
export interface PricePair {
  monthly: string | null;  // Stripe Price ID for monthly billing
  yearly: string | null;   // Stripe Price ID for yearly billing
}

/**
 * Complete price registry by plan ID
 */
export interface PriceRegistry {
  [planId: number]: PricePair;
}

/**
 * LIVE MODE PRICE REGISTRY
 * Maps plan IDs to Stripe Price IDs for production
 * 
 * NOTE: These Price IDs must be created manually in Stripe Dashboard first!
 * See STRIPE_PRICE_SETUP_GUIDE.md for instructions
 */
const LIVE_PRICE_MAP: PriceRegistry = {
  // Free Trial - No Stripe prices needed
  4: {
    monthly: null,  // $0 - Skip Stripe checkout
    yearly: null,   // $0 - Skip Stripe checkout
  },
  
  // Primo Chambeador - $0 (Forever Free)
  5: {
    monthly: null,  // $0 - Skip Stripe checkout
    yearly: null,   // $0 - Skip Stripe checkout
  },
  
  // Mero Patrón - $49.99/month or $509.88/year (15% discount)
  9: {
    monthly: process.env.STRIPE_PRICE_MERO_PATRON_MONTHLY || 'price_PLACEHOLDER_MERO_MONTHLY',
    yearly: process.env.STRIPE_PRICE_MERO_PATRON_YEARLY || 'price_PLACEHOLDER_MERO_YEARLY',
  },
  
  // Master Contractor - $99.99/month or $1,019.89/year (15% discount)
  6: {
    monthly: process.env.STRIPE_PRICE_MASTER_MONTHLY || 'price_PLACEHOLDER_MASTER_MONTHLY',
    yearly: process.env.STRIPE_PRICE_MASTER_YEARLY || 'price_PLACEHOLDER_MASTER_YEARLY',
  },
};

/**
 * TEST MODE PRICE REGISTRY
 * Maps plan IDs to Stripe TEST Price IDs for development
 */
const TEST_PRICE_MAP: PriceRegistry = {
  // Free Trial - No Stripe prices needed
  4: {
    monthly: null,
    yearly: null,
  },
  
  // Primo Chambeador - $0 (Forever Free)
  5: {
    monthly: null,
    yearly: null,
  },
  
  // Mero Patrón - TEST prices
  9: {
    monthly: process.env.STRIPE_TEST_PRICE_MERO_PATRON_MONTHLY || 'price_TEST_PLACEHOLDER_MERO_MONTHLY',
    yearly: process.env.STRIPE_TEST_PRICE_MERO_PATRON_YEARLY || 'price_TEST_PLACEHOLDER_MERO_YEARLY',
  },
  
  // Master Contractor - TEST prices
  6: {
    monthly: process.env.STRIPE_TEST_PRICE_MASTER_MONTHLY || 'price_TEST_PLACEHOLDER_MASTER_MONTHLY',
    yearly: process.env.STRIPE_TEST_PRICE_MASTER_YEARLY || 'price_TEST_PLACEHOLDER_MASTER_YEARLY',
  },
};

/**
 * Detect if using test mode from API key
 */
export function isTestMode(): boolean {
  const key = getStripeSecretKey();
  return key.startsWith('sk_test_');
}

/**
 * Get the correct price registry based on current mode
 */
export function getPriceRegistry(): PriceRegistry {
  return isTestMode() ? TEST_PRICE_MAP : LIVE_PRICE_MAP;
}

/**
 * Get Price ID for a specific plan and billing cycle
 * 
 * @param planId - Database plan ID (4, 5, 6, or 9)
 * @param billingCycle - 'monthly' or 'yearly'
 * @returns Stripe Price ID or null for free plans
 * @throws Error if plan not found or price missing for paid plans
 */
export function getPriceIdForPlan(
  planId: number,
  billingCycle: BillingCycle
): string | null {
  const registry = getPriceRegistry();
  const pricePair = registry[planId];
  
  if (!pricePair) {
    throw new Error(
      `No price mapping found for plan ID ${planId}. ` +
      `Available plans: ${Object.keys(registry).join(', ')}`
    );
  }
  
  const priceId = pricePair[billingCycle];
  
  // Free plans (0, 5) should return null - no Stripe checkout needed
  if (planId === 4 || planId === 5) {
    return null;
  }
  
  // Paid plans MUST have price IDs configured
  if (!priceId || priceId.startsWith('price_PLACEHOLDER') || priceId.startsWith('price_TEST_PLACEHOLDER')) {
    const mode = isTestMode() ? 'TEST' : 'LIVE';
    throw new Error(
      `Price ID not configured for plan ${planId} (${billingCycle} billing) in ${mode} mode. ` +
      `Please create the Stripe Price in the dashboard and update the registry.`
    );
  }
  
  return priceId;
}

/**
 * Validate that all required price IDs are configured
 * Should be called on app startup
 * 
 * @returns Validation result with status and errors
 */
export async function validatePriceRegistry(): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const registry = getPriceRegistry();
  const mode = isTestMode() ? 'TEST' : 'LIVE';
  
  console.log(`🔍 [PRICE-REGISTRY] Validating ${mode} mode price registry...`);
  
  // Check each paid plan has both monthly and yearly prices
  const paidPlans = [6, 9]; // Master Contractor, Mero Patrón
  
  for (const planId of paidPlans) {
    const pricePair = registry[planId];
    
    if (!pricePair) {
      errors.push(`Plan ${planId} missing from price registry`);
      continue;
    }
    
    // Check monthly price
    if (!pricePair.monthly) {
      errors.push(`Plan ${planId} missing monthly price ID in ${mode} mode`);
    } else if (pricePair.monthly.startsWith('price_PLACEHOLDER') || pricePair.monthly.startsWith('price_TEST_PLACEHOLDER')) {
      errors.push(`Plan ${planId} has placeholder monthly price ID: ${pricePair.monthly}`);
    }
    
    // Check yearly price
    if (!pricePair.yearly) {
      errors.push(`Plan ${planId} missing yearly price ID in ${mode} mode`);
    } else if (pricePair.yearly.startsWith('price_PLACEHOLDER') || pricePair.yearly.startsWith('price_TEST_PLACEHOLDER')) {
      errors.push(`Plan ${planId} has placeholder yearly price ID: ${pricePair.yearly}`);
    }
  }
  
  // Verify price IDs exist in Stripe (if configured)
  if (errors.length === 0) {
    const stripe = createStripeClient();
    
    for (const planId of paidPlans) {
      const pricePair = registry[planId];
      
      // Validate monthly price
      if (pricePair.monthly) {
        try {
          const price = await stripe.prices.retrieve(pricePair.monthly);
          
          // Verify currency is USD
          if (price.currency !== 'usd') {
            warnings.push(`Plan ${planId} monthly price ${pricePair.monthly} is ${price.currency}, expected USD`);
          }
          
          // Verify recurring interval
          if (price.recurring?.interval !== 'month') {
            warnings.push(`Plan ${planId} monthly price ${pricePair.monthly} interval is ${price.recurring?.interval}, expected month`);
          }
          
          console.log(`✅ [PRICE-REGISTRY] Plan ${planId} monthly: ${pricePair.monthly} ($${(price.unit_amount || 0) / 100})`);
        } catch (error: any) {
          errors.push(`Failed to fetch monthly price ${pricePair.monthly} for plan ${planId}: ${error.message}`);
        }
      }
      
      // Validate yearly price
      if (pricePair.yearly) {
        try {
          const price = await stripe.prices.retrieve(pricePair.yearly);
          
          // Verify currency is USD
          if (price.currency !== 'usd') {
            warnings.push(`Plan ${planId} yearly price ${pricePair.yearly} is ${price.currency}, expected USD`);
          }
          
          // Verify recurring interval
          if (price.recurring?.interval !== 'year') {
            warnings.push(`Plan ${planId} yearly price ${pricePair.yearly} interval is ${price.recurring?.interval}, expected year`);
          }
          
          console.log(`✅ [PRICE-REGISTRY] Plan ${planId} yearly: ${pricePair.yearly} ($${(price.unit_amount || 0) / 100})`);
        } catch (error: any) {
          errors.push(`Failed to fetch yearly price ${pricePair.yearly} for plan ${planId}: ${error.message}`);
        }
      }
    }
  }
  
  const valid = errors.length === 0;
  
  if (valid) {
    console.log(`✅ [PRICE-REGISTRY] All prices validated successfully in ${mode} mode`);
  } else {
    console.error(`❌ [PRICE-REGISTRY] Validation failed with ${errors.length} errors`);
    errors.forEach(err => console.error(`   - ${err}`));
  }
  
  if (warnings.length > 0) {
    console.warn(`⚠️  [PRICE-REGISTRY] ${warnings.length} warnings:`);
    warnings.forEach(warn => console.warn(`   - ${warn}`));
  }
  
  return { valid, errors, warnings };
}

/**
 * Get all configured price IDs for a plan
 * Useful for testing and debugging
 */
export function getPlanPrices(planId: number): PricePair | null {
  const registry = getPriceRegistry();
  return registry[planId] || null;
}

/**
 * List all configured plans
 */
export function getConfiguredPlanIds(): number[] {
  const registry = getPriceRegistry();
  return Object.keys(registry).map(Number);
}
