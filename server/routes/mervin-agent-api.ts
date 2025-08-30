/**
 * MERVIN AGENT API - ENDPOINT UNIFICADO
 * 
 * Este es el endpoint principal que conecta el frontend agente
 * con el sistema backend unificado de Mervin AI.
 * 
 * Funcionalidades:
 * 1. Chatbot superinteligente de construcción
 * 2. Sistema de ejecución de tareas (Jarvis)
 * 3. Investigación web en tiempo real
 */

import express, { Request, Response } from 'express';
import { MervinChatOrchestrator, MervinRequest, MervinResponse } from '../ai/MervinChatOrchestrator';
import { z } from 'zod';
import { verifyFirebaseAuth } from '../middleware/firebase-auth';
import { userMappingService } from '../services/userMappingService';

const router = express.Router();

// Validación del schema de request
const mervinRequestSchema = z.object({
  input: z.string().min(1, 'Input es requerido'),
  userId: z.string().min(1, 'User ID es requerido'),
  conversationHistory: z.array(z.any()).default([]),
  agentMode: z.enum(['intelligent', 'executor']).default('intelligent'),
  requiresWebResearch: z.boolean().optional(),
  taskType: z.enum(['estimate', 'contract', 'permit', 'property', 'general']).optional()
});

// Inicializar el orquestador una sola vez
let orchestrator: MervinChatOrchestrator | null = null;

function getOrchestrator(): MervinChatOrchestrator {
  if (!orchestrator) {
    orchestrator = new MervinChatOrchestrator();
  }
  return orchestrator;
}

/**
 * POST /api/mervin/process
 * Endpoint principal para procesar requests de Mervin AI
 * 🔐 CRITICAL SECURITY FIX: Agregado verifyFirebaseAuth para proteger sistema Mervin AI
 */
router.post('/process', verifyFirebaseAuth, async (req: Request, res: Response) => {
  console.log('🤖 [MERVIN-API] Nueva request recibida');
  console.log('📝 [MERVIN-API] Body:', JSON.stringify(req.body, null, 2));

  try {
    // 🔐 CRITICAL SECURITY FIX: Solo usuarios autenticados pueden usar Mervin AI
    const firebaseUid = req.firebaseUser?.uid;
    if (!firebaseUid) {
      return res.status(401).json({ 
        success: false,
        error: 'Usuario no autenticado' 
      });
    }
    let userId = await userMappingService.getInternalUserId(firebaseUid);
    if (!userId) {
      userId = await userMappingService.createMapping(firebaseUid, req.firebaseUser?.email || `${firebaseUid}@firebase.auth`);
    }
    if (!userId) {
      return res.status(500).json({ 
        success: false,
        error: 'Error creando mapeo de usuario' 
      });
    }
    console.log(`🔐 [SECURITY] Processing Mervin request for REAL user_id: ${userId}`);
    
    // Validar el request (usar userId autenticado)
    const validatedRequest = mervinRequestSchema.parse({...req.body, userId: userId.toString()});
    
    console.log(`🧠 [MERVIN-API] Procesando para usuario: ${validatedRequest.userId}`);
    console.log(`🎯 [MERVIN-API] Modo: ${validatedRequest.agentMode}`);
    console.log(`💬 [MERVIN-API] Input: "${validatedRequest.input.substring(0, 100)}..."`);

    // Obtener el orquestador y procesar el request
    const mervinOrchestrator = getOrchestrator();
    const mervinRequest: MervinRequest = {
      input: validatedRequest.input,
      userId: validatedRequest.userId,
      conversationHistory: validatedRequest.conversationHistory,
      agentMode: validatedRequest.agentMode,
      requiresWebResearch: validatedRequest.requiresWebResearch,
      taskType: validatedRequest.taskType
    };

    // Procesar con el orquestador unificado
    const response: MervinResponse = await mervinOrchestrator.processRequest(mervinRequest);
    
    console.log('✅ [MERVIN-API] Respuesta generada exitosamente');
    console.log(`📤 [MERVIN-API] Respuesta: "${response.conversationalResponse.substring(0, 100)}..."`);

    // Responder con el formato esperado por el frontend
    res.json({
      success: true,
      data: {
        message: response.conversationalResponse,
        conversationalResponse: response.conversationalResponse,
        taskExecution: response.taskExecution,
        constructionKnowledge: response.constructionKnowledge,
        webResearchData: response.webResearchData,
        languageProfile: response.languageProfile,
        // Compatibilidad con el sistema existente
        isConversational: !response.taskExecution?.requiresExecution,
        type: response.taskExecution?.requiresExecution ? 'task' : 'conversation'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-API] Error procesando request:', error);
    
    // Respuesta de error estructurada
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: 'Datos de entrada inválidos',
        details: error.issues,
        timestamp: new Date().toISOString()
      });
    }

    // Error interno del servidor
    res.status(500).json({
      success: false,
      error: 'Error interno procesando la solicitud',
      data: {
        message: 'Órale, primo, tuve un problemita técnico. ¿Puedes intentar de nuevo?',
        conversationalResponse: 'Órale, primo, tuve un problemita técnico. ¿Puedes intentar de nuevo?',
        isConversational: true,
        type: 'error'
      },
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/mervin/health
 * Health check del sistema Mervin AI
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const orchestrator = getOrchestrator();
    
    // Test básico de funcionalidad
    const testResponse = await orchestrator.processRequest({
      input: 'test',
      userId: 'test-user',
      conversationHistory: [],
      agentMode: 'intelligent'
    });

    res.json({
      success: true,
      status: 'healthy',
      services: {
        orchestrator: 'operational',
        anthropic: process.env.ANTHROPIC_API_KEY ? 'configured' : 'missing',
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
      },
      timestamp: new Date().toISOString(),
      testResponse: testResponse.conversationalResponse ? 'successful' : 'failed'
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-API] Health check failed:', error);
    
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/mervin/research
 * Endpoint específico para investigación web
 */
router.post('/research', async (req: Request, res: Response) => {
  try {
    const { topic, query, userId } = req.body;
    
    if (!topic || !query || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren topic, query y userId'
      });
    }

    console.log(`🌐 [MERVIN-API] Investigación web solicitada: ${topic}`);

    const orchestrator = getOrchestrator();
    const response = await orchestrator.processRequest({
      input: query,
      userId,
      conversationHistory: [],
      agentMode: 'intelligent',
      requiresWebResearch: true
    });

    res.json({
      success: true,
      data: {
        webResearchData: response.webResearchData,
        insights: response.constructionKnowledge,
        conversationalResponse: response.conversationalResponse
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-API] Error en investigación web:', error);
    res.status(500).json({
      success: false,
      error: 'Error realizando investigación web',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/mervin/execute-task
 * Endpoint específico para ejecución de tareas
 */
router.post('/execute-task', async (req: Request, res: Response) => {
  try {
    const { taskType, input, userId, parameters } = req.body;
    
    if (!taskType || !input || !userId) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren taskType, input y userId'
      });
    }

    console.log(`⚡ [MERVIN-API] Ejecución de tarea solicitada: ${taskType}`);

    const orchestrator = getOrchestrator();
    const response = await orchestrator.processRequest({
      input,
      userId,
      conversationHistory: [],
      agentMode: 'executor',
      taskType: taskType as any
    });

    res.json({
      success: true,
      data: {
        taskExecution: response.taskExecution,
        conversationalResponse: response.conversationalResponse,
        constructionKnowledge: response.constructionKnowledge
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-API] Error ejecutando tarea:', error);
    res.status(500).json({
      success: false,
      error: 'Error ejecutando la tarea',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/mervin/capabilities
 * Lista las capacidades disponibles del sistema
 */
router.get('/capabilities', (req: Request, res: Response) => {
  res.json({
    success: true,
    capabilities: {
      conversational: {
        description: 'Chatbot superinteligente de construcción',
        features: [
          'Conocimiento técnico profundo',
          'Personalidad mexicana norteña auténtica',
          'Análisis contextual avanzado',
          'Respuestas específicas al contenido'
        ]
      },
      webResearch: {
        description: 'Investigación web en tiempo real',
        features: [
          'Búsqueda de precios actualizados',
          'Regulaciones y códigos recientes',
          'Tendencias de la industria',
          'Análisis de mercado'
        ]
      },
      taskExecution: {
        description: 'Sistema de ejecución automática de tareas',
        features: [
          'Generación de estimados',
          'Creación de contratos',
          'Análisis de permisos',
          'Verificación de propiedades'
        ]
      },
      constructionExpertise: {
        description: 'Conocimiento especializado en construcción',
        features: [
          'Materiales y especificaciones',
          'Códigos de construcción',
          'Mejores prácticas',
          'Consideraciones legales'
        ]
      }
    },
    endpoints: {
      '/process': 'Endpoint principal unificado',
      '/research': 'Investigación web específica',
      '/execute-task': 'Ejecución de tareas específicas',
      '/health': 'Verificación de estado del sistema',
      '/capabilities': 'Lista de capacidades disponibles'
    },
    models: {
      anthropic: 'claude-sonnet-4-20250514 (Investigación + Conocimiento)',
      openai: 'gpt-4o (Conversación + Tareas)'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;