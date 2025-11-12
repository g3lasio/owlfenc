/**
 * MERVIN V2 API ROUTES
 * 
 * Endpoints principales:
 * - POST /api/mervin-v2/process - Procesar mensaje del usuario
 * - POST /api/mervin-v2/stream - Procesar con streaming SSE
 */

import express, { Request, Response } from 'express';
import admin from 'firebase-admin';
import multer from 'multer';
import { MervinOrchestratorV3 } from '../mervin-v2/orchestrator/MervinOrchestratorV3';
import { ProgressStreamService } from '../mervin-v2/services/ProgressStreamService';
import { FileProcessorService } from '../mervin-v2/services/FileProcessorService';
import type { MervinRequest, FileAttachment } from '../mervin-v2/types/mervin-types';

const router = express.Router();

// 🔧 CRITICAL: Parse JSON bodies for all mervin-v2 routes
// Without this, req.body is undefined and validation fails silently
router.use(express.json({ limit: '10mb' }));

/**
 * POST /api/mervin-v2/message - HTTP Fallback (Non-Streaming)
 * Endpoint simple y robusto que SIEMPRE funciona
 */
router.post('/message', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('🔄 [MERVIN-V2-HTTP] HTTP Fallback request recibido');
  
  try {
    // VALIDAR AUTENTICACIÓN (FIX SECURITY)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7); // Remove "Bearer "
    let authenticatedUserId: string;
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      authenticatedUserId = decodedToken.uid;
      console.log(`✅ [MERVIN-V2-HTTP] Usuario autenticado: ${authenticatedUserId}`);
    } catch (error: any) {
      console.error('❌ [MERVIN-V2-HTTP] Token inválido:', error.message);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const { input, conversationHistory = [], language = 'es' } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Missing input' });
    }

    console.log(`📝 [MERVIN-V2-HTTP] Input: "${input.substring(0, 50)}..."`);
    console.log(`👤 [MERVIN-V2-HTTP] User: ${authenticatedUserId}`);

    // Forward all auth headers to SystemAPIService (FIX 401 en servicios internos)
    const authHeaders: Record<string, string> = {};
    
    // Forward Firebase token
    if (req.headers.authorization) {
      authHeaders['authorization'] = req.headers.authorization;
    }
    
    // Forward session cookies
    if (req.headers.cookie) {
      authHeaders['cookie'] = req.headers.cookie;
    }
    
    // Forward any other auth-related headers
    ['x-firebase-appcheck', 'x-csrf-token'].forEach(header => {
      const value = req.headers[header];
      if (value) {
        authHeaders[header] = Array.isArray(value) ? value[0] : value;
      }
    });

    // Crear orchestrator con userId AUTENTICADO y headers de sesión
    const orchestrator = new MervinOrchestratorV3(authenticatedUserId, authHeaders);

    // Crear request con userId VERIFICADO
    const request: MervinRequest = {
      userId: authenticatedUserId, // USAR userId autenticado
      input,
      conversationHistory,
      language
    };

    // Procesar sin streaming
    const response = await orchestrator.process(request);
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ [MERVIN-V2-HTTP] Respuesta generada en ${elapsed}ms`);
    console.log(`📦 [MERVIN-V2-HTTP] Message length: ${response.message?.length || 0}`);

    // Enviar respuesta completa
    res.json({
      success: true,
      message: response.message,
      type: response.type,
      executionTime: response.executionTime
    });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ [MERVIN-V2-HTTP] Error después de ${elapsed}ms:`, error);
    
    res.status(500).json({
      error: error.message || 'Error procesando mensaje'
    });
  }
});

// Configurar multer para manejar archivos en memoria
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB por archivo
    files: 5 // Máximo 5 archivos
  }
});

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

    // Forward all auth headers to SystemAPIService
    const authHeaders: Record<string, string> = {};
    
    // Forward Firebase token if present
    if (req.headers.authorization) {
      authHeaders['authorization'] = req.headers.authorization;
    }
    
    // Forward session cookies
    if (req.headers.cookie) {
      authHeaders['cookie'] = req.headers.cookie;
    }
    
    // Forward any other auth-related headers
    ['x-firebase-appcheck', 'x-csrf-token'].forEach(header => {
      const value = req.headers[header];
      if (value) {
        authHeaders[header] = Array.isArray(value) ? value[0] : value;
      }
    });

    // Crear orquestador V3 con auth headers
    const orchestrator = new MervinOrchestratorV3(userId, authHeaders);

    // Procesar (V3 usa modo AGENT_SAFE por defecto)
    const response = await orchestrator.process({
      input,
      userId,
      conversationHistory: conversationHistory || [],
      language: language || 'es',
      // Modo por defecto: AGENT_SAFE (auto-ejecuta excepto contratos y acciones críticas)
      mode: {
        type: 'AGENT',
        autoExecute: true,
        requireConfirmationFor: ['create_contract', 'delete_*', 'send_email']
      }
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
    // 🛡️ DEFENSIVE VALIDATION: Check body BEFORE destructuring to avoid throw
    if (!req.body || Object.keys(req.body).length === 0) {
      console.error('❌ [MERVIN-V2-STREAM] VALIDATION FAILED: req.body is empty or undefined');
      console.error('   Headers:', JSON.stringify(req.headers, null, 2));
      res.status(400).json({
        error: 'Request body is empty - ensure Content-Type is application/json'
      });
      return;
    }

    const { input, userId, conversationHistory, language }: MervinRequest = req.body;

    // Validación
    if (!input || !userId) {
      console.error('❌ [MERVIN-V2-STREAM] VALIDATION FAILED: Missing required fields');
      console.error('   Received body:', JSON.stringify({ input: !!input, userId: !!userId, hasHistory: !!conversationHistory }));
      res.status(400).json({
        error: 'Se requiere input y userId'
      });
      return;
    }

    console.log('📡 [MERVIN-V2-STREAM] Request recibido:', { userId, input: input.substring(0, 50) });

    // Forward all auth headers to SystemAPIService
    const authHeaders: Record<string, string> = {};
    
    // Forward Firebase token if present
    if (req.headers.authorization) {
      authHeaders['authorization'] = req.headers.authorization;
    }
    
    // Forward session cookies
    if (req.headers.cookie) {
      authHeaders['cookie'] = req.headers.cookie;
    }
    
    // Forward any other auth-related headers
    ['x-firebase-appcheck', 'x-csrf-token'].forEach(header => {
      const value = req.headers[header];
      if (value) {
        authHeaders[header] = Array.isArray(value) ? value[0] : value;
      }
    });

    // Crear orquestador V3 con auth headers
    const orchestrator = new MervinOrchestratorV3(userId, authHeaders);

    // Configurar streaming
    const progressService = new ProgressStreamService();
    progressService.initializeStream(res);
    orchestrator.setProgressStream(progressService);

    // Procesar con streaming (V3 usa modo AGENT_SAFE por defecto)
    const response = await orchestrator.process({
      input,
      userId,
      conversationHistory: conversationHistory || [],
      language: language || 'es',
      // Modo por defecto: AGENT_SAFE
      mode: {
        type: 'AGENT',
        autoExecute: true,
        requireConfirmationFor: ['create_contract', 'delete_*', 'send_email']
      }
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
 * POST /api/mervin-v2/process-with-files
 * Procesar mensaje con archivos adjuntos
 */
router.post('/process-with-files', upload.array('files', 5), async (req: Request, res: Response) => {
  // Configurar timeout de 120 segundos
  req.setTimeout(120000);
  
  let progressService: ProgressStreamService | null = null;
  
  try {
    const files = req.files as Express.Multer.File[];
    const { input, userId, conversationHistory, language } = req.body;

    // Validación
    if (!input || !userId) {
      return res.status(400).json({
        error: 'Se requiere input y userId'
      });
    }

    console.log(`📨 [MERVIN-V2-FILES] Request con ${files?.length || 0} archivos`);
    console.log(`📝 [MERVIN-V2-FILES] Input: ${input.substring(0, 100)}...`);

    // Procesar archivos adjuntos
    const fileProcessor = new FileProcessorService();
    const attachments: FileAttachment[] = [];

    if (files && files.length > 0) {
      console.log('📎 [MERVIN-V2-FILES] Procesando archivos adjuntos...');
      
      for (const file of files) {
        try {
          console.log(`📄 [MERVIN-V2-FILES] Procesando: ${file.originalname} (${file.size} bytes)`);
          const processedFile = await fileProcessor.processFile(file);
          attachments.push(processedFile);
          console.log(`✅ [MERVIN-V2-FILES] Procesado: ${file.originalname} - ${processedFile.extractedText?.length || 0} chars`);
        } catch (error: any) {
          console.error(`❌ [MERVIN-V2-FILES] Error procesando ${file.originalname}:`, error.message);
          // Continuar con otros archivos
        }
      }
      
      console.log(`✅ [MERVIN-V2-FILES] ${attachments.length} archivos procesados correctamente`);
    }

    // Forward auth headers
    const authHeaders: Record<string, string> = {};
    
    if (req.headers.authorization) {
      authHeaders['authorization'] = req.headers.authorization;
    }
    
    if (req.headers.cookie) {
      authHeaders['cookie'] = req.headers.cookie;
    }
    
    ['x-firebase-appcheck', 'x-csrf-token'].forEach(header => {
      const value = req.headers[header];
      if (value) {
        authHeaders[header] = Array.isArray(value) ? value[0] : value;
      }
    });

    // Crear orquestrador V3
    const orchestrator = new MervinOrchestratorV3(userId, authHeaders);

    // Configurar streaming
    progressService = new ProgressStreamService();
    progressService.initializeStream(res);
    orchestrator.setProgressStream(progressService);

    // Parsear conversationHistory si viene como string
    let parsedHistory = [];
    if (conversationHistory) {
      try {
        parsedHistory = typeof conversationHistory === 'string' 
          ? JSON.parse(conversationHistory) 
          : conversationHistory;
      } catch (e) {
        console.error('⚠️ [MERVIN-V2-FILES] Error parsing conversationHistory:', e);
      }
    }

    console.log(`🚀 [MERVIN-V2-FILES] Iniciando procesamiento con ${attachments.length} archivos`);

    // Procesar con archivos adjuntos con timeout (con cleanup)
    let timeoutId: NodeJS.Timeout | undefined;
    let timedOut = false;
    
    const processPromise = orchestrator.process({
      input,
      userId,
      conversationHistory: parsedHistory,
      language: language || 'es',
      attachments,
      // Modo por defecto: AGENT_SAFE
      mode: {
        type: 'AGENT',
        autoExecute: true,
        requireConfirmationFor: ['create_contract', 'delete_*', 'send_email']
      }
    });

    // Timeout wrapper con cleanup
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        timedOut = true;
        reject(new Error('Request timeout after 120 seconds'));
      }, 120000);
    });

    try {
      await Promise.race([processPromise, timeoutPromise]);
      
      // Limpiar timeout si se completó exitosamente
      if (!timedOut && timeoutId) {
        clearTimeout(timeoutId);
      }
      
      console.log('✅ [MERVIN-V2-FILES] Procesamiento completado exitosamente');
    } catch (error) {
      // Limpiar timeout si hubo error
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      throw error;
    }

  } catch (error: any) {
    console.error('❌ [MERVIN-V2-FILES] Error:', error.message);
    console.error('❌ [MERVIN-V2-FILES] Stack:', error.stack);
    
    // Intentar enviar error al stream si está disponible
    if (progressService) {
      try {
        progressService.sendError(error.message);
      } catch (streamError) {
        console.error('❌ [MERVIN-V2-FILES] Error enviando al stream:', streamError);
      }
    }
    
    // Si los headers no se enviaron, enviar respuesta JSON
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Error procesando mensaje con archivos',
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
