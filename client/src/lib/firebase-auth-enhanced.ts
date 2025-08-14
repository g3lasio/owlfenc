/**
 * 🔐 ENHANCED FIREBASE AUTHENTICATION
 * Comprehensive OAuth + Email + Phone authentication with security hardening
 */

import {
  Auth,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailLink,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signOut,
  onAuthStateChanged,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  PhoneAuthProvider,
  linkWithCredential,
  signInWithCredential,
  UserCredential,
  IdTokenResult,
} from 'firebase/auth';
import { auth } from './firebase';

// 🛡️ SECURITY CONFIGURATION
const SECURITY_CONFIG = {
  // Email verification required for sensitive operations
  requireEmailVerification: true,
  // Force re-authentication for critical actions
  reauthTimeoutMinutes: 30,
  // Token refresh interval
  tokenRefreshMinutes: 15,
  // Maximum login attempts before lockout
  maxLoginAttempts: 5,
  // Lockout duration in minutes
  lockoutDurationMinutes: 15,
} as const;

// 📱 OAUTH PROVIDERS CONFIGURATION
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
  access_type: 'offline',
});

// Add additional scopes for enhanced profile data
googleProvider.addScope('profile');
googleProvider.addScope('email');

// 🔐 ENHANCED AUTHENTICATION CLASS
export class EnhancedFirebaseAuth {
  private auth: Auth;
  private recaptchaVerifier: RecaptchaVerifier | null = null;
  private loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  constructor() {
    this.auth = auth;
    this.setupSecurityMonitoring();
  }

  // 📊 Security monitoring and logging
  private setupSecurityMonitoring() {
    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        this.logSecurityEvent('USER_SIGNED_IN', { uid: user.uid, method: 'state_change' });
        // Use a safe async wrapper to prevent unhandled rejections
        this.validateTokenSecurity(user).catch((error) => {
          console.warn('🔧 [AUTH-SECURITY] Token validation failed silently:', error.message || error);
        });
      } else {
        this.logSecurityEvent('USER_SIGNED_OUT', {});
      }
    });
  }

  private logSecurityEvent(event: string, data: any) {
    console.log(`🔐 [AUTH-SECURITY] ${event}:`, {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      ...data
    });
  }

  private async validateTokenSecurity(user: User) {
    try {
      // Enhanced error handling for token operations
      const tokenResult = await user.getIdTokenResult().catch((tokenError) => {
        // Handle specific token errors gracefully
        if (tokenError.message?.includes?.('Failed to fetch') || 
            tokenError.message?.includes?.('_performFetchWithErrorHandling') ||
            tokenError.message?.includes?.('requestStsToken')) {
          console.warn('🔧 [AUTH-SECURITY] Token fetch failed, network issue - continuing:', tokenError.message);
          return null; // Return null to skip validation
        }
        throw tokenError; // Re-throw other errors
      });
      
      if (!tokenResult) {
        // Skip validation if token fetch failed due to network issues
        return;
      }
      
      // Check token expiration
      const now = Date.now() / 1000;
      const expirationTime = tokenResult.expirationTime;
      const timeUntilExpiration = new Date(expirationTime).getTime() / 1000 - now;
      
      if (timeUntilExpiration < SECURITY_CONFIG.tokenRefreshMinutes * 60) {
        console.warn('🟡 [AUTH-SECURITY] Token expiring soon, refreshing...');
        // Safe token refresh with error handling
        await user.getIdToken(true).catch((refreshError) => {
          console.warn('🔧 [AUTH-SECURITY] Token refresh failed, continuing:', refreshError.message);
        });
      }

      // Validate token claims
      this.validateTokenClaims(tokenResult);
      
    } catch (error: any) {
      // Enhanced error handling - don't force sign out for network errors
      if (error.message?.includes?.('Failed to fetch') || 
          error.message?.includes?.('network') ||
          error.code === 'auth/network-request-failed') {
        console.warn('🔧 [AUTH-SECURITY] Network-related token validation issue, continuing:', error.message);
        return; // Don't sign out for network issues
      }
      
      console.error('❌ [AUTH-SECURITY] Critical token validation failed:', error);
      // Only sign out for critical auth errors, not network issues
      await this.signOut().catch((signOutError) => {
        console.warn('🔧 [AUTH-SECURITY] Sign out failed:', signOutError.message);
      });
    }
  }

  private validateTokenClaims(tokenResult: IdTokenResult) {
    const requiredClaims = ['email_verified', 'auth_time'];
    
    for (const claim of requiredClaims) {
      if (!(claim in tokenResult.claims)) {
        console.warn(`⚠️ [AUTH-SECURITY] Missing required claim: ${claim}`);
      }
    }

    // Check email verification if required
    if (SECURITY_CONFIG.requireEmailVerification && !tokenResult.claims.email_verified) {
      console.warn('⚠️ [AUTH-SECURITY] Email not verified for secured operation');
    }
  }

  // 🛡️ Rate limiting for login attempts
  private checkRateLimit(identifier: string): boolean {
    const now = Date.now();
    const attempts = this.loginAttempts.get(identifier);
    
    if (!attempts) {
      this.loginAttempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    // Check if lockout period has passed
    if (now - attempts.lastAttempt > SECURITY_CONFIG.lockoutDurationMinutes * 60 * 1000) {
      this.loginAttempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    if (attempts.count >= SECURITY_CONFIG.maxLoginAttempts) {
      console.warn('🚫 [AUTH-SECURITY] Rate limit exceeded for:', identifier);
      return false;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    return true;
  }

  // 🌐 ROBUST GOOGLE OAUTH AUTHENTICATION
  async signInWithGoogle(): Promise<UserCredential> {
    this.logSecurityEvent('GOOGLE_SIGNIN_ATTEMPT', {});
    
    const provider = new GoogleAuthProvider();
    provider.addScope('email');
    provider.addScope('profile');
    provider.setCustomParameters({
      prompt: 'select_account',
      access_type: 'online'
    });
    
    // Multi-strategy approach for auth/internal-error
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`🛡️ [ROBUST-GOOGLE] Attempt ${attempt}/3 - using popup`);
        
        // Add progressive delay for retries
        if (attempt > 1) {
          await new Promise(resolve => setTimeout(resolve, attempt * 1500));
        }
        
        const result = await signInWithPopup(this.auth, provider);
        
        this.logSecurityEvent('GOOGLE_SIGNIN_SUCCESS', { 
          uid: result.user.uid,
          email: result.user.email,
          attempt
        });

        console.log(`✅ [ROBUST-GOOGLE] Success on attempt ${attempt}`);
        return result;
        
      } catch (error: any) {
        console.log(`❌ [ROBUST-GOOGLE] Attempt ${attempt} failed:`, error.code);
        
        // Don't retry user-caused errors
        if (['auth/popup-blocked', 'auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(error.code)) {
          this.logSecurityEvent('GOOGLE_SIGNIN_FAILED', { 
            error: error.code,
            reason: 'user_action'
          });
          throw this.createUserFriendlyGoogleError(error);
        }
        
        // For auth/internal-error, try redirect as last resort
        if (error.code === 'auth/internal-error' && attempt === 3) {
          console.log('🔄 [ROBUST-GOOGLE] Using redirect fallback for persistent internal-error');
          try {
            sessionStorage.setItem('oauth-return-url', window.location.pathname);
            await signInWithRedirect(this.auth, provider);
            return null as any; // Will complete after redirect
          } catch (redirectError: any) {
            this.logSecurityEvent('GOOGLE_SIGNIN_FAILED', { 
              error: redirectError.code,
              attempts: attempt
            });
            throw this.createUserFriendlyGoogleError(redirectError);
          }
        }
        
        // Retry for auth/internal-error
        if (error.code === 'auth/internal-error' && attempt < 3) {
          continue;
        }
        
        // Other errors - don't retry
        this.logSecurityEvent('GOOGLE_SIGNIN_FAILED', { 
          error: error.code,
          attempt
        });
        throw this.createUserFriendlyGoogleError(error);
      }
    }
    
    throw new Error('All Google authentication strategies failed');
  }
  
  private createUserFriendlyGoogleError(error: any): Error {
    const friendlyMessages: Record<string, string> = {
      'auth/popup-blocked': 'Tu navegador bloqueó la ventana de autenticación de Google. Permite popups para este sitio y reintenta.',
      'auth/popup-closed-by-user': 'Cerraste la ventana de autenticación de Google. Completa el proceso para continuar.',
      'auth/unauthorized-domain': 'Error de configuración del dominio. Contacta al administrador del sistema.',
      'auth/internal-error': 'Error interno del sistema de Google. Esto puede ser temporal - reintenta en unos minutos o usa autenticación con email.',
      'auth/network-request-failed': 'Error de conexión con Google. Verifica tu internet y reintenta.',
      'auth/too-many-requests': 'Demasiados intentos con Google. Espera unos minutos antes de reintentar.'
    };
    
    const message = friendlyMessages[error.code] || 
                   'Error en autenticación con Google. Reintenta o usa email/contraseña.';
    
    return new Error(message);
  }

  // 📧 EMAIL/PASSWORD AUTHENTICATION
  async signInWithEmail(email: string, password: string): Promise<UserCredential> {
    if (!this.checkRateLimit(email)) {
      throw new Error('Too many login attempts. Please try again later.');
    }

    try {
      this.logSecurityEvent('EMAIL_SIGNIN_ATTEMPT', { email });

      const result = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Reset rate limiting on successful login
      this.loginAttempts.delete(email);
      
      this.logSecurityEvent('EMAIL_SIGNIN_SUCCESS', { 
        uid: result.user.uid,
        emailVerified: result.user.emailVerified 
      });

      return result;
      
    } catch (error: any) {
      this.logSecurityEvent('EMAIL_SIGNIN_FAILED', { 
        email,
        error: error.code 
      });
      throw error;
    }
  }

  async createAccount(email: string, password: string, displayName?: string): Promise<UserCredential> {
    try {
      this.logSecurityEvent('ACCOUNT_CREATION_ATTEMPT', { email });

      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Update profile if display name provided
      if (displayName) {
        await updateProfile(result.user, { displayName });
      }

      // Send verification email
      await this.sendVerificationEmail(result.user);
      
      this.logSecurityEvent('ACCOUNT_CREATION_SUCCESS', { 
        uid: result.user.uid,
        email 
      });

      return result;
      
    } catch (error: any) {
      this.logSecurityEvent('ACCOUNT_CREATION_FAILED', { 
        email,
        error: error.code 
      });
      throw error;
    }
  }

  // 🔗 EMAIL LINK AUTHENTICATION (Passwordless)
  async sendMagicLink(email: string): Promise<void> {
    const actionCodeSettings = {
      url: `${window.location.origin}/auth/verify-email`,
      handleCodeInApp: true,
      iOS: {
        bundleId: 'com.owlfence.app'
      },
      android: {
        packageName: 'com.owlfence.app',
        installApp: true,
        minimumVersion: '12'
      },
      dynamicLinkDomain: 'owlfence.page.link'
    };

    try {
      await sendSignInLinkToEmail(this.auth, email, actionCodeSettings);
      
      // Save email for completion
      window.localStorage.setItem('emailForSignIn', email);
      
      this.logSecurityEvent('MAGIC_LINK_SENT', { email });
      
    } catch (error: any) {
      this.logSecurityEvent('MAGIC_LINK_FAILED', { 
        email,
        error: error.code 
      });
      throw error;
    }
  }

  async signInWithMagicLink(email?: string): Promise<UserCredential> {
    if (!isSignInWithEmailLink(this.auth, window.location.href)) {
      throw new Error('Invalid magic link');
    }

    const emailToUse = email || window.localStorage.getItem('emailForSignIn');
    if (!emailToUse) {
      throw new Error('Email not found for magic link sign-in');
    }

    try {
      const result = await signInWithEmailLink(this.auth, emailToUse, window.location.href);
      
      // Clear stored email
      window.localStorage.removeItem('emailForSignIn');
      
      this.logSecurityEvent('MAGIC_LINK_SIGNIN_SUCCESS', { 
        uid: result.user.uid 
      });

      return result;
      
    } catch (error: any) {
      this.logSecurityEvent('MAGIC_LINK_SIGNIN_FAILED', { 
        error: error.code 
      });
      throw error;
    }
  }

  // 📱 PHONE AUTHENTICATION
  async sendPhoneVerification(phoneNumber: string, recaptchaElementId: string): Promise<string> {
    try {
      // Initialize reCAPTCHA if not already done
      if (!this.recaptchaVerifier) {
        this.recaptchaVerifier = new RecaptchaVerifier(this.auth, recaptchaElementId, {
          size: 'invisible',
          callback: () => {
            this.logSecurityEvent('RECAPTCHA_SOLVED', {});
          },
        });
      }

      const confirmationResult = await signInWithPhoneNumber(
        this.auth,
        phoneNumber,
        this.recaptchaVerifier
      );

      this.logSecurityEvent('PHONE_VERIFICATION_SENT', { phoneNumber });
      
      return confirmationResult.verificationId;
      
    } catch (error: any) {
      this.logSecurityEvent('PHONE_VERIFICATION_FAILED', { 
        phoneNumber,
        error: error.code 
      });
      throw error;
    }
  }

  async verifyPhoneCode(verificationId: string, code: string): Promise<UserCredential> {
    try {
      const credential = PhoneAuthProvider.credential(verificationId, code);
      
      if (this.auth.currentUser) {
        // Link to existing account
        const result = await linkWithCredential(this.auth.currentUser, credential);
        this.logSecurityEvent('PHONE_LINKED_SUCCESS', { uid: result.user.uid });
        return result;
      } else {
        // Sign in with phone
        const result = await signInWithCredential(this.auth, credential);
        this.logSecurityEvent('PHONE_SIGNIN_SUCCESS', { uid: result.user.uid });
        return result;
      }
      
    } catch (error: any) {
      this.logSecurityEvent('PHONE_VERIFICATION_CODE_FAILED', { 
        error: error.code 
      });
      throw error;
    }
  }

  // 📧 EMAIL VERIFICATION
  async sendVerificationEmail(user?: User): Promise<void> {
    const userToVerify = user || this.auth.currentUser;
    if (!userToVerify) {
      throw new Error('No user available for email verification');
    }

    try {
      await sendEmailVerification(userToVerify, {
        url: `${window.location.origin}/auth/email-verified`,
        handleCodeInApp: true,
      });
      
      this.logSecurityEvent('VERIFICATION_EMAIL_SENT', { 
        uid: userToVerify.uid 
      });
      
    } catch (error: any) {
      this.logSecurityEvent('VERIFICATION_EMAIL_FAILED', { 
        error: error.code 
      });
      throw error;
    }
  }

  // 🔄 PASSWORD RESET
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(this.auth, email, {
        url: `${window.location.origin}/auth/reset-complete`,
        handleCodeInApp: false,
      });
      
      this.logSecurityEvent('PASSWORD_RESET_SENT', { email });
      
    } catch (error: any) {
      this.logSecurityEvent('PASSWORD_RESET_FAILED', { 
        email,
        error: error.code 
      });
      throw error;
    }
  }

  // 🔐 RE-AUTHENTICATION (for sensitive operations)
  async reauthenticate(password: string): Promise<UserCredential> {
    const user = this.auth.currentUser;
    if (!user || !user.email) {
      throw new Error('User not authenticated or email not available');
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      const result = await reauthenticateWithCredential(user, credential);
      
      this.logSecurityEvent('REAUTHENTICATION_SUCCESS', { uid: user.uid });
      
      return result;
      
    } catch (error: any) {
      this.logSecurityEvent('REAUTHENTICATION_FAILED', { 
        uid: user.uid,
        error: error.code 
      });
      throw error;
    }
  }

  // 🚪 SIGN OUT
  async signOut(): Promise<void> {
    try {
      const user = this.auth.currentUser;
      await signOut(this.auth);
      
      // Clear sensitive data
      this.loginAttempts.clear();
      if (this.recaptchaVerifier) {
        this.recaptchaVerifier.clear();
        this.recaptchaVerifier = null;
      }
      
      this.logSecurityEvent('SIGNOUT_SUCCESS', { 
        uid: user?.uid || 'unknown' 
      });
      
    } catch (error: any) {
      this.logSecurityEvent('SIGNOUT_FAILED', { 
        error: error.code 
      });
      throw error;
    }
  }

  // 🔍 UTILITY METHODS
  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  async getCurrentUserToken(forceRefresh = false): Promise<string | null> {
    const user = this.getCurrentUser();
    if (!user) return null;
    
    try {
      return await user.getIdToken(forceRefresh);
    } catch (error) {
      console.error('❌ [AUTH-SECURITY] Failed to get user token:', error);
      return null;
    }
  }

  async isEmailVerified(): Promise<boolean> {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    // Refresh user data to get latest email verification status
    await user.reload();
    return user.emailVerified;
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(this.auth, callback);
  }
}

// 🏭 SINGLETON INSTANCE
export const enhancedAuth = new EnhancedFirebaseAuth();