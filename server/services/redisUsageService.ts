/**
 * Redis Usage Tracking Service
 * Manages monthly usage counters with automatic TTL and atomic operations
 * 
 * Key Schema:
 * - usage:{uid}:{feature}:{yyyymm} - Monthly counter for user feature usage
 * - Automatic expiry after 2 months to handle rollover gracefully
 */

import { getRedisClient, isRedisAvailable, executeRedisCommand } from '../lib/redis/client';
import { usageTracker } from '../middleware/usage-tracking';
import { postgresUsageService } from './postgresUsageService';

interface UsageCount {
  current: number;
  limit: number;
  remaining: number;
  resetDate: Date;
}

export class RedisUsageService {
  private readonly KEY_PREFIX = 'usage';
  private readonly DEFAULT_TTL = 60 * 60 * 24 * 60; // 60 days

  /**
   * Get current month key in format YYYYMM
   */
  private getCurrentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}${month}`;
  }

  /**
   * Get next month's first day
   */
  private getNextMonthDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  /**
   * Generate Redis key for usage tracking
   */
  private getUsageKey(userId: string, feature: string): string {
    const monthKey = this.getCurrentMonthKey();
    return `${this.KEY_PREFIX}:${userId}:${feature}:${monthKey}`;
  }

  /**
   * Get current usage for a feature (Redis or fallback to PostgreSQL)
   */
  async getUsage(userId: string, feature: string): Promise<number> {
    if (!isRedisAvailable()) {
      // ✅ FALLBACK: PostgreSQL (persistente) en vez de in-memory
      console.log(`⚠️ [REDIS-USAGE] Redis unavailable, using PostgreSQL for ${userId}:${feature}`);
      return await postgresUsageService.getUsage(userId, feature);
    }

    const key = this.getUsageKey(userId, feature);
    const client = getRedisClient();

    if (!client) {
      return await postgresUsageService.getUsage(userId, feature);
    }

    try {
      const usage = await client.get<number>(key);
      return usage || 0;
    } catch (error) {
      console.error(`❌ [REDIS-USAGE] Error getting usage for ${userId}:${feature}:`, error);
      // ✅ FALLBACK: PostgreSQL (persistente) en vez de in-memory
      return await postgresUsageService.getUsage(userId, feature);
    }
  }

  /**
   * Increment usage counter atomically (Redis + PostgreSQL backup)
   */
  async incrementUsage(userId: string, feature: string, amount: number = 1): Promise<number> {
    if (!isRedisAvailable()) {
      // ✅ FALLBACK: PostgreSQL (persistente) en vez de in-memory
      console.log(`⚠️ [REDIS-USAGE] Redis unavailable, using PostgreSQL for increment ${userId}:${feature}`);
      return await postgresUsageService.incrementUsage(userId, feature, amount);
    }

    const key = this.getUsageKey(userId, feature);
    const client = getRedisClient();

    if (!client) {
      return await postgresUsageService.incrementUsage(userId, feature, amount);
    }

    try {
      // Atomic increment with TTL
      const pipeline = client.pipeline();
      pipeline.incrby(key, amount);
      pipeline.expire(key, this.DEFAULT_TTL);
      
      const results = await pipeline.exec();
      const newValue = results[0] as number;

      console.log(`📊 [REDIS-USAGE] User ${userId} - ${feature}: ${newValue} uses`);
      
      // ✅ ALSO UPDATE: PostgreSQL como backup permanente
      await postgresUsageService.incrementUsage(userId, feature, amount);

      return newValue;
    } catch (error) {
      console.error(`❌ [REDIS-USAGE] Error incrementing usage for ${userId}:${feature}:`, error);
      // ✅ FALLBACK: PostgreSQL (persistente) en vez de in-memory
      return await postgresUsageService.incrementUsage(userId, feature, amount);
    }
  }

  /**
   * Check if user can use a feature (considering limits)
   */
  async canUseFeature(userId: string, feature: string, limit: number): Promise<boolean> {
    if (limit === -1) return true; // Unlimited
    
    const currentUsage = await this.getUsage(userId, feature);
    return currentUsage < limit;
  }

  /**
   * Get detailed usage information
   */
  async getUsageDetails(userId: string, feature: string, limit: number): Promise<UsageCount> {
    const current = await this.getUsage(userId, feature);
    const remaining = limit === -1 ? -1 : Math.max(0, limit - current);
    
    return {
      current,
      limit,
      remaining,
      resetDate: this.getNextMonthDate()
    };
  }

  /**
   * Get all usage for a user (multiple features)
   */
  async getUserUsage(userId: string, features: string[]): Promise<Record<string, number>> {
    const usage: Record<string, number> = {};
    
    // Fetch all features in parallel
    const promises = features.map(async (feature) => {
      const count = await this.getUsage(userId, feature);
      usage[feature] = count;
    });

    await Promise.all(promises);
    return usage;
  }

  /**
   * Reset usage for a specific feature (admin function)
   */
  async resetFeatureUsage(userId: string, feature: string): Promise<void> {
    const key = this.getUsageKey(userId, feature);
    const client = getRedisClient();

    if (!client) {
      console.warn('⚠️ [REDIS-USAGE] Redis not available, skipping reset');
      return;
    }

    try {
      await client.del(key);
      console.log(`🔄 [REDIS-USAGE] Reset usage for ${userId}:${feature}`);
      
      // Also reset in-memory
      usageTracker.resetMonthlyUsage(userId);
    } catch (error) {
      console.error(`❌ [REDIS-USAGE] Error resetting usage for ${userId}:${feature}:`, error);
    }
  }

  /**
   * Get usage statistics (admin function)
   */
  async getUsageStats(): Promise<{
    totalKeys: number;
    estimatedUsers: number;
  }> {
    const client = getRedisClient();

    if (!client) {
      return {
        totalKeys: 0,
        estimatedUsers: 0
      };
    }

    try {
      // Get all usage keys (use with caution in production with many keys)
      const keys = await client.keys(`${this.KEY_PREFIX}:*`);
      
      // Extract unique user IDs
      const users = new Set(
        keys
          .map(key => key.split(':')[1])
          .filter(Boolean)
      );

      return {
        totalKeys: keys.length,
        estimatedUsers: users.size
      };
    } catch (error) {
      console.error('❌ [REDIS-USAGE] Error getting usage stats:', error);
      return {
        totalKeys: 0,
        estimatedUsers: 0
      };
    }
  }
}

// Export singleton instance
export const redisUsageService = new RedisUsageService();
