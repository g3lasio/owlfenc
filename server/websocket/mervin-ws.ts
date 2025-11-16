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
          const processStartTime = Date.now();
          // USAR userId VERIFICADO, no el del mensaje (FIX SECURITY)
          const verifiedUserId = (ws as any).authenticatedUserId;
          console.log(`\n═══════════════════════════════════════════`);
          console.log(`🤖 [MERVIN-WS] INICIO PROCESAMIENTO`);
          console.log(`   Cliente: ${clientId}`);
          console.log(`   Usuario: ${verifiedUserId}`);
          console.log(`   Input: "${message.input}"`);
          console.log(`═══════════════════════════════════════════\n`);
          
          try {
            // Helper para enviar mensajes de progreso
            const sendProgress = (content: string) => {
              if (ws.readyState === WebSocket.OPEN) {
                const progressMsg = JSON.stringify({ type: 'message', content });
                ws.send(progressMsg);
                console.log(`📡 [MERVIN-WS] Progress enviado: "${content}"`);
              } else {
                console.error(`❌ [MERVIN-WS] WebSocket cerrado al intentar enviar progreso`);
              }
            };

            // ETAPA 1: Mensajes de progreso iniciales
            console.log(`🔄 [MERVIN-WS] Etapa 1: Enviando mensajes de progreso iniciales...`);
            sendProgress('📸 Loading your context...');
            sendProgress('🔍 Analyzing your message...');
            
            // ETAPA 2: Crear orchestrator SIN ProgressStream (modo WebSocket directo)
            console.log(`🔄 [MERVIN-WS] Etapa 2: Creando orchestrator...`);
            const orchestrator = new MervinOrchestratorV3(verifiedUserId);
            console.log(`✅ [MERVIN-WS] Orchestrator creado exitosamente`);
            // NO llamar setProgressStream() - WebSocket maneja el streaming directamente
            
            // ETAPA 3: Crear request con userId VERIFICADO
            console.log(`🔄 [MERVIN-WS] Etapa 3: Preparando request...`);
            const request: MervinRequest = {
              userId: verifiedUserId,
              input: message.input,
              conversationHistory: message.conversationHistory || [],
              language: message.language || 'es'
            };
            console.log(`✅ [MERVIN-WS] Request preparado: ${JSON.stringify({ inputLength: message.input.length, historyLength: request.conversationHistory?.length || 0 })}`);
            
            // ETAPA 4: Mensaje de progreso antes de procesar
            console.log(`🔄 [MERVIN-WS] Etapa 4: Enviando mensaje "Thinking..."...`);
            sendProgress('💬 Thinking...');
            
            // ETAPA 5: Procesar mensaje (orchestrator trabaja silenciosamente)
            console.log(`🔄 [MERVIN-WS] Etapa 5: Iniciando orchestrator.process()...`);
            const orchestratorStartTime = Date.now();
            const response = await orchestrator.process(request);
            const orchestratorDuration = Date.now() - orchestratorStartTime;
            
            console.log(`\n✅ [MERVIN-WS] ═══ ORCHESTRATOR COMPLETADO ═══`);
            console.log(`   Duration: ${orchestratorDuration}ms`);
            console.log(`   Response type: ${response.type}`);
            console.log(`   Message length: ${response.message?.length || 0} caracteres`);
            console.log(`   Message preview: "${response.message?.substring(0, 150) || 'N/A'}..."`);
            console.log(`   Has data: ${!!response.data}`);
            console.log(`═══════════════════════════════════════════\n`);
            
            // ETAPA 6: ENVIAR RESPUESTA FINAL COMPLETA
            console.log(`🔄 [MERVIN-WS] Etapa 6: Preparando mensaje "complete"...`);
            if (ws.readyState === WebSocket.OPEN) {
              const completeMessage = {
                type: 'complete',
                content: response.message,
                data: response
              };
              
              const messageJSON = JSON.stringify(completeMessage);
              console.log(`📤 [MERVIN-WS] Enviando mensaje "complete" (${messageJSON.length} bytes)...`);
              ws.send(messageJSON);
              
              const totalDuration = Date.now() - processStartTime;
              console.log(`\n✅ [MERVIN-WS] ═══ PROCESAMIENTO EXITOSO ═══`);
              console.log(`   Cliente: ${clientId}`);
              console.log(`   Total duration: ${totalDuration}ms`);
              console.log(`   Orchestrator: ${orchestratorDuration}ms`);
              console.log(`   Content sent: ${response.message?.length || 0} caracteres`);
              console.log(`   Message bytes: ${messageJSON.length} bytes`);
              console.log(`═══════════════════════════════════════════\n`);
            } else {
              console.error(`\n❌ [MERVIN-WS] ═══ ERROR FATAL ═══`);
              console.error(`   WebSocket cerrado ANTES de enviar respuesta final`);
              console.error(`   ReadyState: ${ws.readyState}`);
              console.error(`   Cliente: ${clientId}`);
              console.error(`═══════════════════════════════════════════\n`);
            }
            
          } catch (error: any) {
            const errorDuration = Date.now() - processStartTime;
            console.error(`\n❌ [MERVIN-WS] ═══ ERROR PROCESANDO MENSAJE ═══`);
            console.error(`   Cliente: ${clientId}`);
            console.error(`   Duration before error: ${errorDuration}ms`);
            console.error(`   Error: ${error.message}`);
            console.error(`   Stack: ${error.stack}`);
            console.error(`═══════════════════════════════════════════\n`);
            
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
