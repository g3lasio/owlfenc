/**
 * Episodic Memory System for Mervin AI
 * 
 * Stores and retrieves specific interaction episodes, allowing Mervin to:
 * - Remember past conversations with users
 * - Recall previous projects and their outcomes
 * - Learn from successful and failed interactions
 * - Provide contextual responses based on history
 */

import { db } from '../../lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

export interface Episode {
  id: string;
  userId: string;
  timestamp: Date;
  
  // Context of the interaction
  context: {
    userMessage: string;
    mervinResponse: string;
    intent: string;
    entities: Record<string, any>;
    pageContext?: string; // Where the user was in the app
  };
  
  // Action taken
  action: {
    type: string; // 'create_estimate', 'create_contract', 'search_client', etc.
    parameters: Record<string, any>;
    toolsUsed: string[];
  };
  
  // Outcome
  outcome: {
    success: boolean;
    userSatisfaction?: number; // 0-1 scale
    completionTime: number; // milliseconds
    errors?: string[];
  };
  
  // Learning
  insights: {
    whatWorked: string[];
    whatFailed: string[];
    improvements: string[];
  };
  
  // Metadata
  metadata: {
    conversationId: string;
    sessionId: string;
    agentVersion: string;
  };
}

export interface EpisodeQuery {
  userId?: string;
  intent?: string;
  actionType?: string;
  successOnly?: boolean;
  limit?: number;
  since?: Date;
}

export class EpisodicMemorySystem {
  private collectionName = 'mervin_episodic_memory';
  
  /**
   * Store a new episode in memory
   */
  async storeEpisode(episode: Omit<Episode, 'id'>): Promise<string> {
    try {
      const docRef = await db.collection(this.collectionName).add({
        ...episode,
        timestamp: Timestamp.fromDate(episode.timestamp),
        createdAt: Timestamp.now(),
      });
      
      console.log(`[EpisodicMemory] Stored episode: ${docRef.id}`);
      return docRef.id;
    } catch (error) {
      console.error('[EpisodicMemory] Error storing episode:', error);
      throw error;
    }
  }
  
  /**
   * Retrieve episodes matching query criteria
   */
  async retrieveEpisodes(query: EpisodeQuery): Promise<Episode[]> {
    try {
      let firestoreQuery = db.collection(this.collectionName).orderBy('timestamp', 'desc');
      
      // Apply filters
      if (query.userId) {
        firestoreQuery = firestoreQuery.where('userId', '==', query.userId) as any;
      }
      
      if (query.intent) {
        firestoreQuery = firestoreQuery.where('context.intent', '==', query.intent) as any;
      }
      
      if (query.actionType) {
        firestoreQuery = firestoreQuery.where('action.type', '==', query.actionType) as any;
      }
      
      if (query.successOnly) {
        firestoreQuery = firestoreQuery.where('outcome.success', '==', true) as any;
      }
      
      if (query.since) {
        firestoreQuery = firestoreQuery.where('timestamp', '>=', Timestamp.fromDate(query.since)) as any;
      }
      
      // Apply limit
      if (query.limit) {
        firestoreQuery = firestoreQuery.limit(query.limit) as any;
      }
      
      const snapshot = await firestoreQuery.get();
      
      const episodes: Episode[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        episodes.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp.toDate(),
        } as Episode);
      });
      
      console.log(`[EpisodicMemory] Retrieved ${episodes.length} episodes`);
      return episodes;
    } catch (error) {
      console.error('[EpisodicMemory] Error retrieving episodes:', error);
      return [];
    }
  }
  
  /**
   * Find similar past episodes based on current context
   */
  async findSimilarEpisodes(
    userId: string,
    currentIntent: string,
    currentEntities: Record<string, any>,
    limit: number = 5
  ): Promise<Episode[]> {
    try {
      // Get recent successful episodes with same intent
      const episodes = await this.retrieveEpisodes({
        userId,
        intent: currentIntent,
        successOnly: true,
        limit: limit * 2, // Get more to filter
      });
      
      // Score episodes by similarity
      const scoredEpisodes = episodes.map(episode => {
        let score = 0;
        
        // Same intent: +10 points
        if (episode.context.intent === currentIntent) {
          score += 10;
        }
        
        // Similar entities: +5 points per match
        const episodeEntities = episode.context.entities || {};
        for (const [key, value] of Object.entries(currentEntities)) {
          if (episodeEntities[key] === value) {
            score += 5;
          }
        }
        
        // Recent episode: +1 point per day recency (max 30)
        const daysAgo = Math.floor(
          (Date.now() - episode.timestamp.getTime()) / (1000 * 60 * 60 * 24)
        );
        score += Math.max(0, 30 - daysAgo);
        
        // High satisfaction: +20 points
        if (episode.outcome.userSatisfaction && episode.outcome.userSatisfaction > 0.8) {
          score += 20;
        }
        
        return { episode, score };
      });
      
      // Sort by score and return top N
      scoredEpisodes.sort((a, b) => b.score - a.score);
      return scoredEpisodes.slice(0, limit).map(s => s.episode);
    } catch (error) {
      console.error('[EpisodicMemory] Error finding similar episodes:', error);
      return [];
    }
  }
  
  /**
   * Get user's interaction history summary
   */
  async getUserHistorySummary(userId: string, days: number = 30): Promise<{
    totalInteractions: number;
    successRate: number;
    averageSatisfaction: number;
    commonIntents: Array<{ intent: string; count: number }>;
    commonActions: Array<{ action: string; count: number }>;
    recentProjects: Array<{ type: string; timestamp: Date; success: boolean }>;
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const episodes = await this.retrieveEpisodes({ userId, since });
      
      if (episodes.length === 0) {
        return {
          totalInteractions: 0,
          successRate: 0,
          averageSatisfaction: 0,
          commonIntents: [],
          commonActions: [],
          recentProjects: [],
        };
      }
      
      // Calculate metrics
      const successCount = episodes.filter(e => e.outcome.success).length;
      const successRate = successCount / episodes.length;
      
      const satisfactionScores = episodes
        .filter(e => e.outcome.userSatisfaction !== undefined)
        .map(e => e.outcome.userSatisfaction!);
      const averageSatisfaction = satisfactionScores.length > 0
        ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
        : 0;
      
      // Count intents
      const intentCounts = new Map<string, number>();
      episodes.forEach(e => {
        const count = intentCounts.get(e.context.intent) || 0;
        intentCounts.set(e.context.intent, count + 1);
      });
      const commonIntents = Array.from(intentCounts.entries())
        .map(([intent, count]) => ({ intent, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Count actions
      const actionCounts = new Map<string, number>();
      episodes.forEach(e => {
        const count = actionCounts.get(e.action.type) || 0;
        actionCounts.set(e.action.type, count + 1);
      });
      const commonActions = Array.from(actionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Recent projects
      const recentProjects = episodes
        .filter(e => ['create_estimate', 'create_contract', 'create_permit'].includes(e.action.type))
        .slice(0, 10)
        .map(e => ({
          type: e.action.type,
          timestamp: e.timestamp,
          success: e.outcome.success,
        }));
      
      return {
        totalInteractions: episodes.length,
        successRate,
        averageSatisfaction,
        commonIntents,
        commonActions,
        recentProjects,
      };
    } catch (error) {
      console.error('[EpisodicMemory] Error getting user history summary:', error);
      return {
        totalInteractions: 0,
        successRate: 0,
        averageSatisfaction: 0,
        commonIntents: [],
        commonActions: [],
        recentProjects: [],
      };
    }
  }
  
  /**
   * Learn from past episodes - extract insights
   */
  async extractInsights(userId: string, actionType: string): Promise<{
    successPatterns: string[];
    failurePatterns: string[];
    recommendations: string[];
  }> {
    try {
      const episodes = await this.retrieveEpisodes({
        userId,
        actionType,
        limit: 50,
      });
      
      if (episodes.length < 5) {
        return {
          successPatterns: [],
          failurePatterns: [],
          recommendations: ['Not enough data yet to extract insights'],
        };
      }
      
      const successfulEpisodes = episodes.filter(e => e.outcome.success);
      const failedEpisodes = episodes.filter(e => !e.outcome.success);
      
      // Extract success patterns
      const successPatterns: string[] = [];
      successfulEpisodes.forEach(e => {
        successPatterns.push(...e.insights.whatWorked);
      });
      
      // Extract failure patterns
      const failurePatterns: string[] = [];
      failedEpisodes.forEach(e => {
        failurePatterns.push(...e.insights.whatFailed);
      });
      
      // Generate recommendations
      const recommendations: string[] = [];
      
      if (successfulEpisodes.length > failedEpisodes.length * 2) {
        recommendations.push('User responds well to this type of action - continue current approach');
      }
      
      if (failedEpisodes.length > successfulEpisodes.length) {
        recommendations.push('High failure rate - consider alternative approaches');
      }
      
      const avgSuccessTime = successfulEpisodes.reduce((sum, e) => sum + e.outcome.completionTime, 0) / successfulEpisodes.length;
      const avgFailTime = failedEpisodes.reduce((sum, e) => sum + e.outcome.completionTime, 0) / (failedEpisodes.length || 1);
      
      if (avgSuccessTime < avgFailTime * 0.7) {
        recommendations.push('Successful interactions are faster - optimize for speed');
      }
      
      return {
        successPatterns: [...new Set(successPatterns)].slice(0, 5),
        failurePatterns: [...new Set(failurePatterns)].slice(0, 5),
        recommendations,
      };
    } catch (error) {
      console.error('[EpisodicMemory] Error extracting insights:', error);
      return {
        successPatterns: [],
        failurePatterns: [],
        recommendations: [],
      };
    }
  }
  
  /**
   * Clean up old episodes (data retention)
   */
  async cleanupOldEpisodes(daysToKeep: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);
      
      const snapshot = await db.collection(this.collectionName)
        .where('timestamp', '<', Timestamp.fromDate(cutoffDate))
        .get();
      
      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      
      console.log(`[EpisodicMemory] Cleaned up ${snapshot.size} old episodes`);
      return snapshot.size;
    } catch (error) {
      console.error('[EpisodicMemory] Error cleaning up old episodes:', error);
      return 0;
    }
  }
}

// Export singleton instance
export const episodicMemory = new EpisodicMemorySystem();
