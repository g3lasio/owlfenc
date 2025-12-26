/**
 * MERVIN CONVERSATIONAL API ROUTES
 * 
 * Endpoints para el nuevo orquestador conversacional con Claude.
 * 
 * Endpoints:
 * - POST /api/mervin-conversational/message - Procesar mensaje conversacional
 * - POST /api/mervin-conversational/ocr - Procesar imagen con OCR
 * - GET /api/mervin-conversational/conversation/:id - Obtener estado de conversación
 * - DELETE /api/mervin-conversational/conversation/:id - Limpiar conversación
 */

import express, { Request, Response } from 'express';
import admin from 'firebase-admin';
import { MervinConversationalOrchestrator } from '../mervin-v2/orchestrator/MervinConversationalOrchestrator';
import { conversationStateManager } from '../mervin-v2/services/ConversationStateManager';

const router = express.Router();

// Parse JSON bodies
router.use(express.json({ limit: '10mb' }));

/**
 * POST /api/mervin-conversational/message
 * Procesar mensaje conversacional con Claude
 */
router.post('/message', async (req: Request, res: Response) => {
  const startTime = Date.now();
  console.log('💬 [MERVIN-CONVERSATIONAL-API] Message request received');
  
  try {
    // Validar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    let authenticatedUserId: string;
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      authenticatedUserId = decodedToken.uid;
      console.log(`✅ [MERVIN-CONVERSATIONAL-API] User authenticated: ${authenticatedUserId}`);
    } catch (error: any) {
      console.error('❌ [MERVIN-CONVERSATIONAL-API] Invalid token:', error.message);
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const { input, conversationId, attachments } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Missing input' });
    }

    console.log(`📝 [MERVIN-CONVERSATIONAL-API] Input: "${input.substring(0, 50)}..."`);
    console.log(`👤 [MERVIN-CONVERSATIONAL-API] User: ${authenticatedUserId}`);
    if (conversationId) {
      console.log(`💬 [MERVIN-CONVERSATIONAL-API] Conversation: ${conversationId}`);
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

    // Crear orchestrator
    const baseURL = process.env.BASE_URL || 'http://localhost:5000';
    const orchestrator = new MervinConversationalOrchestrator(
      authenticatedUserId,
      authHeaders,
      baseURL
    );

    // Procesar mensaje
    const response = await orchestrator.processMessage({
      input,
      userId: authenticatedUserId,
      conversationId,
      attachments
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ [MERVIN-CONVERSATIONAL-API] Response generated in ${elapsed}ms`);
    console.log(`📦 [MERVIN-CONVERSATIONAL-API] Response type: ${response.type}`);

    // Enviar respuesta
    res.json({
      success: true,
      ...response
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-CONVERSATIONAL-API] Error:', error.message);
    console.error(error.stack);
    
    res.status(500).json({
      success: false,
      error: error.message,
      type: 'error'
    });
  }
});

/**
 * POST /api/mervin-conversational/ocr
 * Procesar imagen con OCR
 */
router.post('/ocr', async (req: Request, res: Response) => {
  console.log('📷 [MERVIN-CONVERSATIONAL-API] OCR request received');
  
  try {
    // Validar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    let authenticatedUserId: string;
    
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      authenticatedUserId = decodedToken.uid;
    } catch (error: any) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }

    const { imageData, imageType, prompt } = req.body;

    if (!imageData || !imageType) {
      return res.status(400).json({ error: 'Missing imageData or imageType' });
    }

    console.log(`📷 [MERVIN-CONVERSATIONAL-API] Processing image: ${imageType}`);

    // Importar claudeEngine
    const { claudeEngine } = await import('../mervin-v2/ai/ClaudeConversationalEngine');

    // Procesar imagen
    const extractedText = await claudeEngine.processImageWithOCR(
      imageData,
      imageType,
      prompt || 'Extract all text from this image'
    );

    console.log(`✅ [MERVIN-CONVERSATIONAL-API] OCR completed`);
    console.log(`📝 [MERVIN-CONVERSATIONAL-API] Extracted text length: ${extractedText.length}`);

    res.json({
      success: true,
      extractedText
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-CONVERSATIONAL-API] OCR error:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/mervin-conversational/conversation/:id
 * Obtener estado de conversación
 */
router.get('/conversation/:id', async (req: Request, res: Response) => {
  try {
    // Validar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    await admin.auth().verifyIdToken(token);

    const conversationId = req.params.id;
    const summary = conversationStateManager.getSummary(conversationId);

    if (!summary) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json({
      success: true,
      conversation: summary
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-CONVERSATIONAL-API] Error getting conversation:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/mervin-conversational/conversation/:id
 * Limpiar conversación
 */
router.delete('/conversation/:id', async (req: Request, res: Response) => {
  try {
    // Validar autenticación
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    await admin.auth().verifyIdToken(token);

    const conversationId = req.params.id;
    conversationStateManager.clearConversation(conversationId);

    res.json({
      success: true,
      message: 'Conversation cleared'
    });

  } catch (error: any) {
    console.error('❌ [MERVIN-CONVERSATIONAL-API] Error clearing conversation:', error.message);
    
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
