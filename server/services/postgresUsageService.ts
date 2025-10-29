/**
 * 🔐 PostgreSQL Usage Tracking Service
 * Sistema PERSISTENTE de seguimiento de uso mensual
 * 
 * CRITICAL: Este servicio reemplaza Map en memoria para prevenir pérdida de datos
 * - Storage: PostgreSQL tabla `user_usage_limits`
 * - Persistencia: Datos sobreviven restart, refresh y redeploy
 * - Reset mensual: Automático basado en campo `month`
 */

import { db } from '../db';
import { eq, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

interface UsageRecord {
  basicEstimatesUsed: number;
  aiEstimatesUsed: number;
  contractsUsed: number;
  propertyVerificationsUsed: number;
  permitAdvisorUsed: number;
  projectsUsed: number;
  deepsearchUsed: number;
}

interface UsageDetails {
  used: number;
  limit: number;
  remaining: number;
  month: string;
}

export class PostgresUsageService {
  /**
   * Get current month in YYYY-MM format
   */
  private getCurrentMonth(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Map feature names to database column names
   */
  private getColumnName(feature: string): string {
    const mapping: Record<string, string> = {
      'basicEstimates': 'basic_estimates_used',
      'aiEstimates': 'ai_estimates_used',
      'contracts': 'contracts_used',
      'propertyVerifications': 'property_verifications_used',
      'permitAdvisor': 'permit_advisor_used',
      'projects': 'projects_used',
      'deepsearch': 'basic_estimates_used' // DeepSearch cuenta como estimate
    };
    return mapping[feature] || feature;
  }

  /**
   * Get or create usage record for user in current month
   */
  async getOrCreateUsageRecord(userId: string, planId: number = 5): Promise<any> {
    const currentMonth = this.getCurrentMonth();

    try {
      // Try to find existing record
      const existing = await db.execute(sql`
        SELECT * FROM user_usage_limits 
        WHERE user_id = ${userId} AND month = ${currentMonth}
        LIMIT 1
      `);

      if (existing.rows && existing.rows.length > 0) {
        return existing.rows[0];
      }

      // Create new record for current month
      console.log(`📊 [PG-USAGE] Creating new usage record for user ${userId}, month ${currentMonth}`);
      
      const result = await db.execute(sql`
        INSERT INTO user_usage_limits (
          user_id, month, plan_id,
          basic_estimates_limit, ai_estimates_limit, contracts_limit,
          property_verifications_limit, permit_advisor_limit, projects_limit,
          basic_estimates_used, ai_estimates_used, contracts_used,
          property_verifications_used, permit_advisor_used, projects_used,
          created_at, updated_at
        ) VALUES (
          ${userId}, ${currentMonth}, ${planId},
          5, 1, 0,
          0, 0, 0,
          0, 0, 0,
          0, 0, 0,
          NOW(), NOW()
        )
        RETURNING *
      `);

      return result.rows[0];
    } catch (error) {
      console.error(`❌ [PG-USAGE] Error getting/creating usage record:`, error);
      throw error;
    }
  }

  /**
   * Get current usage for a specific feature
   */
  async getUsage(userId: string, feature: string): Promise<number> {
    try {
      const record = await this.getOrCreateUsageRecord(userId);
      const columnName = this.getColumnName(feature);
      
      const usage = record[columnName] || 0;
      console.log(`📊 [PG-USAGE] User ${userId} - ${feature}: ${usage} uses`);
      
      return usage;
    } catch (error) {
      console.error(`❌ [PG-USAGE] Error getting usage for ${feature}:`, error);
      return 0;
    }
  }

  /**
   * Increment usage counter atomically (PERSISTENT)
   */
  async incrementUsage(userId: string, feature: string, amount: number = 1): Promise<number> {
    const currentMonth = this.getCurrentMonth();
    const columnName = this.getColumnName(feature);

    try {
      // Ensure record exists first
      await this.getOrCreateUsageRecord(userId);

      // Atomic increment with proper SQL column name
      const result = await db.execute(sql.raw(`
        UPDATE user_usage_limits 
        SET ${columnName} = ${columnName} + ${amount},
            updated_at = NOW()
        WHERE user_id = '${userId}' AND month = '${currentMonth}'
        RETURNING ${columnName}
      `));

      const newValue = result.rows[0]?.[columnName] || 0;
      
      console.log(`✅ [PG-USAGE] User ${userId} - ${feature}: incremented by ${amount}, new value: ${newValue}`);
      
      return newValue;
    } catch (error) {
      console.error(`❌ [PG-USAGE] Error incrementing usage for ${feature}:`, error);
      throw error;
    }
  }

  /**
   * Check if user can use a feature (considering limits)
   */
  async canUseFeature(userId: string, feature: string, limit: number): Promise<boolean> {
    if (limit === -1) return true; // Unlimited

    const currentUsage = await this.getUsage(userId, feature);
    const canUse = currentUsage < limit;
    
    console.log(`🔍 [PG-USAGE] Can use ${feature}? ${canUse} (usage: ${currentUsage}/${limit})`);
    
    return canUse;
  }

  /**
   * Get detailed usage information for a feature
   */
  async getUsageDetails(userId: string, feature: string, limit: number): Promise<UsageDetails> {
    const currentMonth = this.getCurrentMonth();
    const used = await this.getUsage(userId, feature);
    const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

    return {
      used,
      limit,
      remaining,
      month: currentMonth
    };
  }

  /**
   * Get all usage for a user (multiple features)
   */
  async getUserUsage(userId: string): Promise<UsageRecord> {
    try {
      const record = await this.getOrCreateUsageRecord(userId);

      return {
        basicEstimatesUsed: record.basic_estimates_used || 0,
        aiEstimatesUsed: record.ai_estimates_used || 0,
        contractsUsed: record.contracts_used || 0,
        propertyVerificationsUsed: record.property_verifications_used || 0,
        permitAdvisorUsed: record.permit_advisor_used || 0,
        projectsUsed: record.projects_used || 0,
        deepsearchUsed: record.basic_estimates_used || 0 // Same as basic estimates
      };
    } catch (error) {
      console.error(`❌ [PG-USAGE] Error getting user usage:`, error);
      return {
        basicEstimatesUsed: 0,
        aiEstimatesUsed: 0,
        contractsUsed: 0,
        propertyVerificationsUsed: 0,
        permitAdvisorUsed: 0,
        projectsUsed: 0,
        deepsearchUsed: 0
      };
    }
  }

  /**
   * Reset usage for a specific feature (admin function)
   */
  async resetFeatureUsage(userId: string, feature: string): Promise<void> {
    const currentMonth = this.getCurrentMonth();
    const columnName = this.getColumnName(feature);

    try {
      await db.execute(sql.raw(`
        UPDATE user_usage_limits 
        SET ${columnName} = 0,
            updated_at = NOW()
        WHERE user_id = '${userId}' AND month = '${currentMonth}'
      `));

      console.log(`🔄 [PG-USAGE] Reset usage for ${userId}:${feature}`);
    } catch (error) {
      console.error(`❌ [PG-USAGE] Error resetting usage:`, error);
      throw error;
    }
  }

  /**
   * Update limits for a user (when plan changes)
   */
  async updateLimits(userId: string, limits: {
    basicEstimatesLimit?: number;
    aiEstimatesLimit?: number;
    contractsLimit?: number;
    propertyVerificationsLimit?: number;
    permitAdvisorLimit?: number;
    projectsLimit?: number;
  }): Promise<void> {
    const currentMonth = this.getCurrentMonth();

    try {
      const updates: string[] = [];
      
      if (limits.basicEstimatesLimit !== undefined) {
        updates.push(`basic_estimates_limit = ${limits.basicEstimatesLimit}`);
      }
      if (limits.aiEstimatesLimit !== undefined) {
        updates.push(`ai_estimates_limit = ${limits.aiEstimatesLimit}`);
      }
      if (limits.contractsLimit !== undefined) {
        updates.push(`contracts_limit = ${limits.contractsLimit}`);
      }
      if (limits.propertyVerificationsLimit !== undefined) {
        updates.push(`property_verifications_limit = ${limits.propertyVerificationsLimit}`);
      }
      if (limits.permitAdvisorLimit !== undefined) {
        updates.push(`permit_advisor_limit = ${limits.permitAdvisorLimit}`);
      }
      if (limits.projectsLimit !== undefined) {
        updates.push(`projects_limit = ${limits.projectsLimit}`);
      }

      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        
        await db.execute(sql.raw(`
          UPDATE user_usage_limits 
          SET ${updates.join(', ')}
          WHERE user_id = '${userId}' AND month = '${currentMonth}'
        `));

        console.log(`✅ [PG-USAGE] Updated limits for user ${userId}`);
      }
    } catch (error) {
      console.error(`❌ [PG-USAGE] Error updating limits:`, error);
      throw error;
    }
  }

  /**
   * Check if month has rolled over and cleanup old records
   */
  async cleanupOldRecords(): Promise<void> {
    try {
      // Delete records older than 3 months
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const cutoffMonth = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}`;

      await db.execute(sql`
        DELETE FROM user_usage_limits 
        WHERE month < ${cutoffMonth}
      `);

      console.log(`🧹 [PG-USAGE] Cleaned up records older than ${cutoffMonth}`);
    } catch (error) {
      console.error(`❌ [PG-USAGE] Error cleaning up old records:`, error);
    }
  }
}

// Export singleton instance
export const postgresUsageService = new PostgresUsageService();
