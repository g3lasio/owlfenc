/**
 * 🔧 CENTRALIZED STRIPE CONFIGURATION
 * Single source of truth for Stripe.js loading with comprehensive error handling
 */

import { loadStripe, Stripe } from "@stripe/stripe-js";

// 🔐 STRIPE CONFIGURATION
const STRIPE_CONFIG = {
  // Test mode public key - safe to expose in frontend
  testPublicKey: "pk_test_51REWb2LxBTKPALGDEj1HeaT63TJDdfEzBpCMlb3ukQSco6YqBjD76HF3oL9miKanHGxVTBdcavkZQFAqvbLSY7H100HcjPRreb",
  // Production key should come from environment variable
  prodPublicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  // Force test mode for development
  forceTestMode: true,
} as const;

// 🔧 SAFE STRIPE LOADING WITH ERROR HANDLING
let stripePromise: Promise<Stripe | null> | null = null;
let loadingError: string | null = null;

/**
 * Get Stripe instance with comprehensive error handling
 * Returns null if Stripe cannot be loaded (graceful degradation)
 */
export const getStripe = (): Promise<Stripe | null> => {
  // Return existing promise if already loading/loaded
  if (stripePromise) {
    return stripePromise;
  }

  // Return null if previous loading failed
  if (loadingError) {
    console.warn('🔧 [STRIPE] Previous loading failed, returning null:', loadingError);
    return Promise.resolve(null);
  }

  try {
    // Determine which key to use
    const stripeKey = STRIPE_CONFIG.forceTestMode 
      ? STRIPE_CONFIG.testPublicKey 
      : (STRIPE_CONFIG.prodPublicKey || STRIPE_CONFIG.testPublicKey);

    if (!stripeKey) {
      loadingError = 'No Stripe public key available';
      console.warn('🔧 [STRIPE] No public key available - payments disabled');
      return Promise.resolve(null);
    }

    console.log('🔧 [STRIPE] Loading Stripe.js with key:', stripeKey.substring(0, 20) + '...');

    // Create the promise with timeout and error handling
    stripePromise = Promise.race([
      loadStripe(stripeKey),
      new Promise<null>((resolve) => {
        setTimeout(() => {
          console.warn('🔧 [STRIPE] Loading timeout - continuing without Stripe');
          resolve(null);
        }, 10000); // 10 second timeout
      })
    ]).catch((error) => {
      loadingError = error.message || 'Unknown error loading Stripe';
      console.warn('🔧 [STRIPE] Failed to load Stripe.js:', loadingError);
      
      // Dispatch custom event for global error handling
      window.dispatchEvent(new CustomEvent('stripe-load-error', {
        detail: { error: loadingError }
      }));
      
      return null;
    });

    return stripePromise;
  } catch (error: any) {
    loadingError = error.message || 'Error initializing Stripe';
    console.warn('🔧 [STRIPE] Error initializing Stripe:', loadingError);
    return Promise.resolve(null);
  }
};

/**
 * Check if Stripe is available
 */
export const isStripeAvailable = async (): Promise<boolean> => {
  const stripe = await getStripe();
  return stripe !== null;
};

/**
 * Get loading error if any
 */
export const getStripeError = (): string | null => {
  return loadingError;
};

/**
 * Reset Stripe loading state (for retries)
 */
export const resetStripe = (): void => {
  stripePromise = null;
  loadingError = null;
  console.log('🔧 [STRIPE] Loading state reset');
};

// 🔧 CONFIGURATION INFO
export const getStripeConfig = () => ({
  testMode: STRIPE_CONFIG.forceTestMode,
  keyLength: STRIPE_CONFIG.forceTestMode 
    ? STRIPE_CONFIG.testPublicKey?.length 
    : (STRIPE_CONFIG.prodPublicKey?.length || STRIPE_CONFIG.testPublicKey?.length),
  available: !!stripePromise && !loadingError,
  error: loadingError,
});

// 🚀 INITIALIZE ON IMPORT (with error suppression)
try {
  // Pre-load Stripe to avoid delays, but don't block app if it fails
  getStripe().catch(() => {
    // Silently handle errors - they're already logged
  });
} catch (error) {
  // Silently handle any initialization errors
  console.warn('🔧 [STRIPE] Silent initialization error handled');
}