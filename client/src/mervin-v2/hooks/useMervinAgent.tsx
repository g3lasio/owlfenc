/**
 * USE MERVIN AGENT HOOK - REACT HOOK PARA MERVIN V2
 * 
 * Este hook maneja toda la interacción con Mervin AI V2
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { HybridAgentClient } from '../lib/HybridAgentClient';
import { AgentClient, MervinMessage, MervinResponse, StreamUpdate, AuthTokenProvider } from '../lib/AgentClient';
import { auth } from '@/lib/firebase';
import { 
  ConversationPersistenceController, 
  type PersistenceState,
  type ConversationMessage 
} from '../services/ConversationPersistenceController';

export interface UseMervinAgentOptions {
  userId: string;
  enableStreaming?: boolean;
  language?: 'es' | 'en';
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
  isHealthy: boolean;
  systemStatus: any;
  persistenceState: PersistenceState;
  conversationId: string | null;
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

  // Cliente HÍBRIDO para mensajes de texto (WebSocket + HTTP Fallback) CON AUTH
  const hybridClientRef = useRef<HybridAgentClient>(new HybridAgentClient(userId, '', getFirebaseToken));
  
  // Cliente ORIGINAL para mensajes con archivos adjuntos
  const legacyClientRef = useRef<AgentClient>(new AgentClient(userId, '', getFirebaseToken));
  
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
      
      // Recrear cliente híbrido CON AUTH
      hybridClientRef.current.close();
      hybridClientRef.current = new HybridAgentClient(userId, '', getFirebaseToken);
      
      // Recrear cliente legacy
      legacyClientRef.current = new AgentClient(userId, '', getFirebaseToken);
      
      prevUserIdRef.current = userId;
      
      // Limpiar mensajes al cambiar usuario
      if (userId !== 'guest') {
        setMessages([]);
        persistenceRef.current?.reset();
      }
    }
  }, [userId]);

  // Obtener estado del sistema híbrido y verificar health del legacy
  useEffect(() => {
    const hybridStatus = hybridClientRef.current.getStatus();
    console.log('🔌 [HYBRID-STATUS]', hybridStatus);
    
    legacyClientRef.current.checkHealth().then(healthy => {
      setIsHealthy(healthy || hybridStatus.wsAvailable || hybridStatus.preferredMethod === 'http');
    });
    
    legacyClientRef.current.getStatus().then(status => {
      setSystemStatus({ hybrid: hybridStatus, legacy: status });
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
      // DECISIÓN INTELIGENTE: Usar cliente según si hay archivos
      if (files && files.length > 0) {
        // CON ARCHIVOS: Usar cliente legacy (AgentClient) que soporta attachments
        console.log(`📎 [MERVIN-AGENT] Usando cliente LEGACY para ${files.length} archivo(s)`);
        
        await legacyClientRef.current.sendMessageWithFiles(
          input,
          files,
          messages,
          language,
          (update: StreamUpdate) => {
            setStreamingUpdates(prev => [...prev, update]);
            if (onStreamUpdate) onStreamUpdate(update);

            if (update.type === 'complete') {
              const assistantMessage: MervinMessage = {
                role: 'assistant',
                content: update.content,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, assistantMessage]);
              persistenceRef.current?.saveMessage({
                sender: 'assistant',
                text: update.content,
                timestamp: assistantMessage.timestamp!.toISOString(),
              }).catch(err => console.error('❌ [AUTO-SAVE] Failed:', err));
            }
          }
        );
      } else {
        // SIN ARCHIVOS: Usar sistema híbrido (WebSocket + HTTP Fallback)
        console.log('🚀 [MERVIN-AGENT] Usando sistema HÍBRIDO (WS → HTTP Fallback)');
        
        await hybridClientRef.current.sendMessageStream(
          input,
          messages,
          language,
          (update: StreamUpdate) => {
            setStreamingUpdates(prev => [...prev, update]);
            if (onStreamUpdate) onStreamUpdate(update);

            if (update.type === 'complete') {
              console.log('✅ [HYBRID-AGENT] Complete message received:', {
                contentLength: update.content?.length || 0,
                fullContent: update.content
              });
              
              const assistantMessage: MervinMessage = {
                role: 'assistant',
                content: update.content,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, assistantMessage]);
              persistenceRef.current?.saveMessage({
                sender: 'assistant',
                text: update.content,
                timestamp: assistantMessage.timestamp!.toISOString(),
              }).catch(err => console.error('❌ [AUTO-SAVE] Failed:', err));
            }
          }
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
   * Cargar conversación existente
   */
  const loadConversation = useCallback((conversationId: string) => {
    persistenceRef.current?.loadConversation(conversationId);
    console.log(`📂 [MERVIN-AGENT] Loaded conversation: ${conversationId}`);
  }, []);

  return {
    messages,
    isProcessing,
    streamingUpdates,
    sendMessage,
    clearMessages,
    startNewConversation,
    loadConversation,
    isHealthy,
    systemStatus,
    persistenceState,
    conversationId: persistenceState.conversationId,
  };
}
