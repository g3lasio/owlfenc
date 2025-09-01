/**
 * 🔄 CLERK AUTHENTICATION ONLY
 * 
 * Firebase completely removed - using Clerk for all authentication
 */

// NO FIREBASE - USING CLERK ONLY
console.log('🔄 [AUTH-CONFIG] Using Clerk backend with original login interfaces - Firebase disabled');

// Email verification functions - DISABLED (using Clerk)
export const sendVerificationEmail = async () => {
  console.warn('🔄 [CLERK-ADAPTER] sendVerificationEmail disabled - use Clerk verification');
  return { success: false, message: 'Function disabled - use Clerk for email verification' };
};

export const checkEmailVerification = async () => {
  console.warn('🔄 [CLERK-ADAPTER] checkEmailVerification disabled - use Clerk verification');
  return { verified: false, message: 'Function disabled - use Clerk for email verification' };
};