/**
 * RATE LIMIT MIDDLEWARE
 * Anti-abuse middleware for protecting production endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { antiAbuseService } from '../services/antiAbuseService.js';
import { AuthenticatedRequest } from './firebase-auth-middleware.js';

export interface RateLimitOptions {
  maxTokens?: number;
  refillRate?: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: Request) => string;
}

/**
 * Create rate limit middleware for specific endpoint
 */
export function createRateLimitMiddleware(
  endpoint: string, 
  options: RateLimitOptions = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get user ID (prefer authenticated, fallback to IP)
      const uid = (req as AuthenticatedRequest).uid || `guest_${getClientIP(req)}`;
      const ip = getClientIP(req);
      const userAgent = req.headers['user-agent'] || 'unknown';
      
      // Check rate limit
      const rateLimitResult = await antiAbuseService.checkRateLimit(
        uid, 
        ip, 
        endpoint,
        {
          maxTokens: options.maxTokens,
          refillRate: options.refillRate
        }
      );
      
      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', rateLimitResult.remaining + rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Remaining', rateLimitResult.remaining);
      res.setHeader('X-RateLimit-Reset', new Date(rateLimitResult.resetTime).toISOString());
      
      if (!rateLimitResult.allowed) {
        if (rateLimitResult.blocked) {
          return res.status(429).json({
            success: false,
            error: 'rate_limit_exceeded_blocked',
            message: 'Your account has been temporarily blocked due to excessive requests',
            retryAfter: new Date(rateLimitResult.resetTime).toISOString(),
            rateLimitInfo: {
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime,
              blocked: true
            }
          });
        } else {
          return res.status(429).json({
            success: false,
            error: 'rate_limit_exceeded',
            message: 'Too many requests. Please slow down.',
            retryAfter: new Date(rateLimitResult.resetTime).toISOString(),
            rateLimitInfo: {
              remaining: rateLimitResult.remaining,
              resetTime: rateLimitResult.resetTime,
              blocked: false
            }
          });
        }
      }
      
      // Check for suspicious activity patterns
      const requestFrequency = getRequestFrequency(req);
      const isSuspicious = await antiAbuseService.detectSuspiciousActivity(
        uid, 
        ip, 
        {
          endpoint,
          userAgent,
          frequency: requestFrequency,
          timePattern: detectTimePattern(req)
        }
      );
      
      if (isSuspicious) {
        return res.status(429).json({
          success: false,
          error: 'suspicious_activity_detected',
          message: 'Suspicious activity detected. Please contact support if this is an error.',
          rateLimitInfo: {
            remaining: 0,
            resetTime: Date.now() + 3600000, // 1 hour
            blocked: true
          }
        });
      }
      
      // Add rate limit info to request for downstream use
      (req as any).rateLimitInfo = {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
        uid,
        ip
      };
      
      next();
      
    } catch (error) {
      console.error('❌ [RATE-LIMIT-MIDDLEWARE] Error in rate limiting:', error);
      // On error, allow request to proceed but log the issue
      next();
    }
  };
}

/**
 * Get client IP address
 */
function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

/**
 * Estimate request frequency (simplified)
 */
function getRequestFrequency(req: Request): number {
  // This is a simplified implementation
  // In production, you'd track this more accurately
  const timestamp = Date.now();
  const key = `freq_${getClientIP(req)}`;
  
  // For demo purposes, return a moderate frequency
  return 10; // requests per minute
}

/**
 * Detect suspicious time patterns
 */
function detectTimePattern(req: Request): string {
  // This is a simplified implementation
  // In production, you'd analyze request timing patterns
  return 'normal';
}

/**
 * Predefined rate limiters for common endpoints
 */
export const rateLimiters = {
  // Generous limits for basic estimates
  basicEstimates: createRateLimitMiddleware('generate-estimate', {
    maxTokens: 30,
    refillRate: 5
  }),
  
  // Stricter limits for AI estimates (more expensive)
  aiEstimates: createRateLimitMiddleware('generate-ai-estimate', {
    maxTokens: 10,
    refillRate: 2
  }),
  
  // Moderate limits for contracts
  contracts: createRateLimitMiddleware('generate-contract', {
    maxTokens: 20,
    refillRate: 3
  }),
  
  // Standard limits for property verification
  propertyVerification: createRateLimitMiddleware('property-verification', {
    maxTokens: 25,
    refillRate: 4
  }),
  
  // Standard limits for permit advisor
  permitAdvisor: createRateLimitMiddleware('permit-advisor', {
    maxTokens: 20,
    refillRate: 3
  }),
  
  // Generous limits for read-only operations
  readOnly: createRateLimitMiddleware('read-only', {
    maxTokens: 100,
    refillRate: 20
  }),
  
  // Strict limits for admin operations
  admin: createRateLimitMiddleware('admin', {
    maxTokens: 50,
    refillRate: 10
  })
};

/**
 * Global rate limiter for all requests
 */
export const globalRateLimit = createRateLimitMiddleware('global', {
  maxTokens: 1000,
  refillRate: 100
});

export default {
  createRateLimitMiddleware,
  rateLimiters,
  globalRateLimit
};