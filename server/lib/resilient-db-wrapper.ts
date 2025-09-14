/**
 * Resilient Database Wrapper for Neon
 * 
 * Handles connection termination, timeouts, and provides retry logic
 * specifically designed for Neon's serverless environment.
 */

import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import * as schema from '@shared/schema';

// Configure Neon for HTTP mode (more reliable than WebSocket for serverless)
neonConfig.fetchConnectionCache = true;

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: string[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 100,
  maxDelayMs: 2000,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT', 
    'ENOTFOUND',
    'ECONNREFUSED',
    'connection terminated unexpectedly',
    'Connection terminated',
    'WebSocket connection closed',
    'connection is closed',
    'server closed the connection unexpectedly',
    'Connection reset by peer'
  ]
};

export class ResilientDbWrapper {
  private retryConfig: RetryConfig;
  
  constructor(retryConfig: Partial<RetryConfig> = {}) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Creates a fresh HTTP-based database connection for each operation
   * This avoids connection pooling issues with idle timeouts
   */
  private createFreshConnection() {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not configured');
    }
    
    const sql = neon(process.env.DATABASE_URL);
    return drizzle(sql, { schema });
  }

  /**
   * Executes a database operation with retry logic for Neon-specific errors
   */
  async executeWithRetry<T>(
    operation: (db: ReturnType<typeof drizzle>) => Promise<T>,
    operationName: string = 'DB Operation'
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        console.log(`🔄 [RESILIENT-DB] ${operationName} - Attempt ${attempt}/${this.retryConfig.maxRetries}`);
        
        // Create a fresh connection for each attempt
        const db = this.createFreshConnection();
        const result = await operation(db);
        
        if (attempt > 1) {
          console.log(`✅ [RESILIENT-DB] ${operationName} succeeded on retry attempt ${attempt}`);
        }
        
        return result;
        
      } catch (error: any) {
        lastError = error;
        const errorMessage = error?.message || String(error);
        
        console.log(`❌ [RESILIENT-DB] ${operationName} failed on attempt ${attempt}: ${errorMessage}`);
        
        // Check if this is a retryable error
        const isRetryable = this.isRetryableError(errorMessage);
        
        if (!isRetryable || attempt === this.retryConfig.maxRetries) {
          console.error(`💥 [RESILIENT-DB] ${operationName} failed permanently after ${attempt} attempts`);
          throw error;
        }
        
        // Calculate exponential backoff delay
        const delay = Math.min(
          this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelayMs
        );
        
        console.log(`⏳ [RESILIENT-DB] Retrying ${operationName} in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    throw lastError || new Error(`Failed after ${this.retryConfig.maxRetries} attempts`);
  }

  /**
   * Checks if an error is retryable based on Neon-specific error patterns
   */
  private isRetryableError(errorMessage: string): boolean {
    return this.retryConfig.retryableErrors.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Helper method for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Safe database operation wrapper - returns null on failure instead of throwing
   */
  async executeOptional<T>(
    operation: (db: ReturnType<typeof drizzle>) => Promise<T>,
    operationName: string = 'Optional DB Operation'
  ): Promise<T | null> {
    try {
      return await this.executeWithRetry(operation, operationName);
    } catch (error) {
      console.warn(`⚠️ [RESILIENT-DB] Optional operation "${operationName}" failed, returning null:`, error);
      return null;
    }
  }

  /**
   * Health check method to verify database connectivity
   */
  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      await this.executeWithRetry(async (db) => {
        // Simple health check query using correct Drizzle syntax
        await db.execute(sql`SELECT 1 as health_check`);
      }, 'Health Check');
      
      const latencyMs = Date.now() - startTime;
      console.log(`✅ [RESILIENT-DB] Health check passed in ${latencyMs}ms`);
      
      return { healthy: true, latencyMs };
      
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      console.error(`❌ [RESILIENT-DB] Health check failed in ${latencyMs}ms:`, error);
      
      return { 
        healthy: false, 
        latencyMs, 
        error: error?.message || String(error) 
      };
    }
  }
}

// Export singleton instance
export const resilientDb = new ResilientDbWrapper();

// Export types for use in other services
export type ResilientDbInstance = ReturnType<typeof drizzle>;