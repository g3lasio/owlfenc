/**
 * Redis Client Factory
 * Provides unified Redis client with Upstash support and graceful fallback
 * 
 * Environment variables:
 * - UPSTASH_REDIS_REST_URL: Upstash Redis REST endpoint
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis authentication token
 * - REDIS_ENABLED: Enable/disable Redis (default: true if credentials present)
 */

import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;
let redisAvailable = false;

/**
 * Initialize Redis client
 */
export function initializeRedis(): Redis | null {
  if (redisClient) {
    return redisClient;
  }

  try {
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    const redisEnabled = process.env.REDIS_ENABLED !== 'false';

    if (!redisEnabled) {
      console.log('📦 [REDIS] Redis disabled via environment variable');
      return null;
    }

    if (!redisUrl || !redisToken) {
      console.warn('⚠️ [REDIS] Credentials not found - falling back to in-memory storage');
      console.warn('⚠️ [REDIS] Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN to enable Redis');
      return null;
    }

    redisClient = new Redis({
      url: redisUrl,
      token: redisToken,
      // Enable automatic retries
      retry: {
        retries: 3,
        backoff: (retryCount) => Math.min(retryCount * 100, 3000)
      }
    });

    redisAvailable = true;
    console.log('✅ [REDIS] Upstash Redis client initialized successfully');
    
    // Test connection
    testRedisConnection();

    return redisClient;
  } catch (error) {
    console.error('❌ [REDIS] Failed to initialize Redis client:', error);
    redisClient = null;
    redisAvailable = false;
    return null;
  }
}

/**
 * Test Redis connection
 */
async function testRedisConnection() {
  if (!redisClient) return;

  try {
    await redisClient.ping();
    console.log('✅ [REDIS] Connection test successful');
  } catch (error) {
    console.error('❌ [REDIS] Connection test failed:', error);
    redisAvailable = false;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient(): Redis | null {
  if (!redisClient) {
    return initializeRedis();
  }
  return redisClient;
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return redisAvailable && redisClient !== null;
}

/**
 * Execute Redis command with fallback handling
 */
export async function executeRedisCommand<T>(
  command: () => Promise<T>,
  fallbackValue: T
): Promise<T> {
  if (!isRedisAvailable()) {
    return fallbackValue;
  }

  try {
    return await command();
  } catch (error) {
    console.error('❌ [REDIS] Command execution failed:', error);
    
    // Mark Redis as unavailable if it's a connection error
    if (error instanceof Error && error.message.includes('connect')) {
      redisAvailable = false;
      console.warn('⚠️ [REDIS] Marked as unavailable due to connection error');
    }
    
    return fallbackValue;
  }
}

/**
 * Health check for Redis
 */
export async function checkRedisHealth(): Promise<{
  available: boolean;
  latency?: number;
  error?: string;
}> {
  if (!redisClient) {
    return {
      available: false,
      error: 'Redis client not initialized'
    };
  }

  try {
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    return {
      available: true,
      latency
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Initialize Redis on module load
initializeRedis();
