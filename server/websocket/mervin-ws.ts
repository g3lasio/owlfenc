import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { MervinOrchestratorV3 } from '../mervin-v2/orchestrator/MervinOrchestratorV3';
import type { MervinRequest } from '../mervin-v2/types/mervin-types';
import type { ProgressUpdate, ProgressStreamService as IProgressStreamService } from '../mervin-v2/services/ProgressStreamService';
import type { TaskProgress } from '../mervin-v2/types/mervin-types';
import admin from 'firebase-admin';

interface WSMessage {
  type: 'message' | 'ping';
  input?: string;
  userId?: string;
  conversationHistory?: any[];
  language?: 'es' | 'en';
}

interface WSResponse {
  type: 'message' | 'complete' | 'error' | 'pong';
  content?: string;
  data?: any;
}

// Adaptador para enviar progress updates via WebSocket
class WebSocketProgressAdapter {
  constructor(private ws: WebSocket) {}

  sendProgress(update: ProgressUpdate): void {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: update.type,
        content: update.content,
        data: update.data
      }));
    }
  }

  sendMessage(message: string): void {
    this.sendProgress({ type: 'message', content: message });
  }

  sendComplete(message: string, data?: any): void {
    this.sendProgress({ type: 'complete', content: message, data });
  }

  sendError(error: string): void {
    this.sendProgress({ type: 'error', content: error });
  }

  sendTaskProgress(progress: TaskProgress, message: string): void {
    this.sendProgress({ type: 'progress', content: message, progress });
  }

  closeStream(): void {
    // No-op para WebSocket, manejado por el propio WS
  }

  isActive(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }
}

export function setupMervinWebSocket(wss: WebSocketServer) {
  console.log('🔌 [MERVIN-WS] Configurando WebSocket server para Mervin V2');

  wss.on('connection', async (ws: WebSocket, req: IncomingMessage) => {
    const clientId = Math.random().toString(36).substring(7);
    console.log(`🔌 [MERVIN-WS] Nueva conexión: ${clientId}`);

    // VALIDAR AUTENTICACIÓN (FIX SECURITY)
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      console.error('❌ [MERVIN-WS] Token no proporcionado');
      ws.close(1008, 'Authentication required');
      return;
    }

    let authenticatedUserId: string;
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      authenticatedUserId = decodedToken.uid;
      console.log(`✅ [MERVIN-WS] Cliente autenticado: ${clientId} (user: ${authenticatedUserId})`);
    } catch (error: any) {
      console.error('❌ [MERVIN-WS] Token inválido:', error.message);
      ws.close(1008, 'Invalid authentication token');
      return;
    }

    // GUARDAR userId autenticado en la conexión (prevenir suplantación)
    (ws as any).authenticatedUserId = authenticatedUserId;

    // Configurar timeout de inactividad (60 segundos)
    let activityTimeout: NodeJS.Timeout;
    const resetActivityTimeout = () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      activityTimeout = setTimeout(() => {
        console.log(`⏰ [MERVIN-WS] Timeout de inactividad para cliente ${clientId}`);
        ws.close(1000, 'Timeout de inactividad');
      }, 60000);
    };

    resetActivityTimeout();

    // Ping/Pong para mantener conexión viva
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    ws.on('message', async (data: Buffer) => {
      resetActivityTimeout();

      try {
        const message: WSMessage = JSON.parse(data.toString());
        console.log(`📨 [MERVIN-WS] Mensaje recibido de ${clientId}:`, message.type);

        // Responder a ping
        if (message.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
          return;
        }

        // Procesar mensaje normal
        if (message.type === 'message' && message.input) {
          // USAR userId VERIFICADO, no el del mensaje (FIX SECURITY)
          const verifiedUserId = (ws as any).authenticatedUserId;
          console.log(`🤖 [MERVIN-WS] Procesando: "${message.input.substring(0, 50)}..." (user: ${verifiedUserId})`);
          
          try {
            // Crear orchestrator con userId VERIFICADO
            const orchestrator = new MervinOrchestratorV3(verifiedUserId);
            
            // Usar adaptador WebSocket para progress streaming
            const progressAdapter = new WebSocketProgressAdapter(ws);
            orchestrator.setProgressStream(progressAdapter as any);
            
            // Crear request con userId VERIFICADO (no confiar en el cliente)
            const request: MervinRequest = {
              userId: verifiedUserId, // USAR userId autenticado
              input: message.input,
              conversationHistory: message.conversationHistory || [],
              language: message.language || 'es'
            };
            
            // Procesar mensaje
            const response = await orchestrator.process(request);
            console.log(`✅ [MERVIN-WS] Procesamiento completado para ${clientId}`);
            
          } catch (error: any) {
            console.error(`❌ [MERVIN-WS] Error procesando mensaje:`, error);
            
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'error',
                content: `Error: ${error.message}`
              }));
            }
          }
        }

      } catch (error: any) {
        console.error(`❌ [MERVIN-WS] Error parseando mensaje:`, error);
        
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'error',
            content: 'Error procesando mensaje'
          }));
        }
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`👋 [MERVIN-WS] Cliente desconectado ${clientId}: ${code} - ${reason}`);
      clearInterval(pingInterval);
      if (activityTimeout) clearTimeout(activityTimeout);
    });

    ws.on('error', (error) => {
      console.error(`❌ [MERVIN-WS] Error en conexión ${clientId}:`, error);
    });

    // Enviar mensaje de bienvenida
    ws.send(JSON.stringify({
      type: 'message',
      content: '🔌 Conectado a Mervin V2 via WebSocket'
    }));
  });

  console.log('✅ [MERVIN-WS] WebSocket server configurado exitosamente');
}
