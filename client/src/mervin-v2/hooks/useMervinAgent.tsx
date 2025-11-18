/**
 * USE MERVIN AGENT HOOK - REACT HOOK PARA MERVIN V2
 * 
 * Este hook maneja toda la interacción con Mervin AI V2
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AssistantsClient } from '../lib/AssistantsClient';
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

  // Cliente ASSISTANTS API para mensajes de texto (OpenAI powered) CON AUTH
  const assistantsClientRef = useRef<AssistantsClient>(new AssistantsClient(userId, getFirebaseToken));
  
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
      
      // Recrear cliente Assistants CON AUTH
      assistantsClientRef.current.resetThread();
      assistantsClientRef.current = new AssistantsClient(userId, getFirebaseToken);
      
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

  // Obtener estado del sistema y verificar health
  useEffect(() => {
    // Verificar health del cliente legacy (para file uploads)
    legacyClientRef.current.checkHealth().then(healthy => {
      setIsHealthy(healthy);
    });
    
    // Obtener estado del cliente Assistants
    const assistantsStatus = assistantsClientRef.current.getStatus();
    
    legacyClientRef.current.getStatus().then(legacyStatus => {
      setSystemStatus({ 
        assistants: assistantsStatus, 
        legacy: legacyStatus 
      });
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
        // SIN ARCHIVOS: Usar Assistants API (OpenAI powered, confiable)
        console.log('🤖 [MERVIN-AGENT] Usando ASSISTANTS API (OpenAI powered)');
        
        await assistantsClientRef.current.sendMessageStream(
          input,
          [], // No necesitamos history completo, OpenAI lo maneja
          language,
          (assistantUpdate) => {
            console.log('📨 [UPDATE-RECEIVED] Got update from AssistantsClient:', {
              type: assistantUpdate.type,
              hasContent: !!assistantUpdate.content,
              contentLength: assistantUpdate.content?.length || 0,
              contentPreview: assistantUpdate.content?.substring(0, 100) || '(no content)'
            });

            // Adaptar updates de AssistantsClient al formato StreamUpdate estándar
            let adaptedType: 'progress' | 'message' | 'complete' | 'error' = 'message';
            if (assistantUpdate.type === 'text_delta') adaptedType = 'message';
            else if (assistantUpdate.type === 'tool_call_start' || assistantUpdate.type === 'tool_call_end') adaptedType = 'progress';
            else if (assistantUpdate.type === 'complete') adaptedType = 'complete';
            else if (assistantUpdate.type === 'error') adaptedType = 'error';
            
            const adaptedUpdate: StreamUpdate = {
              type: adaptedType,
              content: assistantUpdate.content || '',
              data: assistantUpdate.data,
            };
            
            console.log('🔄 [ADAPTATION] Adapted update:', {
              originalType: assistantUpdate.type,
              adaptedType: adaptedType,
              contentPreserved: adaptedUpdate.content === assistantUpdate.content
            });
            
            setStreamingUpdates(prev => {
              console.log('📊 [STATE-UPDATE] Adding to streamingUpdates, current count:', prev.length);
              return [...prev, adaptedUpdate];
            });
            
            if (onStreamUpdate) onStreamUpdate(adaptedUpdate);

            // FIX CRÍTICO: El mensaje completo ahora llega directamente en type='complete'
            if (assistantUpdate.type === 'complete' && assistantUpdate.content) {
              console.log('✅ [ASSISTANTS] Complete message received:', {
                contentLength: assistantUpdate.content.length,
                fullContent: assistantUpdate.content
              });
              
              const assistantMessage: MervinMessage = {
                role: 'assistant',
                content: assistantUpdate.content,
                timestamp: new Date()
              };

              console.log('💾 [SAVING-MESSAGE] About to save message:', {
                role: assistantMessage.role,
                contentLength: assistantMessage.content.length,
                timestamp: assistantMessage.timestamp
              });
              
              setMessages(prev => {
                console.log('📝 [MESSAGES-UPDATE] Current messages:', prev.length);
                console.log('📝 [MESSAGES-UPDATE] Adding new message with', assistantMessage.content.length, 'characters');
                const newMessages = [...prev, assistantMessage];
                console.log('📝 [MESSAGES-UPDATE] New total:', newMessages.length);
                console.log('📝 [MESSAGES-UPDATE] Last message content:', newMessages[newMessages.length - 1].content);
                return newMessages;
              });

              persistenceRef.current?.saveMessage({
                sender: 'assistant',
                text: assistantUpdate.content,
                timestamp: assistantMessage.timestamp!.toISOString(),
              }).catch(err => console.error('❌ [AUTO-SAVE] Failed:', err));

              console.log('✅ [MESSAGE-SAVED] Message successfully added to state');
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
