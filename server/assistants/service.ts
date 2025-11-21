/**
 * ASSISTANTS SERVICE - GESTIÓN DE THREADS Y MENSAJES
 * 
 * Servicio principal para interactuar con OpenAI Assistants API
 * Maneja creación de threads, envío de mensajes, y streaming de respuestas
 */

import { openai, getMervinAssistant, createMervinAssistant } from './config';
import { TOOL_DEFINITIONS } from './tools-registry';
import { buildContextualInstructions } from './context-builder';
import type { 
  UserContext,
  CreateThreadParams,
  CreateThreadResponse,
  SendMessageParams
} from './types';

/**
 * Crear thread para nueva conversación
 */
export async function createThread(params: CreateThreadParams): Promise<CreateThreadResponse> {
  try {
    // Obtener o crear assistant
    let assistantId = await getMervinAssistant();
    
    if (!assistantId) {
      // Crear assistant con herramientas
      assistantId = await createMervinAssistant(TOOL_DEFINITIONS);
    }

    // Crear thread
    const thread = await openai.beta.threads.create({
      metadata: {
        userId: params.userContext.userId,
        subscriptionPlan: params.userContext.subscriptionPlan,
        language: params.userContext.language
      }
    });

    console.log('✅ [ASSISTANTS] Created thread:', thread.id, 'for user:', params.userContext.userId);

    // Si hay mensaje inicial, agregarlo
    if (params.initialMessage) {
      await openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: params.initialMessage
      });
    }

    return {
      threadId: thread.id,
      assistantId: assistantId
    };
  } catch (error: any) {
    console.error('❌ [ASSISTANTS] Error creating thread:', error);
    throw new Error(`Failed to create thread: ${error.message}`);
  }
}

/**
 * Enviar mensaje en un thread existente
 */
export async function sendMessage(params: SendMessageParams) {
  try {
    const assistantId = await getMervinAssistant();
    if (!assistantId) {
      throw new Error('Assistant not initialized');
    }

    // 👁️ Construir instrucciones contextuales si hay pageContext
    let contextualInstructions = '';
    if (params.pageContext && params.pageContext.type !== 'none') {
      contextualInstructions = buildContextualInstructions(params.pageContext);
      console.log('👁️ [ASSISTANTS] Agregando contexto de página:', params.pageContext.type);
    }

    // Agregar mensaje del usuario (con contexto si aplica)
    const messageContent = contextualInstructions 
      ? `${params.message}${contextualInstructions}`
      : params.message;

    await openai.beta.threads.messages.create(params.threadId, {
      role: 'user',
      content: messageContent
    });

    console.log('📤 [ASSISTANTS] Message sent to thread:', params.threadId);
    if (contextualInstructions) {
      console.log('👁️ [ASSISTANTS] Con instrucciones contextuales incluidas');
    }

    // Crear run (iniciar procesamiento)
    const run = await openai.beta.threads.runs.create(params.threadId, {
      assistant_id: assistantId,
      metadata: {
        userId: params.userContext.userId,
        language: params.userContext.language,
        pageContext: params.pageContext ? JSON.stringify(params.pageContext) : undefined
      }
    });

    console.log('🏃 [ASSISTANTS] Run created:', run.id);

    return {
      runId: run.id,
      threadId: params.threadId
    };
  } catch (error: any) {
    console.error('❌ [ASSISTANTS] Error sending message:', error);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

/**
 * Obtener mensajes de un thread
 */
export async function getThreadMessages(threadId: string) {
  try {
    const messages = await openai.beta.threads.messages.list(threadId, {
      order: 'asc'
    });

    return messages.data.map(msg => ({
      id: msg.id,
      role: msg.role,
      content: msg.content.map(c => {
        if (c.type === 'text') {
          return { type: 'text', text: c.text.value };
        }
        return { type: c.type };
      }),
      createdAt: msg.created_at
    }));
  } catch (error: any) {
    console.error('❌ [ASSISTANTS] Error getting messages:', error);
    throw new Error(`Failed to get messages: ${error.message}`);
  }
}

/**
 * Cancelar un run
 */
export async function cancelRun(threadId: string, runId: string) {
  try {
    await openai.beta.threads.runs.cancel(threadId, runId);
    console.log('❌ [ASSISTANTS] Run cancelled:', runId);
  } catch (error: any) {
    console.error('❌ [ASSISTANTS] Error cancelling run:', error);
  }
}

/**
 * Obtener estado de un run
 */
export async function getRunStatus(threadId: string, runId: string) {
  try {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);
    return {
      status: run.status,
      completedAt: run.completed_at,
      failedAt: run.failed_at,
      lastError: run.last_error
    };
  } catch (error: any) {
    console.error('❌ [ASSISTANTS] Error getting run status:', error);
    throw new Error(`Failed to get run status: ${error.message}`);
  }
}
