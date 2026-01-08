/**
 * Continuous Learning System for Mervin AI
 * 
 * Enables Mervin to learn and improve continuously from every interaction.
 * This system:
 * - Discovers new patterns automatically
 * - Optimizes existing strategies
 * - Learns from collective user behavior
 * - Adapts to changing user preferences
 * - Improves decision-making over time
 */

import { episodicMemory, Episode } from '../memory/EpisodicMemory';
import { semanticMemory } from '../memory/SemanticMemory';
import { proceduralMemory } from '../memory/ProceduralMemory';
import { selfEvaluation } from './SelfEvaluationSystem';
import { knowledgeGraph } from './KnowledgeGraph';

export interface LearningInsight {
  type: 'pattern' | 'optimization' | 'preference' | 'rule';
  description: string;
  confidence: number;
  evidence: string[];
  actionable: boolean;
  suggestedAction?: string;
}

export interface OptimizationResult {
  area: string;
  currentPerformance: number;
  potentialImprovement: number;
  recommendations: string[];
}

export class ContinuousLearningSystem {
  /**
   * Learn from a completed interaction
   */
  async learnFromInteraction(
    userId: string,
    episode: Omit<Episode, 'id'>
  ): Promise<LearningInsight[]> {
    try {
      const insights: LearningInsight[] = [];
      
      // Store episode in memory
      await episodicMemory.storeEpisode(episode);
      
      // Evaluate performance
      const evaluation = await selfEvaluation.evaluateInteraction(
        userId,
        episode.context.userMessage,
        episode.context.mervinResponse,
        episode.action.type,
        episode.action.parameters,
        episode.outcome,
        episode.outcome.userSatisfaction ? {
          rating: episode.outcome.userSatisfaction * 5,
        } : undefined
      );
      
      // Learn from successful interactions
      if (episode.outcome.success && evaluation.overall > 0.8) {
        // Extract what worked well
        const successPatterns = evaluation.insights.whatWorkedWell;
        
        for (const pattern of successPatterns) {
          // Store as a concept
          await semanticMemory.storeConcept({
            name: `success_pattern_${episode.action.type}`,
            type: 'pattern',
            definition: pattern,
            examples: [episode.context.userMessage],
            relatedConcepts: [],
            confidence: evaluation.overall,
            domain: 'construction',
            userId,
          });
          
          insights.push({
            type: 'pattern',
            description: `Learned successful pattern: ${pattern}`,
            confidence: evaluation.overall,
            evidence: [episode.context.userMessage],
            actionable: true,
            suggestedAction: 'Apply this pattern in similar situations',
          });
        }
      }
      
      // Learn from failures
      if (!episode.outcome.success || evaluation.overall < 0.5) {
        const failurePatterns = evaluation.insights.whatNeedsImprovement;
        
        for (const pattern of failurePatterns) {
          insights.push({
            type: 'pattern',
            description: `Identified failure pattern: ${pattern}`,
            confidence: 1.0 - evaluation.overall,
            evidence: episode.outcome.errors || [],
            actionable: true,
            suggestedAction: evaluation.insights.suggestedActions[0] || 'Review and improve',
          });
        }
      }
      
      // Learn user preferences
      if (episode.outcome.success) {
        // Extract preference from successful interaction
        const preference = this.extractPreference(episode);
        if (preference) {
          await semanticMemory.storePreference(
            userId,
            preference.name,
            preference.definition,
            [episode.context.userMessage]
          );
          
          insights.push({
            type: 'preference',
            description: `Learned user preference: ${preference.name}`,
            confidence: 0.8,
            evidence: [episode.context.userMessage],
            actionable: true,
            suggestedAction: 'Remember this preference for future interactions',
          });
        }
      }
      
      // Update procedural memory
      await this.updateProcedure(episode);
      
      console.log(`[ContinuousLearning] Generated ${insights.length} insights from interaction`);
      
      return insights;
    } catch (error) {
      console.error('[ContinuousLearning] Error learning from interaction:', error);
      return [];
    }
  }
  
  /**
   * Extract user preference from successful interaction
   */
  private extractPreference(episode: Episode): { name: string; definition: string } | null {
    // Extract preferences from parameters
    const params = episode.action.parameters;
    
    // Template preference
    if (params.templateId) {
      return {
        name: `preferred_template_${episode.action.type}`,
        definition: `User prefers ${params.templateId} template for ${episode.action.type}`,
      };
    }
    
    // Material preference
    if (params.material) {
      return {
        name: 'preferred_material',
        definition: `User prefers ${params.material} material`,
      };
    }
    
    // Communication style preference
    const message = episode.context.userMessage.toLowerCase();
    if (message.length < 20) {
      return {
        name: 'communication_style',
        definition: 'User prefers concise communication',
      };
    } else if (message.length > 100) {
      return {
        name: 'communication_style',
        definition: 'User prefers detailed communication',
      };
    }
    
    return null;
  }
  
  /**
   * Update procedural memory with new execution data
   */
  private async updateProcedure(episode: Episode): Promise<void> {
    try {
      // Find or create procedure for this action type
      let procedure = await proceduralMemory.findProcedureByName(episode.action.type);
      
      if (!procedure) {
        // Create new procedure
        await proceduralMemory.storeProcedure({
          name: episode.action.type,
          description: `Procedure for ${episode.action.type}`,
          steps: episode.action.toolsUsed.map((tool, index) => ({
            order: index + 1,
            action: tool,
            expectedOutcome: 'Success',
          })),
          triggers: [episode.context.intent],
          prerequisites: [],
          successRate: episode.outcome.success ? 1.0 : 0.0,
          averageTime: episode.outcome.completionTime,
          timesUsed: 1,
          lastUsed: episode.timestamp,
          improvements: [],
          commonErrors: episode.outcome.errors?.map(error => ({
            error,
            frequency: 1,
            fix: 'To be determined',
          })) || [],
          domain: 'construction',
        });
      } else {
        // Update existing procedure
        await proceduralMemory.updateProcedureMetrics(
          procedure.id,
          episode.outcome.success,
          episode.outcome.completionTime,
          episode.outcome.errors
        );
      }
    } catch (error) {
      console.error('[ContinuousLearning] Error updating procedure:', error);
    }
  }
  
  /**
   * Discover new patterns from recent interactions
   */
  async discoverPatterns(userId: string, minOccurrences: number = 3): Promise<LearningInsight[]> {
    try {
      const insights: LearningInsight[] = [];
      
      // Get recent episodes
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      const episodes = await episodicMemory.retrieveEpisodes({
        userId,
        since,
        limit: 100,
      });
      
      if (episodes.length < minOccurrences) {
        return [];
      }
      
      // Pattern 1: Frequent action sequences
      const sequences = new Map<string, number>();
      episodes.forEach(episode => {
        const sequence = episode.action.toolsUsed.join(' -> ');
        sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
      });
      
      sequences.forEach((count, sequence) => {
        if (count >= minOccurrences) {
          insights.push({
            type: 'pattern',
            description: `Frequent action sequence: ${sequence}`,
            confidence: Math.min(1.0, count / 10),
            evidence: [`Occurred ${count} times`],
            actionable: true,
            suggestedAction: 'Create optimized workflow for this sequence',
          });
        }
      });
      
      // Pattern 2: Time-based patterns
      const hourCounts = new Map<number, number>();
      episodes.forEach(episode => {
        const hour = episode.timestamp.getHours();
        hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
      });
      
      const peakHour = Array.from(hourCounts.entries())
        .sort((a, b) => b[1] - a[1])[0];
      
      if (peakHour && peakHour[1] >= minOccurrences) {
        insights.push({
          type: 'pattern',
          description: `Peak usage hour: ${peakHour[0]}:00`,
          confidence: 0.8,
          evidence: [`${peakHour[1]} interactions during this hour`],
          actionable: false,
        });
      }
      
      // Pattern 3: Entity co-occurrence patterns
      const coOccurrences = new Map<string, Map<string, number>>();
      episodes.forEach(episode => {
        const entities = Object.values(episode.context.entities || {});
        for (let i = 0; i < entities.length; i++) {
          for (let j = i + 1; j < entities.length; j++) {
            const entity1 = String(entities[i]);
            const entity2 = String(entities[j]);
            
            if (!coOccurrences.has(entity1)) {
              coOccurrences.set(entity1, new Map());
            }
            const map = coOccurrences.get(entity1)!;
            map.set(entity2, (map.get(entity2) || 0) + 1);
          }
        }
      });
      
      coOccurrences.forEach((targets, source) => {
        targets.forEach((count, target) => {
          if (count >= minOccurrences) {
            insights.push({
              type: 'pattern',
              description: `${source} often appears with ${target}`,
              confidence: Math.min(1.0, count / 10),
              evidence: [`Co-occurred ${count} times`],
              actionable: true,
              suggestedAction: `When user mentions ${source}, proactively ask about ${target}`,
            });
          }
        });
      });
      
      console.log(`[ContinuousLearning] Discovered ${insights.length} patterns`);
      
      return insights;
    } catch (error) {
      console.error('[ContinuousLearning] Error discovering patterns:', error);
      return [];
    }
  }
  
  /**
   * Optimize existing strategies
   */
  async optimizeStrategies(userId: string): Promise<OptimizationResult[]> {
    try {
      const optimizations: OptimizationResult[] = [];
      
      // Get user's procedures
      const procedures = await proceduralMemory.retrieveProcedures({
        userId,
        minSuccessRate: 0.5,
      });
      
      for (const procedure of procedures) {
        const history = await proceduralMemory.getProcedureHistory(procedure.id);
        
        // Identify optimization opportunities
        if (history.successRate < 0.8 && history.totalExecutions > 5) {
          optimizations.push({
            area: procedure.name,
            currentPerformance: history.successRate,
            potentialImprovement: 0.8 - history.successRate,
            recommendations: [
              'Review common errors and implement fixes',
              'Compare with successful similar procedures',
              'Add validation steps to prevent failures',
            ],
          });
        }
        
        if (history.averageTime > 10000 && history.totalExecutions > 5) {
          // Slow procedure
          optimizations.push({
            area: procedure.name,
            currentPerformance: 1.0 - (history.averageTime / 20000),
            potentialImprovement: 0.3,
            recommendations: [
              'Identify and remove unnecessary steps',
              'Parallelize independent operations',
              'Cache frequently accessed data',
            ],
          });
        }
      }
      
      console.log(`[ContinuousLearning] Identified ${optimizations.length} optimization opportunities`);
      
      return optimizations;
    } catch (error) {
      console.error('[ContinuousLearning] Error optimizing strategies:', error);
      return [];
    }
  }
  
  /**
   * Learn from collective user behavior (all users)
   */
  async learnFromCollective(): Promise<LearningInsight[]> {
    try {
      const insights: LearningInsight[] = [];
      
      // Get recent episodes from all users
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const episodes = await episodicMemory.retrieveEpisodes({
        since,
        limit: 500,
      });
      
      if (episodes.length < 10) {
        return [];
      }
      
      // Identify globally successful patterns
      const successfulEpisodes = episodes.filter(e => e.outcome.success && (e.outcome.userSatisfaction || 0) > 0.8);
      
      // Count action types
      const actionCounts = new Map<string, number>();
      successfulEpisodes.forEach(episode => {
        actionCounts.set(episode.action.type, (actionCounts.get(episode.action.type) || 0) + 1);
      });
      
      // Identify most successful action types
      const topActions = Array.from(actionCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      topActions.forEach(([action, count]) => {
        insights.push({
          type: 'pattern',
          description: `${action} is highly successful across all users`,
          confidence: Math.min(1.0, count / 50),
          evidence: [`${count} successful executions`],
          actionable: true,
          suggestedAction: `Prioritize ${action} when applicable`,
        });
      });
      
      // Identify common failure patterns
      const failedEpisodes = episodes.filter(e => !e.outcome.success);
      const errorCounts = new Map<string, number>();
      
      failedEpisodes.forEach(episode => {
        episode.outcome.errors?.forEach(error => {
          errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });
      });
      
      const topErrors = Array.from(errorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      
      topErrors.forEach(([error, count]) => {
        insights.push({
          type: 'rule',
          description: `Common error across users: ${error}`,
          confidence: Math.min(1.0, count / 20),
          evidence: [`Occurred ${count} times`],
          actionable: true,
          suggestedAction: 'Implement system-wide validation to prevent this error',
        });
      });
      
      console.log(`[ContinuousLearning] Generated ${insights.length} collective insights`);
      
      return insights;
    } catch (error) {
      console.error('[ContinuousLearning] Error learning from collective:', error);
      return [];
    }
  }
  
  /**
   * Adapt to changing user preferences
   */
  async adaptToChanges(userId: string): Promise<LearningInsight[]> {
    try {
      const insights: LearningInsight[] = [];
      
      // Get user's preferences
      const preferences = await semanticMemory.getUserPreferences(userId);
      
      // Get recent episodes
      const recentEpisodes = await episodicMemory.retrieveEpisodes({
        userId,
        limit: 20,
      });
      
      // Check if recent behavior matches stored preferences
      for (const preference of preferences) {
        const matchingEpisodes = recentEpisodes.filter(episode => {
          // Check if episode aligns with preference
          const message = episode.context.userMessage.toLowerCase();
          const prefName = preference.name.toLowerCase();
          
          return message.includes(prefName) || prefName.includes(message);
        });
        
        if (matchingEpisodes.length === 0 && recentEpisodes.length > 10) {
          // Preference no longer being used
          insights.push({
            type: 'preference',
            description: `User preference "${preference.name}" may have changed`,
            confidence: 0.7,
            evidence: ['Not observed in recent interactions'],
            actionable: true,
            suggestedAction: 'Re-evaluate this preference or remove if no longer relevant',
          });
        }
      }
      
      console.log(`[ContinuousLearning] Identified ${insights.length} preference changes`);
      
      return insights;
    } catch (error) {
      console.error('[ContinuousLearning] Error adapting to changes:', error);
      return [];
    }
  }
  
  /**
   * Generate learning report
   */
  async generateLearningReport(userId: string): Promise<{
    period: string;
    patternsDiscovered: number;
    optimizationsIdentified: number;
    preferencesLearned: number;
    overallImprovement: number;
    keyInsights: string[];
  }> {
    try {
      // Discover patterns
      const patterns = await this.discoverPatterns(userId);
      
      // Identify optimizations
      const optimizations = await this.optimizeStrategies(userId);
      
      // Get preferences
      const preferences = await semanticMemory.getUserPreferences(userId);
      
      // Calculate overall improvement
      const performanceReport = await selfEvaluation.generatePerformanceReport(userId, 30);
      const overallImprovement = performanceReport.trend === 'Improving' ? 0.15 : 
                                 performanceReport.trend === 'Declining' ? -0.10 : 0;
      
      // Extract key insights
      const keyInsights: string[] = [];
      
      patterns.slice(0, 3).forEach(pattern => {
        keyInsights.push(pattern.description);
      });
      
      optimizations.slice(0, 2).forEach(opt => {
        keyInsights.push(`Optimization opportunity in ${opt.area}: ${(opt.potentialImprovement * 100).toFixed(0)}% improvement possible`);
      });
      
      return {
        period: 'Last 30 days',
        patternsDiscovered: patterns.length,
        optimizationsIdentified: optimizations.length,
        preferencesLearned: preferences.length,
        overallImprovement,
        keyInsights,
      };
    } catch (error) {
      console.error('[ContinuousLearning] Error generating learning report:', error);
      return {
        period: 'Last 30 days',
        patternsDiscovered: 0,
        optimizationsIdentified: 0,
        preferencesLearned: 0,
        overallImprovement: 0,
        keyInsights: ['Unable to generate report'],
      };
    }
  }
}

// Export singleton instance
export const continuousLearning = new ContinuousLearningSystem();
