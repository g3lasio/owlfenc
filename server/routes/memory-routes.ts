/**
 * MEMORY SYSTEM API ROUTES
 * 
 * Endpoints para el sistema de memoria y aprendizaje del agente.
 * Gestiona patrones de comportamiento, optimizaciones y predicciones.
 */

import { Router } from 'express';
import { memoryService } from '../services/MemoryService';
import { z } from 'zod';

const router = Router();

// Schema validation for memory requests
const storeMemoryPatternSchema = z.object({
  intention: z.object({
    primary: z.string(),
    complexity: z.enum(['simple', 'medium', 'complex']),
    executionPlan: z.any().optional(),
    parameters: z.any().optional()
  }),
  executionResult: z.object({
    success: z.boolean(),
    executionTime: z.number(),
    endpointsUsed: z.array(z.string()),
    error: z.string().optional()
  }),
  context: z.any(),
  userFeedback: z.number().min(1).max(5).optional()
});

const updateContextSchema = z.object({
  contextType: z.string(),
  entities: z.any(),
  importance: z.number().min(1).max(10).default(5)
});

const predictNeedsSchema = z.object({
  currentContext: z.any()
});

/**
 * POST /api/memory/store-pattern
 * Almacenar un patrón de memoria de una interacción
 */
router.post('/store-pattern', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID requerido en headers' 
      });
    }

    const validatedData = storeMemoryPatternSchema.parse(req.body);
    
    const pattern = await memoryService.storeMemoryPattern({
      userId,
      intention: validatedData.intention,
      executionResult: validatedData.executionResult,
      context: validatedData.context || {},
      userFeedback: validatedData.userFeedback
    });

    console.log(`🧠 [MEMORY-API] Stored pattern for user ${userId}: ${pattern.intentionType}`);

    res.json({
      success: true,
      pattern: {
        id: pattern.id,
        patternId: pattern.patternId,
        intentionType: pattern.intentionType,
        success: pattern.success,
        executionTime: pattern.executionTime,
        createdAt: pattern.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [MEMORY-API] Error storing pattern:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error almacenando patrón de memoria'
    });
  }
});

/**
 * GET /api/memory/behavior-analysis/:userId
 * Obtener o actualizar análisis de comportamiento
 */
router.get('/behavior-analysis/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const forceRefresh = req.query.refresh === 'true';

    let analytics;
    if (forceRefresh) {
      analytics = await memoryService.analyzeBehaviorPatterns(userId);
    } else {
      // Primero intentar obtener análisis existente
      try {
        analytics = await memoryService.analyzeBehaviorPatterns(userId);
      } catch (error) {
        console.log('Creating new behavior analysis for user:', userId);
        analytics = await memoryService.analyzeBehaviorPatterns(userId);
      }
    }

    console.log(`🧠 [MEMORY-API] Retrieved behavior analysis for user ${userId}: ${analytics.adaptationLevel}`);

    res.json({
      success: true,
      analytics: {
        userId: analytics.userId,
        adaptationLevel: analytics.adaptationLevel,
        totalTasks: analytics.totalTasks,
        successfulTasks: analytics.successfulTasks,
        averageExecutionTime: analytics.averageExecutionTime,
        commonIntentions: analytics.commonIntentions,
        preferredWorkflows: analytics.preferredWorkflows,
        timePatterns: analytics.timePatterns,
        lastAnalysisDate: analytics.lastAnalysisDate
      }
    });

  } catch (error) {
    console.error('❌ [MEMORY-API] Error getting behavior analysis:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo análisis de comportamiento'
    });
  }
});

/**
 * GET /api/memory/optimizations/:userId
 * Obtener optimizaciones generadas para el usuario
 */
router.get('/optimizations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const generateNew = req.query.generate === 'true';

    let optimizations;
    if (generateNew) {
      optimizations = await memoryService.generateOptimizations(userId);
    } else {
      // Obtener optimizaciones existentes primero
      optimizations = await memoryService.generateOptimizations(userId);
    }

    console.log(`🧠 [MEMORY-API] Retrieved ${optimizations.length} optimizations for user ${userId}`);

    res.json({
      success: true,
      optimizations: optimizations.map(opt => ({
        id: opt.id,
        suggestionId: opt.suggestionId,
        type: opt.type,
        description: opt.description,
        reason: opt.reason,
        estimatedImprovement: opt.estimatedImprovement,
        confidence: opt.confidence,
        applicableIntentions: opt.applicableIntentions,
        status: opt.status,
        createdAt: opt.createdAt
      }))
    });

  } catch (error) {
    console.error('❌ [MEMORY-API] Error getting optimizations:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo optimizaciones'
    });
  }
});

/**
 * POST /api/memory/predict-needs
 * Predecir necesidades del usuario basado en contexto
 */
router.post('/predict-needs', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID requerido en headers' 
      });
    }

    const { currentContext } = predictNeedsSchema.parse(req.body);
    
    const predictions = await memoryService.predictUserNeeds(userId, currentContext);

    console.log(`🧠 [MEMORY-API] Generated ${predictions.length} predictions for user ${userId}`);

    res.json({
      success: true,
      predictions
    });

  } catch (error) {
    console.error('❌ [MEMORY-API] Error predicting needs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error prediciendo necesidades'
    });
  }
});

/**
 * POST /api/memory/update-context
 * Actualizar memoria contextual
 */
router.post('/update-context', async (req, res) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: 'User ID requerido en headers' 
      });
    }

    const { contextType, entities, importance } = updateContextSchema.parse(req.body);
    
    const context = await memoryService.updateContextualMemory(
      userId,
      contextType,
      entities,
      importance
    );

    console.log(`🧠 [MEMORY-API] Updated context for user ${userId}: ${contextType}`);

    res.json({
      success: true,
      context: {
        id: context.id,
        contextId: context.contextId,
        contextType: context.contextType,
        scope: context.scope,
        importance: context.importance,
        createdAt: context.createdAt
      }
    });

  } catch (error) {
    console.error('❌ [MEMORY-API] Error updating context:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error actualizando contexto'
    });
  }
});

/**
 * GET /api/memory/learning-insights/:userId
 * Obtener insights de aprendizaje del usuario
 */
router.get('/learning-insights/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const insights = await memoryService.getLearningInsights(userId);

    console.log(`🧠 [MEMORY-API] Retrieved learning insights for user ${userId}: ${insights.adaptationLevel}`);

    res.json({
      success: true,
      insights
    });

  } catch (error) {
    console.error('❌ [MEMORY-API] Error getting learning insights:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Error obteniendo insights de aprendizaje'
    });
  }
});

/**
 * POST /api/memory/optimization-feedback
 * Proporcionar feedback sobre una optimización aplicada
 */
router.post('/optimization-feedback', async (req, res) => {
  try {
    const { suggestionId, feedbackScore, applied } = req.body;
    
    if (!suggestionId || (!feedbackScore && applied === undefined)) {
      return res.status(400).json({
        success: false,
        error: 'suggestionId y feedbackScore o applied son requeridos'
      });
    }

    // Aquí se implementaría la lógica para actualizar el feedback
    // Por ahora retornamos éxito
    console.log(`🧠 [MEMORY-API] Received feedback for suggestion ${suggestionId}: ${feedbackScore || (applied ? 'applied' : 'rejected')}`);

    res.json({
      success: true,
      message: 'Feedback registrado exitosamente'
    });

  } catch (error) {
    console.error('❌ [MEMORY-API] Error processing feedback:', error);
    res.status(500).json({
      success: false,
      error: 'Error procesando feedback'
    });
  }
});

/**
 * POST /api/memory/cleanup
 * Limpiar memoria antigua (admin endpoint)
 */
router.post('/cleanup', async (req, res) => {
  try {
    // Verificar permisos de admin aquí si es necesario
    
    await memoryService.cleanupOldMemory();

    console.log('🧹 [MEMORY-API] Memory cleanup completed');

    res.json({
      success: true,
      message: 'Limpieza de memoria completada'
    });

  } catch (error) {
    console.error('❌ [MEMORY-API] Error during cleanup:', error);
    res.status(500).json({
      success: false,
      error: 'Error durante limpieza de memoria'
    });
  }
});

export default router;