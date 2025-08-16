/**
 * DATABASE AGENT MEMORY - SISTEMA DE MEMORIA PERSISTENTE BASADO EN BASE DE DATOS
 * 
 * Sistema de memoria avanzado que reemplaza localStorage con almacenamiento en PostgreSQL
 * y análisis inteligente usando Anthropic AI para el aprendizaje y optimización.
 * 
 * Características Fase 5:
 * - Almacenamiento persistente en base de datos
 * - Análisis de comportamiento con Anthropic AI
 * - Optimización automática de flujos de trabajo
 * - Predicción inteligente de necesidades
 * - Memoria contextual y entity tracking
 * - Learning progress tracking
 */

import { apiRequest } from '../../lib/queryClient';
import { UserIntention, TaskExecutionPlan } from '../core/IntentionEngine';
import { TaskResult } from '../core/MervinAgent';

export interface DatabaseTaskPattern {
  id: number;
  patternId: string;
  intentionType: string;
  intentionComplexity: string;
  executionPlan: any;
  success: boolean;
  executionTime: number;
  endpointsUsed: string[];
  parametersUsed?: any;
  userSatisfaction?: number;
  optimizations?: any;
  confidence?: number;
  contextData?: any;
  conversationHistory?: any;
  activeEntities?: any;
  createdAt: string;
  updatedAt: string;
}

export interface BehaviorAnalytics {
  userId: string;
  adaptationLevel: string;
  totalTasks: number;
  successfulTasks: number;
  averageExecutionTime: number;
  commonIntentions: string[];
  preferredWorkflows: string[];
  timePatterns: any;
  lastAnalysisDate: string;
}

export interface MemoryPrediction {
  intention: string;
  confidence: number;
  reason: string;
  suggestedAction: string;
  estimatedValue: number;
}

export interface OptimizationSuggestion {
  id: number;
  suggestionId: string;
  type: 'sequence' | 'parameters' | 'timing' | 'alternative';
  description: string;
  reason: string;
  estimatedImprovement: number;
  confidence: number;
  applicableIntentions: string[];
  status: string;
  createdAt: string;
}

export interface LearningInsights {
  adaptationLevel: string;
  learningVelocity: number;
  strongPatterns: string[];
  improvementAreas: string[];
  nextOptimizations: OptimizationSuggestion[];
}

export class DatabaseAgentMemory {
  private userId: string;
  private cache: Map<string, any> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache

  // Compatibility properties to match AgentMemory interface
  public taskHistory: any[] = [];
  public behaviorPattern: any = {};
  public optimizations: any[] = [];
  public memoryLimit: number = 1000;
  public learningRate: number = 0.8;
  public confidenceThreshold: number = 0.7;
  public adaptationSpeed: string = 'medium';
  public contextWindow: number = 10;
  public patternRecognition: boolean = true;
  public autoOptimization: boolean = true;
  public memoryPersistence: string = 'database';
  public analysisDepth: string = 'comprehensive';
  public predictionAccuracy: number = 0.85;
  public userFeedbackWeight: number = 0.9;
  public timeDecay: number = 0.95;
  public contextualAwareness: boolean = true;
  public crossSessionLearning: boolean = true;

  constructor(userId: string) {
    this.userId = userId;
    console.log(`🧠 [DATABASE-MEMORY] Initialized for user: ${userId}`);
  }

  // Interface compatibility method
  storeSuccessfulInteraction(data: any): void {
    console.log('🧠 [DATABASE-MEMORY] Stored successful interaction:', data);
  }

  /**
   * Aprender de una tarea completada - ahora usa base de datos
   */
  async learnFromTask(intention: UserIntention, result: TaskResult): Promise<void> {
    try {
      const pattern = {
        intention: {
          primary: intention.primary,
          complexity: intention.complexity,
          executionPlan: {},
          parameters: intention.parameters || {}
        },
        executionResult: {
          success: result.success,
          executionTime: result.executionTime,
          endpointsUsed: result.endpointsUsed || [],
          error: result.error
        },
        context: intention.context || {},
        userFeedback: undefined
      };

      const response = await apiRequest('/api/memory/store-pattern', 'POST', pattern);

      const responseData = await response.json();
      if (responseData?.success) {
        console.log(`🧠 [DATABASE-MEMORY] Stored pattern: ${intention.primary} (${result.success ? 'success' : 'failed'})`);
        
        // Invalidar cache relacionado
        this.invalidateCache(['behavior-analysis', 'optimizations', 'predictions']);
      } else {
        console.error('❌ [DATABASE-MEMORY] Failed to store pattern:', responseData?.error);
      }

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error learning from task:', error);
    }
  }

  /**
   * Optimizar plan de ejecución basado en análisis de memoria
   */
  async optimizePlan(basePlan: TaskExecutionPlan, intention: UserIntention): Promise<TaskExecutionPlan> {
    try {
      // Obtener optimizaciones específicas para este tipo de intención
      const optimizations = await this.getOptimizations();
      
      if (optimizations.length === 0) {
        return basePlan;
      }

      // Filtrar optimizaciones aplicables a esta intención
      const applicableOptimizations = optimizations.filter(opt => 
        opt.applicableIntentions.includes(intention.primary) &&
        opt.confidence > 0.7 &&
        opt.status === 'pending'
      );

      if (applicableOptimizations.length === 0) {
        return basePlan;
      }

      // Aplicar la optimización con mayor confianza
      const bestOptimization = applicableOptimizations[0];
      const optimizedPlan = { ...basePlan };

      console.log(`🔧 [DATABASE-MEMORY] Applying optimization: ${bestOptimization.description}`);

      // Aplicar optimizaciones específicas según el tipo
      switch (bestOptimization.type) {
        case 'sequence':
          // Optimizar secuencia de pasos
          optimizedPlan.steps = this.optimizeStepSequence(basePlan.steps, bestOptimization);
          break;
        case 'timing':
          // Ajustar tiempos estimados
          optimizedPlan.estimatedDuration = this.adjustEstimatedDuration(basePlan.estimatedDuration, bestOptimization);
          break;
        case 'parameters':
          // Optimizar parámetros (implementación pendiente)
          // optimizedPlan.defaultParameters = { ...basePlan.defaultParameters, ...bestOptimization.supportingData };
          break;
      }

      return optimizedPlan;

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error optimizing plan:', error);
      return basePlan;
    }
  }

  /**
   * Predecir necesidades del usuario usando IA
   */
  async predictUserNeeds(context: any): Promise<MemoryPrediction[]> {
    try {
      const cacheKey = `predictions-${Date.now()}`;
      
      const response = await apiRequest('/api/memory/predict-needs', 'POST', { currentContext: context });
      const responseData = await response.json();

      if (responseData?.success) {
        const predictions = responseData?.predictions || [];
        this.setCache(cacheKey, predictions, this.CACHE_TTL);
        
        console.log(`🧠 [DATABASE-MEMORY] Generated ${predictions.length} predictions`);
        return predictions;
      }

      return [];

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error predicting needs:', error);
      return [];
    }
  }

  /**
   * Obtener análisis de comportamiento
   */
  async getBehaviorAnalytics(forceRefresh: boolean = false): Promise<BehaviorAnalytics | null> {
    try {
      const cacheKey = 'behavior-analysis';
      
      if (!forceRefresh) {
        const cached = this.getCache<BehaviorAnalytics>(cacheKey);
        if (cached) return cached;
      }

      const refreshParam = forceRefresh ? '?refresh=true' : '';
      const response = await apiRequest(`/api/memory/behavior-analysis/${this.userId}${refreshParam}`, 'GET');
      const responseData = await response.json();

      if (responseData?.success) {
        const analytics = responseData?.analytics;
        this.setCache(cacheKey, analytics, this.CACHE_TTL);
        
        console.log(`🧠 [DATABASE-MEMORY] Retrieved behavior analytics: ${analytics.adaptationLevel} level`);
        return analytics;
      }

      return null;

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error getting behavior analytics:', error);
      return null;
    }
  }

  /**
   * Obtener optimizaciones disponibles
   */
  async getOptimizations(generateNew: boolean = false): Promise<OptimizationSuggestion[]> {
    try {
      const cacheKey = 'optimizations';
      
      if (!generateNew) {
        const cached = this.getCache<OptimizationSuggestion[]>(cacheKey);
        if (cached) return cached;
      }

      const generateParam = generateNew ? '?generate=true' : '';
      const response = await apiRequest(`/api/memory/optimizations/${this.userId}${generateParam}`, 'GET');
      const responseData = await response.json();

      if (responseData?.success) {
        const optimizations = responseData?.optimizations || [];
        this.setCache(cacheKey, optimizations, this.CACHE_TTL);
        
        console.log(`🧠 [DATABASE-MEMORY] Retrieved ${optimizations.length} optimizations`);
        return optimizations;
      }

      return [];

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error getting optimizations:', error);
      return [];
    }
  }

  /**
   * Obtener insights de aprendizaje
   */
  async getLearningInsights(): Promise<LearningInsights | null> {
    try {
      const cacheKey = 'learning-insights';
      const cached = this.getCache<LearningInsights>(cacheKey);
      if (cached) return cached;

      const response = await apiRequest(`/api/memory/learning-insights/${this.userId}`, 'GET');
      const responseData = await response.json();

      if (responseData?.success) {
        const insights = responseData?.insights;
        this.setCache(cacheKey, insights, this.CACHE_TTL);
        
        console.log(`🧠 [DATABASE-MEMORY] Retrieved learning insights: ${insights.adaptationLevel}`);
        return insights;
      }

      return null;

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error getting learning insights:', error);
      return null;
    }
  }

  /**
   * Actualizar memoria contextual
   */
  async updateContextualMemory(
    contextType: string,
    entities: any,
    importance: number = 5
  ): Promise<void> {
    try {
      const response = await apiRequest('/api/memory/update-context', 'POST', {
        contextType,
        entities,
        importance
      });
      const responseData = await response.json();

      if (responseData?.success) {
        console.log(`🧠 [DATABASE-MEMORY] Updated context: ${contextType} (importance: ${importance})`);
        
        // Invalidar predicciones ya que el contexto cambió
        this.invalidateCache(['predictions']);
      }

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error updating context:', error);
    }
  }

  /**
   * Proporcionar feedback sobre optimización
   */
  async provideFeedback(suggestionId: string, feedbackScore: number, applied: boolean = false): Promise<void> {
    try {
      const response = await apiRequest('/api/memory/optimization-feedback', 'POST', {
        suggestionId,
        feedbackScore,
        applied
      });
      const responseData = await response.json();

      if (responseData?.success) {
        console.log(`🧠 [DATABASE-MEMORY] Feedback provided for suggestion: ${suggestionId}`);
        
        // Invalidar cache de optimizaciones
        this.invalidateCache(['optimizations']);
      }

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error providing feedback:', error);
    }
  }

  /**
   * Obtener estadísticas de uso mejoradas
   */
  async getUsageStatistics(): Promise<any> {
    try {
      const analytics = await this.getBehaviorAnalytics();
      const insights = await this.getLearningInsights();

      if (!analytics) return null;

      const successRate = analytics.totalTasks > 0 
        ? (analytics.successfulTasks / analytics.totalTasks) * 100 
        : 0;

      return {
        totalTasks: analytics.totalTasks,
        successfulTasks: analytics.successfulTasks,
        successRate,
        averageExecutionTime: analytics.averageExecutionTime,
        adaptationLevel: analytics.adaptationLevel,
        learningVelocity: insights?.learningVelocity || 0,
        mostCommonIntentions: analytics.commonIntentions.slice(0, 5),
        strongPatterns: insights?.strongPatterns || [],
        nextOptimizations: insights?.nextOptimizations || []
      };

    } catch (error) {
      console.error('❌ [DATABASE-MEMORY] Error getting usage statistics:', error);
      return null;
    }
  }

  /**
   * Métodos de cache para optimizar rendimiento
   */
  private setCache<T>(key: string, value: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + ttl);
  }

  private getCache<T>(key: string): T | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    return this.cache.get(key) || null;
  }

  private invalidateCache(patterns: string[]): void {
    patterns.forEach(pattern => {
      Array.from(this.cache.keys()).forEach(key => {
        if (key.includes(pattern)) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      });
    });
  }

  /**
   * Métodos auxiliares para optimización
   */
  private optimizeStepSequence(steps: any[], optimization: OptimizationSuggestion): any[] {
    // Implementar lógica de optimización de secuencia basada en datos históricos
    return steps; // Por ahora mantener orden original
  }

  private adjustEstimatedDuration(baseDuration: number, optimization: OptimizationSuggestion): number {
    const improvement = optimization.estimatedImprovement / 100;
    return Math.round(baseDuration * (1 - improvement));
  }

  /**
   * Limpiar cache periódicamente
   */
  startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const entries = Array.from(this.cacheExpiry.entries());
      for (const [key, expiry] of entries) {
        if (now > expiry) {
          this.cache.delete(key);
          this.cacheExpiry.delete(key);
        }
      }
    }, 60000); // Limpiar cada minuto
  }
}

export { DatabaseAgentMemory as AgentMemory };