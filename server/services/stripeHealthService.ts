/**
 * STRIPE HEALTH & MODE DETECTION SERVICE
 * Critical guardrails for production safety:
 * - Detects test vs live mode automatically
 * - Validates account activation status
 * - Blocks live charges if account not ready
 * - Provides clear health check endpoint
 */

import Stripe from 'stripe';
import { createStripeClient, getStripeSecretKey } from '../config/stripe.js';

// Initialize Stripe with centralized configuration
const stripe = createStripeClient();

export interface StripeHealthStatus {
  mode: 'test' | 'live' | 'unknown';
  accountActivated: boolean;
  canProcessPayments: boolean;
  issues: string[];
  recommendations: string[];
  capabilities: {
    chargesEnabled: boolean | null;
    payoutsEnabled: boolean | null;
    cardPayments: string | null;
    transfers: string | null;
  };
  accountDetails: {
    id: string | null;
    email: string | null;
    businessProfile: any | null;
  };
}

export class StripeHealthService {
  private cachedHealthStatus: StripeHealthStatus | null = null;
  private lastCheckTime: number = 0;
  private readonly CACHE_TTL = 60000; // 1 minute cache

  /**
   * Detect Stripe mode from secret key
   */
  detectMode(): 'test' | 'live' | 'unknown' {
    const secretKey = getStripeSecretKey();
    
    if (secretKey.startsWith('sk_test_')) {
      return 'test';
    } else if (secretKey.startsWith('sk_live_')) {
      return 'live';
    } else if (secretKey.startsWith('sk_org_')) {
      console.log('🏢 [STRIPE-HEALTH] Organization API key detected');
      return 'live'; // Organization keys are live by default
    }
    
    return 'unknown';
  }

  /**
   * Check if account can process payments (with caching)
   */
  async getHealthStatus(forceRefresh: boolean = false): Promise<StripeHealthStatus> {
    const now = Date.now();
    
    // Return cached status if fresh
    if (!forceRefresh && this.cachedHealthStatus && (now - this.lastCheckTime) < this.CACHE_TTL) {
      console.log('✅ [STRIPE-HEALTH] Returning cached status');
      return this.cachedHealthStatus;
    }

    const mode = this.detectMode();
    const status: StripeHealthStatus = {
      mode,
      accountActivated: false,
      canProcessPayments: false,
      issues: [],
      recommendations: [],
      capabilities: {
        chargesEnabled: null,
        payoutsEnabled: null,
        cardPayments: null,
        transfers: null,
      },
      accountDetails: {
        id: null,
        email: null,
        businessProfile: null,
      },
    };

    try {
      // Test mode is always considered "activated" for development
      if (mode === 'test') {
        status.accountActivated = true;
        status.canProcessPayments = true;
        status.recommendations.push(
          'Running in TEST MODE - Use test cards: 4242 4242 4242 4242'
        );
        this.cachedHealthStatus = status;
        this.lastCheckTime = now;
        return status;
      }

      // For live mode, verify account activation
      if (mode === 'live') {
        try {
          // Retrieve account details
          const account = await stripe.accounts.retrieve();
          
          status.accountDetails = {
            id: account.id,
            email: account.email || null,
            businessProfile: account.business_profile || null,
          };

          // Check capabilities
          status.capabilities = {
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            cardPayments: account.capabilities?.card_payments || null,
            transfers: account.capabilities?.transfers || null,
          };

          // Determine if account is fully activated
          const isFullyActivated = 
            account.charges_enabled === true && 
            account.payouts_enabled === true;

          status.accountActivated = isFullyActivated;
          status.canProcessPayments = isFullyActivated;

          // Build issues array
          if (!account.charges_enabled) {
            status.issues.push('Charges not enabled - cannot accept payments');
          }
          if (!account.payouts_enabled) {
            status.issues.push('Payouts not enabled - cannot transfer funds');
          }
          if (account.requirements?.currently_due && account.requirements.currently_due.length > 0) {
            status.issues.push(
              `Missing required information: ${account.requirements.currently_due.join(', ')}`
            );
          }

          // Build recommendations
          if (!isFullyActivated) {
            status.recommendations.push(
              'Complete account activation in Stripe Dashboard'
            );
            status.recommendations.push(
              'Alternatively, use TEST MODE for development'
            );
            status.recommendations.push(
              'Visit: https://dashboard.stripe.com/account/onboarding'
            );
          }

        } catch (error: any) {
          console.error('❌ [STRIPE-HEALTH] Error retrieving account:', error.message);
          
          // If we can't retrieve account, assume not activated
          status.accountActivated = false;
          status.canProcessPayments = false;
          status.issues.push(
            `Unable to verify account status: ${error.message}`
          );
          
          if (error.type === 'StripeAuthenticationError') {
            status.issues.push('Invalid Stripe API key - check environment variables');
          } else if (error.message?.includes('live charges')) {
            status.issues.push(
              'Account not activated for live payments - complete Stripe onboarding'
            );
          }

          status.recommendations.push('Verify STRIPE_SECRET_KEY is correct');
          status.recommendations.push('Check Stripe Dashboard for account status');
        }
      }

    } catch (error: any) {
      console.error('❌ [STRIPE-HEALTH] Unexpected error:', error);
      status.issues.push(`Unexpected error: ${error.message}`);
    }

    // Cache the result
    this.cachedHealthStatus = status;
    this.lastCheckTime = now;

    return status;
  }

  /**
   * Assert that payments can be processed (throws if not)
   */
  async assertCanProcessPayments(): Promise<void> {
    const health = await this.getHealthStatus();

    if (!health.canProcessPayments) {
      const errorMessage = [
        '🔴 STRIPE PAYMENTS BLOCKED:',
        `Mode: ${health.mode.toUpperCase()}`,
        ...health.issues,
        '',
        'Recommendations:',
        ...health.recommendations,
      ].join('\n');

      console.error(errorMessage);
      
      throw new Error(
        `Stripe payments are currently unavailable. ${health.issues.join('. ')}`
      );
    }
  }

  /**
   * Log health status to console
   */
  async logHealthStatus(): Promise<void> {
    const health = await this.getHealthStatus();

    const emoji = health.canProcessPayments ? '✅' : '⚠️';
    
    console.log(`${emoji} [STRIPE-HEALTH] ═══════════════════════════════════`);
    console.log(`${emoji} [STRIPE-HEALTH] Mode: ${health.mode.toUpperCase()}`);
    console.log(`${emoji} [STRIPE-HEALTH] Can Process Payments: ${health.canProcessPayments}`);
    
    if (health.accountDetails.id) {
      console.log(`${emoji} [STRIPE-HEALTH] Account ID: ${health.accountDetails.id}`);
    }
    
    if (health.issues.length > 0) {
      console.log(`⚠️ [STRIPE-HEALTH] Issues:`);
      health.issues.forEach(issue => {
        console.log(`   - ${issue}`);
      });
    }
    
    if (health.recommendations.length > 0) {
      console.log(`💡 [STRIPE-HEALTH] Recommendations:`);
      health.recommendations.forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
    
    console.log(`${emoji} [STRIPE-HEALTH] ═══════════════════════════════════`);
  }

  /**
   * Get simple boolean: can we process payments?
   */
  async canProcessPayments(): Promise<boolean> {
    const health = await this.getHealthStatus();
    return health.canProcessPayments;
  }

  /**
   * Clear health check cache (force refresh on next check)
   */
  clearCache(): void {
    this.cachedHealthStatus = null;
    this.lastCheckTime = 0;
    console.log('🔄 [STRIPE-HEALTH] Cache cleared');
  }
}

// Export singleton instance
export const stripeHealthService = new StripeHealthService();

// Log health status on startup
setTimeout(async () => {
  try {
    await stripeHealthService.logHealthStatus();
  } catch (error) {
    console.error('❌ [STRIPE-HEALTH] Failed to check startup health:', error);
  }
}, 2000); // 2 second delay to let server initialize
