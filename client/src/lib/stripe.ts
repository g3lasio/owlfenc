/**
 * 🔧 CENTRALIZED STRIPE CONFIGURATION
 * Single source of truth for Stripe.js loading with comprehensive error handling
 */

import { loadStripe, Stripe } from "@stripe/stripe-js";

// 🔐 STRIPE CONFIGURATION - PRODUCTION ONLY
const STRIPE_CONFIG = {
  // Production key from environment variable - REQUIRED
  publicKey: import.meta.env.VITE_STRIPE_PUBLIC_KEY,
  // Production mode enforced
  productionMode: true,
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
    // Use production key only
    const stripeKey = STRIPE_CONFIG.publicKey;

    if (!stripeKey) {
      loadingError = 'No Stripe public key available';
      console.warn('🔧 [STRIPE] No public key available - payments disabled');
      return Promise.resolve(null);
    }

    console.log('🔧 [STRIPE] Loading Stripe.js with key:', stripeKey.substring(0, 20) + '...');

    // Create the promise with enhanced error handling and timeout
    stripePromise = new Promise((resolve) => {
      // Try loading Stripe with multiple fallback strategies
      const loadWithFallbacks = async () => {
        try {
          // First attempt: Direct load
          console.log('🔧 [STRIPE] Attempt 1: Direct loadStripe call');
          const stripe = await loadStripe(stripeKey);
          if (stripe) {
            console.log('✅ [STRIPE] Successfully loaded Stripe.js');
            resolve(stripe);
            return;
          }
        } catch (error: any) {
          console.warn('🔧 [STRIPE] Direct load failed:', error.message);
        }

        try {
          // Second attempt: Load with delay (network issues)
          console.log('🔧 [STRIPE] Attempt 2: Delayed load');
          await new Promise(resolve => setTimeout(resolve, 2000));
          const stripe = await loadStripe(stripeKey);
          if (stripe) {
            console.log('✅ [STRIPE] Successfully loaded Stripe.js (delayed)');
            resolve(stripe);
            return;
          }
        } catch (error: any) {
          console.warn('🔧 [STRIPE] Delayed load failed:', error.message);
        }

        // Third attempt: Check if Stripe object exists globally
        try {
          console.log('🔧 [STRIPE] Attempt 3: Check global Stripe object');
          if (typeof window !== 'undefined' && (window as any).Stripe) {
            console.log('✅ [STRIPE] Found global Stripe object, creating instance');
            const stripeInstance = (window as any).Stripe(stripeKey);
            if (stripeInstance) {
              console.log('✅ [STRIPE] Successfully created Stripe instance from global object');
              resolve(stripeInstance);
              return;
            }
          }
        } catch (error: any) {
          console.warn('🔧 [STRIPE] Global Stripe check failed:', error.message);
        }

        // Fourth attempt: Wait for global Stripe to load
        try {
          console.log('🔧 [STRIPE] Attempt 4: Waiting for global Stripe to load');
          let attempts = 0;
          const maxAttempts = 10;
          
          const checkGlobalStripe = () => {
            attempts++;
            if (typeof window !== 'undefined' && (window as any).Stripe) {
              console.log('✅ [STRIPE] Global Stripe loaded after waiting');
              const stripeInstance = (window as any).Stripe(stripeKey);
              if (stripeInstance) {
                resolve(stripeInstance);
                return;
              }
            }
            
            if (attempts < maxAttempts) {
              setTimeout(checkGlobalStripe, 500); // Check every 500ms
            } else {
              console.warn('🔧 [STRIPE] Global Stripe never loaded after waiting');
            }
          };
          
          setTimeout(checkGlobalStripe, 1000); // Start checking after 1 second
        } catch (error: any) {
          console.warn('🔧 [STRIPE] Global Stripe wait failed:', error.message);
        }

        // All attempts failed - graceful degradation
        loadingError = 'All Stripe loading attempts failed - payments disabled';
        console.warn('🔧 [STRIPE] All loading attempts failed, payments disabled');
        
        // Dispatch custom event for global error handling
        window.dispatchEvent(new CustomEvent('stripe-load-error', {
          detail: { error: loadingError }
        }));
        
        resolve(null);
      };

      // Set overall timeout
      const timeout = setTimeout(() => {
        loadingError = 'Stripe loading timeout';
        console.warn('🔧 [STRIPE] Loading timeout - continuing without Stripe');
        resolve(null);
      }, 5000); // 5 second timeout - optimized for faster response

      loadWithFallbacks().then(() => {
        clearTimeout(timeout);
      });
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
  productionMode: STRIPE_CONFIG.productionMode,
  keyLength: STRIPE_CONFIG.publicKey?.length || 0,
  keyPrefix: STRIPE_CONFIG.publicKey?.substring(0, 7) || 'Not set',
  available: !!stripePromise && !loadingError,
  error: loadingError,
});

// 🚀 INITIALIZE ON IMPORT (with error suppression)
// Pre-load Stripe when the module loads, but only if running in browser
if (typeof window !== 'undefined') {
  // Delay initialization to ensure DOM is ready
  setTimeout(() => {
    try {
      getStripe().catch(() => {
        // Silently handle errors - they're already logged
      });
    } catch (error) {
      console.warn('🔧 [STRIPE] Silent initialization error handled');
    }
  }, 1000); // 1 second delay
}