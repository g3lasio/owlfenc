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
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '');
    }
  }

  // Add security response headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  const currentOrigin = `https://${req.hostname}`;
  const isProductionOrigin = WEBAUTHN_ALLOWED_ORIGINS.some(origin =>
    currentOrigin === origin || req.hostname === origin.replace('https://', '')
  );

  if (isProductionOrigin) {
    res.setHeader('Permissions-Policy',
      `publickey-credentials-get=(self "${WEBAUTHN_ALLOWED_ORIGINS.join('" "')}"), ` +
      `publickey-credentials-create=(self "${WEBAUTHN_ALLOWED_ORIGINS.join('" "')}")`
    );
  } else {
    res.setHeader('Permissions-Policy',
      'publickey-credentials-get=(self), publickey-credentials-create=(self)'
    );
  }

  next();
};

// API Key validation middleware
export const validateApiKeys = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.includes('demo') || authHeader === 'Bearer demo-token') {
      console.error('🚨 SECURITY ALERT: Demo token used in production!');
      return res.status(401).json({
        error: 'Token de desarrollo no permitido en producción',
        code: 'INVALID_TOKEN_TYPE'
      });
    }
  }
  next();
};

// Request logging for security monitoring — improved to avoid sensitive data exposure
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // SECURITY: Only log non-sensitive information (no User-Agent, no Authorization headers)
  const securityInfo = {
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    firebaseUser: req.firebaseUser?.uid || null
  };

  // Log suspicious activity
  if (req.url.includes('admin') || req.url.includes('debug') || req.url.includes('test')) {
    console.warn('[SECURITY] Suspicious URL access attempt:', securityInfo);
  }

  // Log auth API endpoints only when DEBUG_AUTH is enabled
  const isAuthApiEndpoint = req.url.startsWith('/api/') &&
    (req.url.includes('/login') || req.url.includes('/register') ||
     req.url.includes('/auth/') || req.url.includes('/sessionLogin'));
  if (isAuthApiEndpoint && process.env.DEBUG_AUTH === 'true') {
    console.log('[AUTH-EVENT] Authentication attempt:', { uid: securityInfo.firebaseUser, method: securityInfo.method });
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
    'SESSION_SECRET',
    'OPENAI_API_KEY',
    'ANTHROPIC_API_KEY'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  /* if (missingVars.length > 0) {
    console.error('🚨 CRITICAL: Missing environment variables:', missingVars);
    process.exit(1);
  } */

  // Check for exposed keys
  const sensitiveVars = ['STRIPE_SECRET_KEY', 'DATABASE_URL', 'SESSION_SECRET'];
  sensitiveVars.forEach(varName => {
    const value = process.env[varName];
    if (value && (value.includes('demo') || value.includes('test') || value.includes('placeholder'))) {
      console.warn(`⚠️ WARNING: ${varName} appears to contain test/demo values in production`);
    }
  });
};

// CORS configuration for production
export const corsConfig = {
  origin: process.env.NODE_ENV === 'production'
    ? [process.env.ALLOWED_ORIGINS?.split(',') || []].flat().filter(Boolean)
    : true, // Allow all origins in development
  credentials: true, // CRITICAL: Required for session cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-Firebase-UID',
    'X-User-Email'
  ]
};
