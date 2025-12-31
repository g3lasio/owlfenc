/**
 * USE MERVIN AGENT HOOK - REACT HOOK PARA MERVIN V2
 * 
 * ARQUITECTURA UNIFICADA (Dic 26, 2024):
 * ======================================
 * 
 * 🎯 SISTEMA PRINCIPAL - Claude Conversational:
 * - Cliente: AgentClient
 * - Backend: /api/mervin-v2/* (server/routes/mervin-v2.ts)
 * - Motor: MervinConversationalOrchestrator con Claude 3.5 Sonnet
 * - Uso: TODOS los mensajes (con y sin archivos)
 * - Beneficios: Tool calling nativo, soporte de archivos, sin dependencia de OpenAI
 * 
 * ❌ SISTEMA OBSOLETO - OpenAI Assistants API:
 * - DESACTIVADO completamente
 * - AssistantsClient ya no se usa
 * - /api/assistant/* endpoints desactivados
 * 
 * 🛠️ CAPACIDADES DE MERVIN:
 * - Chat conversacional (responde preguntas, guía usuarios)
 * - Tool execution (crear estimates, contracts, verify properties)
 * - Workflows completos (Property, Estimate, Contract, Permit)
 * - Procesamiento de archivos e imágenes
 * - WorkflowRunner ejecuta workflows existentes del sistema
 */

import { useState, useCallback, useRef, useEffect } from 'react';
// import { AssistantsClient } from '../lib/AssistantsClient'; // DESACTIVADO - Sistema obsoleto de OpenAI
import { AgentClient, MervinMessage, MervinResponse, StreamUpdate, AuthTokenProvider } from '../lib/AgentClient';
import { auth } from '@/lib/firebase';
import { 
  ConversationPersistenceController, 
  type PersistenceState,
  type ConversationMessage 
} from '../services/ConversationPersistenceController';
import type { PageContextType } from '@/contexts/PageContext';

export interface UseMervinAgentOptions {
  userId: string;
  enableStreaming?: boolean;
  language?: 'es' | 'en';
  mode?: 'chat' | 'agent'; // Modo de operación: chat (free) o agent (paid)
  pageContext?: PageContextType;
  onStreamUpdate?: (update: StreamUpdate) => void;
  onPersistenceError?: (error: string) => void;
}

export interface UseMervinAgentReturn {
  messages: MervinMessage[];
  isProcessing: boolean;
  streamingUpdates: StreamUpdate[];
  sendMessage: (input: string, files?: File[]) => Promise<void>;
  clearMessages: () => void;
  startNewConversation: () => void;
  loadConversation: (conversationId: string) => void;
  hydrateMessagesFromHistory: (historyMessages: MervinMessage[]) => void;
  loadConversationFromHistory: (conversationId: string, historyMessages: MervinMessage[]) => Promise<void>;
  isHealthy: boolean;
  systemStatus: any;
  persistenceState: PersistenceState;
  conversationId: string | null;
  persistenceController: ConversationPersistenceController | null;
}

/**
 * Función para obtener token de Firebase
 */
const getFirebaseToken: AuthTokenProvider = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return token;
    }
    return null;
  } catch (error) {
    console.error('❌ [MERVIN-AGENT] Error obteniendo Firebase token:', error);
    return null;
  }
};

export function useMervinAgent(options: UseMervinAgentOptions): UseMervinAgentReturn {
  const {
    userId,
    enableStreaming = true,
    language = 'es',
    mode = 'agent', // Default: agent mode
    pageContext,
    onStreamUpdate,
    onPersistenceError
  } = options;

  // Estado
  const [messages, setMessages] = useState<MervinMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingUpdates, setStreamingUpdates] = useState<StreamUpdate[]>([]);
  const [isHealthy, setIsHealthy] = useState(true);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [persistenceState, setPersistenceState] = useState<PersistenceState>({
    status: 'idle',
    conversationId: null,
    error: null,
    pendingSaves: 0,
  });

  // ✅ SISTEMA PRINCIPAL: AgentClient con Claude Conversational
  // - Usa /api/mervin-v2/* endpoints
  // - Claude 3.5 Sonnet con tool calling
  // - Soporta archivos adjuntos
  const agentClientRef = useRef<AgentClient>(new AgentClient(userId, '', getFirebaseToken));
  
  // ❌ SISTEMA OBSOLETO: AssistantsClient (OpenAI) - DESACTIVADO
  // const assistantsClientRef = useRef<AssistantsClient>(new AssistantsClient(userId, getFirebaseToken));
  
  const prevUserIdRef = useRef<string>(userId);
  
  // Persistence controller
  const persistenceRef = useRef<ConversationPersistenceController | null>(null);

  // Inicializar persistence controller
  useEffect(() => {
    if (!persistenceRef.current || userId !== prevUserIdRef.current) {
      console.log(`📦 [MERVIN-AGENT] Initializing persistence for user: ${userId}`);
      persistenceRef.current = new ConversationPersistenceController(userId);
      
      // Setup callbacks
      persistenceRef.current.onStateChangeCallback((state) => {
        setPersistenceState(state);
      });
      
      persistenceRef.current.onErrorCallback((error) => {
        console.error('❌ [PERSISTENCE] Error:', error);
        if (onPersistenceError) {
          onPersistenceError(error);
        }
      });
    }
  }, [userId, onPersistenceError]);

  // Recrear clientes si userId cambia
  useEffect(() => {
    if (userId !== prevUserIdRef.current) {
      console.log(`🔄 [MERVIN-AGENT] UserId changed: ${prevUserIdRef.current} → ${userId}`);
      
      // Recrear cliente con Claude Conversational
      agentClientRef.current = new AgentClient(userId, '', getFirebaseToken);
      
      prevUserIdRef.current = userId;
      
      // Limpiar mensajes al cambiar usuario
      if (userId !== 'guest') {
        setMessages([]);
        persistenceRef.current?.reset();
      }
    }
  }, [userId]);

  // Obtener estado del sistema y verificar health
  useEffect(() => {
    // Verificar health del cliente
    agentClientRef.current.checkHealth().then(healthy => {
      setIsHealthy(healthy);
    });
    
    // Obtener estado del cliente
    agentClientRef.current.getStatus().then(status => {
      setSystemStatus({ agent: status });
    });
  }, [userId]);

  /**
   * Enviar mensaje a Mervin (con soporte para archivos adjuntos)
   */
  const sendMessage = useCallback(async (input: string, files?: File[]) => {
    if (!input.trim() || isProcessing) return;

    // Agregar mensaje del usuario
    const userMessage: MervinMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);
    setStreamingUpdates([]);

    // 💾 AUTO-SAVE: Guardar mensaje del usuario (asíncrono, no bloqueante)
    const userConversationMessage: ConversationMessage = {
      sender: 'user',
      text: input,
      timestamp: userMessage.timestamp!.toISOString(),
    };
    persistenceRef.current?.saveMessage(userConversationMessage).catch((err) => {
      console.error('❌ [AUTO-SAVE] Failed to save user message:', err);
    });

    try {
      // Usar AgentClient con Claude Conversational (soporta archivos)
      if (files && files.length > 0) {
        console.log(`📎 [MERVIN-AGENT] Enviando mensaje con ${files.length} archivo(s)`);
        
        await agentClientRef.current.sendMessageWithFiles(
          input,
          files,
          messages,
          language,
          (update: StreamUpdate) => {
            console.log('📥 [MERVIN-AGENT] Received update:', JSON.stringify(update, null, 2));
            setStreamingUpdates(prev => [...prev, update]);
            if (onStreamUpdate) onStreamUpdate(update);

            if (update.type === 'complete') {
              console.log('✅ [MERVIN-AGENT] Processing complete update, content length:', update.content?.length);
              const assistantMessage: MervinMessage = {
                role: 'assistant',
                content: update.content,
                timestamp: new Date()
              };
              console.log('📝 [MERVIN-AGENT] Adding assistant message to state');
              setMessages(prev => [...prev, assistantMessage]);
              persistenceRef.current?.saveMessage({
                sender: 'assistant',
                text: update.content,
                timestamp: assistantMessage.timestamp!.toISOString(),
              }).catch(err => console.error('❌ [AUTO-SAVE] Failed:', err));
            }
          },
          mode, // Pasar mode al cliente
          pageContext ? { url: pageContext.currentUrl, section: pageContext.currentSection } : undefined
        );
      } else {
        // SIN ARCHIVOS: Usar AgentClient con Claude Conversational
        console.log('🤖 [MERVIN-AGENT] Usando Claude Conversational API');
        
        await agentClientRef.current.sendMessageStream(
          input,
          messages,
          language,
          (update: StreamUpdate) => {
            console.log('📥 [MERVIN-AGENT] Received update:', JSON.stringify(update, null, 2));
            setStreamingUpdates(prev => [...prev, update]);
            if (onStreamUpdate) onStreamUpdate(update);

            if (update.type === 'complete') {
              console.log('✅ [MERVIN-AGENT] Processing complete update, content length:', update.content?.length);
              const assistantMessage: MervinMessage = {
                role: 'assistant',
                content: update.content,
                timestamp: new Date()
              };
              console.log('📝 [MERVIN-AGENT] Adding assistant message to state');
              setMessages(prev => [...prev, assistantMessage]);
              persistenceRef.current?.saveMessage({
                sender: 'assistant',
                text: update.content,
                timestamp: assistantMessage.timestamp!.toISOString(),
              }).catch(err => console.error('❌ [AUTO-SAVE] Failed:', err));
            }
          },
          mode, // Pasar mode al cliente
          pageContext ? { url: pageContext.currentUrl, section: pageContext.currentSection } : undefined
        );
      }

    } catch (error: any) {
      console.error('Error enviando mensaje:', error);
      
      // Agregar mensaje de error
      const errorMessage: MervinMessage = {
        role: 'assistant',
        content: `Disculpa primo, hubo un error: ${error.message}`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  }, [messages, isProcessing, enableStreaming, language, onStreamUpdate]);

  /**
   * Limpiar mensajes
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setStreamingUpdates([]);
  }, []);

  /**
   * Iniciar nueva conversación
   */
  const startNewConversation = useCallback(() => {
    setMessages([]);
    setStreamingUpdates([]);
    persistenceRef.current?.reset();
    console.log('🆕 [MERVIN-AGENT] New conversation started');
  }, []);

  /**
   * Cargar conversación existente (solo actualiza el persistence controller)
   */
  const loadConversation = useCallback((conversationId: string) => {
    persistenceRef.current?.loadConversation(conversationId);
    console.log(`📂 [MERVIN-AGENT] Loaded conversation: ${conversationId}`);
  }, []);

  /**
   * Hidratar mensajes desde una conversación cargada del historial
   * Esto permite restaurar los mensajes en la UI cuando se selecciona una conversación anterior
   */
  const hydrateMessagesFromHistory = useCallback((historyMessages: MervinMessage[]) => {
    console.log(`💧 [MERVIN-AGENT] Hydrating ${historyMessages.length} messages from history`);
    setMessages(historyMessages);
    setStreamingUpdates([]);
  }, []);

  /**
   * Cargar conversación desde historial de forma completa y sincrónica
   * Esta es la forma recomendada de cargar conversaciones del historial
   * ya que maneja correctamente la hidratación y evita race conditions
   */
  const loadConversationFromHistory = useCallback(async (
    conversationId: string, 
    historyMessages: MervinMessage[]
  ): Promise<void> => {
    console.log(`📂 [MERVIN-AGENT] Loading conversation ${conversationId} with ${historyMessages.length} messages`);
    
    // 1. Primero resetear el estado
    setStreamingUpdates([]);
    
    // 2. Hidratar los mensajes directamente
    setMessages(historyMessages);
    
    console.log(`✅ [MERVIN-AGENT] Conversation ${conversationId} loaded successfully`);
  }, []);

  return {
    messages,
    isProcessing,
    streamingUpdates,
    sendMessage,
    clearMessages,
    startNewConversation,
    loadConversation,
    hydrateMessagesFromHistory,
    loadConversationFromHistory,
    isHealthy,
    systemStatus,
    persistenceState,
    conversationId: persistenceState.conversationId,
    // 🔥 Exponer referencia al persistence controller para sincronización
    persistenceController: persistenceRef.current,
  };
}
