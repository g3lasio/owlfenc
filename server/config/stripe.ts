/**
 * Centralized Stripe Configuration
 * Handles both naming conventions for API keys
 * Supports Organization API keys with Stripe-Account header
 */

import Stripe from 'stripe';

/**
 * Centralized Stripe API Version
 * Using latest stable API version for compile-time type safety
 */
export const STRIPE_API_VERSION = '2025-06-30.basil' as const;

/**
 * Get Stripe Secret Key with fallback support
 * Supports both STRIPE_SECRET_KEY and STRIPE_API_KEY
 */
export function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  
  if (!key) {
    console.error(
      "❌ Stripe Secret Key not found. Please set STRIPE_SECRET_KEY or STRIPE_API_KEY in Replit Secrets"
    );
    throw new Error("Stripe Secret Key is required");
  }
  
  return key;
}

/**
 * Get Stripe Account ID (required for Organization API keys)
 */
export function getStripeAccountId(): string | undefined {
  return process.env.STRIPE_ACCOUNT_ID;
}

/**
 * Check if using Organization API key
 */
export function isOrganizationApiKey(): boolean {
  const key = getStripeSecretKey();
  return key.startsWith("sk_org_");
}

/**
 * Get Stripe Publishable Key with fallback support
 * Supports both STRIPE_PUBLISHABLE_KEY and STRIPE_PUBLIC_KEY
 */
export function getStripePublishableKey(): string | undefined {
  return process.env.STRIPE_PUBLISHABLE_KEY || process.env.STRIPE_PUBLIC_KEY;
}

/**
 * Get Stripe Webhook Secret
 */
export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET;
}

/**
 * Get Stripe configuration options including headers for Organization API keys
 */
export function getStripeConfig(): { apiKey: string; stripeAccount?: string } {
  const apiKey = getStripeSecretKey();
  const config: { apiKey: string; stripeAccount?: string } = { apiKey };
  
  if (isOrganizationApiKey()) {
    const accountId = getStripeAccountId();
    if (!accountId) {
      console.error(
        "❌ Organization API key detected but STRIPE_ACCOUNT_ID not found. Please set STRIPE_ACCOUNT_ID in Replit Secrets"
      );
      throw new Error("STRIPE_ACCOUNT_ID is required when using Organization API key");
    }
    config.stripeAccount = accountId;
    console.log(`🏢 [STRIPE-ORG] Using Organization key with Account: ${accountId.substring(0, 12)}...`);
  }
  
  return config;
}

/**
 * Create Stripe client with centralized configuration
 * All Stripe instances should use this factory for consistency
 */
export function createStripeClient(): Stripe {
  const config = getStripeConfig();
  return new Stripe(config.apiKey, {
    apiVersion: STRIPE_API_VERSION,
    stripeAccount: config.stripeAccount,
  });
}

/**
 * Log Stripe configuration status
 */
export function logStripeConfig(): void {
  const secretKey = getStripeSecretKey();
  const publishableKey = getStripePublishableKey();
  const webhookSecret = getStripeWebhookSecret();
  const accountId = getStripeAccountId();
  const isOrgKey = isOrganizationApiKey();
  
  const keyType = secretKey.startsWith("sk_live_") 
    ? "LIVE" 
    : secretKey.startsWith("sk_test_")
    ? "TEST"
    : secretKey.startsWith("sk_org_")
    ? "ORGANIZATION"
    : "UNKNOWN";
  
  console.log("🔑 [STRIPE-CONFIG] Configuration loaded successfully");
  console.log(`🔑 [STRIPE-CONFIG] Secret Key: ${secretKey.substring(0, 15)}...`);
  console.log(`🔑 [STRIPE-CONFIG] Environment: ${keyType} MODE`);
  console.log(`🔑 [STRIPE-CONFIG] API Version: ${STRIPE_API_VERSION}`);
  console.log(`🔑 [STRIPE-CONFIG] Publishable Key: ${publishableKey ? "✅ Configured" : "⚠️  Not configured"}`);
  console.log(`🔑 [STRIPE-CONFIG] Webhook Secret: ${webhookSecret ? "✅ Configured" : "⚠️  Not configured"}`);
  
  if (isOrgKey) {
    console.log(`🏢 [STRIPE-CONFIG] Organization Mode: ${accountId ? `✅ Account ID: ${accountId.substring(0, 12)}...` : "❌ STRIPE_ACCOUNT_ID missing!"}`);
  }
}
