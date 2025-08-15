/**
 * MERVIN CHAT - INTERFAZ SIMPLIFICADA PARA EL AGENTE
 * 
 * Nueva interfaz simplificada que reemplaza el monolito de 6,550 líneas.
 * Diseñada para trabajar con el sistema de agente autónomo.
 * 
 * Responsabilidades:
 * - UI limpia y moderna para chat
 * - Integración con MervinAgent
 * - Visualización de progreso en tiempo real
 * - Manejo de diferentes tipos de respuesta
 * - Selector de modelo (Legacy/Agent mode)
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Zap, Brain, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/contexts/PermissionContext';

// Import the new agent system
import { MervinAgent, AgentConfig, AgentState, TaskResult } from '../core/MervinAgent';
import { TaskProgress } from '../core/TaskOrchestrator';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  taskResult?: TaskResult;
  isTyping?: boolean;
}

interface MervinChatProps {
  className?: string;
}

export function MervinChat({ className = '' }: MervinChatProps) {
  // Estados principales
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'legacy' | 'agent'>('agent');
  const [showModelSelector, setShowModelSelector] = useState(false);
  
  // Estados del agente
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [taskProgress, setTaskProgress] = useState<TaskProgress | null>(null);
  
  // Referencias
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const agentRef = useRef<MervinAgent | null>(null);
  
  // Hooks
  const { currentUser } = useAuth();
  const { userPlan } = usePermissions();
  const { toast } = useToast();

  // Inicializar agente
  useEffect(() => {
    if (currentUser && !agentRef.current) {
      const agentConfig: AgentConfig = {
        userId: currentUser.uid,
        userPermissions: userPlan || {},
        subscriptionLevel: userPlan?.name || 'free',
        debug: process.env.NODE_ENV === 'development'
      };

      agentRef.current = new MervinAgent(agentConfig);
      
      // Agregar mensaje de bienvenida personalizado
      const welcomeContent = agentRef.current?.getWelcomeMessage(selectedModel === 'agent') || 
        (selectedModel === 'agent' 
          ? '🤖 **¡Hola! Soy Mervin AI en modo Agente Autónomo.** \n\nPuedo ejecutar tareas complejas de forma autónoma como:\n• Generar estimados completos\n• Crear contratos con firma dual\n• Analizar permisos municipales\n• Verificar propiedades\n• Y mucho más...\n\n¿En qué puedo ayudarte hoy?'
          : '💬 **¡Hola! Soy Mervin AI en modo Legacy.**\n\nEstoy aquí para ayudarte con información y guiarte paso a paso. ¿En qué puedo asistirte?');

      const welcomeMessage: Message = {
        id: 'welcome',
        content: welcomeContent,
        sender: 'assistant',
        timestamp: new Date()
      };

      setMessages([welcomeMessage]);
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.dispose();
      }
    };
  }, [currentUser, selectedModel]);

  // Scroll automático al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, taskProgress]);

  // Manejar cambio de modelo
  const handleModelChange = (model: 'legacy' | 'agent') => {
    setSelectedModel(model);
    setShowModelSelector(false);
    
    // Limpiar mensajes y reinicializar
    setMessages([]);
    if (agentRef.current) {
      agentRef.current.dispose();
      agentRef.current = null;
    }
    
    toast({
      title: `Modo ${model === 'agent' ? 'Agente Autónomo' : 'Legacy'} activado`,
      description: model === 'agent' 
        ? 'Ahora puedo ejecutar tareas complejas automáticamente'
        : 'Modo de conversación tradicional activado'
    });
  };

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || !currentUser) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      if (selectedModel === 'agent' && agentRef.current) {
        await handleAgentMode(userMessage);
      } else {
        await handleLegacyMode(userMessage);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      
      const errorMessage: Message = {
        id: `error_${Date.now()}`,
        content: `❌ **Error procesando mensaje:** ${(error as Error).message}\n\nIntenta de nuevo o contacta soporte si el problema persiste.`,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'No pude procesar tu mensaje. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
      setTaskProgress(null);
    }
  };

  // Manejar modo agente autónomo
  const handleAgentMode = async (userMessage: Message) => {
    if (!agentRef.current) return;

    // Configurar callbacks de progreso
    const agent = agentRef.current;
    
    // Agregar mensaje de "pensando"
    const thinkingMessage: Message = {
      id: `thinking_${Date.now()}`,
      content: '🤔 **Analizando tu solicitud...**\n\nEstoy determinando la mejor forma de ayudarte.',
      sender: 'assistant',
      timestamp: new Date(),
      isTyping: true
    };
    
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      // Procesar con el agente
      const result = await agent.processUserInput(userMessage.content, messages);
      
      // Remover mensaje de "pensando"
      setMessages(prev => prev.filter(m => m.id !== thinkingMessage.id));
      
      // Usar respuesta conversacional si está disponible
      const responseContent = result.data?.conversationalResponse 
        ? result.data.conversationalResponse 
        : formatAgentResponse(result);

      // Agregar respuesta del agente
      const agentResponse: Message = {
        id: `agent_${Date.now()}`,
        content: responseContent,
        sender: 'assistant',
        timestamp: new Date(),
        taskResult: result
      };
      
      setMessages(prev => [...prev, agentResponse]);
      
      // Mostrar toast de éxito/error
      if (result.success) {
        toast({
          title: 'Tarea completada',
          description: `Ejecuté ${result.stepsCompleted} pasos en ${(result.executionTime / 1000).toFixed(1)}s`
        });
      }

    } catch (error) {
      // Remover mensaje de "pensando"
      setMessages(prev => prev.filter(m => m.id !== thinkingMessage.id));
      throw error;
    }
  };

  // Manejar modo legacy
  const handleLegacyMode = async (userMessage: Message) => {
    // Simulación del modo legacy (puedes conectar con el sistema anterior si es necesario)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simular processing

    const legacyResponse: Message = {
      id: `legacy_${Date.now()}`,
      content: `💬 **Modo Legacy Activado**\n\nRecibí tu mensaje: "${userMessage.content}"\n\nEn modo legacy, puedo ayudarte con información general y guiarte paso a paso. Para ejecutar tareas automáticamente, cambia al **modo Agente**.\n\n¿Te gustaría que te explique cómo hacer algo específico?`,
      sender: 'assistant',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, legacyResponse]);
  };

  // Formatear respuesta del agente
  const formatAgentResponse = (result: TaskResult): string => {
    if (!result.success) {
      return `❌ **No pude completar la tarea**\n\n**Error:** ${result.error}\n\n**Sugerencias:**\n• Verifica que tengas los permisos necesarios\n• Asegúrate de proporcionar información completa\n• Intenta reformular tu solicitud`;
    }

    let response = `✅ **Tarea ejecutada exitosamente**\n\n`;
    
    response += `📊 **Resumen:**\n`;
    response += `• Pasos completados: ${result.stepsCompleted}\n`;
    response += `• Tiempo de ejecución: ${(result.executionTime / 1000).toFixed(1)} segundos\n`;
    response += `• Endpoints utilizados: ${result.endpointsUsed.length}\n\n`;

    if (result.data) {
      if (result.data.type === 'estimate_result') {
        response += `📋 **Estimado generado:**\n`;
        response += `• ID: ${result.data.estimateData?.id}\n`;
        response += `• Total: $${result.data.estimateData?.totals?.total?.toFixed(2) || '0.00'}\n`;
        if (result.data.emailSent) {
          response += `• ✉️ Enviado por email\n`;
        }
      } else if (result.data.type === 'contract_result') {
        response += `📋 **Contrato generado:**\n`;
        response += `• ID: ${result.data.contractId}\n`;
        if (result.data.signatureLinks) {
          response += `• ✍️ Enlaces de firma creados\n`;
        }
      }
    }

    response += `\n💡 **¿Necesitas algo más?** Puedo ayudarte con la siguiente tarea.`;

    return response;
  };

  // Manejar tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-50 to-blue-50 ${className}`}>
      {/* Header con selector de modelo */}
      <div className="flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              {selectedModel === 'agent' ? (
                <Brain className="w-6 h-6 text-white" />
              ) : (
                <Zap className="w-6 h-6 text-white" />
              )}
            </div>
            {agentState?.isActive && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-slate-800">Mervin AI</h1>
              
              {/* Selector de modelo */}
              <div className="relative">
                <button
                  onClick={() => setShowModelSelector(!showModelSelector)}
                  className="flex items-center space-x-1 px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <span>{selectedModel === 'agent' ? 'Agent mode' : 'Legacy'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                
                {showModelSelector && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 min-w-[160px]">
                    <button
                      onClick={() => handleModelChange('agent')}
                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 rounded-t-lg ${selectedModel === 'agent' ? 'bg-blue-50 text-blue-700' : ''}`}
                    >
                      <div className="font-medium">Agent mode</div>
                      <div className="text-xs text-slate-500">Ejecución autónoma</div>
                    </button>
                    <button
                      onClick={() => handleModelChange('legacy')}
                      className={`w-full text-left px-4 py-2 hover:bg-slate-50 rounded-b-lg ${selectedModel === 'legacy' ? 'bg-blue-50 text-blue-700' : ''}`}
                    >
                      <div className="font-medium">Legacy</div>
                      <div className="text-xs text-slate-500">Chat tradicional</div>
                    </button>
                  </div>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-500">
              {agentState?.isActive ? 'Ejecutando tarea...' : 'Listo para ayudarte'}
            </p>
          </div>
        </div>
        
        {/* Estado del usuario */}
        <div className="flex items-center space-x-2 text-sm text-slate-600">
          <span>{userPlan?.name || 'Free'}</span>
          <div className="w-2 h-2 bg-green-500 rounded-full" />
        </div>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.sender === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-800 shadow-sm border border-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.content.split('\n').map((line, index) => (
                  <div key={index}>
                    {formatMessageLine(line)}
                  </div>
                ))}
              </div>
              
              {message.isTyping && (
                <div className="flex items-center space-x-1 mt-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm opacity-70">Procesando...</span>
                </div>
              )}
              
              <div className={`text-xs mt-2 opacity-70 ${message.sender === 'user' ? 'text-blue-100' : 'text-slate-500'}`}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {/* Indicador de progreso de tarea */}
        {taskProgress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-blue-800">
                {taskProgress.currentStepName}
              </span>
              <span className="text-sm text-blue-600">
                {taskProgress.currentStep}/{taskProgress.totalSteps}
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${taskProgress.progress}%` }}
              />
            </div>
            {taskProgress.estimatedTimeRemaining > 0 && (
              <div className="text-xs text-blue-600 mt-1">
                Tiempo estimado restante: {Math.round(taskProgress.estimatedTimeRemaining / 1000)}s
              </div>
            )}
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Área de input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                selectedModel === 'agent' 
                  ? "Describe qué necesitas hacer (ej: 'Crear estimado para cerca de 100 pies para Juan Pérez')..." 
                  : "Escribe tu mensaje..."
              }
              className="w-full resize-none border border-slate-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={inputValue.split('\n').length}
              maxLength={1000}
              disabled={isLoading}
            />
          </div>
          
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </Button>
        </div>
        
        <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
          <span>Enter para enviar • Shift+Enter para nueva línea</span>
          <span>{inputValue.length}/1000</span>
        </div>
      </div>
    </div>
  );
}

// Utilidad para formatear líneas de mensaje
const formatMessageLine = (line: string) => {
  // Formatear texto en negrita
  if (line.includes('**')) {
    const parts = line.split('**');
    return (
      <>
        {parts.map((part, index) => 
          index % 2 === 0 ? part : <strong key={index}>{part}</strong>
        )}
      </>
    );
  }
  
  // Formatear listas con •
  if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
    return <div className="ml-4">{line}</div>;
  }
  
  return line;
};