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
import { adminAuth } from '../firebase-admin';
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
  const decodedToken = await adminAuth.verifyIdToken(token);
  
  return {
    userId: decodedToken.uid,
    email: decodedToken.email,
    subscriptionPlan: 'premium', // TODO: Get from database
    permissions: [], // TODO: Get from database
    language: (req.body.language || 'es') as 'es' | 'en',
    firebaseToken: token // 🔥 Incluir token para autenticación en requests internos
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

    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔄 [POLLING-LOOP] INICIANDO polling para run: ${result.runId}`);
    console.log(`   Thread: ${threadId}`);
    console.log(`   User: ${userContext.userId}`);
    console.log(`   Message: "${message.substring(0, 50)}..."`);
    console.log(`${'='.repeat(70)}\n`);

    // Esperar a que complete (polling simple)
    let run = await openai.beta.threads.runs.retrieve(threadId, result.runId);
    let attempts = 0;
    const maxAttempts = 60; // 60 segundos máximo
    const startTime = Date.now();

    console.log(`📊 [POLLING-LOOP] Status inicial: ${run.status}`);

    while (run.status === 'in_progress' || run.status === 'queued') {
      attempts++;
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      
      console.log(`🔄 [POLLING-LOOP] Iteración ${attempts}/${maxAttempts} (${elapsed}s transcurridos)`);
      console.log(`   Status actual: ${run.status}`);
      
      if (attempts > maxAttempts) {
        console.error(`\n❌ [POLLING-LOOP] TIMEOUT después de ${maxAttempts} intentos`);
        console.error(`   Thread: ${threadId}`);
        console.error(`   Run: ${result.runId}`);
        console.error(`   Último status: ${run.status}`);
        console.error(`   Tiempo transcurrido: ${elapsed}s\n`);
        throw new Error(`Run timeout después de ${maxAttempts}s - run stuck en ${run.status}`);
      }
      
      // Esperar 1 segundo
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Obtener nuevo status
      const previousStatus = run.status;
      run = await openai.beta.threads.runs.retrieve(threadId, result.runId);
      
      if (run.status !== previousStatus) {
        console.log(`   ⚡ Cambio de status: ${previousStatus} → ${run.status}`);
      }

      // Si requiere action (tool call), ejecutarla
      if (run.status === 'requires_action' && run.required_action) {
        const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
        console.log(`\n🔧 [TOOL-CALLS] Detectados ${toolCalls.length} tool call(s)`);
        
        const toolOutputs = [];

        for (const toolCall of toolCalls) {
          if (toolCall.type === 'function') {
            const toolName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            
            console.log(`   🔨 Ejecutando tool: ${toolName}`);
            console.log(`      Args:`, JSON.stringify(args, null, 2).substring(0, 200));

            const executor = getToolExecutor(toolName);
            if (!executor) {
              console.error(`   ❌ Tool "${toolName}" no encontrado en registry`);
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: `Tool ${toolName} not found` })
              });
              continue;
            }

            try {
              const toolResult = await executor(args, userContext);
              console.log(`   ✅ Tool "${toolName}" ejecutado exitosamente`);
              console.log(`      Result:`, JSON.stringify(toolResult, null, 2).substring(0, 200));
              
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify(toolResult)
              });
            } catch (error: any) {
              console.error(`   ❌ Error ejecutando tool "${toolName}":`, error.message);
              toolOutputs.push({
                tool_call_id: toolCall.id,
                output: JSON.stringify({ error: error.message })
              });
            }
          }
        }

        // Enviar outputs de tools
        console.log(`\n📤 [TOOL-CALLS] Enviando ${toolOutputs.length} tool output(s) a OpenAI...`);
        await openai.beta.threads.runs.submitToolOutputs(
          threadId,
          result.runId,
          { tool_outputs: toolOutputs }
        );
        console.log(`✅ [TOOL-CALLS] Tool outputs enviados correctamente\n`);

        // Continuar polling
        run = await openai.beta.threads.runs.retrieve(threadId, result.runId);
        console.log(`📊 [TOOL-CALLS] Nuevo status después de tool submission: ${run.status}`);
      }
    }

    const totalElapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n✅ [POLLING-LOOP] Run COMPLETADO en ${totalElapsed}s`);
    console.log(`   Status final: ${run.status}`);
    console.log(`   Total de iteraciones: ${attempts}\n`);

    if (run.status === 'failed') {
      console.error(`❌ [POLLING-LOOP] Run FAILED con error:`, run.last_error);
      throw new Error(`Run failed: ${run.last_error?.message}`);
    }

    if (run.status === 'cancelled') {
      console.error(`❌ [POLLING-LOOP] Run CANCELADO`);
      throw new Error('Run was cancelled');
    }

    if (run.status === 'expired') {
      console.error(`❌ [POLLING-LOOP] Run EXPIRADO`);
      throw new Error('Run expired');
    }

    // Obtener mensajes
    console.log(`📨 [MESSAGE-RETRIEVAL] Obteniendo mensajes del thread...`);
    const messages = await getThreadMessages(threadId);
    console.log(`   Total mensajes en thread: ${messages.length}`);
    
    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage) {
      console.error(`❌ [MESSAGE-RETRIEVAL] NO hay último mensaje`);
      console.error(`   Thread: ${threadId}`);
      console.error(`   Total messages: ${messages.length}`);
      throw new Error('No message found in thread');
    }
    
    console.log(`   Último mensaje:`);
    console.log(`      Role: ${lastMessage.role}`);
    console.log(`      Content items: ${lastMessage.content?.length || 0}`);
    
    if (lastMessage.content && lastMessage.content.length > 0) {
      const textContent = lastMessage.content.find((c: any) => c.type === 'text');
      if (textContent) {
        const textLength = textContent.text?.length || 0;
        const preview = textContent.text?.substring(0, 100) || '';
        console.log(`      Text length: ${textLength} caracteres`);
        console.log(`      Preview: "${preview}..."`);
      } else {
        console.warn(`⚠️ [MESSAGE-RETRIEVAL] Último mensaje NO tiene contenido de tipo 'text'`);
        console.warn(`      Content types:`, lastMessage.content.map((c: any) => c.type));
      }
    } else {
      console.error(`❌ [MESSAGE-RETRIEVAL] Último mensaje tiene content VACÍO`);
    }
    
    console.log(`${'='.repeat(70)}\n`);

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
