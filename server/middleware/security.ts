/**
 * COMPREHENSIVE SECURITY MIDDLEWARE
 * Implements security best practices and headers
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
      scriptSrc: [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        // Maps & Geo
        "https://maps.googleapis.com",
        "https://api.mapbox.com",
        // Payments
        "https://js.stripe.com",
        // Auth
        "https://appleid.cdn-apple.com",
        // CDN
        "https://cdn.jsdelivr.net",
        // Dev tools
        "https://replit.com",
        // Analytics — required to avoid CSP errors on all pages
        "https://www.googletagmanager.com",
        "https://www.googletagmanager.com/gtm.js",
        "https://www.googletagmanager.com/gtag/js",
        "https://www.google-analytics.com",
        "https://www.redditstatic.com",
        "https://connect.facebook.net",
      ],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: [
        "'self'",
        // AI APIs
        "https://api.openai.com",
        "https://api.anthropic.com",
        // Payments
        "https://api.stripe.com",
        // Firebase
        "https://firestore.googleapis.com",
        "https://identitytoolkit.googleapis.com",
        "https://securetoken.googleapis.com",
        "https://*.googleapis.com",
        "https://firebasestorage.googleapis.com",
        "https://storage.googleapis.com",
        // Maps
        "https://api.mapbox.com",
        "https://*.tiles.mapbox.com",
        "https://events.mapbox.com",
        // Analytics
        "https://www.google-analytics.com",
        "https://analytics.google.com",
        "https://www.googletagmanager.com",
        "https://stats.g.doubleclick.net",
        "https://www.redditstatic.com",
        "https://alb.reddit.com",
        // WebSockets
        "wss:",
      ],
      frameSrc: ["'self'", "https://js.stripe.com", "https://www.googletagmanager.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Lista de dominios de producción autorizados para WebAuthn
 * Estos dominios pueden usar WebAuthn cuando están embebidos
 */
const WEBAUTHN_ALLOWED_ORIGINS = [
  'https://app.owlfenc.com',
  'https://owlfenc.com',
  'https://owl-fenc.firebaseapp.com',
  'https://owl-fenc.web.app'
];

// Request sanitization middleware
export const sanitizeRequest = (req: Request, res: Response, next: NextFunction) => {
  // Remove potentially dangerous characters from query params
  for (const key in req.query) {
    if (typeof req.query[key] === 'string') {
      req.query[key] = (req.query[key] as string)
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+\s*=/gi, ''); // Remove event handlers
    }
  }

  next();
};

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // SECURITY: Only log non-sensitive information
  const securityInfo = {
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    firebaseUser: req.firebaseUser?.uid || null
    // NOTE: Intentionally NOT logging User-Agent, Authorization headers, or request body
  };
  
  // Log suspicious activity
  if (req.url.includes('admin') || req.url.includes('debug') || req.url.includes('test')) {
    console.warn('[SECURITY] Suspicious URL access attempt:', securityInfo);
  }
  
  // Log actual auth API endpoints only (not Vite static files that contain 'auth' in path)
  const isAuthApiEndpoint = req.url.startsWith('/api/') && 
    (req.url.includes('/login') || req.url.includes('/register') || 
     req.url.includes('/auth/') || req.url.includes('/sessionLogin'));
  if (isAuthApiEndpoint && process.env.DEBUG_AUTH === 'true') {
    // Only log auth events in debug mode to avoid exposing user info in production
    console.log('[AUTH-EVENT] User authentication attempt:', { uid: securityInfo.firebaseUser, method: securityInfo.method });
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (res.statusCode >= 400) {
      console.warn('[ERROR] Request failed:', { method: securityInfo.method, url: securityInfo.url, statusCode: res.statusCode, duration });
    }
  });
  
  next();
};

// Environment validation
export const validateEnvironment = () => {
  const requiredEnvVars = [
    'DATABASE_URL',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
  ];

  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  if (missingVars.length > 0) {
    console.warn(`⚠️ Missing environment variables: ${missingVars.join(', ')}`);
  }
};

// Demo token security check
export const checkDemoToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token === 'demo-token-12345' && process.env.NODE_ENV === 'production') {
    console.error('🚨 SECURITY ALERT: Demo token used in production!');
    return res.status(401).json({ error: 'Invalid authentication token' });
  }
  next();
};

// WebAuthn origin validation
export const validateWebAuthnOrigin = (origin: string): boolean => {
  return WEBAUTHN_ALLOWED_ORIGINS.includes(origin);
};
