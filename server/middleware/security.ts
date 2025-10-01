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
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://maps.googleapis.com", "https://api.mapbox.com", "https://js.stripe.com", "https://appleid.cdn-apple.com", "https://cdn.jsdelivr.net", "https://replit.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.openai.com", "https://api.anthropic.com", "https://api.stripe.com", "https://firestore.googleapis.com", "https://identitytoolkit.googleapis.com", "https://securetoken.googleapis.com", "https://*.googleapis.com", "https://api.mapbox.com", "https://*.tiles.mapbox.com", "https://events.mapbox.com", "wss:"],
      frameSrc: ["'self'", "https://js.stripe.com"],
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
  
  // Add security response headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
};

// API Key validation middleware
export const validateApiKeys = (req: Request, res: Response, next: NextFunction) => {
  // Check for exposed development keys in production
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

// Request logging for security monitoring
export const securityLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Log security-relevant information
  const securityInfo = {
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    method: req.method,
    url: req.url,
    timestamp: new Date().toISOString(),
    firebaseUser: req.firebaseUser?.uid || null
  };
  
  // Log suspicious activity
  if (req.url.includes('admin') || req.url.includes('debug') || req.url.includes('test')) {
    console.warn('🔍 SECURITY LOG: Suspicious URL access:', securityInfo);
  }
  
  // Log all authentication attempts
  if (req.url.includes('login') || req.url.includes('register') || req.url.includes('auth')) {
    console.log('🔐 AUTH LOG:', securityInfo);
  }
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (res.statusCode >= 400) {
      console.warn('⚠️ ERROR LOG:', { ...securityInfo, statusCode: res.statusCode, duration });
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
  
  if (missingVars.length > 0) {
    console.error('🚨 CRITICAL: Missing environment variables:', missingVars);
    process.exit(1);
  }
  
  // Check for exposed keys
  const sensitiveVars = ['STRIPE_API_KEY', 'DATABASE_URL', 'SESSION_SECRET'];
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
    'Authorization', // Fallback support for mobile/CLI
    'X-Requested-With',
    'X-Firebase-UID', // Legacy header support
    'X-User-Email'    // Legacy header support
  ]
};