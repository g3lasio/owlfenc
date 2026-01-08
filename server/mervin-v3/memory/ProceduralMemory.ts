/**
 * Procedural Memory System for Mervin AI
 * 
 * Stores and retrieves procedures, workflows, and "how-to" knowledge.
 * This is Mervin's memory of HOW to do things:
 * - Step-by-step procedures
 * - Successful workflows
 * - Common error patterns and fixes
 * - Optimization strategies
 */

import { db } from '../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface Procedure {
  id: string;
  name: string;
  description: string;
  
  // The procedure itself
  steps: Array<{
    order: number;
    action: string;
    tool?: string;
    parameters?: Record<string, any>;
    expectedOutcome: string;
    commonErrors?: string[];
    fixes?: string[];
  }>;
  
  // When to use this procedure
  triggers: string[]; // Conditions that suggest using this procedure
  prerequisites: string[]; // What must be true before starting
  
  // Performance metrics
  successRate: number; // 0-1 scale
  averageTime: number; // milliseconds
  timesUsed: number;
  lastUsed: Date;
  
  // Learning
  improvements: Array<{
    timestamp: Date;
    change: string;
    reason: string;
    impact: string;
  }>;
  
  commonErrors: Array<{
    error: string;
    frequency: number;
    fix: string;
  }>;
  
  // Context
  domain: string;
  userId?: string; // User-specific procedure (null = global)
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcedureQuery {
  name?: string;
  domain?: string;
  userId?: string;
  minSuccessRate?: number;
  limit?: number;
}

export class ProceduralMemorySystem {
  private collectionName = 'mervin_procedural_memory';
  
  /**
   * Store or update a procedure
   */
  async storeProcedure(procedure: Omit<Procedure, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    try {
      // Check if procedure already exists
      const existing = await this.findProcedureByName(procedure.name, procedure.userId);
      
      if (existing) {
        // Update existing procedure
        await db.collection(this.collectionName).doc(existing.id).update({
          ...procedure,
          timesUsed: existing.timesUsed + 1,
          lastUsed: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        console.log(`[ProceduralMemory] Updated procedure: ${existing.id}`);
        return existing.id;
      } else {
        // Create new procedure
        const docRef = await db.collection(this.collectionName).add({
          ...procedure,
          timesUsed: 0,
          successRate: 1.0,
          lastUsed: Timestamp.now(),
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        
        console.log(`[ProceduralMemory] Stored new procedure: ${docRef.id}`);
        return docRef.id;
      }
    } catch (error) {
      console.error('[ProceduralMemory] Error storing procedure:', error);
      throw error;
    }
  }
  
  /**
   * Find procedure by name
   */
  async findProcedureByName(name: string, userId?: string): Promise<Procedure | null> {
    try {
      let query = db.collection(this.collectionName)
        .where('name', '==', name);
      
      if (userId) {
        query = query.where('userId', '==', userId) as any;
      } else {
        query = query.where('userId', '==', null) as any;
      }
      
      const snapshot = await query.limit(1).get();
      
      if (snapshot.empty) {
        return null;
      }
      
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      return {
        id: doc.id,
        ...data,
        lastUsed: data.lastUsed.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        improvements: data.improvements?.map((imp: any) => ({
          ...imp,
          timestamp: imp.timestamp.toDate(),
        })) || [],
      } as Procedure;
    } catch (error) {
      console.error('[ProceduralMemory] Error finding procedure:', error);
      return null;
    }
  }
  
  /**
   * Retrieve procedures matching query
   */
  async retrieveProcedures(query: ProcedureQuery): Promise<Procedure[]> {
    try {
      let firestoreQuery = db.collection(this.collectionName).orderBy('successRate', 'desc');
      
      if (query.domain) {
        firestoreQuery = firestoreQuery.where('domain', '==', query.domain) as any;
      }
      
      if (query.userId !== undefined) {
        firestoreQuery = firestoreQuery.where('userId', '==', query.userId) as any;
      }
      
      if (query.minSuccessRate) {
        firestoreQuery = firestoreQuery.where('successRate', '>=', query.minSuccessRate) as any;
      }
      
      if (query.limit) {
        firestoreQuery = firestoreQuery.limit(query.limit) as any;
      }
      
      const snapshot = await firestoreQuery.get();
      
      const procedures: Procedure[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        procedures.push({
          id: doc.id,
          ...data,
          lastUsed: data.lastUsed.toDate(),
          createdAt: data.createdAt.toDate(),
          updatedAt: data.updatedAt.toDate(),
          improvements: data.improvements?.map((imp: any) => ({
            ...imp,
            timestamp: imp.timestamp.toDate(),
          })) || [],
        } as Procedure);
      });
      
      console.log(`[ProceduralMemory] Retrieved ${procedures.length} procedures`);
      return procedures;
    } catch (error) {
      console.error('[ProceduralMemory] Error retrieving procedures:', error);
      return [];
    }
  }
  
  /**
   * Find best procedure for given context
   */
  async findBestProcedure(
    triggers: string[],
    domain: string,
    userId?: string
  ): Promise<Procedure | null> {
    try {
      // Get all procedures for domain
      const procedures = await this.retrieveProcedures({
        domain,
        userId,
        minSuccessRate: 0.5,
      });
      
      if (procedures.length === 0) {
        return null;
      }
      
      // Score procedures by relevance
      const scoredProcedures = procedures.map(procedure => {
        let score = 0;
        
        // Match triggers: +10 points per match
        const matchingTriggers = procedure.triggers.filter(t => 
          triggers.some(trigger => trigger.toLowerCase().includes(t.toLowerCase()))
        );
        score += matchingTriggers.length * 10;
        
        // Success rate: +50 points max
        score += procedure.successRate * 50;
        
        // Usage frequency: +20 points max
        score += Math.min(20, procedure.timesUsed / 5);
        
        // Recency: +10 points if used in last 7 days
        const daysAgo = (Date.now() - procedure.lastUsed.getTime()) / (1000 * 60 * 60 * 24);
        if (daysAgo < 7) {
          score += 10;
        }
        
        return { procedure, score };
      });
      
      // Sort by score and return best
      scoredProcedures.sort((a, b) => b.score - a.score);
      
      return scoredProcedures.length > 0 ? scoredProcedures[0].procedure : null;
    } catch (error) {
      console.error('[ProceduralMemory] Error finding best procedure:', error);
      return null;
    }
  }
  
  /**
   * Update procedure metrics after execution
   */
  async updateProcedureMetrics(
    procedureId: string,
    success: boolean,
    executionTime: number,
    errors?: string[]
  ): Promise<void> {
    try {
      const docRef = db.collection(this.collectionName).doc(procedureId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.warn(`[ProceduralMemory] Procedure ${procedureId} not found`);
        return;
      }
      
      const data = doc.data()!;
      const currentSuccessRate = data.successRate || 1.0;
      const currentTimesUsed = data.timesUsed || 0;
      const currentAvgTime = data.averageTime || 0;
      
      // Calculate new success rate (weighted average)
      const newSuccessRate = (currentSuccessRate * currentTimesUsed + (success ? 1 : 0)) / (currentTimesUsed + 1);
      
      // Calculate new average time
      const newAvgTime = (currentAvgTime * currentTimesUsed + executionTime) / (currentTimesUsed + 1);
      
      // Update common errors if any
      const commonErrors = data.commonErrors || [];
      if (errors && errors.length > 0) {
        errors.forEach(error => {
          const existing = commonErrors.find((e: any) => e.error === error);
          if (existing) {
            existing.frequency += 1;
          } else {
            commonErrors.push({
              error,
              frequency: 1,
              fix: 'To be determined',
            });
          }
        });
      }
      
      await docRef.update({
        timesUsed: currentTimesUsed + 1,
        successRate: newSuccessRate,
        averageTime: newAvgTime,
        commonErrors,
        lastUsed: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      
      console.log(`[ProceduralMemory] Updated metrics for procedure ${procedureId}`);
    } catch (error) {
      console.error('[ProceduralMemory] Error updating procedure metrics:', error);
    }
  }
  
  /**
   * Add improvement to procedure
   */
  async addImprovement(
    procedureId: string,
    change: string,
    reason: string,
    impact: string
  ): Promise<void> {
    try {
      const docRef = db.collection(this.collectionName).doc(procedureId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        console.warn(`[ProceduralMemory] Procedure ${procedureId} not found`);
        return;
      }
      
      const data = doc.data()!;
      const improvements = data.improvements || [];
      
      improvements.push({
        timestamp: Timestamp.now(),
        change,
        reason,
        impact,
      });
      
      await docRef.update({
        improvements,
        updatedAt: Timestamp.now(),
      });
      
      console.log(`[ProceduralMemory] Added improvement to procedure ${procedureId}`);
    } catch (error) {
      console.error('[ProceduralMemory] Error adding improvement:', error);
    }
  }
  
  /**
   * Get procedure execution history
   */
  async getProcedureHistory(procedureId: string): Promise<{
    totalExecutions: number;
    successRate: number;
    averageTime: number;
    improvements: number;
    commonErrors: Array<{ error: string; frequency: number }>;
  }> {
    try {
      const doc = await db.collection(this.collectionName).doc(procedureId).get();
      
      if (!doc.exists) {
        return {
          totalExecutions: 0,
          successRate: 0,
          averageTime: 0,
          improvements: 0,
          commonErrors: [],
        };
      }
      
      const data = doc.data()!;
      
      return {
        totalExecutions: data.timesUsed || 0,
        successRate: data.successRate || 0,
        averageTime: data.averageTime || 0,
        improvements: (data.improvements || []).length,
        commonErrors: (data.commonErrors || [])
          .sort((a: any, b: any) => b.frequency - a.frequency)
          .slice(0, 5),
      };
    } catch (error) {
      console.error('[ProceduralMemory] Error getting procedure history:', error);
      return {
        totalExecutions: 0,
        successRate: 0,
        averageTime: 0,
        improvements: 0,
        commonErrors: [],
      };
    }
  }
}

// Export singleton instance
export const proceduralMemory = new ProceduralMemorySystem();
