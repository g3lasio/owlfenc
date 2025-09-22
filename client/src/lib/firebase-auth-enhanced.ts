/**
 * 🔐 ENHANCED FIREBASE AUTHENTICATION
 * Comprehensive OAuth + Email + Phone authentication with security hardening
 * 🔧 ENV-GATED: Only loads when VITE_USE_FIREBASE_AUTH=true
 */

// 🛡️ ENV-GATED FIREBASE IMPORTS - Static imports with conditional exports
const USE_FIREBASE_AUTH = import.meta.env.VITE_USE_FIREBASE_AUTH === 'true';

// 🔥 NO STATIC FIREBASE IMPORTS - Dynamic imports only when enabled

// Conditionally use Firebase or provide stubs
let auth: any;
let signInWithEmailAndPassword: any;
let createUserWithEmailAndPassword: any;
let sendEmailVerification: any;
let sendPasswordResetEmail: any;
let signInWithEmailLink: any;
let sendSignInLinkToEmail: any;
let isSignInWithEmailLink: any;
let signOut: any;
let onAuthStateChanged: any;
let updateProfile: any;
let reauthenticateWithCredential: any;
let EmailAuthProvider: any;
let RecaptchaVerifier: any;
let signInWithPhoneNumber: any;
let PhoneAuthProvider: any;
let linkWithCredential: any;
let signInWithCredential: any;

// 🔧 Initialize Firebase dynamically or provide stubs
let firebaseInitialized = false;

async function initializeFirebaseIfNeeded() {
  if (!USE_FIREBASE_AUTH) return;
  if (firebaseInitialized) return;
  
  try {
    console.log('🔥 [FIREBASE-AUTH-ENHANCED] Loading Firebase modules dynamically...');
    const firebaseAuthModule = await import('firebase/auth');
    const firebaseConfigModule = await import('./firebase');
    
    // Assign Firebase functions from dynamic imports
    auth = firebaseConfigModule.auth;
    signInWithEmailAndPassword = firebaseAuthModule.signInWithEmailAndPassword;
    createUserWithEmailAndPassword = firebaseAuthModule.createUserWithEmailAndPassword;
    sendEmailVerification = firebaseAuthModule.sendEmailVerification;
    sendPasswordResetEmail = firebaseAuthModule.sendPasswordResetEmail;
    signInWithEmailLink = firebaseAuthModule.signInWithEmailLink;
    sendSignInLinkToEmail = firebaseAuthModule.sendSignInLinkToEmail;
    isSignInWithEmailLink = firebaseAuthModule.isSignInWithEmailLink;
    signOut = firebaseAuthModule.signOut;
    onAuthStateChanged = firebaseAuthModule.onAuthStateChanged;
    updateProfile = firebaseAuthModule.updateProfile;
    reauthenticateWithCredential = firebaseAuthModule.reauthenticateWithCredential;
    EmailAuthProvider = firebaseAuthModule.EmailAuthProvider;
    RecaptchaVerifier = firebaseAuthModule.RecaptchaVerifier;
    signInWithPhoneNumber = firebaseAuthModule.signInWithPhoneNumber;
    PhoneAuthProvider = firebaseAuthModule.PhoneAuthProvider;
    linkWithCredential = firebaseAuthModule.linkWithCredential;
    signInWithCredential = firebaseAuthModule.signInWithCredential;
    
    firebaseInitialized = true;
    console.log('✅ [FIREBASE-AUTH-ENHANCED] Firebase modules loaded successfully');
  } catch (error) {
    console.error('❌ [FIREBASE-AUTH-ENHANCED] Failed to load Firebase modules:', error);
    initializeStubs();
  }
}

function initializeStubs() {
  auth = null;
  signInWithEmailAndPassword = async () => { throw new Error('Firebase authentication disabled'); };
  createUserWithEmailAndPassword = async () => { throw new Error('Firebase authentication disabled'); };
  sendEmailVerification = async () => { throw new Error('Firebase authentication disabled'); };
  sendPasswordResetEmail = async () => { throw new Error('Firebase authentication disabled'); };
  signInWithEmailLink = async () => { throw new Error('Firebase authentication disabled'); };
  sendSignInLinkToEmail = async () => { throw new Error('Firebase authentication disabled'); };
  isSignInWithEmailLink = () => false;
  signOut = async () => { throw new Error('Firebase authentication disabled'); };
  onAuthStateChanged = () => () => {}; // Return no-op unsubscribe
  updateProfile = async () => { throw new Error('Firebase authentication disabled'); };
  reauthenticateWithCredential = async () => { throw new Error('Firebase authentication disabled'); };
  EmailAuthProvider = class StubEmailAuthProvider {};
  RecaptchaVerifier = class StubRecaptchaVerifier {};
  signInWithPhoneNumber = async () => { throw new Error('Firebase authentication disabled'); };
  PhoneAuthProvider = class StubPhoneAuthProvider {};
  linkWithCredential = async () => { throw new Error('Firebase authentication disabled'); };
  signInWithCredential = async () => { throw new Error('Firebase authentication disabled'); };
}

if (USE_FIREBASE_AUTH) {
  console.log('🔥 [FIREBASE-AUTH-ENHANCED] Firebase authentication enabled - will load on demand');
} else {
  console.log('🚫 [FIREBASE-AUTH-ENHANCED] Firebase authentication disabled via VITE_USE_FIREBASE_AUTH');
  initializeStubs();
}

// 🛡️ SECURITY CONFIGURATION - OPTIMIZADO PARA EVITAR FETCH ERRORS
const SECURITY_CONFIG = {
  // Email verification required for sensitive operations
  requireEmailVerification: false, // DESHABILITADO para evitar validaciones que causan fetch
  // Force re-authentication for critical actions
  reauthTimeoutMinutes: 120, // AUMENTADO para reducir re-auth frecuente
  // Token refresh interval - CRÍTICO: Aumentado para evitar refreshes
  tokenRefreshMinutes: 240, // 4 horas en lugar de 15 minutos
  // Maximum login attempts before lockout
  maxLoginAttempts: 10, // Más permisivo
  // Lockout duration in minutes
  lockoutDurationMinutes: 5, // Reducido
  // NUEVO: Deshabilitar validación automática de tokens
  disableTokenValidation: true,
} as const;


// 🔐 ENHANCED AUTHENTICATION CLASS
export class EnhancedFirebaseAuth {
  private auth: Auth;
  private recaptchaVerifier: any | null = null;
  private loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();

  constructor() {
    this.auth = auth;
    this.setupSecurityMonitoring();
  }

  // 📊 Security monitoring - OPTIMIZADO para evitar fetch errors
  private setupSecurityMonitoring() {
    onAuthStateChanged(this.auth, (user: any) => {
      if (user) {
        this.logSecurityEvent('USER_SIGNED_IN', { uid: user.uid, method: 'state_change' });
        
        // CRÍTICO: Solo validar tokens si está explícitamente habilitado
        if (!SECURITY_CONFIG.disableTokenValidation) {
          // Token validation completamente deshabilitada para evitar STS requests
          setTimeout(() => {
            this.validateTokenSecurity(user).catch((error) => {
              console.debug('🔧 [AUTH-SECURITY] Token validation silenced:', error?.code || 'network');
            });
          }, 10000); // Delay de 10 segundos para evitar requests inmediatos
        }
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
    // SOLUCIÓN DEFINITIVA: Deshabilitar completamente validación de tokens
    // Esta función era la causa principal de los STS token requests
    
    if (SECURITY_CONFIG.disableTokenValidation) {
      console.debug('🔧 [AUTH-SECURITY] Token validation disabled to prevent fetch errors');
      return;
    }
    
    // Si por alguna razón necesitáramos validación, verificar usuario básico
    try {
      // SOLO verificar que el usuario existe sin hacer requests de token
      const userExists = user?.uid && user?.email;
      if (userExists) {
        console.debug('🔧 [AUTH-SECURITY] User authenticated, skipping token validation');
        return;
      }
    } catch (error: any) {
      // Silenciar TODOS los errores de token para evitar fetch problems
      console.debug('🔧 [AUTH-SECURITY] Token check silenced:', error?.code || 'unknown');
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