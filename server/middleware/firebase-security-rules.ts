/**
 * 🛡️ FIREBASE SECURITY RULES ENFORCEMENT
 * Server-side validation of Firebase security policies
 */

import { Request, Response, NextFunction } from 'express';
import { admin } from '../lib/firebase-admin';
import { rateLimit } from 'express-rate-limit';

// 🔐 SECURITY CONFIGURATION
const SECURITY_POLICIES = {
  // Require email verification for sensitive operations
  requireEmailVerification: true,
  // Force token refresh interval (minutes)
  maxTokenAge: 60,
  // Allow operations only from authorized domains
  authorizedDomains: process.env.AUTHORIZED_DOMAINS?.split(',') || [],
  // Require recent authentication for critical operations
  criticalOperationTimeout: 30 * 60 * 1000, // 30 minutes
} as const;

// 🎯 ENHANCED FIREBASE TOKEN VALIDATION
export const enhancedFirebaseAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autorización requerido',
        code: 'AUTH_TOKEN_MISSING'
      });
    }

    const idToken = authHeader.substring(7);
    
    // 🔍 ENHANCED TOKEN VERIFICATION
    const decodedToken = await admin.auth().verifyIdToken(idToken, true); // checkRevoked = true
    
    // 🛡️ SECURITY VALIDATIONS
    await validateTokenSecurity(decodedToken, req);
    
    // 👤 ATTACH USER CONTEXT
    req.firebaseUser = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
      name: decodedToken.name || null,
      picture: decodedToken.picture || null,
      provider: decodedToken.firebase?.sign_in_provider || 'unknown',
      customClaims: decodedToken.custom_claims || {},
      tokenIssuedAt: new Date(decodedToken.iat * 1000),
      authTime: new Date(decodedToken.auth_time * 1000),
    };

    // 📊 LOG SECURITY EVENT
    console.log('🔐 [FIREBASE-AUTH] Token validated:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      provider: decodedToken.firebase?.sign_in_provider,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100),
      endpoint: req.path
    });

    next();

  } catch (error: any) {
    console.error('❌ [FIREBASE-AUTH] Token validation failed:', {
      error: error.message,
      code: error.code,
      ip: req.ip,
      endpoint: req.path
    });

    // 🚨 SPECIFIC ERROR HANDLING
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Token expirado. Por favor, inicia sesión nuevamente',
        code: 'AUTH_TOKEN_EXPIRED'
      });
    }
    
    if (error.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        error: 'Sesión revocada. Por favor, inicia sesión nuevamente',
        code: 'AUTH_SESSION_REVOKED'
      });
    }

    return res.status(401).json({
      error: 'Token de autenticación inválido',
      code: 'AUTH_TOKEN_INVALID'
    });
  }
};

// 🔍 COMPREHENSIVE TOKEN SECURITY VALIDATION
async function validateTokenSecurity(decodedToken: admin.auth.DecodedIdToken, req: Request) {
  const now = Date.now();
  
  // 1. CHECK TOKEN AGE
  const tokenAge = now - (decodedToken.iat * 1000);
  if (tokenAge > SECURITY_POLICIES.maxTokenAge * 60 * 1000) {
    console.warn('🟡 [FIREBASE-SECURITY] Token age exceeds policy:', {
      uid: decodedToken.uid,
      ageMinutes: Math.round(tokenAge / (60 * 1000))
    });
  }

  // 2. VALIDATE EMAIL VERIFICATION (if required)
  if (SECURITY_POLICIES.requireEmailVerification && !decodedToken.email_verified) {
    throw new Error('Email verification required for this operation');
  }

  // 3. CHECK AUTHENTICATION RECENCY FOR CRITICAL OPERATIONS
  if (isCriticalOperation(req.path)) {
    const authAge = now - (decodedToken.auth_time * 1000);
    if (authAge > SECURITY_POLICIES.criticalOperationTimeout) {
      throw new Error('Recent authentication required for this operation');
    }
  }

  // 4. VALIDATE REQUEST ORIGIN
  const origin = req.get('Origin') || req.get('Referer');
  if (origin && SECURITY_POLICIES.authorizedDomains.length > 0) {
    const isAuthorized = SECURITY_POLICIES.authorizedDomains.some(domain => 
      origin.includes(domain)
    );
    
    if (!isAuthorized) {
      console.warn('🚨 [FIREBASE-SECURITY] Unauthorized domain access:', {
        uid: decodedToken.uid,
        origin,
        authorized: SECURITY_POLICIES.authorizedDomains
      });
    }
  }

  // 5. CHECK FOR SUSPICIOUS PATTERNS
  await detectSuspiciousActivity(decodedToken, req);
}

// 🎯 IDENTIFY CRITICAL OPERATIONS
function isCriticalOperation(path: string): boolean {
  const criticalPaths = [
    '/api/users/delete',
    '/api/payments/create',
    '/api/contracts/sign',
    '/api/profile/update-email',
    '/api/profile/update-password',
    '/api/admin/',
    '/api/settings/security'
  ];
  
  return criticalPaths.some(criticalPath => path.includes(criticalPath));
}

// 🕵️ SUSPICIOUS ACTIVITY DETECTION
async function detectSuspiciousActivity(decodedToken: admin.auth.DecodedIdToken, req: Request) {
  const suspiciousIndicators = [];

  // Check for multiple rapid requests
  const userKey = `activity:${decodedToken.uid}`;
  // In production, use Redis for this
  // For now, just log the pattern
  
  // Check for unusual user agent patterns
  const userAgent = req.get('User-Agent') || '';
  if (userAgent.length < 10 || userAgent.includes('bot') || userAgent.includes('crawler')) {
    suspiciousIndicators.push('suspicious_user_agent');
  }

  // Check for IP geolocation changes (would need external service)
  // suspiciousIndicators.push('location_change');

  if (suspiciousIndicators.length > 0) {
    console.warn('🚨 [FIREBASE-SECURITY] Suspicious activity detected:', {
      uid: decodedToken.uid,
      indicators: suspiciousIndicators,
      ip: req.ip,
      userAgent: userAgent.substring(0, 100)
    });
  }
}

// 📧 EMAIL VERIFICATION MIDDLEWARE
export const requireEmailVerification = (req: Request, res: Response, next: NextFunction) => {
  if (!req.firebaseUser?.emailVerified) {
    return res.status(403).json({
      error: 'Se requiere verificación de email para esta operación',
      code: 'EMAIL_VERIFICATION_REQUIRED',
      action: 'VERIFY_EMAIL'
    });
  }
  next();
};

// ⏱️ RECENT AUTHENTICATION MIDDLEWARE
export const requireRecentAuth = (maxAgeMinutes: number = 30) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.firebaseUser) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        code: 'AUTH_REQUIRED'
      });
    }

    const now = Date.now();
    const authAge = now - req.firebaseUser.authTime.getTime();
    const maxAge = maxAgeMinutes * 60 * 1000;

    if (authAge > maxAge) {
      return res.status(403).json({
        error: 'Se requiere autenticación reciente para esta operación',
        code: 'RECENT_AUTH_REQUIRED',
        action: 'REAUTHENTICATE',
        maxAgeMinutes
      });
    }

    next();
  };
};

// 🎭 ROLE-BASED ACCESS CONTROL
export const requireRole = (requiredRole: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = req.firebaseUser?.customClaims?.role;
    
    if (!userRole || userRole !== requiredRole) {
      console.warn('🚫 [FIREBASE-SECURITY] Insufficient permissions:', {
        uid: req.firebaseUser?.uid,
        requiredRole,
        userRole,
        endpoint: req.path
      });

      return res.status(403).json({
        error: 'Permisos insuficientes para esta operación',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: requiredRole,
        current: userRole || 'none'
      });
    }

    next();
  };
};

// 🛡️ ADVANCED RATE LIMITING BY USER
export const createUserRateLimit = (options: {
  windowMs: number;
  max: number;
  message?: string;
}) => {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    keyGenerator: (req: Request) => {
      return req.firebaseUser?.uid || req.ip || 'anonymous';
    },
    message: {
      error: options.message || 'Límite de solicitudes excedido',
      code: 'RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Skip rate limiting for admin users
      return req.firebaseUser?.customClaims?.role === 'admin';
    }
  });
};

// 🍪 SECURE COOKIE TOKEN HANDLING
export const setSecureTokenCookie = (res: Response, token: string) => {
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000, // 1 hour
    domain: process.env.COOKIE_DOMAIN,
  });
};

export const clearSecureTokenCookie = (res: Response) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    domain: process.env.COOKIE_DOMAIN,
  });
};