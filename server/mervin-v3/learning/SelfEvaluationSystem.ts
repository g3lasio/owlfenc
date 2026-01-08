/**
 * Self-Evaluation System for Mervin AI
 * 
 * Allows Mervin to evaluate its own performance and learn from mistakes.
 * This system:
 * - Scores each interaction automatically
 * - Identifies what went wrong and why
 * - Compares with past successful interactions
 * - Generates improvement suggestions
 * - Learns from patterns of success and failure
 */

import { episodicMemory, Episode } from '../memory/EpisodicMemory';
import { semanticMemory } from '../memory/SemanticMemory';
import { proceduralMemory } from '../memory/ProceduralMemory';

export interface PerformanceScore {
  overall: number; // 0-1 scale
  breakdown: {
    accuracy: number; // Did it do the right thing?
    efficiency: number; // How fast was it?
    userSatisfaction: number; // Did the user like it?
    completeness: number; // Did it finish the task?
  };
  insights: {
    whatWorkedWell: string[];
    whatNeedsImprovement: string[];
    suggestedActions: string[];
  };
}

export interface ComparisonResult {
  currentPerformance: number;
  averagePerformance: number;
  bestPerformance: number;
  worstPerformance: number;
  trend: 'improving' | 'declining' | 'stable';
  insights: string[];
}

export class SelfEvaluationSystem {
  /**
   * Evaluate a completed interaction
   */
  async evaluateInteraction(
    userId: string,
    userMessage: string,
    mervinResponse: string,
    actionType: string,
    actionParameters: Record<string, any>,
    outcome: {
      success: boolean;
      completionTime: number;
      errors?: string[];
    },
    userFeedback?: {
      rating?: number; // 1-5
      comment?: string;
    }
  ): Promise<PerformanceScore> {
    try {
      // Calculate accuracy score
      const accuracy = await this.calculateAccuracy(
        userId,
        actionType,
        actionParameters,
        outcome
      );
      
      // Calculate efficiency score
      const efficiency = await this.calculateEfficiency(
        actionType,
        outcome.completionTime
      );
      
      // Calculate user satisfaction score
      const userSatisfaction = this.calculateUserSatisfaction(
        outcome.success,
        userFeedback
      );
      
      // Calculate completeness score
      const completeness = this.calculateCompleteness(
        outcome.success,
        outcome.errors
      );
      
      // Overall score (weighted average)
      const overall = (
        accuracy * 0.3 +
        efficiency * 0.2 +
        userSatisfaction * 0.4 +
        completeness * 0.1
      );
      
      // Generate insights
      const insights = await this.generateInsights(
        userId,
        actionType,
        {
          accuracy,
          efficiency,
          userSatisfaction,
          completeness,
        },
        outcome
      );
      
      console.log(`[SelfEvaluation] Evaluated interaction: ${overall.toFixed(2)}`);
      
      return {
        overall,
        breakdown: {
          accuracy,
          efficiency,
          userSatisfaction,
          completeness,
        },
        insights,
      };
    } catch (error) {
      console.error('[SelfEvaluation] Error evaluating interaction:', error);
      return {
        overall: 0.5,
        breakdown: {
          accuracy: 0.5,
          efficiency: 0.5,
          userSatisfaction: 0.5,
          completeness: 0.5,
        },
        insights: {
          whatWorkedWell: [],
          whatNeedsImprovement: ['Unable to evaluate - system error'],
          suggestedActions: ['Review system logs'],
        },
      };
    }
  }
  
  /**
   * Calculate accuracy score
   */
  private async calculateAccuracy(
    userId: string,
    actionType: string,
    actionParameters: Record<string, any>,
    outcome: { success: boolean; errors?: string[] }
  ): Promise<number> {
    // Base score on success
    let score = outcome.success ? 0.8 : 0.2;
    
    // Compare with similar past interactions
    const similarEpisodes = await episodicMemory.retrieveEpisodes({
      userId,
      actionType,
      successOnly: true,
      limit: 10,
    });
    
    if (similarEpisodes.length > 0) {
      // Check if parameters match successful patterns
      const parameterMatches = similarEpisodes.filter(episode => {
        const episodeParams = episode.action.parameters;
        let matches = 0;
        let total = 0;
        
        for (const key in actionParameters) {
          total++;
          if (episodeParams[key] === actionParameters[key]) {
            matches++;
          }
        }
        
        return total > 0 ? matches / total > 0.7 : false;
      });
      
      if (parameterMatches.length > 0) {
        score += 0.2; // Bonus for matching successful patterns
      }
    }
    
    // Penalty for errors
    if (outcome.errors && outcome.errors.length > 0) {
      score -= Math.min(0.3, outcome.errors.length * 0.1);
    }
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Calculate efficiency score
   */
  private async calculateEfficiency(
    actionType: string,
    completionTime: number
  ): Promise<number> {
    // Get average time for this action type
    const procedure = await proceduralMemory.findProcedureByName(actionType);
    
    if (!procedure || procedure.averageTime === 0) {
      // No baseline, assume average performance
      return 0.7;
    }
    
    const avgTime = procedure.averageTime;
    
    // Score based on comparison to average
    if (completionTime <= avgTime * 0.7) {
      return 1.0; // Excellent - 30% faster than average
    } else if (completionTime <= avgTime) {
      return 0.9; // Good - faster than average
    } else if (completionTime <= avgTime * 1.3) {
      return 0.7; // Average - within 30% of average
    } else if (completionTime <= avgTime * 1.5) {
      return 0.5; // Below average - 50% slower
    } else {
      return 0.3; // Poor - much slower than average
    }
  }
  
  /**
   * Calculate user satisfaction score
   */
  private calculateUserSatisfaction(
    success: boolean,
    userFeedback?: { rating?: number; comment?: string }
  ): Promise<number> {
    // If explicit feedback provided, use it
    if (userFeedback?.rating) {
      return Promise.resolve(userFeedback.rating / 5); // Convert 1-5 to 0-1
    }
    
    // Otherwise, infer from success and comment
    if (!success) {
      return Promise.resolve(0.3); // Failed task = low satisfaction
    }
    
    if (userFeedback?.comment) {
      const comment = userFeedback.comment.toLowerCase();
      
      // Positive keywords
      const positiveKeywords = ['great', 'perfect', 'excellent', 'thanks', 'good', 'helpful'];
      const hasPositive = positiveKeywords.some(kw => comment.includes(kw));
      
      // Negative keywords
      const negativeKeywords = ['wrong', 'bad', 'error', 'problem', 'issue', 'not what'];
      const hasNegative = negativeKeywords.some(kw => comment.includes(kw));
      
      if (hasPositive && !hasNegative) {
        return Promise.resolve(0.9);
      } else if (hasNegative) {
        return Promise.resolve(0.4);
      }
    }
    
    // Default: successful task = good satisfaction
    return Promise.resolve(0.7);
  }
  
  /**
   * Calculate completeness score
   */
  private calculateCompleteness(
    success: boolean,
    errors?: string[]
  ): number {
    if (!success) {
      return 0.2; // Task not completed
    }
    
    if (errors && errors.length > 0) {
      // Completed but with errors
      return Math.max(0.5, 1.0 - errors.length * 0.1);
    }
    
    return 1.0; // Fully completed without errors
  }
  
  /**
   * Generate insights from evaluation
   */
  private async generateInsights(
    userId: string,
    actionType: string,
    scores: {
      accuracy: number;
      efficiency: number;
      userSatisfaction: number;
      completeness: number;
    },
    outcome: { success: boolean; errors?: string[] }
  ): Promise<{
    whatWorkedWell: string[];
    whatNeedsImprovement: string[];
    suggestedActions: string[];
  }> {
    const whatWorkedWell: string[] = [];
    const whatNeedsImprovement: string[] = [];
    const suggestedActions: string[] = [];
    
    // Analyze accuracy
    if (scores.accuracy >= 0.8) {
      whatWorkedWell.push('Action was accurate and matched successful patterns');
    } else if (scores.accuracy < 0.5) {
      whatNeedsImprovement.push('Action accuracy was low');
      suggestedActions.push('Review similar successful interactions for better approach');
    }
    
    // Analyze efficiency
    if (scores.efficiency >= 0.9) {
      whatWorkedWell.push('Completed faster than average');
    } else if (scores.efficiency < 0.5) {
      whatNeedsImprovement.push('Took longer than expected');
      suggestedActions.push('Optimize workflow steps to reduce completion time');
    }
    
    // Analyze user satisfaction
    if (scores.userSatisfaction >= 0.8) {
      whatWorkedWell.push('User was satisfied with the result');
    } else if (scores.userSatisfaction < 0.5) {
      whatNeedsImprovement.push('User satisfaction was low');
      suggestedActions.push('Ask for more specific feedback to understand user needs better');
    }
    
    // Analyze completeness
    if (scores.completeness === 1.0) {
      whatWorkedWell.push('Task completed without errors');
    } else if (scores.completeness < 0.7) {
      whatNeedsImprovement.push('Task had errors or was incomplete');
      if (outcome.errors && outcome.errors.length > 0) {
        suggestedActions.push(`Address common errors: ${outcome.errors.join(', ')}`);
      }
    }
    
    // Get insights from past episodes
    const pastInsights = await episodicMemory.extractInsights(userId, actionType);
    
    if (pastInsights.successPatterns.length > 0) {
      suggestedActions.push(`Apply successful patterns: ${pastInsights.successPatterns[0]}`);
    }
    
    return {
      whatWorkedWell,
      whatNeedsImprovement,
      suggestedActions,
    };
  }
  
  /**
   * Compare current performance with historical performance
   */
  async compareWithHistory(
    userId: string,
    actionType: string,
    currentScore: number
  ): Promise<ComparisonResult> {
    try {
      // Get recent episodes
      const recentEpisodes = await episodicMemory.retrieveEpisodes({
        userId,
        actionType,
        limit: 20,
      });
      
      if (recentEpisodes.length < 3) {
        return {
          currentPerformance: currentScore,
          averagePerformance: currentScore,
          bestPerformance: currentScore,
          worstPerformance: currentScore,
          trend: 'stable',
          insights: ['Not enough historical data for comparison'],
        };
      }
      
      // Calculate metrics
      const scores = recentEpisodes.map(e => e.outcome.userSatisfaction || 0.5);
      const averagePerformance = scores.reduce((a, b) => a + b, 0) / scores.length;
      const bestPerformance = Math.max(...scores);
      const worstPerformance = Math.min(...scores);
      
      // Determine trend (last 5 vs previous 5)
      const recent5 = scores.slice(0, 5);
      const previous5 = scores.slice(5, 10);
      
      let trend: 'improving' | 'declining' | 'stable' = 'stable';
      if (previous5.length >= 3) {
        const recentAvg = recent5.reduce((a, b) => a + b, 0) / recent5.length;
        const previousAvg = previous5.reduce((a, b) => a + b, 0) / previous5.length;
        
        if (recentAvg > previousAvg + 0.1) {
          trend = 'improving';
        } else if (recentAvg < previousAvg - 0.1) {
          trend = 'declining';
        }
      }
      
      // Generate insights
      const insights: string[] = [];
      
      if (currentScore > averagePerformance) {
        insights.push('Current performance is above average');
      } else if (currentScore < averagePerformance - 0.2) {
        insights.push('Current performance is below average - review what went wrong');
      }
      
      if (trend === 'improving') {
        insights.push('Performance is improving over time - keep up the good work');
      } else if (trend === 'declining') {
        insights.push('Performance is declining - identify and address issues');
      }
      
      if (currentScore === bestPerformance) {
        insights.push('This is your best performance yet!');
      }
      
      return {
        currentPerformance: currentScore,
        averagePerformance,
        bestPerformance,
        worstPerformance,
        trend,
        insights,
      };
    } catch (error) {
      console.error('[SelfEvaluation] Error comparing with history:', error);
      return {
        currentPerformance: currentScore,
        averagePerformance: currentScore,
        bestPerformance: currentScore,
        worstPerformance: currentScore,
        trend: 'stable',
        insights: ['Unable to compare with history'],
      };
    }
  }
  
  /**
   * Identify patterns of failure
   */
  async identifyFailurePatterns(
    userId: string,
    actionType: string
  ): Promise<Array<{
    pattern: string;
    frequency: number;
    suggestedFix: string;
  }>> {
    try {
      // Get failed episodes
      const failedEpisodes = await episodicMemory.retrieveEpisodes({
        userId,
        actionType,
        limit: 50,
      });
      
      const failures = failedEpisodes.filter(e => !e.outcome.success);
      
      if (failures.length === 0) {
        return [];
      }
      
      // Count error patterns
      const errorCounts = new Map<string, number>();
      failures.forEach(episode => {
        episode.outcome.errors?.forEach(error => {
          errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });
      });
      
      // Convert to array and sort by frequency
      const patterns = Array.from(errorCounts.entries())
        .map(([pattern, frequency]) => ({
          pattern,
          frequency,
          suggestedFix: this.suggestFix(pattern),
        }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);
      
      return patterns;
    } catch (error) {
      console.error('[SelfEvaluation] Error identifying failure patterns:', error);
      return [];
    }
  }
  
  /**
   * Suggest fix for common error
   */
  private suggestFix(errorPattern: string): string {
    const fixes: Record<string, string> = {
      'missing_client_email': 'Ask for client email before proceeding',
      'invalid_parameters': 'Validate parameters before executing action',
      'timeout': 'Optimize query or increase timeout limit',
      'not_found': 'Verify entity exists before attempting action',
      'permission_denied': 'Check user permissions before action',
    };
    
    for (const [key, fix] of Object.entries(fixes)) {
      if (errorPattern.toLowerCase().includes(key)) {
        return fix;
      }
    }
    
    return 'Review logs and identify root cause';
  }
  
  /**
   * Generate performance report
   */
  async generatePerformanceReport(
    userId: string,
    days: number = 7
  ): Promise<{
    period: string;
    totalInteractions: number;
    averageScore: number;
    trend: string;
    topSuccesses: string[];
    topFailures: string[];
    recommendations: string[];
  }> {
    try {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const episodes = await episodicMemory.retrieveEpisodes({ userId, since });
      
      if (episodes.length === 0) {
        return {
          period: `Last ${days} days`,
          totalInteractions: 0,
          averageScore: 0,
          trend: 'No data',
          topSuccesses: [],
          topFailures: [],
          recommendations: ['Not enough data to generate report'],
        };
      }
      
      // Calculate average score
      const scores = episodes.map(e => e.outcome.userSatisfaction || 0.5);
      const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      
      // Determine trend
      const firstHalf = scores.slice(0, Math.floor(scores.length / 2));
      const secondHalf = scores.slice(Math.floor(scores.length / 2));
      
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      let trend = 'Stable';
      if (secondAvg > firstAvg + 0.1) {
        trend = 'Improving';
      } else if (secondAvg < firstAvg - 0.1) {
        trend = 'Declining';
      }
      
      // Top successes
      const successes = episodes
        .filter(e => e.outcome.success && (e.outcome.userSatisfaction || 0) > 0.8)
        .slice(0, 3);
      const topSuccesses = successes.map(e => 
        `${e.action.type}: ${e.insights.whatWorked[0] || 'Successful execution'}`
      );
      
      // Top failures
      const failures = episodes
        .filter(e => !e.outcome.success)
        .slice(0, 3);
      const topFailures = failures.map(e => 
        `${e.action.type}: ${e.outcome.errors?.[0] || 'Unknown error'}`
      );
      
      // Recommendations
      const recommendations: string[] = [];
      
      if (averageScore < 0.6) {
        recommendations.push('Overall performance needs improvement - review failed interactions');
      } else if (averageScore > 0.8) {
        recommendations.push('Excellent performance - maintain current approach');
      }
      
      if (trend === 'Declining') {
        recommendations.push('Performance is declining - identify and address root causes');
      } else if (trend === 'Improving') {
        recommendations.push('Performance is improving - continue learning from successes');
      }
      
      if (topFailures.length > 0) {
        recommendations.push(`Address common failures: ${topFailures[0]}`);
      }
      
      return {
        period: `Last ${days} days`,
        totalInteractions: episodes.length,
        averageScore,
        trend,
        topSuccesses,
        topFailures,
        recommendations,
      };
    } catch (error) {
      console.error('[SelfEvaluation] Error generating performance report:', error);
      return {
        period: `Last ${days} days`,
        totalInteractions: 0,
        averageScore: 0,
        trend: 'Error',
        topSuccesses: [],
        topFailures: [],
        recommendations: ['Unable to generate report'],
      };
    }
  }
}

// Export singleton instance
export const selfEvaluation = new SelfEvaluationSystem();
