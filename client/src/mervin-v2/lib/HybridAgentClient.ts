/**
 * HYBRID AGENT CLIENT - SISTEMA A PRUEBA DE FALLOS
 * 
 * Sistema híbrido que combina:
 * ✔️ WebSocket como canal principal (rápido, real-time)
 * ✔️ HTTP Fallback automático (confiable, siempre funciona)
 * ✔️ Reconexión automática
 * ✔️ Timeouts estrictos
 * ✔️ Logging completo
 * 
 * NUNCA MÁS TRUNCACIÓN DE MENSAJES
 */

import { WebSocketAgentClient } from './WebSocketAgentClient';
import { HttpFallbackClient } from './HttpFallbackClient';
import type { MervinMessage, StreamUpdate, AuthTokenProvider } from './AgentClient';

export type StreamCallback = (update: StreamUpdate) => void;

export class HybridAgentClient {
  private wsClient: WebSocketAgentClient;
  private httpClient: HttpFallbackClient;
  private userId: string;
  private getAuthToken: AuthTokenProvider | null;
  private preferWebSocket = true;
  private wsFailureCount = 0;
  private maxWsFailures = 2;

  constructor(userId: string, baseURL: string = '', getAuthToken: AuthTokenProvider | null = null) {
    this.userId = userId;
    this.getAuthToken = getAuthToken;
    
    // Inicializar clientes CON AUTENTICACIÓN (FIX SECURITY)
    this.wsClient = new WebSocketAgentClient(userId, getAuthToken);
    this.httpClient = new HttpFallbackClient(userId, baseURL); // Usa apiRequest() con todos los headers
    
    console.log('🚀 [HYBRID-CLIENT] Sistema híbrido inicializado');
    console.log('   ✅ WebSocket: Activado (principal) + Auth:', getAuthToken ? 'SI' : 'NO');
    console.log('   ✅ HTTP Fallback: Activado (backup)');
  }

  /**
   * Enviar mensaje usando estrategia híbrida inteligente
   */
  async sendMessageStream(
    input: string,
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback
  ): Promise<void> {
    console.log('\n='.repeat(50));
    console.log('🤖 [HYBRID-CLIENT] Nueva solicitud');
    console.log(`📝 Input: "${input.substring(0, 50)}..."`);
    console.log(`🔀 Estrategia: ${this.preferWebSocket ? 'WebSocket → HTTP Fallback' : 'HTTP Fallback (WebSocket deshabilitado)'}`);
    console.log('='.repeat(50) + '\n');

    const startTime = performance.now();

    // Intentar WebSocket si está habilitado
    if (this.preferWebSocket && this.wsFailureCount < this.maxWsFailures) {
      try {
        console.log('🔌 [HYBRID-CLIENT] Intentando WebSocket...');
        
        await this.wsClient.sendMessageStream(
          input,
          conversationHistory,
          language,
          onUpdate
        );

        // Éxito - resetear contador de fallos
        this.wsFailureCount = 0;
        const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ [HYBRID-CLIENT] Éxito con WebSocket en ${elapsed}s\n`);
        return;

      } catch (wsError: any) {
        this.wsFailureCount++;
        console.error(`❌ [HYBRID-CLIENT] WebSocket falló (${this.wsFailureCount}/${this.maxWsFailures}):`, wsError.message);
        
        // Si llegamos al máximo de fallos, deshabilitar WebSocket
        if (this.wsFailureCount >= this.maxWsFailures) {
          this.preferWebSocket = false;
          console.warn(`⚠️ [HYBRID-CLIENT] WebSocket deshabilitado después de ${this.maxWsFailures} fallos`);
        }
        
        // Intentar fallback automático
        console.log('🔄 [HYBRID-CLIENT] Cambiando a HTTP Fallback...');
      }
    }

    // Usar HTTP Fallback
    try {
      console.log('🔄 [HYBRID-CLIENT] Usando HTTP Fallback');
      
      await this.httpClient.sendMessage(
        input,
        conversationHistory,
        language,
        onUpdate
      );

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ [HYBRID-CLIENT] Éxito con HTTP Fallback en ${elapsed}s\n`);

    } catch (httpError: any) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ [HYBRID-CLIENT] AMBOS métodos fallaron después de ${elapsed}s`);
      console.error('   WebSocket Error:', this.wsFailureCount > 0 ? 'Failed' : 'Not attempted');
      console.error('   HTTP Error:', httpError.message);
      
      // Notificar error crítico
      onUpdate({
        type: 'error',
        content: 'Sistema temporalmente no disponible. Por favor intenta de nuevo.'
      });

      throw httpError;
    }
  }

  /**
   * Verificar estado del sistema
   */
  getStatus(): {
    wsAvailable: boolean;
    wsEnabled: boolean;
    wsFailures: number;
    preferredMethod: 'websocket' | 'http';
  } {
    return {
      wsAvailable: this.wsClient.isWebSocketAvailable(),
      wsEnabled: this.preferWebSocket,
      wsFailures: this.wsFailureCount,
      preferredMethod: this.preferWebSocket ? 'websocket' : 'http'
    };
  }

  /**
   * Resetear fallos de WebSocket y reactivarlo
   */
  resetWebSocket(): void {
    console.log('🔄 [HYBRID-CLIENT] Reseteando estado de WebSocket');
    this.wsFailureCount = 0;
    this.preferWebSocket = true;
  }

  /**
   * Cerrar todas las conexiones
   */
  close(): void {
    console.log('👋 [HYBRID-CLIENT] Cerrando todas las conexiones');
    this.wsClient.close();
  }
}
