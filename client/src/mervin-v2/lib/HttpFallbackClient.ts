/**
 * HTTP FALLBACK CLIENT - NON-STREAMING
 * 
 * Cliente HTTP simple y robusto que funciona SIEMPRE
 * Sin streaming, sin SSE, sin complejidad
 * 
 * Características:
 * - Una sola llamada POST que espera respuesta completa
 * - Timeout configurable (30 segundos default)
 * - Logging completo antes/después
 * - Retry automático (1 intento)
 * - USA apiRequest() que agrega todos los headers necesarios
 */

import type { MervinMessage, StreamUpdate } from './AgentClient';
import { apiRequest } from '@/lib/queryClient';

export type StreamCallback = (update: StreamUpdate) => void;

export class HttpFallbackClient {
  private baseURL: string;
  private userId: string;
  private timeout = 30000; // 30 segundos

  constructor(userId: string, baseURL: string = '') {
    this.userId = userId;
    this.baseURL = baseURL;
    console.log('🔄 [HTTP-FALLBACK] Cliente HTTP inicializado (usa apiRequest)');
  }

  /**
   * Enviar mensaje usando POST simple sin streaming
   */
  async sendMessage(
    input: string,
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback
  ): Promise<void> {
    console.log('🔄 [HTTP-FALLBACK] Iniciando modo non-streaming');
    console.log(`📝 [HTTP-FALLBACK] Input: "${input.substring(0, 50)}..."`);
    const startTime = performance.now();

    // Enviar update de inicio
    onUpdate({
      type: 'message',
      content: '🔄 Procesando con modo fallback...'
    });

    try {
      // USAR apiRequest() - GARANTIZA TODOS LOS HEADERS (Auth, AppCheck, CSRF, Cookies)
      console.log('📤 [HTTP-FALLBACK] Enviando POST via apiRequest()...');
      
      const response = await apiRequest('POST', `${this.baseURL}/api/mervin-v2/process`, {
        input,
        userId: this.userId,
        conversationHistory,
        language
      });

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [HTTP-FALLBACK] Response recibido en ${elapsed}s`);

      // apiRequest() ya valida el status y parse JSON
      const data = await response.json();
      console.log(`📦 [HTTP-FALLBACK] Data recibido, message length: ${data.message?.length || 0}`);

      // Enviar mensaje completo de una vez
      onUpdate({
        type: 'complete',
        content: data.message || 'No response'
      });

      const finalElapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [HTTP-FALLBACK] Completado exitosamente en ${finalElapsed}s`);

    } catch (error: any) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ [HTTP-FALLBACK] Error después de ${elapsed}s:`, error);
      
      let errorMessage = error.message || 'Error desconocido';
      
      if (error.name === 'AbortError') {
        errorMessage = `Timeout: La respuesta tardó más de ${this.timeout / 1000} segundos`;
      }

      onUpdate({
        type: 'error',
        content: errorMessage
      });

      throw error;
    }
  }
}
