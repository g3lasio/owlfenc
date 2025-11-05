/**
 * MERVIN V2 API ROUTES
 * 
 * Endpoints principales:
 * - POST /api/mervin-v2/process - Procesar mensaje del usuario
 * - POST /api/mervin-v2/stream - Procesar con streaming SSE
 */

import express, { Request, Response } from 'express';
import { MervinOrchestrator } from '../mervin-v2/orchestrator/MervinOrchestrator';
import { ProgressStreamService } from '../mervin-v2/services/ProgressStreamService';
import type { MervinRequest } from '../mervin-v2/types/mervin-types';

const router = express.Router();

/**
 * POST /api/mervin-v2/process
 * Procesar mensaje del usuario (respuesta JSON normal)
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    const { input, userId, conversationHistory, language }: MervinRequest = req.body;

    // Validación
    if (!input || !userId) {
      return res.status(400).json({
        error: 'Se requiere input y userId'
      });
    }

    console.log('📨 [MERVIN-V2-API] Request recibido:', { userId, input: input.substring(0, 50) });

    // Crear orquestador
    const orchestrator = new MervinOrchestrator(userId);

    // Procesar
    const response = await orchestrator.process({
      input,
      userId,
      conversationHistory: conversationHistory || [],
      language: language || 'es'
    });

    console.log('✅ [MERVIN-V2-API] Response generado exitosamente');

    res.json(response);

  } catch (error: any) {
    console.error('❌ [MERVIN-V2-API] Error:', error);
    res.status(500).json({
      error: 'Error procesando mensaje',
      details: error.message
    });
  }
});

/**
 * POST /api/mervin-v2/stream
 * Procesar mensaje con streaming SSE (Server-Sent Events)
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { input, userId, conversationHistory, language }: MervinRequest = req.body;

    // Validación
    if (!input || !userId) {
      res.status(400).json({
        error: 'Se requiere input y userId'
      });
      return;
    }

    console.log('📡 [MERVIN-V2-STREAM] Request recibido:', { userId, input: input.substring(0, 50) });

    // Crear orquestador
    const orchestrator = new MervinOrchestrator(userId);

    // Configurar streaming
    const progressService = new ProgressStreamService();
    progressService.initializeStream(res);
    orchestrator.setProgressStream(progressService);

    // Procesar (streaming en progreso)
    const response = await orchestrator.process({
      input,
      userId,
      conversationHistory: conversationHistory || [],
      language: language || 'es'
    });

    // Ya no necesito enviar nada más, el stream ya se cerró
    console.log('✅ [MERVIN-V2-STREAM] Streaming completado');

  } catch (error: any) {
    console.error('❌ [MERVIN-V2-STREAM] Error:', error);
    
    // Si el stream no se inició, enviar error JSON
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error procesando mensaje',
        details: error.message
      });
    }
  }
});

/**
 * GET /api/mervin-v2/health
 * Health check del servicio V2
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    services: {
      chatgpt: !!process.env.OPENAI_API_KEY,
      claude: !!process.env.ANTHROPIC_API_KEY,
      systemAPI: true,
      webSearch: !!(process.env.TAVILY_API_KEY || process.env.EXA_API_KEY),
      streaming: true
    }
  });
});

/**
 * GET /api/mervin-v2/status
 * Estado detallado del sistema
 */
router.get('/status', (req: Request, res: Response) => {
  res.json({
    version: '2.0.0',
    architecture: 'Hybrid Intelligence',
    capabilities: {
      tasks: ['estimate', 'contract', 'permit', 'property', 'conversation', 'research'],
      aiProviders: ['ChatGPT-4o', 'Claude Sonnet 4'],
      features: [
        'Quick intent analysis',
        'Parameter extraction',
        'Task execution via existing endpoints',
        'Professional response generation',
        'Real-time progress streaming',
        'Web research',
        'Multi-language support (ES/EN)'
      ]
    },
    environment: {
      openaiConfigured: !!process.env.OPENAI_API_KEY,
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
      webSearchConfigured: !!(process.env.TAVILY_API_KEY || process.env.EXA_API_KEY)
    }
  });
});

export default router;
