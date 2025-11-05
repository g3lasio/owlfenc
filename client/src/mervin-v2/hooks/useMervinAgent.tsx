/**
 * USE MERVIN AGENT HOOK - REACT HOOK PARA MERVIN V2
 * 
 * Este hook maneja toda la interacción con Mervin AI V2
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentClient, MervinMessage, MervinResponse, StreamUpdate } from '../lib/AgentClient';

export interface UseMervinAgentOptions {
  userId: string;
  enableStreaming?: boolean;
  language?: 'es' | 'en';
  onStreamUpdate?: (update: StreamUpdate) => void;
}

export interface UseMervinAgentReturn {
  messages: MervinMessage[];
  isProcessing: boolean;
  streamingUpdates: StreamUpdate[];
  sendMessage: (input: string) => Promise<void>;
  clearMessages: () => void;
  isHealthy: boolean;
  systemStatus: any;
}

export function useMervinAgent(options: UseMervinAgentOptions): UseMervinAgentReturn {
  const {
    userId,
    enableStreaming = true,
    language = 'es',
    onStreamUpdate
  } = options;

  // Estado
  const [messages, setMessages] = useState<MervinMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [streamingUpdates, setStreamingUpdates] = useState<StreamUpdate[]>([]);
  const [isHealthy, setIsHealthy] = useState(true);
  const [systemStatus, setSystemStatus] = useState<any>(null);

  // Cliente de API (ref para no recrearlo)
  const clientRef = useRef<AgentClient>(new AgentClient(userId));

  // Health check al montar
  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await clientRef.current.checkHealth();
      setIsHealthy(healthy);
      
      const status = await clientRef.current.getStatus();
      setSystemStatus(status);
    };

    checkHealth();
  }, []);

  /**
   * Enviar mensaje a Mervin
   */
  const sendMessage = useCallback(async (input: string) => {
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

    try {
      if (enableStreaming) {
        // Modo streaming
        await clientRef.current.sendMessageStream(
          input,
          messages,
          language,
          (update: StreamUpdate) => {
            // Agregar actualización al estado
            setStreamingUpdates(prev => [...prev, update]);
            
            // Callback externo si existe
            if (onStreamUpdate) {
              onStreamUpdate(update);
            }

            // Si es mensaje completo, agregarlo a los mensajes
            if (update.type === 'complete') {
              const assistantMessage: MervinMessage = {
                role: 'assistant',
                content: update.content,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, assistantMessage]);
            }
          }
        );
      } else {
        // Modo JSON normal
        const response: MervinResponse = await clientRef.current.sendMessage(
          input,
          messages,
          language
        );

        // Agregar respuesta del asistente
        const assistantMessage: MervinMessage = {
          role: 'assistant',
          content: response.message,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMessage]);
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

  return {
    messages,
    isProcessing,
    streamingUpdates,
    sendMessage,
    clearMessages,
    isHealthy,
    systemStatus
  };
}
