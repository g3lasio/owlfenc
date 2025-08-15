/**
 * AGENT MEMORY - SISTEMA DE MEMORIA PERSISTENTE Y APRENDIZAJE
 * 
 * Sistema de memoria inteligente que permite al agente aprender de interacciones
 * previas, optimizar flujos de trabajo y proporcionar sugerencias proactivas.
 * 
 * Responsabilidades:
 * - Almacenamiento de patrones de uso
 * - Optimización de secuencias de endpoints
 * - Predicción de necesidades del usuario
 * - Mejora continua basada en feedback
 * - Personalización de respuestas
 */

import { UserIntention, TaskExecutionPlan } from '../core/IntentionEngine';
import { TaskResult } from '../core/MervinAgent';

export interface TaskPattern {
  id: string;
  intention: UserIntention;
  executionPlan: TaskExecutionPlan;
  result: TaskResult;
  timestamp: Date;
  userId: string;
  success: boolean;
  executionTime: number;
  userSatisfaction?: number; // 1-5 rating
  optimizations?: string[];
}

export interface UserBehaviorPattern {
  userId: string;
  commonIntentions: string[];
  preferredWorkflows: string[];
  timePatterns: Record<string, number>;
  successfulPatterns: TaskPattern[];
  failurePatterns: TaskPattern[];
  lastAnalysis: Date;
}

export interface OptimizationSuggestion {
  type: 'sequence' | 'parameters' | 'timing' | 'alternative';
  description: string;
  estimatedImprovement: number; // percentage
  confidence: number; // 0-1
  applicableToIntentions: string[];
}

export interface PredictedNeed {
  intention: UserIntention;
  confidence: number;
  reason: string;
  suggestedAction: string;
  estimatedValue: number; // 1-10 scale
}

export class AgentMemory {
  private userId: string;
  private taskHistory: TaskPattern[] = [];
  private behaviorPattern: UserBehaviorPattern | null = null;
  private optimizations: Map<string, OptimizationSuggestion[]> = new Map();
  private memoryLimit: number = 1000; // Maximum tasks to remember
  private autoSaveInterval: number = 30000; // 30 seconds

  constructor(userId: string) {
    this.userId = userId;
    this.loadMemory();
    this.startAutoSave();
  }

  /**
   * Aprender de una tarea completada
   */
  async learnFromTask(intention: UserIntention, result: TaskResult): Promise<void> {
    try {
      const pattern: TaskPattern = {
        id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        intention,
        executionPlan: {} as TaskExecutionPlan, // Se llenará con más detalles
        result,
        timestamp: new Date(),
        userId: this.userId,
        success: result.success,
        executionTime: result.executionTime
      };

      // Agregar patrón a historial
      this.taskHistory.unshift(pattern);

      // Mantener límite de memoria
      if (this.taskHistory.length > this.memoryLimit) {
        this.taskHistory = this.taskHistory.slice(0, this.memoryLimit);
      }

      // Analizar patrones de comportamiento
      await this.analyzeBehaviorPatterns();

      // Generar optimizaciones
      await this.generateOptimizations();

      console.log(`🧠 [AGENT-MEMORY] Learned from task: ${intention.primary} (${result.success ? 'success' : 'failed'})`);

    } catch (error) {
      console.error('❌ [AGENT-MEMORY] Error learning from task:', error);
    }
  }

  /**
   * Optimizar plan de ejecución basado en memoria
   */
  async optimizePlan(basePlan: TaskExecutionPlan, intention: UserIntention): Promise<TaskExecutionPlan> {
    try {
      // Buscar patrones similares exitosos
      const similarPatterns = this.findSimilarPatterns(intention);
      
      if (similarPatterns.length === 0) {
        return basePlan; // No hay datos históricos, usar plan base
      }

      // Analizar optimizaciones exitosas
      const optimizedPlan = { ...basePlan };
      
      // Optimizar secuencia de pasos
      optimizedPlan.steps = this.optimizeStepSequence(basePlan.steps, similarPatterns);
      
      // Ajustar tiempos estimados
      optimizedPlan.estimatedDuration = this.adjustEstimatedDuration(basePlan.estimatedDuration, similarPatterns);
      
      // Agregar pasos opcionales basados en éxito histórico
      const additionalSteps = this.suggestAdditionalSteps(intention, similarPatterns);
      if (additionalSteps.length > 0) {
        optimizedPlan.steps.push(...additionalSteps);
      }

      console.log(`🔧 [AGENT-MEMORY] Optimized plan for ${intention.primary} based on ${similarPatterns.length} similar patterns`);
      
      return optimizedPlan;

    } catch (error) {
      console.error('❌ [AGENT-MEMORY] Error optimizing plan:', error);
      return basePlan;
    }
  }

  /**
   * Predecir necesidades del usuario
   */
  async predictUserNeeds(context: any): Promise<PredictedNeed[]> {
    try {
      const predictions: PredictedNeed[] = [];

      // Analizar patrones temporales
      const timeBasedPredictions = this.analyzeTimePatterns(context);
      predictions.push(...timeBasedPredictions);

      // Analizar secuencias comunes
      const sequencePredictions = this.analyzeSequencePatterns(context);
      predictions.push(...sequencePredictions);

      // Analizar contexto actual
      const contextPredictions = this.analyzeContextPatterns(context);
      predictions.push(...contextPredictions);

      // Ordenar por confianza
      predictions.sort((a, b) => b.confidence - a.confidence);

      // Retornar top 5 predicciones
      return predictions.slice(0, 5);

    } catch (error) {
      console.error('❌ [AGENT-MEMORY] Error predicting needs:', error);
      return [];
    }
  }

  /**
   * Obtener sugerencias de optimización
   */
  getOptimizationSuggestions(intentionType: string): OptimizationSuggestion[] {
    return this.optimizations.get(intentionType) || [];
  }

  /**
   * Obtener estadísticas de uso
   */
  getUsageStatistics(): any {
    const totalTasks = this.taskHistory.length;
    const successfulTasks = this.taskHistory.filter(t => t.success).length;
    const successRate = totalTasks > 0 ? (successfulTasks / totalTasks) * 100 : 0;

    const intentionCounts = this.taskHistory.reduce((acc, task) => {
      acc[task.intention.primary] = (acc[task.intention.primary] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const averageExecutionTime = totalTasks > 0 
      ? this.taskHistory.reduce((sum, task) => sum + task.executionTime, 0) / totalTasks 
      : 0;

    return {
      totalTasks,
      successfulTasks,
      successRate,
      averageExecutionTime,
      mostCommonIntentions: Object.entries(intentionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5),
      recentActivity: this.taskHistory.slice(0, 10)
    };
  }

  /**
   * Limpiar memoria antigua
   */
  cleanupOldMemory(daysToKeep: number = 30): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const initialCount = this.taskHistory.length;
    this.taskHistory = this.taskHistory.filter(task => task.timestamp > cutoffDate);
    const removed = initialCount - this.taskHistory.length;

    if (removed > 0) {
      console.log(`🧹 [AGENT-MEMORY] Cleaned up ${removed} old memory entries`);
      this.saveMemory();
    }
  }

  /**
   * Cargar memoria desde localStorage
   */
  private loadMemory(): void {
    try {
      const stored = localStorage.getItem(`agentMemory_${this.userId}`);
      if (stored) {
        const parsed: any = JSON.parse(stored);
        
        // Restaurar taskHistory con conversión de fechas
        this.taskHistory = (parsed.taskHistory || []).map((task: any) => ({
          ...task,
          timestamp: new Date(task.timestamp)
        }));

        // Restaurar behaviorPattern
        if (parsed.behaviorPattern) {
          this.behaviorPattern = {
            ...parsed.behaviorPattern,
            lastAnalysis: new Date(parsed.behaviorPattern.lastAnalysis)
          };
        }

        console.log(`🧠 [AGENT-MEMORY] Loaded ${this.taskHistory.length} tasks from memory`);
      }
    } catch (error) {
      console.error('❌ [AGENT-MEMORY] Error loading memory:', error);
      this.taskHistory = [];
    }
  }

  /**
   * Guardar memoria en localStorage
   */
  private saveMemory(): void {
    try {
      const toSave = {
        taskHistory: this.taskHistory,
        behaviorPattern: this.behaviorPattern,
        lastSaved: new Date()
      };

      localStorage.setItem(`agentMemory_${this.userId}`, JSON.stringify(toSave));
    } catch (error) {
      console.error('❌ [AGENT-MEMORY] Error saving memory:', error);
    }
  }

  /**
   * Almacenar interacción exitosa (utilizado por SmartTaskCoordinator)
   */
  async storeSuccessfulInteraction(data: {
    intention: any;
    strategy: any;
    result: any;
    timestamp: string;
  }): Promise<void> {
    try {
      // Convertir a TaskPattern
      const pattern: TaskPattern = {
        id: `pattern_${Date.now()}`,
        intention: data.intention,
        executionPlan: {
          steps: [],
          estimatedDuration: 0,
          requiredPermissions: [],
          riskLevel: 'low',
          canRollback: true
        },
        result: data.result,
        timestamp: new Date(data.timestamp),
        userId: this.userId,
        success: data.result.success,
        executionTime: data.result.executionTime || 0,
        optimizations: data.strategy.optimizations || []
      };

      this.taskHistory.push(pattern);
      this.saveMemory();
    } catch (error) {
      console.error('❌ [AGENT-MEMORY] Error storing successful interaction:', error);
    }
  }

  /**
   * Auto-guardar periódico
   */
  private startAutoSave(): void {
    setInterval(() => {
      this.saveMemory();
    }, this.autoSaveInterval);
  }

  /**
   * Encontrar patrones similares
   */
  private findSimilarPatterns(intention: UserIntention): TaskPattern[] {
    return this.taskHistory.filter(pattern => 
      pattern.intention.primary === intention.primary &&
      pattern.success &&
      pattern.intention.complexity === intention.complexity
    );
  }

  /**
   * Optimizar secuencia de pasos
   */
  private optimizeStepSequence(steps: any[], similarPatterns: TaskPattern[]): any[] {
    // Analizar secuencias exitosas y reordenar pasos si es necesario
    // Por ahora, mantener orden original pero esto se puede mejorar
    return steps;
  }

  /**
   * Ajustar duración estimada
   */
  private adjustEstimatedDuration(baseDuration: number, similarPatterns: TaskPattern[]): number {
    if (similarPatterns.length === 0) return baseDuration;

    const avgActualDuration = similarPatterns.reduce((sum, p) => sum + p.executionTime, 0) / similarPatterns.length;
    
    // Usar promedio ponderado: 70% histórico, 30% estimación base
    return Math.round(avgActualDuration * 0.7 + baseDuration * 0.3);
  }

  /**
   * Sugerir pasos adicionales
   */
  private suggestAdditionalSteps(intention: UserIntention, similarPatterns: TaskPattern[]): any[] {
    // Analizar pasos que mejoraron el éxito en patrones similares
    // Por ahora retornar array vacío, se puede expandir
    return [];
  }

  /**
   * Analizar patrones de comportamiento
   */
  private async analyzeBehaviorPatterns(): Promise<void> {
    try {
      const recentTasks = this.taskHistory.slice(0, 100); // Últimas 100 tareas
      
      // Analizar intenciones comunes
      const intentionCounts = recentTasks.reduce((acc, task) => {
        acc[task.intention.primary] = (acc[task.intention.primary] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const commonIntentions = Object.entries(intentionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([intention]) => intention);

      // Analizar patrones de tiempo
      const timePatterns = this.analyzeTimeUsagePatterns(recentTasks);

      // Separar patrones exitosos y fallidos
      const successfulPatterns = recentTasks.filter(t => t.success);
      const failurePatterns = recentTasks.filter(t => !t.success);

      this.behaviorPattern = {
        userId: this.userId,
        commonIntentions,
        preferredWorkflows: [], // Se puede expandir
        timePatterns,
        successfulPatterns,
        failurePatterns,
        lastAnalysis: new Date()
      };

    } catch (error) {
      console.error('❌ [AGENT-MEMORY] Error analyzing behavior patterns:', error);
    }
  }

  /**
   * Generar optimizaciones
   */
  private async generateOptimizations(): Promise<void> {
    if (!this.behaviorPattern) return;

    for (const intention of this.behaviorPattern.commonIntentions) {
      const optimizations: OptimizationSuggestion[] = [];

      // Analizar patrones de falla para este tipo de intención
      const failures = this.behaviorPattern.failurePatterns.filter(p => p.intention.primary === intention);
      const successes = this.behaviorPattern.successfulPatterns.filter(p => p.intention.primary === intention);

      if (failures.length > 0 && successes.length > 0) {
        // Sugerir optimizaciones basadas en diferencias entre éxitos y fallas
        optimizations.push({
          type: 'sequence',
          description: `Mejorar secuencia para ${intention} basado en ${successes.length} casos exitosos`,
          estimatedImprovement: Math.min(90, (successes.length / (successes.length + failures.length)) * 100),
          confidence: 0.8,
          applicableToIntentions: [intention]
        });
      }

      this.optimizations.set(intention, optimizations);
    }
  }

  /**
   * Analizar patrones temporales
   */
  private analyzeTimePatterns(context: any): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    const currentHour = new Date().getHours();

    // Analizar tareas comunes por hora del día
    const hourlyPatterns = this.taskHistory.reduce((acc, task) => {
      const hour = task.timestamp.getHours();
      if (!acc[hour]) acc[hour] = [];
      acc[hour].push(task.intention.primary);
      return acc;
    }, {} as Record<number, string[]>);

    const currentHourPatterns = hourlyPatterns[currentHour] || [];
    if (currentHourPatterns.length > 0) {
      const mostCommon = this.getMostCommon(currentHourPatterns);
      
      predictions.push({
        intention: {
          primary: mostCommon as any,
          complexity: 'simple',
          confidence: 0.6,
          requiredEndpoints: [],
          estimatedSteps: 1,
          parameters: {},
          context: { conversationHistory: [], recentActions: [], availableData: {} }
        },
        confidence: 0.6,
        reason: `Patrón temporal: frecuente a las ${currentHour}:00`,
        suggestedAction: `Considera crear un ${mostCommon}`,
        estimatedValue: 7
      });
    }

    return predictions;
  }

  /**
   * Analizar patrones de secuencia
   */
  private analyzeSequencePatterns(context: any): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    
    // Analizar secuencias comunes (ej: estimate -> contract)
    const sequences = this.findCommonSequences();
    
    // Si el usuario acaba de hacer un estimate, sugerir contract
    const recentMessages = context.conversation?.messages?.slice(-3) || [];
    const recentIntentions = recentMessages.map((m: any) => m.intention?.primary).filter(Boolean);
    
    if (recentIntentions.includes('estimate')) {
      predictions.push({
        intention: {
          primary: 'contract',
          complexity: 'complex',
          confidence: 0.75,
          requiredEndpoints: ['/api/legal-defense'],
          estimatedSteps: 5,
          parameters: {},
          context: { conversationHistory: [], recentActions: [], availableData: {} }
        },
        confidence: 0.75,
        reason: 'Secuencia común: estimate → contract',
        suggestedAction: 'Generar contrato basado en el estimado reciente',
        estimatedValue: 9
      });
    }

    return predictions;
  }

  /**
   * Analizar patrones de contexto
   */
  private analyzeContextPatterns(context: any): PredictedNeed[] {
    const predictions: PredictedNeed[] = [];
    
    // Analizar entidades activas
    const activeEntities = context.conversation?.activeEntities || {};
    
    // Si hay un cliente mencionado recientemente, sugerir acciones relacionadas
    const recentClients = Object.entries(activeEntities)
      .filter(([key]) => key.startsWith('client_'))
      .filter(([, entity]: [string, any]) => {
        const timeSinceLastMention = Date.now() - new Date(entity.mentionedAt).getTime();
        return timeSinceLastMention < 300000; // Últimos 5 minutos
      });

    if (recentClients.length > 0) {
      predictions.push({
        intention: {
          primary: 'estimate',
          complexity: 'simple',
          confidence: 0.7,
          requiredEndpoints: ['/api/estimates'],
          estimatedSteps: 3,
          parameters: { clientName: recentClients[0][1].name },
          context: { conversationHistory: [], recentActions: [], availableData: {} }
        },
        confidence: 0.7,
        reason: `Cliente ${recentClients[0][1].name} mencionado recientemente`,
        suggestedAction: `Crear estimado para ${recentClients[0][1].name}`,
        estimatedValue: 8
      });
    }

    return predictions;
  }

  /**
   * Analizar patrones de uso por tiempo
   */
  private analyzeTimeUsagePatterns(tasks: TaskPattern[]): Record<string, number> {
    const patterns: Record<string, number> = {};
    
    tasks.forEach(task => {
      const hour = task.timestamp.getHours();
      const day = task.timestamp.getDay();
      const key = `${day}_${hour}`;
      patterns[key] = (patterns[key] || 0) + 1;
    });

    return patterns;
  }

  /**
   * Encontrar secuencias comunes
   */
  private findCommonSequences(): string[][] {
    const sequences: string[][] = [];
    
    // Analizar secuencias de 2-3 tareas consecutivas
    for (let i = 0; i < this.taskHistory.length - 1; i++) {
      const current = this.taskHistory[i].intention.primary;
      const next = this.taskHistory[i + 1].intention.primary;
      
      // Verificar que las tareas sean del mismo día (secuencia lógica)
      const timeDiff = this.taskHistory[i].timestamp.getTime() - this.taskHistory[i + 1].timestamp.getTime();
      if (timeDiff < 24 * 60 * 60 * 1000) { // Mismo día
        sequences.push([current, next]);
      }
    }

    return sequences;
  }

  /**
   * Obtener elemento más común en array
   */
  private getMostCommon(array: string[]): string {
    const counts = array.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || array[0];
  }
}