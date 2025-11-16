import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { MervinOrchestratorV3 } from '../mervin-v2/orchestrator/MervinOrchestratorV3';
import type { MervinRequest } from '../mervin-v2/types/mervin-types';
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
            // Helper para enviar mensajes de progreso
            const sendProgress = (content: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                  type: 'message',
                  content
                }));
              }
            };

            // ETAPA 1: Mensajes de progreso iniciales
            sendProgress('📸 Loading your context...');
            sendProgress('🔍 Analyzing your message...');
            
            // ETAPA 2: Crear orchestrator SIN ProgressStream (modo WebSocket directo)
            const orchestrator = new MervinOrchestratorV3(verifiedUserId);
            // NO llamar setProgressStream() - WebSocket maneja el streaming directamente
            
            // ETAPA 3: Crear request con userId VERIFICADO
            const request: MervinRequest = {
              userId: verifiedUserId,
              input: message.input,
              conversationHistory: message.conversationHistory || [],
              language: message.language || 'es'
            };
            
            // ETAPA 4: Mensaje de progreso antes de procesar
            sendProgress('💬 Thinking...');
            
            // ETAPA 5: Procesar mensaje (orchestrator trabaja silenciosamente)
            const response = await orchestrator.process(request);
            console.log(`✅ [MERVIN-WS] Procesamiento completado para ${clientId}`);
            console.log(`📤 [MERVIN-WS] Respuesta final length: ${response.message?.length || 0}`);
            console.log(`📤 [MERVIN-WS] Respuesta preview: ${response.message?.substring(0, 100) || 'N/A'}`);
            
            // ETAPA 6: ENVIAR RESPUESTA FINAL COMPLETA
            if (ws.readyState === WebSocket.OPEN) {
              const completeMessage = {
                type: 'complete',
                content: response.message,
                data: response
              };
              
              ws.send(JSON.stringify(completeMessage));
              console.log(`✅ [MERVIN-WS] ✨ Mensaje "complete" enviado exitosamente a ${clientId}`);
              console.log(`✅ [MERVIN-WS] ✨ Content length: ${response.message?.length || 0} caracteres`);
            } else {
              console.error(`❌ [MERVIN-WS] WebSocket cerrado ANTES de enviar respuesta final`);
            }
            
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
