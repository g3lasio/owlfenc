import React, { useState, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/PermissionContext";
import { useSidebar } from "@/contexts/SidebarContext";
import { usePageContext } from "@/contexts/PageContext";
import {
  Send,
  Paperclip,
  Zap,
  Brain,
  ChevronDown,
  Check,
  X,
  File,
  FileText,
  Image as ImageIcon,
  History,
  Copy,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { useMervinAgent } from "../../mervin-v2/hooks/useMervinAgent";
import { SmartActionSystem } from "./SmartActionSystem";
import { ThinkingIndicator } from "./ThinkingIndicator";
import { MessageContent } from "./MessageContent";
import { SmartContextPanel } from "./SmartContextPanel";
import { WebResearchIndicator } from "./WebResearchIndicator";
import { ConversationHistory } from "./ConversationHistory";
import { LiveTaskIndicator } from "./LiveTaskIndicator";
import { MessageFeedback } from "./MessageFeedback";
import { EnhancedErrorMessage } from "./EnhancedErrorMessage";
import { useConversationManager } from "@/hooks/useConversationManager";

// Types
type MessageSender = "user" | "assistant";
type MessageState = "analyzing" | "thinking" | "none";
type Message = {
  id: string;
  content: string;
  sender: MessageSender;
  state?: MessageState;
  action?: string;
  taskResult?: any;
  timestamp?: Date;
  isError?: boolean;
  errorId?: string;
  errorContext?: string;
  canRetry?: boolean;
};

type AgentTask = "estimates" | "contracts" | "permits" | "properties" | "analytics" | "chat";

// Helper function to format message timestamp
function formatMessageTime(timestamp?: Date): string {
  if (!timestamp) return '';
  
  const now = new Date();
  const msgDate = new Date(timestamp);
  const isToday = now.toDateString() === msgDate.toDateString();
  
  const timeStr = msgDate.toLocaleTimeString('es-MX', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  });
  
  if (isToday) {
    return timeStr;
  } else {
    const dateStr = msgDate.toLocaleDateString('es-MX', { 
      month: 'short', 
      day: 'numeric' 
    });
    return `${dateStr}, ${timeStr}`;
  }
}

interface MervinExperienceProps {
  mode: 'full' | 'sidebar';
  onMinimize?: () => void;
  isMinimized?: boolean;
  onClose?: () => void;
}

export function MervinExperience({ mode, onMinimize, isMinimized = false, onClose }: MervinExperienceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // V2 UI States
  const [activeEndpoints, setActiveEndpoints] = useState<string[]>([]);
  const [currentAIModel, setCurrentAIModel] = useState<'ChatGPT-4o' | 'Claude Sonnet 4' | null>(null);
  const [isWebSearching, setIsWebSearching] = useState(false);
  const [webSearchResults, setWebSearchResults] = useState<number | undefined>(undefined);
  const [webSearchQuery, setWebSearchQuery] = useState<string | undefined>(undefined);
  const [suggestionContext, setSuggestionContext] = useState<'initial' | 'estimate' | 'contract' | 'permit' | 'property' | 'general'>('initial');
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  
  // File attachment states
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { userPlan } = usePermissions();
  const { isSidebarExpanded } = useSidebar();
  const { pageContext } = usePageContext();
  
  // Conversation History Manager
  const conversationManager = useConversationManager({
    userId: currentUser?.uid || null,
  });
  
  // Estado para trackear si estamos esperando cargar una conversación del historial
  const [pendingConversationLoad, setPendingConversationLoad] = useState<string | null>(null);
  

  // Mode restrictions
  const isFreeUser = userPlan?.id === 4 || userPlan?.id === 5 || 
                      userPlan?.name === "Free Trial" || 
                      userPlan?.name === "Primo Chambeador";
  const canUseAgentMode = !isFreeUser;
  
  const getInitialModel = (): "legacy" | "agent" => {
    if (isFreeUser) return "legacy";
    return "agent";
  };
  
  const [selectedModel, setSelectedModel] = useState<"legacy" | "agent">(getInitialModel());
  
  // Cambiar a legacy silenciosamente si el usuario es free (sin toast invasivo)
  useEffect(() => {
    // Solo cambiar si userPlan está cargado Y es un usuario free
    if (userPlan && isFreeUser && selectedModel === "agent") {
      setSelectedModel("legacy");
      // No mostrar toast - es redundante y molesto al cargar la página
    }
  }, [userPlan, isFreeUser, selectedModel]);
  
  // Initialize Mervin V2 Agent
  const mervinAgent = useMervinAgent({
    userId: currentUser?.uid || 'guest',
    enableStreaming: true,
    language: 'es',
    mode: selectedModel === 'legacy' ? 'chat' : 'agent', // 🎯 Mapear selectedModel a mode
    pageContext, // 👁️ Pasar contexto de página actual
    onStreamUpdate: (update) => {
      const content = update.content.toLowerCase();
      if (content.includes('estimate') || content.includes('estimado')) {
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'estimate'])));
        setSuggestionContext('estimate');
      }
      if (content.includes('contract') || content.includes('contrato')) {
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'contract'])));
        setSuggestionContext('contract');
      }
      if (content.includes('permit') || content.includes('permiso')) {
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'permit'])));
        setSuggestionContext('permit');
      }
      if (content.includes('property') || content.includes('propiedad')) {
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'property'])));
        setSuggestionContext('property');
      }
      
      if (content.includes('investigando') || content.includes('buscando') || content.includes('web search')) {
        setIsWebSearching(true);
        setActiveEndpoints(prev => Array.from(new Set([...prev, 'research'])));
        setWebSearchQuery(content.split('buscando')[1]?.split('.')[0] || 'información relevante');
      }
      
      if (update.type === 'complete' && isWebSearching) {
        setIsWebSearching(false);
        const match = content.match(/(\d+)\s+resultados?/i);
        if (match) {
          setWebSearchResults(parseInt(match[1]));
        }
      }
      
      if (content.includes('chatgpt') || content.includes('gpt-4o')) {
        setCurrentAIModel('ChatGPT-4o');
      } else if (content.includes('claude') || content.includes('sonnet')) {
        setCurrentAIModel('Claude Sonnet 4');
      }
    }
  });

  // 🔄 SINCRONIZACIÓN: Cuando estamos en modo legacy/chat, sincronizar mervinAgent.messages con el estado local messages
  // Esto asegura que las respuestas del asistente se muestren en la UI
  // ⚡ OPTIMIZADO: Usa useMemo para evitar re-renders innecesarios
  const syncedMessagesForLegacy = useMemo(() => {
    if (selectedModel !== 'legacy') return null;
    
    return mervinAgent.messages.map((msg, index) => ({
      id: `synced-${msg.role}-${index}-${msg.timestamp?.getTime() || Date.now()}`,
      content: msg.content,
      sender: msg.role === 'user' ? 'user' : 'assistant',
      timestamp: msg.timestamp || new Date(),
    }));
  }, [mervinAgent.messages, selectedModel]);

  useEffect(() => {
    if (!syncedMessagesForLegacy) return;
    
    // Comparación inteligente: verificar longitud Y último mensaje
    const needsUpdate = 
      syncedMessagesForLegacy.length !== messages.length ||
      (syncedMessagesForLegacy.length > 0 && messages.length > 0 &&
       syncedMessagesForLegacy[syncedMessagesForLegacy.length - 1].content !== messages[messages.length - 1]?.content);
    
    if (needsUpdate) {
      console.log(`🔄 [SYNC] Syncing ${syncedMessagesForLegacy.length} messages from mervinAgent to local state (legacy mode)`);
      setMessages(syncedMessagesForLegacy);
    }
  }, [syncedMessagesForLegacy, messages]);

  // Efecto para cargar mensajes cuando la conversación se carga del historial
  // ARQUITECTURA SIMPLIFICADA: Usamos mervinAgent.messages como única fuente de verdad
  useEffect(() => {
    // Solo procesar si estamos esperando cargar una conversación específica
    if (!pendingConversationLoad) return;
    
    // Si aún está cargando, esperar
    if (conversationManager.isLoadingConversation) return;
    
    // Si la conversación cargó y coincide con la que esperábamos
    if (conversationManager.activeConversation && 
        conversationManager.activeConversationId === pendingConversationLoad) {
      
      const conv = conversationManager.activeConversation;
      
      console.log(`📂 [HISTORY] Loading conversation ${conv.conversationId} with ${conv.messages.length} messages`);
      
      // Mapear mensajes al formato del agente (ÚNICA FUENTE DE VERDAD)
      const agentMessages = conv.messages.map((msg, index) => ({
        id: msg.id || `hydrated-${index}-${Date.now()}`,
        role: msg.sender === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.text,
        timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
      }));
      
      // Usar el nuevo método del hook que maneja todo correctamente
      mervinAgent.loadConversationFromHistory(conv.conversationId, agentMessages);
      
      setSelectedModel('agent');
      setCurrentAIModel(conv.aiModel === 'claude' ? 'Claude Sonnet 4' : 'ChatGPT-4o');
      
      // Limpiar el estado de carga pendiente
      setPendingConversationLoad(null);
      
      console.log(`✅ [HISTORY] Loaded ${agentMessages.length} messages successfully`);
    }
  }, [pendingConversationLoad, conversationManager.activeConversation, conversationManager.activeConversationId, conversationManager.isLoadingConversation]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    if (inputValue.startsWith('/')) {
      const command = inputValue.toLowerCase();
      const slashActions: { [key: string]: string } = {
        '/estimate': 'estimates',
        '/contract': 'contracts', 
        '/permit': 'permits',
        '/property': 'properties',
        '/analytics': 'analytics'
      };
      
      const action = slashActions[command];
      if (action) {
        setInputValue('');
        await handleAction(action, 'slash');
        return;
      }
    }

    const currentInput = inputValue;
    const currentFiles = [...attachedFiles];
    setInputValue("");
    setAttachedFiles([]);
    
    // ❌ ELIMINADO: No agregar manualmente el mensaje del usuario en modo legacy
    // El hook mervinAgent ya lo agrega a mervinAgent.messages, y el useEffect de sincronización
    // lo copiará automáticamente al estado local messages
    // Esto evita duplicación y mantiene una única fuente de verdad
    
    setActiveEndpoints([]);
    setCurrentAIModel(null);
    setIsWebSearching(false);
    setWebSearchResults(undefined);
    setWebSearchQuery(undefined);
    setSuggestionContext('general');
    
    setIsLoading(true);

    try {
      if ((selectedModel === "agent" && canUseAgentMode && mervinAgent.isHealthy) || 
          (selectedModel === "legacy" && mervinAgent.isHealthy)) {
        // ✅ USAR SISTEMA REAL: Tanto agent como legacy usan mervinAgent
        // El backend maneja la diferencia entre modos con el parámetro 'mode'
        await mervinAgent.sendMessage(currentInput, currentFiles.length > 0 ? currentFiles : undefined);
      } else {
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          content: "⚠️ El servicio de Mervin V2 no está disponible en este momento. Por favor intenta de nuevo más tarde.",
          sender: "assistant",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      
    } catch (error: any) {
      console.error("Error processing request:", error);
      
      // Generar ID de error único
      const errorId = `M-${Date.now().toString(36).toUpperCase()}`;
      
      const errorMessage: Message = {
        id: "error-" + Date.now(),
        content: error?.message || "Hubo un problema procesando tu solicitud",
        sender: "assistant",
        timestamp: new Date(),
        isError: true,
        errorId: errorId,
        errorContext: "El agente encontró un problema al procesar tu mensaje. Puedes intentar de nuevo o reformular tu pregunta.",
        canRetry: true
      };
      setMessages(prev => [...prev, errorMessage]);
      
      // No mostrar toast - el mensaje de error enriquecido es suficiente
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAction = async (action: string, source: 'slash' | 'smart' | 'fab' | 'button' = 'button') => {
    setActiveEndpoints([]);
    setCurrentAIModel(null);
    setIsWebSearching(false);
    setWebSearchResults(undefined);
    setWebSearchQuery(undefined);
    setSuggestionContext('general');
    
    let contextMsg = '';
    switch(source) {
      case 'slash':
        contextMsg = '⚡ Comando ejecutado rápidamente';
        break;
      case 'smart':
        contextMsg = '🧠 Intención detectada automáticamente';
        break;
      case 'fab':
        contextMsg = '🎯 Acción seleccionada del menú';
        break;
      default:
        contextMsg = '🚀 Función activada';
    }
    setCurrentTask(action as AgentTask);
    
    const actionMessage: Message = {
      id: "action-" + Date.now(),
      content: `${contextMsg}\n\n🚀 **Activando ${action.toUpperCase()}**\n\nInicializando agente autónomo para ${action}...`,
      sender: "assistant",
      state: "analyzing",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, actionMessage]);
    
    try {
      if (selectedModel === "agent" && canUseAgentMode && mervinAgent.isHealthy) {
        const taskPrompt = getTaskPrompt(action);
        await mervinAgent.sendMessage(taskPrompt);
      } else {
        const guidanceMessage: Message = {
          id: "guidance-" + Date.now(),
          content: `Para usar ${action}, activa el modo Agent arriba y háblame sobre lo que necesitas, primo.`,
          sender: "assistant",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, guidanceMessage]);
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      const errorMessage: Message = {
        id: "error-" + Date.now(),
        content: `¡Órale! Hubo un problemita con ${action}. Dime qué necesitas hacer y te ayudo de otra forma, compadre.`,
        sender: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };
  
  const getTaskPrompt = (action: string): string => {
    const prompts = {
      estimates: "ESTIMATE_WIZARD_START: Iniciar flujo conversacional de estimado paso a paso empezando por información del cliente",
      contracts: "Necesito generar un contrato. Inicia el flujo completo de creación de contratos.",
      permits: "Quiero analizar permisos municipales. Activa el asesor de permisos.",
      properties: "Necesito verificar la propiedad de un inmueble. Inicia la verificación.",
      analytics: "Quiero revisar el seguimiento de pagos y análisis. Activa las analíticas."
    };
    return prompts[action as keyof typeof prompts] || `Activa la funcionalidad de ${action}.`;
  };
  
  const handleNewConversation = () => {
    setMessages([]);
    setActiveEndpoints([]);
    setCurrentAIModel(null);
    setWebSearchResults(undefined);
    setWebSearchQuery(undefined);
    setSuggestionContext('initial');
    conversationManager.clearActiveConversation();
    setIsHistorySidebarOpen(false);
    mervinAgent.startNewConversation();
  };
  
  const handleSelectConversation = async (conversationId: string) => {
    console.log(`📂 [HISTORY] User selected conversation: ${conversationId}`);
    
    // Limpiar mensajes actuales mientras cargamos
    setMessages([]);
    
    // Marcar que estamos esperando cargar esta conversación
    setPendingConversationLoad(conversationId);
    
    // Notificar a los sistemas de la nueva conversación
    mervinAgent.loadConversation(conversationId);
    conversationManager.loadConversation(conversationId);
    
    // Cerrar el sidebar del historial
    setIsHistorySidebarOpen(false);
    
    // El useEffect de arriba se encargará de cargar los mensajes cuando los datos estén listos
  };
  
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await conversationManager.deleteConversation(conversationId);
      if (conversationManager.activeConversationId === conversationId) {
        setMessages([]);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la conversación',
        variant: 'destructive',
      });
    }
  };
  
  const handlePinConversation = async (conversationId: string, isPinned: boolean) => {
    try {
      await conversationManager.updateConversation(conversationId, { isPinned });
    } catch (error) {
      console.error('Error pinning conversation:', error);
    }
  };
  
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      // No mostrar toast - el icono de check ya da feedback visual
      
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('Error copying message:', error);
      // Solo log, no toast para errores menores
    }
  };

  const handleFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    try {
      // TODO: Enviar feedback al backend para el SelfEvaluationSystem
      console.log(`Feedback for message ${messageId}: ${feedback}`);
      
      // Aquí se integraría con el endpoint del backend
      // await fetch('/api/mervin-v2/feedback', {
      //   method: 'POST',
      //   body: JSON.stringify({ messageId, feedback, userId: currentUser?.uid })
      // });
    } catch (error) {
      console.error('Error sending feedback:', error);
    }
  };

  const handleReportMessage = async (messageId: string, content: string) => {
    try {
      // TODO: Enviar reporte al backend
      console.log(`Reported message ${messageId}`);
      
      // Aquí se integraría con el sistema de soporte
      // await fetch('/api/support/report', {
      //   method: 'POST',
      //   body: JSON.stringify({ messageId, content, userId: currentUser?.uid })
      // });
    } catch (error) {
      console.error('Error reporting message:', error);
    }
  };

  const handleRetryError = async () => {
    // Reintentar el último mensaje del usuario
    const lastUserMessage = messages.filter(m => m.sender === 'user').pop();
    if (lastUserMessage) {
      // Eliminar el mensaje de error
      setMessages(prev => prev.filter(m => !m.isError));
      // Reenviar el mensaje
      await handleSendMessage();
    }
  };

  const handleReportError = async (errorId: string, errorMessage: string) => {
    try {
      console.log(`Reported error ${errorId}: ${errorMessage}`);
      // TODO: Integrar con sistema de soporte
    } catch (error) {
      console.error('Error reporting error:', error);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    
    if (attachedFiles.length + newFiles.length > 5) {
      toast({
        title: 'Límite de archivos',
        description: 'Solo puedes adjuntar hasta 5 archivos',
        variant: 'destructive',
      });
      return;
    }

    const oversizedFiles = newFiles.filter(file => file.size > 10 * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'Archivo muy grande',
        description: 'Cada archivo debe ser menor a 10 MB',
        variant: 'destructive',
      });
      return;
    }

    setAttachedFiles(prev => [...prev, ...newFiles]);
    // No mostrar toast - los archivos se muestran visualmente en la UI

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col h-full w-full bg-black text-white">
      {/* Header - Simplified and Compact */}
      <div className="px-3 py-2 border-b border-cyan-900/30 bg-black/90 sticky top-0 z-40 flex-shrink-0">
        <div className="flex items-center justify-between gap-2">
          {/* Logo + Title - Responsive */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <img 
              src="https://i.postimg.cc/FK6hvMbf/logo-mervin.png" 
              alt="Mervin AI Logo" 
              className="w-6 h-6 hidden md:block"
            />
            <h1 className="text-sm font-semibold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Mervin AI
            </h1>
          </div>
          
          {/* Action Buttons - Compact */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-cyan-500 hover:text-cyan-400 hover:bg-gray-800/50"
              onClick={() => setIsHistorySidebarOpen(true)}
              data-testid="button-open-history"
              title="Historial"
            >
              <History className="w-4 h-4" />
            </Button>
            
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-cyan-500 hover:text-cyan-400 hover:bg-gray-800/50"
                onClick={() => canUseAgentMode && setShowModelSelector(!showModelSelector)}
                title={isFreeUser ? "Chat Mode" : selectedModel === "agent" ? "Agent Mode" : "Chat Mode"}
              >
                {selectedModel === "agent" ? (
                  <Brain className="w-4 h-4" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
              </Button>
              
              {showModelSelector && canUseAgentMode && (
                <div className="absolute top-full right-0 mt-1 bg-gray-800 border border-cyan-900/50 rounded-md shadow-xl z-50 min-w-[160px]">
                  <button
                    className={`w-full text-left px-3 py-2 rounded-t-md flex items-center justify-between text-xs ${
                      selectedModel === "agent"
                        ? 'text-cyan-400 bg-cyan-900/20'
                        : 'text-cyan-400 hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      setSelectedModel("agent");
                      setShowModelSelector(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5" />
                      <span className="font-medium">Agent Mode</span>
                    </div>
                    {selectedModel === "agent" && <Check className="w-3.5 h-3.5" />}
                  </button>
                  
                  <button
                    className={`w-full text-left px-3 py-2 rounded-b-md flex items-center justify-between text-xs ${
                      selectedModel === "legacy"
                        ? 'text-cyan-400 bg-cyan-900/20'
                        : 'text-gray-400 hover:bg-gray-700'
                    }`}
                    onClick={() => {
                      setSelectedModel("legacy");
                      setShowModelSelector(false);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5" />
                      <span className="font-medium">Chat Mode</span>
                    </div>
                    {selectedModel === "legacy" && <Check className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
            
            {mode === 'sidebar' && onMinimize && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-cyan-500 hover:text-cyan-400 hover:bg-gray-800/50"
                onClick={onMinimize}
                data-testid="button-minimize-chat"
                title={isMinimized ? "Expandir" : "Minimizar"}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </Button>
            )}
            
            {mode === 'sidebar' && onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-gray-400 hover:text-red-400 hover:bg-gray-800/50"
                onClick={onClose}
                data-testid="button-close-chat"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 md:p-4 space-y-4 pb-28 md:pb-24">
        {(activeEndpoints.length > 0 || currentAIModel) && (
          <SmartContextPanel
            activeEndpoints={activeEndpoints}
            currentModel={currentAIModel}
            isProcessing={isLoading}
          />
        )}

        {(isWebSearching || webSearchResults !== undefined) && (
          <WebResearchIndicator
            isSearching={isWebSearching}
            resultsFound={webSearchResults}
            query={webSearchQuery}
          />
        )}

        {selectedModel === "agent" && canUseAgentMode ? (
          mervinAgent.messages.map((message, index) => (
            <div
              key={`msg-${index}-${message.timestamp?.getTime() || Date.now()}`}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              } animate-fade-in animate-slide-up`}
            >
              <div className="relative group">
                <div
                  className={`max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl md:rounded-lg text-base md:text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-cyan-600 text-white shadow-lg"
                      : "bg-gray-800 text-gray-200 shadow-lg"
                  }`}
                >
                  <MessageContent 
                    content={message.content}
                    sender={message.role === "user" ? "user" : "assistant"}
                    enableTyping={true}
                  />
                  
                  {message.timestamp && (
                    <div className={`mt-2 text-xs ${
                      message.role === "user" 
                        ? "text-cyan-200/70" 
                        : "text-gray-400"
                    }`}>
                      {formatMessageTime(message.timestamp)}
                    </div>
                  )}
                </div>
                
                {message.role === "assistant" && (
                  <MessageFeedback
                    messageId={`msg-${index}`}
                    messageContent={message.content}
                    onCopy={handleCopyMessage}
                    onFeedback={handleFeedback}
                    onReport={handleReportMessage}
                    isCopied={copiedMessageId === `msg-${index}`}
                  />
                )}
              </div>
            </div>
          ))
        ) : (
          messages.map((message, index) => (
            <div
              key={message.id || `msg-${index}`}
              className={`flex ${
                message.sender === "user" ? "justify-end" : "justify-start"
              } animate-fade-in animate-slide-up`}
            >
              <div className="relative group">
                {message.isError ? (
                  <div className="max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg w-full">
                    <EnhancedErrorMessage
                      errorId={message.errorId || 'UNKNOWN'}
                      errorMessage={message.content}
                      errorContext={message.errorContext}
                      canRetry={message.canRetry}
                      onRetry={handleRetryError}
                      onReport={handleReportError}
                    />
                  </div>
                ) : (
                  <>
                    <div
                      className={`max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl md:rounded-lg text-base md:text-sm leading-relaxed ${
                        message.sender === "user"
                          ? "bg-cyan-600 text-white shadow-lg"
                          : "bg-gray-800 text-gray-200 shadow-lg"
                      }`}
                    >
                      <MessageContent 
                        content={message.content}
                        sender={message.sender}
                        enableTyping={true}
                      />
                      
                      {message.timestamp && (
                        <div className={`mt-2 text-xs ${
                          message.sender === "user" 
                            ? "text-cyan-200/70" 
                            : "text-gray-400"
                        }`}>
                          {formatMessageTime(message.timestamp)}
                        </div>
                      )}
                    </div>
                    
                    {message.sender === "assistant" && (
                      <MessageFeedback
                        messageId={message.id}
                        messageContent={message.content}
                        onCopy={handleCopyMessage}
                        onFeedback={handleFeedback}
                        onReport={handleReportMessage}
                        isCopied={copiedMessageId === message.id}
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
        
        {isLoading && mervinAgent.streamingUpdates.length > 0 && (
          <div className="flex justify-start">
            <div className="max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg w-full">
              <LiveTaskIndicator
                updates={mervinAgent.streamingUpdates}
                isActive={isLoading}
              />
            </div>
          </div>
        )}
        
        {isLoading && mervinAgent.streamingUpdates.length === 0 && (
          <div className="flex justify-start px-2">
            <ThinkingIndicator currentAction={undefined} />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div 
        className={`${
          mode === 'full'
            ? `fixed bottom-0 right-0 bg-black/95 backdrop-blur-sm border-t border-cyan-900/30 pb-safe-area-inset-bottom transition-all duration-300 ease-in-out ${
                isSidebarExpanded 
                  ? 'left-0 sm:left-[280px]' 
                  : 'left-0 sm:left-[64px]'
              }`
            : 'border-t border-cyan-900/30 bg-black/95 backdrop-blur-sm flex-shrink-0'
        }`}
      >
        <div className="p-4 md:p-3">
          <div className="relative max-w-screen-lg mx-auto">
            <SmartActionSystem 
              onAction={handleAction}
              currentMessage={inputValue}
              isVisible={!isOnboardingMode}
            />
            
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gray-800/50 border border-cyan-900/30 rounded-lg px-3 py-2 text-xs sm:text-sm"
                  >
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-cyan-400 flex-shrink-0" />
                    ) : file.type === 'application/pdf' ? (
                      <FileText className="h-4 w-4 text-red-400 flex-shrink-0" />
                    ) : (
                      <File className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    )}
                    <span className="text-gray-300 max-w-[120px] sm:max-w-[150px] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="text-gray-400 active:text-red-400 transition-colors touch-manipulation p-1"
                      title="Eliminar archivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 md:gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="*/*"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file"
              />
              
              <Button
                variant="outline"
                size="icon"
                className="bg-gray-800 text-cyan-500 border-cyan-900/50 min-h-[48px] min-w-[48px] md:min-h-[40px] md:min-w-[40px] flex-shrink-0 hover:bg-gray-700"
                title="Adjuntar archivos (PDF, imágenes, documentos)"
                onClick={handleFileButtonClick}
                data-testid="button-attach-files"
              >
                <Paperclip className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe tu mensaje o usa / para comandos rápidos..."
                  className="w-full bg-gray-800 border border-cyan-900/50 rounded-full px-5 py-3 md:px-4 md:py-2 text-white text-base md:text-sm focus:outline-none focus:border-cyan-500 min-h-[48px] md:min-h-[40px]"
                  disabled={isLoading}
                />
                
                {inputValue.startsWith('/') && (
                  <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-cyan-400 text-xs hidden md:block">
                    ⚡ Comando
                  </div>
                )}
              </div>
              <Button
                variant="default"
                className="rounded-full bg-cyan-600 hover:bg-cyan-700 min-h-[48px] min-w-[48px] md:min-h-[40px] md:min-w-[40px] flex-shrink-0"
                onClick={handleSendMessage}
                disabled={inputValue.trim() === "" || isLoading}
                data-testid="button-send-message"
              >
                <Send className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </div>
            
            {!isOnboardingMode && inputValue.length === 0 && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                💡 Tip: Escribe "/" para comandos rápidos o háblale a Mervin naturalmente
              </div>
            )}
          </div>
        </div>
      </div>
      
      <ConversationHistory
        isOpen={isHistorySidebarOpen}
        onClose={() => setIsHistorySidebarOpen(false)}
        conversations={conversationManager.conversations}
        activeConversationId={conversationManager.activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onPinConversation={handlePinConversation}
        isLoading={conversationManager.isLoadingConversations}
      />
    </div>
  );
}
