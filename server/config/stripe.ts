/**
 * Centralized Stripe Configuration
 * Handles both naming conventions for API keys
 */

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
 * Log Stripe configuration status
 */
export function logStripeConfig(): void {
  const secretKey = getStripeSecretKey();
  const publishableKey = getStripePublishableKey();
  const webhookSecret = getStripeWebhookSecret();
  
  const keyType = secretKey.startsWith("sk_live_") 
    ? "LIVE" 
    : secretKey.startsWith("sk_test_")
    ? "TEST"
    : "UNKNOWN";
  
  console.log("🔑 [STRIPE-CONFIG] Configuration loaded successfully");
  console.log(`🔑 [STRIPE-CONFIG] Secret Key: ${secretKey.substring(0, 15)}...`);
  console.log(`🔑 [STRIPE-CONFIG] Environment: ${keyType} MODE`);
  console.log(`🔑 [STRIPE-CONFIG] Publishable Key: ${publishableKey ? "✅ Configured" : "⚠️  Not configured"}`);
  console.log(`🔑 [STRIPE-CONFIG] Webhook Secret: ${webhookSecret ? "✅ Configured" : "⚠️  Not configured"}`);
}
