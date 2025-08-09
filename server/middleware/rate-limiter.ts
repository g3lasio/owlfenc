/**
 * RATE LIMITING MIDDLEWARE
 * Critical security protection against brute force attacks
 */

import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request } from 'express';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Max 1000 requests per windowMs per IP
  message: {
    error: 'Demasiadas solicitudes desde esta IP, inténtalo de nuevo en 15 minutos.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication endpoints (login, register, password reset)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 attempts per windowMs per IP
  skipSuccessfulRequests: true, // Don't count successful requests
  message: {
    error: 'Demasiados intentos de autenticación, inténtalo de nuevo en 15 minutos.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Email sending rate limiter
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Max 50 emails per hour per IP
  message: {
    error: 'Límite de envío de emails alcanzado, inténtalo de nuevo en 1 hora.',
    code: 'EMAIL_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Contract generation rate limiter (expensive operations)
export const contractLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // Max 100 contracts per hour per IP
  message: {
    error: 'Límite de generación de contratos alcanzado, inténtalo de nuevo en 1 hora.',
    code: 'CONTRACT_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Property verification rate limiter (external API calls)
export const propertyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour  
  max: 200, // Max 200 property verifications per hour per IP
  message: {
    error: 'Límite de verificaciones de propiedad alcanzado, inténtalo de nuevo en 1 hora.',
    code: 'PROPERTY_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI/Chat rate limiter (expensive AI operations)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 300, // Max 300 AI requests per hour per IP
  message: {
    error: 'Límite de solicitudes AI alcanzado, inténtalo de nuevo en 1 hora.',
    code: 'AI_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiting middleware (slows down requests instead of blocking)
export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 100, // Allow 100 requests per windowMs at full speed
  delayMs: (hits) => hits * 100, // Add 100ms delay per request after delayAfter
  maxDelayMs: 5000, // Maximum delay of 5 seconds
});

// IP-based key generator for Firebase users
export const createFirebaseUserKeyGenerator = (prefix: string = '') => {
  return (req: Request): string => {
    // Try to get Firebase user ID first, fallback to IP
    const firebaseUserId = req.firebaseUser?.uid;
    if (firebaseUserId) {
      return `${prefix}firebase:${firebaseUserId}`;
    }
    // Fallback to IP address
    return `${prefix}ip:${req.ip || req.connection.remoteAddress || 'unknown'}`;
  };
};

// Advanced rate limiter with Firebase user support
export const createUserRateLimiter = (options: {
  windowMs: number;
  max: number;
  message: string;
  keyPrefix?: string;
}) => {
  return rateLimit({
    ...options,
    keyGenerator: createFirebaseUserKeyGenerator(options.keyPrefix),
    message: {
      error: options.message,
      code: 'USER_RATE_LIMIT_EXCEEDED'
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};