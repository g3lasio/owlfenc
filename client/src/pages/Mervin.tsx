import React, { useState, useRef, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/contexts/PermissionContext";
import { useSidebar } from "@/contexts/SidebarContext";
import {
  Send,
  Paperclip,
  Zap,
  Brain,
  ChevronDown,
  GraduationCap,
  SkipForward,
  Sparkles,
  Lock,
  Cpu,
  Copy,
  Check,
  X,
  File,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { ConversationEngine } from "../mervin-ai/core/ConversationEngine";
import { SmartActionSystem } from "../components/mervin/SmartActionSystem";
import { useMervinAgent } from "../mervin-v2/hooks/useMervinAgent";
import { ThinkingIndicator } from "../components/mervin/ThinkingIndicator";
import { MessageContent } from "../components/mervin/MessageContent";
import { SmartContextPanel } from "../components/mervin/SmartContextPanel";
import { AgentCapabilitiesBadge } from "../components/mervin/AgentCapabilitiesBadge";
import { DynamicActionSuggestions } from "../components/mervin/DynamicActionSuggestions";
import { WebResearchIndicator } from "../components/mervin/WebResearchIndicator";
import { SystemStatusBar } from "../components/mervin/SystemStatusBar";
import { FuturisticThinking } from "../components/mervin/FuturisticThinking";
import { ConversationHistory } from "../components/mervin/ConversationHistory";
import { useConversationManager } from "@/hooks/useConversationManager";
import { History } from "lucide-react";

// Complete types for agent functionality
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
};

type AgentTask = "estimates" | "contracts" | "permits" | "properties" | "analytics" | "chat";

interface AgentResponse {
  message: string;
  requiresAction?: boolean;
  actionType?: string;
  taskData?: any;
  followUpActions?: string[];
}

// Action buttons removed - now handled by SmartActionSystem

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

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"legacy" | "agent">("agent");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [showOnboardingProgress, setShowOnboardingProgress] = useState(false);
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
  const conversationEngineRef = useRef<ConversationEngine | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { userPlan } = usePermissions();
  const { isSidebarExpanded } = useSidebar();
  
  // Conversation History Manager
  const conversationManager = useConversationManager({
    userId: currentUser?.uid || null,
  });

  // Detect if user is free plan (Primo Chambeador)
  const isFreeUser = userPlan?.id === 5 || userPlan?.name === "Primo Chambeador";
  const canUseAgentMode = !isFreeUser;

  // Initialize Mervin V2 Agent (only if user has access and is in agent mode)
  const mervinAgent = useMervinAgent({
    userId: currentUser?.uid || 'guest',
    enableStreaming: true, // ✅ Streaming activado
    language: 'es',
    onStreamUpdate: (update) => {
      console.log('📡 [STREAM-UPDATE]:', update);
      
      // Detectar endpoints activos
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
      
      // Detectar web research
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
      
      // Detectar modelo AI en uso
      if (content.includes('chatgpt') || content.includes('gpt-4o')) {
        setCurrentAIModel('ChatGPT-4o');
      } else if (content.includes('claude') || content.includes('sonnet')) {
        setCurrentAIModel('Claude Sonnet 4');
      }
    }
  });

  // React to mervinAgent messages updates (fix asynchronous state issue)
  useEffect(() => {
    if (mervinAgent.messages.length > 0) {
      const lastMervinMessage = mervinAgent.messages[mervinAgent.messages.length - 1];
      
      // Only add assistant messages that are new (not already in our messages state)
      if (lastMervinMessage.role === 'assistant') {
        const alreadyExists = messages.some(msg => 
          msg.sender === 'assistant' && 
          msg.content === lastMervinMessage.content &&
          Math.abs(new Date().getTime() - (lastMervinMessage.timestamp?.getTime() || 0)) < 1000
        );
        
        if (!alreadyExists) {
          console.log('📨 [MERVIN-UI] Adding assistant message from hook:', lastMervinMessage.content.substring(0, 50));
          
          // Remove any processing/thinking messages
          setMessages(prev => {
            const filtered = prev.filter(msg => msg.state !== 'analyzing' && msg.state !== 'thinking');
            return [...filtered, {
              id: "assistant-" + Date.now(),
              content: lastMervinMessage.content,
              sender: "assistant" as MessageSender,
              timestamp: lastMervinMessage.timestamp || new Date()
            }];
          });
          
          // Limpiar estados al completar
          setIsLoading(false);
          
          // Reset web search indicators después de 3 segundos
          setTimeout(() => {
            setIsWebSearching(false);
          }, 3000);
        }
      }
    }
  }, [mervinAgent.messages]);

  // Función para determinar si el input requiere capacidades de agente autónomo
  const isTaskRequiringAgent = (input: string): boolean => {
    const taskKeywords = [
      // Estimados y cotizaciones
      'estimado', 'cotizar', 'presupuesto', 'precio', 'cuanto cuesta', 'costo',
      'quote', 'estimate', 'pricing', 'cost', 'budget',
      
      // Contratos y documentos legales
      'contrato', 'acuerdo', 'firmar', 'documento legal', 'terms',
      'contract', 'agreement', 'sign', 'legal document',
      
      // Permisos y regulaciones
      'permiso', 'municipal', 'ciudad', 'building code', 'regulation',
      'permit', 'city', 'approval', 'code', 'inspection',
      
      // Verificación de propiedades
      'propiedad', 'dueño', 'propietario', 'verificar ownership', 
      'property', 'owner', 'ownership', 'verify', 'title',
      
      // Generación de documentos
      'generar', 'crear', 'hacer un', 'preparar', 'armar',
      'generate', 'create', 'make', 'prepare', 'build'
    ];
    
    const lowerInput = input.toLowerCase();
    
    // Comandos slash siempre requieren agente
    if (lowerInput.startsWith('/')) return true;
    
    // Verificar si contiene palabras clave de tareas específicas
    const hasTaskKeywords = taskKeywords.some(keyword => lowerInput.includes(keyword));
    
    // Verificar patrones de solicitudes específicas
    const hasActionPattern = /\b(crear?|generar?|hacer|armar|calcular|verificar|revisar)\b.*\b(estimado|contrato|permiso|propiedad)\b/i.test(lowerInput);
    
    return hasTaskKeywords || hasActionPattern;
  };

  // Initialize systems and onboarding detection
  useEffect(() => {
    if (!conversationEngineRef.current && currentUser?.uid) {
      conversationEngineRef.current = new ConversationEngine(currentUser.uid);
      console.log('🤖 [MERVIN-V2] Ready for V2 integration');
    }
  }, [currentUser, userPlan]);

  // Handle onboarding mode activation - DISABLED
  useEffect(() => {
    // ONBOARDING REMOVED: Usuarios van directo al dashboard
    // Regular initialization for existing users
    if (currentUser?.uid) {
      const engine = conversationEngineRef.current;
      if (engine && messages.length === 0) {
        const welcomeContent = engine.generateWelcomeMessage(selectedModel === "agent");
        const welcomeMessage: Message = {
          id: "welcome",
          content: welcomeContent,
          sender: "assistant",
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    }
  }, [currentUser, selectedModel, messages.length]);

  // Handle slash commands
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Check for slash commands
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
        setInputValue(''); // Clear input
        await handleAction(action, 'slash');
        return;
      }
    }

    const userMessage: Message = {
      id: "user-" + Date.now(),
      content: inputValue,
      sender: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    const currentFiles = [...attachedFiles]; // Capturar archivos actuales
    setInputValue("");
    setAttachedFiles([]); // Limpiar archivos adjuntos
    
    // Reset all context states for fresh task
    setActiveEndpoints([]);
    setCurrentAIModel(null);
    setIsWebSearching(false);
    setWebSearchResults(undefined);
    setWebSearchQuery(undefined);
    setSuggestionContext('general');
    
    setIsLoading(true);

    // No need for thinking message anymore - ThinkingIndicator handles it

    try {
      // AGENT MODE V2 - Use backend orchestrator
      if (selectedModel === "agent" && canUseAgentMode && mervinAgent.isHealthy) {
        console.log('🤖 [AGENT-MODE-V2] Using Mervin V2 backend orchestrator');
        
        // Send to Mervin V2 backend with files if any
        await mervinAgent.sendMessage(currentInput, currentFiles.length > 0 ? currentFiles : undefined);
        
        // Note: The assistant response will be added automatically by the useEffect
        // that watches mervinAgent.messages
        
      } else if (selectedModel === "legacy" || !canUseAgentMode) {
        // LEGACY MODE - Simple conversational responses
        console.log('💬 [LEGACY-MODE] Using simple conversational mode');
        
        // Simple responses for legacy mode
        const legacyResponses = [
          "¡Órale primo! En modo Legacy te puedo ayudar con conversaciones simples. Para funciones avanzadas, activa el modo Agent.",
          "¡Qué onda! Estoy en modo conversacional. Si necesitas que genere estimados o contratos, cambia a modo Agent arriba.",
          "¡Ey compadre! Te escucho. Para usar las capacidades completas del agente, activa el modo Agent en el selector de arriba."
        ];
        
        const randomResponse = legacyResponses[Math.floor(Math.random() * legacyResponses.length)];
        
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          content: randomResponse,
          sender: "assistant",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Fallback - Service not available
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          content: "⚠️ El servicio de Mervin V2 no está disponible en este momento. Por favor intenta de nuevo más tarde.",
          sender: "assistant",
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      
    } catch (error) {
      console.error("Error processing request:", error);
      
      const errorMessage: Message = {
        id: "assistant-" + Date.now(),
        content: "¡Órale compadre! Se me trabó el sistema, pero no te preocupes. Dame un momento y vuelve a intentarlo. Aquí ando para lo que necesites.",
        sender: "assistant",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error en el agente",
        description: "Hubo un problema procesando tu solicitud. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Save company profile function
  const saveCompanyProfile = async (companyInfo: any) => {
    if (!currentUser?.uid) return;
    
    try {
      const response = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await currentUser.getIdToken()}`
        },
        body: JSON.stringify({
          uid: currentUser.uid,
          companyName: companyInfo.name,
          contactPhone: companyInfo.contact,
          email: companyInfo.email || currentUser.email,
          serviceArea: companyInfo.serviceArea,
        })
      });
      
      if (response.ok) {
        console.log('✅ [ONBOARDING] Company profile saved successfully');
        toast({
          title: "Perfil guardado",
          description: "Tu información de empresa se guardó correctamente.",
        });
      }
    } catch (error) {
      console.error('Error saving company profile:', error);
    }
  };

  // Handle skip onboarding - DISABLED (ONBOARDING REMOVED)
  // const handleSkipOnboarding = () => {
  //   setIsOnboardingMode(false);
  //   setShowOnboardingProgress(false);
  //   toast({
  //     title: "Onboarding omitido",
  //     description: "Puedes configurar tu perfil después desde el menú principal.",
  //   });
  // };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAction = async (action: string, source: 'slash' | 'smart' | 'fab' | 'button' = 'button') => {
    console.log(`🎯 [SMART-ACTION] ${action} triggered from ${source}`);
    
    // Reset all context states for fresh task
    setActiveEndpoints([]);
    setCurrentAIModel(null);
    setIsWebSearching(false);
    setWebSearchResults(undefined);
    setWebSearchQuery(undefined);
    setSuggestionContext('general');
    
    // Add contextual message based on source
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
        // Use Mervin V2 agent to handle the task
        const taskPrompt = getTaskPrompt(action);
        
        // Send to Mervin V2 backend - response will be handled by useEffect
        await mervinAgent.sendMessage(taskPrompt);
        
        // Note: The assistant response will be added automatically by the useEffect
        // that watches mervinAgent.messages
      } else {
        // Legacy mode guidance
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
  
  // Conversation History Handlers
  const handleNewConversation = () => {
    if (messages.length > 0) {
      // Auto-save current conversation before starting new one
      handleSaveCurrentConversation();
    }
    
    // Clear messages and states
    setMessages([]);
    setActiveEndpoints([]);
    setCurrentAIModel(null);
    setWebSearchResults(undefined);
    setWebSearchQuery(undefined);
    setSuggestionContext('initial');
    conversationManager.clearActiveConversation();
    setIsHistorySidebarOpen(false);
  };
  
  const handleSelectConversation = async (conversationId: string) => {
    conversationManager.loadConversation(conversationId);
    setIsHistorySidebarOpen(false);
    
    // Wait for conversation to load
    setTimeout(() => {
      if (conversationManager.activeConversation) {
        const conv = conversationManager.activeConversation;
        
        // Convert conversation messages to Mervin message format
        const mervinMessages: Message[] = conv.messages.map(msg => ({
          id: msg.id,
          content: msg.text,
          sender: msg.sender === 'user' ? 'user' : 'assistant',
          timestamp: msg.timestamp,
          state: msg.state as MessageState | undefined,
        }));
        
        setMessages(mervinMessages);
        // Restore model: always 'agent' mode for history (legacy doesn't save conversations)
        setSelectedModel('agent');
        // Set AI model state based on saved conversation
        setCurrentAIModel(conv.aiModel === 'claude' ? 'Claude Sonnet 4' : 'ChatGPT-4o');
      }
    }, 300);
  };
  
  const handleSaveCurrentConversation = useCallback(async () => {
    if (!currentUser?.uid || messages.length < 2) return;
    
    try {
      console.log('💾 [CONVERSATION-SAVE] Attempting to save conversation...', {
        messageCount: messages.length,
        activeConversationId: conversationManager.activeConversationId,
        aiModel: currentAIModel,
        category: suggestionContext,
      });
      
      // Convert Mervin messages to conversation format
      const conversationMessages = messages.map(msg => ({
        id: msg.id,
        sender: msg.sender === 'user' ? ('user' as const) : ('agent' as const),
        text: msg.content,
        timestamp: msg.timestamp || new Date(),
        state: msg.state as 'normal' | 'thinking' | 'analyzing' | 'processing' | 'error' | undefined,
      }));
      
      // Detect AI model based on currentAIModel state (ChatGPT-4o vs Claude Sonnet 4)
      const aiModel: 'chatgpt' | 'claude' = currentAIModel === 'Claude Sonnet 4' ? 'claude' : 'chatgpt';
      const category = suggestionContext !== 'initial' ? suggestionContext : 'general';
      
      // Save or update conversation
      if (conversationManager.activeConversationId) {
        // Update existing conversation
        console.log('💾 [CONVERSATION-SAVE] Updating existing conversation:', conversationManager.activeConversationId);
        await conversationManager.addMessages(
          conversationManager.activeConversationId,
          conversationMessages
        );
        console.log('✅ [CONVERSATION-SAVE] Conversation updated successfully');
      } else {
        // Create new conversation
        console.log('💾 [CONVERSATION-SAVE] Creating new conversation...');
        const result = await conversationManager.createConversation(
          conversationMessages,
          aiModel,
          category as any
        );
        console.log('✅ [CONVERSATION-SAVE] New conversation created:', result?.conversationId);
      }
    } catch (error) {
      console.error('❌ [CONVERSATION-SAVE] Error saving conversation:', error);
    }
  }, [currentUser?.uid, messages, conversationManager, currentAIModel, suggestionContext]);
  
  const handleDeleteConversation = async (conversationId: string) => {
    try {
      await conversationManager.deleteConversation(conversationId);
      
      // If deleted conversation was active, clear messages
      if (conversationManager.activeConversationId === conversationId) {
        setMessages([]);
      }
    } catch (error) {
      console.error('❌ Error deleting conversation:', error);
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
      console.error('❌ Error pinning conversation:', error);
    }
  };
  
  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      
      toast({
        title: "✓ Copiado",
        description: "Mensaje copiado al portapapeles",
      });
      
      // Reset after 2 seconds
      setTimeout(() => {
        setCopiedMessageId(null);
      }, 2000);
    } catch (error) {
      console.error('❌ Error copying message:', error);
      toast({
        title: 'Error',
        description: 'No se pudo copiar el mensaje',
        variant: 'destructive',
      });
    }
  };

  // File attachment handlers
  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    
    // Limit to 5 files total
    if (attachedFiles.length + newFiles.length > 5) {
      toast({
        title: 'Límite de archivos',
        description: 'Solo puedes adjuntar hasta 5 archivos',
        variant: 'destructive',
      });
      return;
    }

    // Check file size (10MB per file)
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
    
    toast({
      title: '✓ Archivos adjuntados',
      description: `${newFiles.length} archivo(s) listo(s) para enviar`,
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Auto-save conversation every 3 messages (more frequent)
  useEffect(() => {
    if (messages.length > 0 && messages.length % 3 === 0) {
      console.log('💾 [AUTO-SAVE] Saving conversation (every 3 messages)');
      handleSaveCurrentConversation();
    }
  }, [messages.length, handleSaveCurrentConversation]);
  
  // Save conversation when loading stops (after receiving Mervin's response)
  useEffect(() => {
    if (!isLoading && messages.length >= 2) {
      console.log('💾 [AUTO-SAVE] Saving conversation (after response completed)');
      handleSaveCurrentConversation();
    }
  }, [isLoading, messages.length, handleSaveCurrentConversation]);

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Mobile Safe Area Spacer */}
      <div className="h-safe-area-inset-top bg-black md:hidden" />
      {/* Header with Model Selector */}
      <div className="px-4 py-3 md:p-4 border-b border-cyan-900/30 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          {/* Spacer for alignment */}
          <div className="w-[100px] md:w-[150px]"></div>
          
          {/* Centered Logo and Title */}
          <div className="flex items-center gap-3 justify-center flex-1">
            <img
              src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png"
              alt="Mervin AI"
              className="w-8 h-8 md:w-10 md:h-10"
            />
            <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              Mervin AI
            </h1>
          </div>
          
          {/* Model Selector and History */}
          <div className="flex items-center gap-2">
            {/* History Button */}
            <Button
              variant="outline"
              size="icon"
              className="bg-gray-800 text-cyan-500 border-cyan-900/50 hover:bg-gray-700"
              onClick={() => setIsHistorySidebarOpen(true)}
              data-testid="button-open-history"
            >
              <History className="w-5 h-5" />
            </Button>
            
            {/* Model Selector */}
            <div className="relative">
              <Button
                variant="outline"
                size="icon"
                className="bg-gray-800 text-cyan-500 border-cyan-900/50 hover:bg-gray-700"
                onClick={() => setShowModelSelector(!showModelSelector)}
              >
                {selectedModel === "agent" ? (
                  <Brain className="w-5 h-5" />
                ) : (
                  <Zap className="w-5 h-5" />
                )}
              </Button>
              
              {showModelSelector && (
                <div className="absolute top-full right-0 mt-2 bg-gray-800 border border-cyan-900/50 rounded-lg shadow-xl z-50 min-w-[160px] md:min-w-[150px]">
                  <button
                    className={`w-full text-left px-4 py-4 md:px-3 md:py-2 rounded-t-lg flex items-center justify-between min-h-[52px] md:min-h-[auto] ${
                      canUseAgentMode 
                        ? 'text-cyan-400 hover:bg-gray-700' 
                        : 'text-gray-500 cursor-not-allowed bg-gray-700/50'
                    }`}
                    onClick={() => {
                      if (canUseAgentMode) {
                        setSelectedModel("agent");
                        setShowModelSelector(false);
                      } else {
                        toast({
                          title: "Upgrade Required",
                          description: "Agent Mode is available for Mero Patrón and Master Contractor plans.",
                          variant: "destructive"
                        });
                      }
                    }}
                    disabled={!canUseAgentMode}
                  >
                    <div className="flex items-center">
                      <Brain className="w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2" />
                      <span className="text-base md:text-sm">Agent Mode</span>
                    </div>
                    {!canUseAgentMode && <Lock className="w-4 h-4 text-yellow-500" />}
                  </button>
                  <button
                    className="w-full text-left px-4 py-4 md:px-3 md:py-2 text-cyan-400 hover:bg-gray-700 rounded-b-lg flex items-center min-h-[52px] md:min-h-[auto]"
                    onClick={() => {
                      setSelectedModel("legacy");
                      setShowModelSelector(false);
                    }}
                  >
                    <Zap className="w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2" />
                    <span className="text-base md:text-sm">Legacy</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Onboarding Progress Bar - DISABLED (ONBOARDING REMOVED) */}

      {/* Onboarding Instructions - DISABLED (ONBOARDING REMOVED) */}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 md:p-4 space-y-4 pb-28 md:pb-24">
        {/* Smart Context Panel */}
        {(activeEndpoints.length > 0 || currentAIModel) && (
          <SmartContextPanel
            activeEndpoints={activeEndpoints}
            currentModel={currentAIModel}
            isProcessing={isLoading}
          />
        )}

        {/* Web Research Indicator */}
        {(isWebSearching || webSearchResults !== undefined) && (
          <WebResearchIndicator
            isSearching={isWebSearching}
            resultsFound={webSearchResults}
            query={webSearchQuery}
          />
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className="relative group">
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
                  enableTyping={!message.state}
                />
                
                {message.taskResult && (
                  <div className="mt-3 p-2 bg-green-900/30 border border-green-700/50 rounded text-green-200 text-sm">
                    <strong>✅ Tarea Completada</strong>
                    <div className="mt-1 text-xs text-green-300">
                      Resultado procesado por el agente autónomo
                    </div>
                  </div>
                )}
                
                {/* Timestamp */}
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
              
              {/* Copy Button - Only for assistant messages */}
              {message.sender === "assistant" && (
                <button
                  onClick={() => handleCopyMessage(message.id, message.content)}
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 text-gray-300 p-1.5 rounded-lg shadow-lg"
                  title="Copiar mensaje"
                  data-testid={`button-copy-${message.id}`}
                >
                  {copiedMessageId === message.id ? (
                    <Check className="w-3.5 h-3.5 text-green-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start px-2">
            <ThinkingIndicator 
              currentAction={
                mervinAgent.streamingUpdates.length > 0
                  ? mervinAgent.streamingUpdates[mervinAgent.streamingUpdates.length - 1].content
                  : undefined
              }
            />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Smart Input Area with Context-Aware Actions */}
      <div 
        className={`fixed bottom-0 right-0 bg-black/95 backdrop-blur-sm border-t border-cyan-900/30 pb-safe-area-inset-bottom transition-all duration-300 ease-in-out ${
          // Usar el mismo breakpoint que el sidebar (640px = sm)
          // Phone (< 640px): siempre usar left-0 porque el sidebar es overlay
          // Tablet/Desktop (>= 640px): ajustar margin según estado del sidebar
          isSidebarExpanded 
            ? 'left-0 sm:left-[280px]' // Phone: sin margin, Tablet/Desktop: ancho del sidebar expandido  
            : 'left-0 sm:left-[64px]'  // Phone: sin margin, Tablet/Desktop: ancho del sidebar colapsado (solo iconos)
        }`}
      >
        <div className="p-4 md:p-3">
          <div className="relative max-w-screen-lg mx-auto">
            {/* Smart Action System */}
            <SmartActionSystem 
              onAction={handleAction}
              currentMessage={inputValue}
              isVisible={!isOnboardingMode}
            />
            
            {/* Archivo adjunto preview */}
            {attachedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-gray-800/50 border border-cyan-900/30 rounded-lg px-3 py-2 text-sm"
                  >
                    {file.type.startsWith('image/') ? (
                      <ImageIcon className="h-4 w-4 text-cyan-400" />
                    ) : file.type === 'application/pdf' ? (
                      <FileText className="h-4 w-4 text-red-400" />
                    ) : (
                      <File className="h-4 w-4 text-gray-400" />
                    )}
                    <span className="text-gray-300 max-w-[150px] truncate">
                      {file.name}
                    </span>
                    <button
                      onClick={() => handleRemoveFile(index)}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                      title="Eliminar archivo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 md:gap-2">
              {/* Hidden file input */}
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
                  placeholder={
                    isOnboardingMode 
                      ? "Responde a Mervin..."
                      : "Escribe tu mensaje o usa / para comandos rápidos..."
                  }
                  className="w-full bg-gray-800 border border-cyan-900/50 rounded-full px-5 py-3 md:px-4 md:py-2 text-white text-base md:text-sm focus:outline-none focus:border-cyan-500 min-h-[48px] md:min-h-[40px]"
                  disabled={isLoading}
                />
                
                {/* Slash Command Indicator */}
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
            
            {/* Quick Tips */}
            {!isOnboardingMode && inputValue.length === 0 && (
              <div className="mt-2 text-xs text-gray-500 text-center">
                💡 Tip: Escribe "/" para comandos rápidos o háblale a Mervin naturalmente
              </div>
            )}
          </div>
        </div>
      </div>

      {/* System Status Bar */}
      <SystemStatusBar 
        isHealthy={mervinAgent.isHealthy}
        version={mervinAgent.systemStatus?.version}
      />
      
      {/* Conversation History Sidebar */}
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