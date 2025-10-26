/**
 * Redis Rate Limiter Service
 * Implements sliding window rate limiting with Redis
 * 
 * Key Schema:
 * - rate:{route}:{fingerprint} - Sorted set of timestamps for sliding window
 * - Each entry is a timestamp scored by itself for easy cleanup
 */

import { getRedisClient, isRedisAvailable } from '../lib/redis/client';

export interface RateLimitConfig {
  windowMs: number;  // Time window in milliseconds
  max: number;       // Maximum requests in window
  message?: string;  // Custom error message
  keyPrefix?: string; // Custom key prefix
}

export interface RateLimitResult {
  allowed: boolean;
  current: number;
  limit: number;
  remaining: number;
  resetAt: Date;
  retryAfter?: number; // Seconds to wait before retry
}

export class RedisRateLimiter {
  private readonly KEY_PREFIX = 'rate';

  /**
   * Generate Redis key for rate limiting
   */
  private getRateLimitKey(route: string, fingerprint: string, prefix?: string): string {
    const basePrefix = prefix || this.KEY_PREFIX;
    return `${basePrefix}:${route}:${fingerprint}`;
  }

  /**
   * Check and increment rate limit using sliding window
   */
  async checkLimit(
    route: string,
    fingerprint: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const client = getRedisClient();

    // Fallback: allow if Redis not available (with warning)
    if (!isRedisAvailable() || !client) {
      console.warn('⚠️ [RATE-LIMITER] Redis unavailable, allowing request (no rate limit enforcement)');
      return {
        allowed: true,
        current: 0,
        limit: config.max,
        remaining: config.max,
        resetAt: new Date(Date.now() + config.windowMs)
      };
    }

    const key = this.getRateLimitKey(route, fingerprint, config.keyPrefix);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = client.pipeline();

      // 1. Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // 2. Count current entries in window
      pipeline.zcard(key);

      // 3. Add current timestamp
      pipeline.zadd(key, { score: now, member: `${now}-${Math.random()}` });

      // 4. Set TTL to window size + buffer
      pipeline.expire(key, Math.ceil(config.windowMs / 1000) + 60);

      const results = await pipeline.exec() as unknown[];

      // Extract count (before adding current request)
      const currentCount = typeof results[1] === 'number' ? results[1] : 0;
      const newCount = currentCount + 1;

      const allowed = newCount <= config.max;
      const remaining = Math.max(0, config.max - newCount);
      const resetAt = new Date(now + config.windowMs);

      if (!allowed) {
        // Calculate retry-after (oldest entry in window + window size - now)
        const oldestEntry = await client.zrange(key, 0, 0, { withScores: true }) as Array<{ score: number; member: string }>;
        const retryAfter = oldestEntry && oldestEntry.length > 0 
          ? Math.ceil((Number(oldestEntry[0].score) + config.windowMs - now) / 1000)
          : Math.ceil(config.windowMs / 1000);

        console.warn(`⚠️ [RATE-LIMITER] Limit exceeded for ${route}:${fingerprint} - ${newCount}/${config.max}`);

        return {
          allowed: false,
          current: newCount,
          limit: config.max,
          remaining: 0,
          resetAt,
          retryAfter
        };
      }

      console.log(`✅ [RATE-LIMITER] Request allowed for ${route}:${fingerprint} - ${newCount}/${config.max}`);

      return {
        allowed: true,
        current: newCount,
        limit: config.max,
        remaining,
        resetAt
      };

    } catch (error) {
      console.error(`❌ [RATE-LIMITER] Error checking limit for ${route}:${fingerprint}:`, error);
      
      // On error, allow the request but log warning
      return {
        allowed: true,
        current: 0,
        limit: config.max,
        remaining: config.max,
        resetAt: new Date(now + config.windowMs)
      };
    }
  }

  /**
   * Reset rate limit for a specific key (admin function)
   */
  async resetLimit(route: string, fingerprint: string, prefix?: string): Promise<void> {
    const client = getRedisClient();

    if (!client) {
      console.warn('⚠️ [RATE-LIMITER] Redis not available, skipping reset');
      return;
    }

    const key = this.getRateLimitKey(route, fingerprint, prefix);

    try {
      await client.del(key);
      console.log(`🔄 [RATE-LIMITER] Reset rate limit for ${route}:${fingerprint}`);
    } catch (error) {
      console.error(`❌ [RATE-LIMITER] Error resetting limit for ${route}:${fingerprint}:`, error);
    }
  }

  /**
   * Get current rate limit status without incrementing
   */
  async getStatus(
    route: string,
    fingerprint: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const client = getRedisClient();

    if (!isRedisAvailable() || !client) {
      return {
        allowed: true,
        current: 0,
        limit: config.max,
        remaining: config.max,
        resetAt: new Date(Date.now() + config.windowMs)
      };
    }

    const key = this.getRateLimitKey(route, fingerprint, config.keyPrefix);
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Clean old entries and count
      await client.zremrangebyscore(key, 0, windowStart);
      const currentCount = await client.zcard(key);

      const allowed = currentCount < config.max;
      const remaining = Math.max(0, config.max - currentCount);
      const resetAt = new Date(now + config.windowMs);

      return {
        allowed,
        current: currentCount,
        limit: config.max,
        remaining,
        resetAt
      };
    } catch (error) {
      console.error(`❌ [RATE-LIMITER] Error getting status for ${route}:${fingerprint}:`, error);
      
      return {
        allowed: true,
        current: 0,
        limit: config.max,
        remaining: config.max,
        resetAt: new Date(now + config.windowMs)
      };
    }
  }

  /**
   * Clean up all expired rate limit keys (maintenance function)
   */
  async cleanup(): Promise<number> {
    const client = getRedisClient();

    if (!client) {
      return 0;
    }

    try {
      // Get all rate limit keys
      const keys = await client.keys(`${this.KEY_PREFIX}:*`);
      let cleanedCount = 0;

      for (const key of keys) {
        // Check if key has any members
        const count = await client.zcard(key);
        if (count === 0) {
          await client.del(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🧹 [RATE-LIMITER] Cleaned up ${cleanedCount} expired keys`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('❌ [RATE-LIMITER] Error during cleanup:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const redisRateLimiter = new RedisRateLimiter();
