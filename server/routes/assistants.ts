/**
 * ASSISTANTS API ROUTES
 * 
 * Endpoints para interactuar con OpenAI Assistants API
 * Reemplaza WebSocket/HTTP custom con arquitectura más confiable
 */

import express, { type Request, type Response } from 'express';
import { openai, getMervinAssistant } from '../assistants/config';
import { createThread, sendMessage, getThreadMessages, cancelRun } from '../assistants/service';
import { getToolExecutor, requiresConfirmation } from '../assistants/tools-registry';
import { verifyFirebaseToken } from '../middleware/authMiddleware';
import type { UserContext } from '../assistants/types';

const router = express.Router();

/**
 * Middleware para extraer user context desde Firebase token
 */
async function extractUserContext(req: Request): Promise<UserContext> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing authorization header');
  }

  const token = authHeader.substring(7);
  const decodedToken = await verifyFirebaseToken(token);
  
  return {
    userId: decodedToken.uid,
    email: decodedToken.email,
    subscriptionPlan: 'premium', // TODO: Get from database
    permissions: [], // TODO: Get from database
    language: (req.body.language || 'es') as 'es' | 'en'
  };
}

/**
 * POST /api/assistant/thread
 * Crear nuevo thread para conversación
 */
router.post('/thread', async (req: Request, res: Response) => {
  try {
    const userContext = await extractUserContext(req);
    const { initialMessage } = req.body;

    const thread = await createThread({
      userContext,
      initialMessage
    });

    res.json({
      success: true,
      threadId: thread.threadId,
      assistantId: thread.assistantId
    });
  } catch (error: any) {
    console.error('❌ [ASSISTANTS-API] Error creating thread:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/assistant/message
 * Enviar mensaje (sin streaming)
 */
router.post('/message', async (req: Request, res: Response) => {
  try {
    const userContext = await extractUserContext(req);
    const { threadId, message } = req.body;

    if (!threadId || !message) {
      return res.status(400).json({
        success: false,
        error: 'threadId and message are required'
      });
    }

    const result = await sendMessage({
      threadId,
      message,
      userContext
    });

    // Esperar a que complete (polling simple)
    let run = await openai.beta.threads.runs.retrieve(threadId, result.runId);
    let attempts = 0;
    const maxAttempts = 60; // 60 segundos máximo

    while (run.status === 'in_progress' || run.status === 'queued') {
      if (attempts++ > maxAttempts) {
        throw new Error('Run timeout');
      }
      
      // Esperar 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(threadId, result.runId);

      // Si requiere action (tool call), ejecutarla
      if (run.status === 'requires_action' && run.required_action) {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          if (toolCall.type === 'function') {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            
            console.log(`🔧 [ASSISTANTS] Executing tool: ${toolName}`, args);

            const executor = getToolExecutor(toolName);
            if (!executor) {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: `Tool ${toolName} not found` })
              });
              continue;
            }

            try {
              const result = await executor(args, userContext);
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(result)
              });
            } catch (error: any) {
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: error.message })
              });
            }
          }
        }

        // Enviar outputs de tools
        await openai.beta.threads.runs.submitToolOutputs(
          threadId,
          result.runId,
          { tool_outputs: toolOutputs }
        );

        // Continuar polling
        run = await openai.beta.threads.runs.retrieve(threadId, result.runId);
      }
    }

    if (run.status === 'failed') {
      throw new Error(`Run failed: ${run.last_error?.message}`);
    }

    // Obtener mensajes
    const messages = await getThreadMessages(threadId);
    const lastMessage = messages[messages.length - 1];

    res.json({
      success: true,
      response: lastMessage,
      runStatus: run.status
    });
  } catch (error: any) {
    console.error('❌ [ASSISTANTS-API] Error sending message:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/assistant/messages/:threadId
 * Obtener mensajes de un thread
 */
router.get('/messages/:threadId', async (req: Request, res: Response) => {
  try {
    await extractUserContext(req); // Verificar auth
    
    const { threadId } = req.params;
    const messages = await getThreadMessages(threadId);

    res.json({
      success: true,
      messages
    });
  } catch (error: any) {
    console.error('❌ [ASSISTANTS-API] Error getting messages:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/assistant/cancel
 * Cancelar run activo
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    await extractUserContext(req); // Verificar auth
    
    const { threadId, runId } = req.body;
    await cancelRun(threadId, runId);

    res.json({
      success: true
    });
  } catch (error: any) {
    console.error('❌ [ASSISTANTS-API] Error cancelling run:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
