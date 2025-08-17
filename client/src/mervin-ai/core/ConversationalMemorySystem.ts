/**
 * CONVERSATIONAL MEMORY SYSTEM - SISTEMA DE MEMORIA CONVERSACIONAL AVANZADO
 * 
 * Sistema que mantiene memoria persistente entre conversaciones para crear
 * una experiencia conversacional más rica y personalizada que evoluciona
 * con el tiempo y uso.
 */

export interface UserPersonalityProfile {
  communication_style: 'direct' | 'detailed' | 'casual' | 'professional';
  expertise_level: 'novice' | 'intermediate' | 'advanced' | 'expert';
  preferred_language: 'spanish' | 'english' | 'mixed';
  cultural_preference: 'mexican' | 'californian' | 'neutral';
  response_length_preference: 'brief' | 'detailed' | 'comprehensive';
  emotional_baseline: {
    typical_satisfaction: number;
    typical_confidence: number;
    typical_engagement: number;
  };
  interaction_patterns: {
    most_frequent_topics: string[];
    preferred_times: string[];
    session_length_average: number;
  };
}

export interface ConversationalInsight {
  pattern_type: 'workflow' | 'preference' | 'expertise' | 'emotional' | 'temporal';
  insight: string;
  confidence_score: number;
  occurrences: number;
  last_observed: Date;
  context: string[];
}

export interface LongTermMemory {
  successful_interactions: Array<{
    topic: string;
    approach: string;
    user_satisfaction: number;
    timestamp: Date;
  }>;
  failed_interactions: Array<{
    topic: string;
    issue: string;
    resolution: string;
    timestamp: Date;
  }>;
  user_preferences: {
    confirmed: Record<string, any>;
    inferred: Record<string, any>;
  };
  relationship_milestones: Array<{
    milestone: string;
    achieved_at: Date;
    context: string;
  }>;
}

export class ConversationalMemorySystem {
  private userProfile: UserPersonalityProfile | null = null;
  private conversationalInsights: ConversationalInsight[] = [];
  private longTermMemory: LongTermMemory;
  private sessionMemory: Map<string, any> = new Map();

  constructor(private userId: string) {
    this.longTermMemory = {
      successful_interactions: [],
      failed_interactions: [],
      user_preferences: {
        confirmed: {},
        inferred: {}
      },
      relationship_milestones: []
    };
    
    this.initializeUserProfile();
  }

  /**
   * Inicializar perfil de usuario basado en datos históricos
   */
  private async initializeUserProfile(): Promise<void> {
    // En una implementación real, esto vendría de una base de datos
    this.userProfile = {
      communication_style: 'casual',
      expertise_level: 'novice',
      preferred_language: 'spanish',
      cultural_preference: 'mexican',
      response_length_preference: 'detailed',
      emotional_baseline: {
        typical_satisfaction: 0.7,
        typical_confidence: 0.6,
        typical_engagement: 0.5
      },
      interaction_patterns: {
        most_frequent_topics: [],
        preferred_times: [],
        session_length_average: 15
      }
    };
  }

  /**
   * Actualizar perfil basado en nueva interacción
   */
  public updateUserProfile(
    linguisticAnalysis: any,
    emotionalInsights: any,
    interactionSuccess: boolean
  ): void {
    if (!this.userProfile) return;

    // Actualizar nivel de expertise
    if (linguisticAnalysis?.complexity) {
      this.adaptExpertiseLevel(linguisticAnalysis.complexity);
    }

    // Actualizar estilo de comunicación
    if (linguisticAnalysis?.formality) {
      this.adaptCommunicationStyle(linguisticAnalysis.formality);
    }

    // Actualizar baseline emocional
    if (emotionalInsights?.current) {
      this.updateEmotionalBaseline(emotionalInsights.current);
    }

    // Registrar interacción exitosa/fallida
    this.recordInteractionOutcome(interactionSuccess, linguisticAnalysis);
  }

  private adaptExpertiseLevel(complexity: string): void {
    if (!this.userProfile) return;

    const complexityMapping: Record<string, 'novice' | 'intermediate' | 'advanced' | 'expert'> = {
      'basic': 'novice',
      'intermediate': 'intermediate', 
      'advanced': 'advanced',
      'expert': 'expert'
    };

    const newLevel = complexityMapping[complexity];
    if (newLevel && this.shouldUpgradeExpertise(newLevel)) {
      this.userProfile.expertise_level = newLevel;
      this.recordMilestone(`Upgraded to ${newLevel} level`);
    }
  }

  private shouldUpgradeExpertise(newLevel: string): boolean {
    if (!this.userProfile) return false;

    const levels = ['novice', 'intermediate', 'advanced', 'expert'];
    const currentIndex = levels.indexOf(this.userProfile.expertise_level);
    const newIndex = levels.indexOf(newLevel);
    
    return newIndex > currentIndex;
  }

  private adaptCommunicationStyle(formality: string): void {
    if (!this.userProfile) return;

    const styleMapping: Record<string, 'direct' | 'detailed' | 'casual' | 'professional'> = {
      'casual': 'casual',
      'professional': 'professional',
      'formal': 'professional',
      'technical': 'detailed'
    };

    if (styleMapping[formality]) {
      this.userProfile.communication_style = styleMapping[formality];
    }
  }

  private updateEmotionalBaseline(currentEmotions: any): void {
    if (!this.userProfile) return;

    const { satisfaction, confidence, engagement } = currentEmotions;
    const baseline = this.userProfile.emotional_baseline;
    
    // Suavizar cambios en baseline (promedio móvil)
    baseline.typical_satisfaction = (baseline.typical_satisfaction * 0.8) + (satisfaction * 0.2);
    baseline.typical_confidence = (baseline.typical_confidence * 0.8) + (confidence * 0.2);
    baseline.typical_engagement = (baseline.typical_engagement * 0.8) + (engagement * 0.2);
  }

  private recordInteractionOutcome(success: boolean, context: any): void {
    const timestamp = new Date();
    
    if (success) {
      this.longTermMemory.successful_interactions.push({
        topic: context?.topic || 'general',
        approach: context?.formality || 'standard',
        user_satisfaction: this.userProfile?.emotional_baseline.typical_satisfaction || 0.7,
        timestamp
      });
    } else {
      this.longTermMemory.failed_interactions.push({
        topic: context?.topic || 'general',
        issue: 'Low satisfaction or engagement',
        resolution: 'Adapt communication style',
        timestamp
      });
    }

    // Mantener solo las últimas 100 interacciones
    if (this.longTermMemory.successful_interactions.length > 100) {
      this.longTermMemory.successful_interactions = 
        this.longTermMemory.successful_interactions.slice(-100);
    }
    
    if (this.longTermMemory.failed_interactions.length > 50) {
      this.longTermMemory.failed_interactions = 
        this.longTermMemory.failed_interactions.slice(-50);
    }
  }

  private recordMilestone(milestone: string): void {
    this.longTermMemory.relationship_milestones.push({
      milestone,
      achieved_at: new Date(),
      context: this.userProfile?.expertise_level || 'unknown'
    });
  }

  /**
   * Generar insights conversacionales basados en memoria
   */
  public generateConversationalInsights(): ConversationalInsight[] {
    const insights: ConversationalInsight[] = [];

    // Insight sobre temas más exitosos
    const topicSuccess = this.analyzeTopicSuccess();
    if (topicSuccess.insight) {
      insights.push(topicSuccess);
    }

    // Insight sobre estilo de comunicación preferido  
    const communicationInsight = this.analyzeCommunicationPreference();
    if (communicationInsight.insight) {
      insights.push(communicationInsight);
    }

    // Insight sobre patrones emocionales
    const emotionalInsight = this.analyzeEmotionalPatterns();
    if (emotionalInsight.insight) {
      insights.push(emotionalInsight);
    }

    return insights;
  }

  private analyzeTopicSuccess(): ConversationalInsight {
    const topicCounts: Record<string, { success: number; total: number }> = {};
    
    this.longTermMemory.successful_interactions.forEach(interaction => {
      if (!topicCounts[interaction.topic]) {
        topicCounts[interaction.topic] = { success: 0, total: 0 };
      }
      topicCounts[interaction.topic].success++;
      topicCounts[interaction.topic].total++;
    });

    this.longTermMemory.failed_interactions.forEach(interaction => {
      if (!topicCounts[interaction.topic]) {
        topicCounts[interaction.topic] = { success: 0, total: 0 };
      }
      topicCounts[interaction.topic].total++;
    });

    const bestTopic = Object.entries(topicCounts)
      .sort(([,a], [,b]) => (b.success / b.total) - (a.success / a.total))[0];

    return {
      pattern_type: 'workflow',
      insight: bestTopic ? `Most successful topic: ${bestTopic[0]}` : '',
      confidence_score: bestTopic ? bestTopic[1].success / bestTopic[1].total : 0,
      occurrences: bestTopic ? bestTopic[1].total : 0,
      last_observed: new Date(),
      context: ['topic_analysis']
    };
  }

  private analyzeCommunicationPreference(): ConversationalInsight {
    if (!this.userProfile) {
      return {
        pattern_type: 'preference',
        insight: '',
        confidence_score: 0,
        occurrences: 0,
        last_observed: new Date(),
        context: []
      };
    }

    return {
      pattern_type: 'preference',
      insight: `Preferred communication: ${this.userProfile.communication_style}`,
      confidence_score: 0.8,
      occurrences: this.longTermMemory.successful_interactions.length,
      last_observed: new Date(),
      context: ['communication_analysis']
    };
  }

  private analyzeEmotionalPatterns(): ConversationalInsight {
    if (!this.userProfile) {
      return {
        pattern_type: 'emotional',
        insight: '',
        confidence_score: 0,
        occurrences: 0,
        last_observed: new Date(),
        context: []
      };
    }

    const baseline = this.userProfile.emotional_baseline;
    const dominantEmotion = baseline.typical_satisfaction > 0.7 ? 'positive' :
                            baseline.typical_confidence < 0.4 ? 'cautious' :
                            baseline.typical_engagement > 0.8 ? 'enthusiastic' : 'neutral';

    return {
      pattern_type: 'emotional',
      insight: `Dominant emotional pattern: ${dominantEmotion}`,
      confidence_score: 0.7,
      occurrences: this.longTermMemory.successful_interactions.length,
      last_observed: new Date(),
      context: ['emotional_analysis']
    };
  }

  /**
   * Obtener recomendaciones para optimizar la conversación
   */
  public getConversationOptimizationRecommendations(): string[] {
    const recommendations: string[] = [];
    
    if (!this.userProfile) return recommendations;

    // Recomendaciones basadas en expertise
    if (this.userProfile.expertise_level === 'expert') {
      recommendations.push('Use technical terminology and detailed explanations');
    } else if (this.userProfile.expertise_level === 'novice') {
      recommendations.push('Provide step-by-step explanations with context');
    }

    // Recomendaciones basadas en estilo de comunicación
    if (this.userProfile.communication_style === 'direct') {
      recommendations.push('Keep responses concise and action-oriented');
    } else if (this.userProfile.communication_style === 'detailed') {
      recommendations.push('Provide comprehensive information and examples');
    }

    // Recomendaciones basadas en baseline emocional
    if (this.userProfile.emotional_baseline.typical_confidence < 0.5) {
      recommendations.push('Increase encouragement and provide reassurance');
    }

    if (this.userProfile.emotional_baseline.typical_engagement < 0.5) {
      recommendations.push('Use more interactive and engaging communication');
    }

    return recommendations;
  }

  /**
   * Métodos públicos para acceso a la memoria
   */
  public getUserProfile(): UserPersonalityProfile | null {
    return this.userProfile;
  }

  public getLongTermMemory(): LongTermMemory {
    return this.longTermMemory;
  }

  public getSessionMemory(): Map<string, any> {
    return this.sessionMemory;
  }

  public setSessionMemory(key: string, value: any): void {
    this.sessionMemory.set(key, value);
  }
}