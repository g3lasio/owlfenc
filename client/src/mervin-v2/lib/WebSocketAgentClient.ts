/**
 * WEBSOCKET AGENT CLIENT - SISTEMA ROBUSTO A PRUEBA DE FALLOS
 * 
 * Características:
 * - WebSocket como canal principal
 * - Reconexión automática con backoff exponencial
 * - Timeouts estrictos (30 segundos por mensaje)
 * - Fallback automático a HTTP si WebSocket falla
 * - Logging detallado antes/después de cada operación
 */

import type { MervinMessage, StreamUpdate, AuthTokenProvider } from './AgentClient';

export type StreamCallback = (update: StreamUpdate) => void;

interface WSMessage {
  type: 'message' | 'complete' | 'error' | 'pong';
  content?: string;
  data?: any;
}

export class WebSocketAgentClient {
  private ws: WebSocket | null = null;
  private userId: string;
  private getAuthToken: AuthTokenProvider | null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private reconnectDelay = 1000; // Start with 1 second
  private messageTimeout = 30000; // 30 segundos strict timeout
  private isConnecting = false;
  private pendingCallbacks: Map<string, StreamCallback> = new Map();
  private connectionPromise: Promise<void> | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(userId: string, getAuthToken: AuthTokenProvider | null = null) {
    this.userId = userId;
    this.getAuthToken = getAuthToken;
    console.log(`🔌 [WS-CLIENT] Inicializado para usuario: ${userId} (auth: ${getAuthToken ? 'SI' : 'NO'})`);
  }

  /**
   * Conectar WebSocket con reconexión automática
   */
  private async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('✅ [WS-CLIENT] Ya conectado');
      return;
    }

    if (this.isConnecting && this.connectionPromise) {
      console.log('⏳ [WS-CLIENT] Conexión en progreso, esperando...');
      return this.connectionPromise;
    }

    this.isConnecting = true;
    this.connectionPromise = new Promise(async (resolve, reject) => {
      const wsUrl = await this.getWebSocketUrl();
      console.log(`🔌 [WS-CLIENT] Conectando a WebSocket autenticado`);
      const connectStart = performance.now();

      try {
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          const connectTime = (performance.now() - connectStart).toFixed(2);
          console.log(`✅ [WS-CLIENT] Conectado en ${connectTime}ms`);
          this.reconnectAttempts = 0;
          this.reconnectDelay = 1000;
          this.isConnecting = false;
          this.setupHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('❌ [WS-CLIENT] Error:', error);
        };

        this.ws.onclose = (event) => {
          console.log(`👋 [WS-CLIENT] Desconectado: ${event.code} - ${event.reason}`);
          this.ws = null;
          this.isConnecting = false;
          
          // Intentar reconexión si no fue cierre normal
          if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        // Timeout de conexión
        setTimeout(() => {
          if (this.isConnecting) {
            console.error('❌ [WS-CLIENT] Timeout de conexión');
            this.ws?.close();
            this.isConnecting = false;
            reject(new Error('WebSocket connection timeout'));
          }
        }, 10000); // 10 segundos para conectar

      } catch (error) {
        console.error('❌ [WS-CLIENT] Error creando WebSocket:', error);
        this.isConnecting = false;
        reject(error);
      }
    });

    return this.connectionPromise;
  }

  /**
   * Programar reconexión con backoff exponencial
   */
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 [WS-CLIENT] Reconectando en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(error => {
        console.error('❌ [WS-CLIENT] Error en reconexión:', error);
      });
    }, delay);
  }

  /**
   * Configurar heartbeat para mantener conexión viva
   */
  private setupHeartbeat(): void {
    // Limpiar heartbeat anterior si existe
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
        console.log('💓 [WS-CLIENT] Ping enviado');
      } else {
        this.stopHeartbeat();
      }
    }, 30000); // Ping cada 30 segundos
  }
  
  /**
   * Detener heartbeat (FIX MEMORY LEAK)
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      console.log('🛑 [WS-CLIENT] Heartbeat detenido');
    }
  }

  /**
   * Obtener URL WebSocket correcta (con token de autenticación)
   */
  private async getWebSocketUrl(): Promise<string> {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    let url = `${protocol}//${host}/ws/mervin-v2`;
    
    // AGREGAR TOKEN DE FIREBASE (FIX SECURITY)
    if (this.getAuthToken) {
      try {
        const token = await this.getAuthToken();
        if (token) {
          url += `?token=${encodeURIComponent(token)}`;
          console.log('🔐 [WS-CLIENT] Token de autenticación agregado');
        }
      } catch (error) {
        console.error('❌ [WS-CLIENT] Error obteniendo token:', error);
      }
    }
    
    return url;
  }

  /**
   * Manejar mensaje recibido
   */
  private handleMessage(data: string): void {
    try {
      console.log(`\n📩 [WS-CLIENT] ═══ RAW MESSAGE RECEIVED ═══`);
      console.log(`   Length: ${data.length} bytes`);
      console.log(`   Preview: ${data.substring(0, 200)}...`);
      
      const message: WSMessage = JSON.parse(data);
      console.log(`✅ [WS-CLIENT] Mensaje parseado exitosamente`);
      console.log(`   Type: "${message.type}"`);
      console.log(`   Content length: ${message.content?.length || 0}`);
      console.log(`   Has data: ${!!message.data}`);

      // Obtener callback activo
      const callback = this.pendingCallbacks.get('current');
      if (!callback) {
        console.warn('⚠️ [WS-CLIENT] No hay callback activo para procesar mensaje');
        console.warn(`   Message type: ${message.type}`);
        return;
      }

      // Convertir a StreamUpdate
      const update: StreamUpdate = {
        type: message.type as any,
        content: message.content || '',
        data: message.data
      };

      console.log(`📡 [WS-CLIENT] Llamando callback con update tipo: "${update.type}"`);
      callback(update);
      console.log(`✅ [WS-CLIENT] Callback ejecutado exitosamente`);

      // Si es complete o error, limpiar callback
      if (message.type === 'complete' || message.type === 'error') {
        console.log(`🏁 [WS-CLIENT] Mensaje final detectado (${message.type}), limpiando callback`);
        this.pendingCallbacks.delete('current');
      }

    } catch (error) {
      console.error('❌ [WS-CLIENT] Error procesando mensaje:', error);
      console.error('   Raw data:', data.substring(0, 500));
    }
  }

  /**
   * Enviar mensaje con timeout estricto
   */
  async sendMessageStream(
    input: string,
    conversationHistory: MervinMessage[] = [],
    language: 'es' | 'en' = 'es',
    onUpdate: StreamCallback
  ): Promise<void> {
    console.log('🚀 [WS-CLIENT] Iniciando envío de mensaje via WebSocket');
    console.log(`📝 [WS-CLIENT] Input: "${input.substring(0, 50)}..."`);
    const startTime = performance.now();

    try {
      // Intentar conectar
      await this.connect();

      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        throw new Error('WebSocket no disponible');
      }

      // Esperar a que se complete o falle
      return new Promise((resolve, reject) => {
        // Timeout estricto de 30 segundos
        const timeoutId = setTimeout(() => {
          const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
          console.error(`⏰ [WS-CLIENT] TIMEOUT después de ${elapsed}s`);
          
          this.pendingCallbacks.delete('current');
          onUpdate({
            type: 'error',
            content: 'Timeout: La respuesta tardó más de 30 segundos'
          });
          
          // Cerrar conexión
          this.ws?.close();
          reject(new Error('Timeout'));
        }, this.messageTimeout);

        // Crear wrapped callback ANTES de enviarlo
        const wrappedCallback: StreamCallback = (update) => {
          onUpdate(update);
          
          if (update.type === 'complete') {
            clearTimeout(timeoutId);
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            console.log(`✅ [WS-CLIENT] Completado en ${elapsed}s`);
            this.pendingCallbacks.delete('current');
            resolve();
          } else if (update.type === 'error') {
            clearTimeout(timeoutId);
            const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
            console.error(`❌ [WS-CLIENT] Error en ${elapsed}s:`, update.content);
            this.pendingCallbacks.delete('current');
            reject(new Error(update.content || 'Error desconocido'));
          }
        };

        // Guardar callback ANTES de enviar mensaje
        this.pendingCallbacks.set('current', wrappedCallback);

        // Enviar mensaje
        const message = {
          type: 'message',
          input,
          userId: this.userId,
          conversationHistory,
          language
        };

        console.log('📤 [WS-CLIENT] Enviando mensaje...');
        this.ws!.send(JSON.stringify(message));
      });

    } catch (error: any) {
      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ [WS-CLIENT] Error después de ${elapsed}s:`, error);
      throw error;
    }
  }

  /**
   * Verificar si WebSocket está disponible
   */
  isWebSocketAvailable(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Cerrar conexión
   */
  close(): void {
    console.log('👋 [WS-CLIENT] Cerrando conexión');
    this.stopHeartbeat(); // FIX MEMORY LEAK
    this.ws?.close(1000, 'Cliente cerró conexión');
    this.ws = null;
    this.pendingCallbacks.clear();
  }
}
