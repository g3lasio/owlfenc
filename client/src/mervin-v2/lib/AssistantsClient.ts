/**
 * ASSISTANTS CLIENT - NUEVO CLIENTE BASADO EN OPENAI ASSISTANTS API
 * 
 * Reemplaza HybridAgentClient con arquitectura más confiable:
 * - Frontend comunica directamente con OpenAI vía backend proxy
 * - Sin WebSocket custom
 * - Streaming confiable usando SDK de OpenAI
 * - Backend ejecuta tools cuando necesario
 */

import { apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/firebase';
import type { AuthTokenProvider } from './AgentClient';

export interface AssistantsMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface StreamUpdate {
  type: 'text_delta' | 'tool_call_start' | 'tool_call_end' | 'complete' | 'error';
  content?: string;
  toolName?: string;
  data?: any;
  error?: string;
}

export type StreamCallback = (update: StreamUpdate) => void;

/**
 * Cliente para Assistants API
 */
export class AssistantsClient {
  private threadId: string | null = null;
  private assistantId: string | null = null;
  private userId: string;
  private getAuthToken: AuthTokenProvider | null;
  
  constructor(userId: string, getAuthToken: AuthTokenProvider | null = null) {
    this.userId = userId;
    this.getAuthToken = getAuthToken;
    
    console.log('🤖 [ASSISTANTS-CLIENT] Inicializado para usuario:', userId);
    console.log('   ✅ Usando OpenAI Assistants API');
    console.log('   ✅ Streaming confiable');
    console.log('   ✅ Sin WebSocket custom');
  }

  /**
   * Asegurar que hay usuario autenticado Y token válido antes de hacer requests
   * Incluye retry logic para esperar a que Firebase auth esté completamente listo
   */
  private async ensureAuthenticated(): Promise<void> {
    const maxRetries = 10; // 10 intentos
    const retryDelay = 300; // 300ms entre intentos = 3 segundos total

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      // Verificar que existe auth.currentUser
      if (auth.currentUser) {
        try {
          // CRÍTICO: Obtener token directamente de Firebase para garantizar que está disponible
          const token = await auth.currentUser.getIdToken(false); // false = usar cached si está fresco
          
          if (token) {
            console.log(`✅ [ASSISTANTS-AUTH] Usuario autenticado con token válido: ${this.userId}`);
            return; // Success! Tenemos usuario Y token
          }
        } catch (tokenError: any) {
          // Error obteniendo token, seguir intentando
          console.log(`⚠️ [ASSISTANTS-AUTH] Error obteniendo token (${attempt}/${maxRetries}):`, tokenError.message);
        }
      }

      // Si no está listo o falló obtener token, esperar y reintentar
      if (attempt < maxRetries) {
        console.log(`⏳ [ASSISTANTS-AUTH] Esperando auth completo (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    // Si llegamos aquí, auth no está disponible después de todos los intentos
    throw new Error('No se pudo autenticar. Por favor recarga la página e inicia sesión de nuevo.');
  }

  /**
   * Crear thread (solo si no existe)
   */
  private async ensureThread(): Promise<void> {
    if (this.threadId) {
      return;
    }

    // CRÍTICO: Asegurar autenticación antes de crear thread
    await this.ensureAuthenticated();

    console.log('🔧 [ASSISTANTS-CLIENT] Creando thread...');
    
    // apiRequest.post() automáticamente incluye auth headers desde Firebase
    const response = await apiRequest.post('/api/assistant/thread', {
      language: 'es'
    }) as { threadId: string; assistantId: string };

    this.threadId = response.threadId;
    this.assistantId = response.assistantId;
    
    console.log('✅ [ASSISTANTS-CLIENT] Thread creado:', this.threadId);
  }

  /**
   * Enviar mensaje con streaming
   * NOTA: Por ahora usa polling, después migraremos a SSE real
   */
  async sendMessageStream(
    input: string,
    conversationHistory: AssistantsMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback
  ): Promise<void> {
    console.log('\n' + '='.repeat(50));
    console.log('🤖 [ASSISTANTS-CLIENT] Nueva solicitud');
    console.log(`📝 Input: "${input.substring(0, 50)}..."`);
    console.log('='.repeat(50) + '\n');

    const startTime = performance.now();

    try {
      // CRÍTICO: Verificar autenticación primero
      await this.ensureAuthenticated();
      
      // Asegurar que existe thread
      await this.ensureThread();

      if (!this.threadId) {
        throw new Error('Failed to create thread');
      }

      // Enviar mensaje a través del backend
      console.log('📤 [ASSISTANTS-CLIENT] Enviando mensaje...');
      
      // Mostrar feedback inicial
      onUpdate({
        type: 'text_delta',
        content: '🤔 '
      });

      // apiRequest.post() automáticamente incluye auth headers desde Firebase
      const response = await apiRequest.post('/api/assistant/message', {
        threadId: this.threadId,
        message: input,
        language
      }) as {
        success: boolean;
        response: any;
        runStatus: string;
      };

      if (!response.success) {
        throw new Error('Failed to send message');
      }

      // Extraer respuesta del assistant
      const assistantMessage = response.response;
      if (assistantMessage?.content) {
        const textContent = assistantMessage.content.find((c: any) => c.type === 'text');
        if (textContent) {
          // Enviar respuesta completa
          onUpdate({
            type: 'text_delta',
            content: textContent.text
          });
        }
      }

      // Marcar como completo
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [ASSISTANTS-CLIENT] Completado en ${elapsed}s`);
      
      onUpdate({
        type: 'complete'
      });

    } catch (error: any) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ [ASSISTANTS-CLIENT] Error después de ${elapsed}s:`, error);
      
      // Mensaje de error amigable para problemas de autenticación
      let errorMessage = error.message || 'Error processing message';
      if (errorMessage.includes('autenticación') || errorMessage.includes('autenticado') || errorMessage.includes('token')) {
        errorMessage = 'Por favor inicia sesión de nuevo para continuar usando Mervin AI.';
      }
      
      onUpdate({
        type: 'error',
        content: errorMessage
      });

      throw error;
    }
  }

  /**
   * Obtener mensajes del thread
   */
  async getMessages(): Promise<AssistantsMessage[]> {
    if (!this.threadId) {
      return [];
    }

    try {
      // CRÍTICO: Asegurar autenticación antes de obtener mensajes
      await this.ensureAuthenticated();
      
      // apiRequest.get() automáticamente incluye auth headers desde Firebase
      const response = await apiRequest.get(`/api/assistant/messages/${this.threadId}`) as {
        success: boolean;
        messages: any[];
      };

      if (!response.success) {
        return [];
      }

      return response.messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content.map((c: any) => c.type === 'text' ? c.text : '').join('')
      }));
    } catch (error) {
      console.error('❌ [ASSISTANTS-CLIENT] Error getting messages:', error);
      return [];
    }
  }

  /**
   * Reset thread (crear nuevo)
   */
  resetThread(): void {
    console.log('🔄 [ASSISTANTS-CLIENT] Reseteando thread');
    this.threadId = null;
    this.assistantId = null;
  }

  /**
   * Obtener estado
   */
  getStatus(): {
    threadId: string | null;
    assistantId: string | null;
    isReady: boolean;
  } {
    return {
      threadId: this.threadId,
      assistantId: this.assistantId,
      isReady: !!this.threadId
    };
  }
}
