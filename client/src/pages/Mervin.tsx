import React, { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import { ConversationEngine } from "../mervin-ai/core/ConversationEngine";
import { SmartActionSystem } from "../components/mervin/SmartActionSystem";
import { useMervinAgent } from "../mervin-v2/hooks/useMervinAgent";

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

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"legacy" | "agent">("agent");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showAgentFunctions, setShowAgentFunctions] = useState(false);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [isProcessingTask, setIsProcessingTask] = useState(false);
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [showOnboardingProgress, setShowOnboardingProgress] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationEngineRef = useRef<ConversationEngine | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { userPlan } = usePermissions();
  const { isSidebarExpanded } = useSidebar();

  // Detect if user is free plan (Primo Chambeador)
  const isFreeUser = userPlan?.id === 5 || userPlan?.name === "Primo Chambeador";
  const canUseAgentMode = !isFreeUser;

  // Initialize Mervin V2 Agent (only if user has access and is in agent mode)
  const mervinAgent = useMervinAgent({
    userId: currentUser?.uid || 'guest',
    enableStreaming: false, // Start with JSON mode for simplicity
    language: 'es'
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
              sender: "assistant" as MessageSender
            }];
          });
          setIsLoading(false);
          setIsProcessingTask(false);
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
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");
    setIsLoading(true);

    // Add thinking indicator
    const thinkingMessage: Message = {
      id: "thinking-" + Date.now(),
      content: "Analizando tu solicitud...",
      sender: "assistant",
      state: "thinking"
    };
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      // AGENT MODE V2 - Use backend orchestrator
      if (selectedModel === "agent" && canUseAgentMode && mervinAgent.isHealthy) {
        console.log('🤖 [AGENT-MODE-V2] Using Mervin V2 backend orchestrator');
        
        // Remove thinking message and add processing
        setMessages(prev => prev.slice(0, -1));
        
        const processingMessage: Message = {
          id: "processing-" + Date.now(),
          content: "🤖 **Mervin AI V2 Activo**\n\nProcesando tu solicitud con inteligencia híbrida...\n\n*ChatGPT-4o + Claude Sonnet 4 trabajando en tu proyecto...*",
          sender: "assistant",
          state: "analyzing"
        };
        setMessages(prev => [...prev, processingMessage]);
        
        // Send to Mervin V2 backend - response will be handled by useEffect
        await mervinAgent.sendMessage(currentInput);
        
        // Note: The assistant response will be added automatically by the useEffect
        // that watches mervinAgent.messages
        
      } else if (selectedModel === "legacy" || !canUseAgentMode) {
        // LEGACY MODE - Simple conversational responses
        console.log('💬 [LEGACY-MODE] Using simple conversational mode');
        setMessages(prev => prev.slice(0, -1)); // Remove thinking
        
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
          sender: "assistant"
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Fallback - Service not available
        setMessages(prev => prev.slice(0, -1));
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          content: "⚠️ El servicio de Mervin V2 no está disponible en este momento. Por favor intenta de nuevo más tarde.",
          sender: "assistant",
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      
    } catch (error) {
      console.error("Error processing request:", error);
      setMessages(prev => prev.slice(0, -1)); // Remove thinking/processing message
      
      const errorMessage: Message = {
        id: "assistant-" + Date.now(),
        content: "¡Órale compadre! Se me trabó el sistema, pero no te preocupes. Dame un momento y vuelve a intentarlo. Aquí ando para lo que necesites.",
        sender: "assistant",
      };
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: "Error en el agente",
        description: "Hubo un problema procesando tu solicitud. Intenta de nuevo.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setIsProcessingTask(false);
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
    setIsProcessingTask(true);
    
    const actionMessage: Message = {
      id: "action-" + Date.now(),
      content: `${contextMsg}\n\n🚀 **Activando ${action.toUpperCase()}**\n\nInicializando agente autónomo para ${action}...`,
      sender: "assistant",
      state: "analyzing"
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
        };
        setMessages(prev => [...prev, guidanceMessage]);
      }
    } catch (error) {
      console.error(`Error in ${action}:`, error);
      const errorMessage: Message = {
        id: "error-" + Date.now(),
        content: `¡Órale! Hubo un problemita con ${action}. Dime qué necesitas hacer y te ayudo de otra forma, compadre.`,
        sender: "assistant",
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessingTask(false);
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

  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Mobile Safe Area Spacer */}
      <div className="h-safe-area-inset-top bg-black md:hidden" />
      {/* Header with Model Selector */}
      <div className="px-4 py-3 md:p-4 border-b border-cyan-900/30 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="flex items-center justify-between">
          <h1 className="text-xl md:text-2xl font-bold text-cyan-400 truncate">Mervin AI</h1>
          
          {/* Model Selector and Agent Functions */}
          <div className="flex items-center gap-2">
            {/* Agent Functions Button - Only visible in Agent Mode */}
            {selectedModel === "agent" && canUseAgentMode && (
              <div className="relative">
                <Button
                  variant="outline"
                  size="default"
                  className="bg-gradient-to-r from-purple-800/50 to-cyan-800/50 text-cyan-300 border-cyan-500/30 hover:from-purple-700/60 hover:to-cyan-700/60 min-h-[44px] min-w-[44px] group transition-all duration-300"
                  onClick={() => setShowAgentFunctions(!showAgentFunctions)}
                >
                  <Sparkles className="w-5 h-5 md:w-4 md:h-4 group-hover:animate-pulse" />
                  <span className="sr-only">Agent Functions</span>
                </Button>
                
                {showAgentFunctions && (
                  <div className="absolute top-full right-0 mt-2 bg-gray-800/95 backdrop-blur-sm border border-cyan-500/30 rounded-lg shadow-xl z-50 min-w-[200px] animate-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-1">
                      <div className="flex items-center space-x-2 px-3 py-2 text-cyan-300 text-sm border-b border-gray-700">
                        <Cpu className="w-4 h-4" />
                        <span>Agent Functions</span>
                      </div>
                      <button
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700/50 rounded transition-colors text-cyan-300"
                        onClick={() => {
                          handleAction('estimates', 'button');
                          setShowAgentFunctions(false);
                        }}
                      >
                        <Paperclip className="w-4 h-4" />
                        <span className="text-sm">Generate Estimates</span>
                      </button>
                      <button
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700/50 rounded transition-colors text-cyan-300"
                        onClick={() => {
                          handleAction('contracts', 'button');
                          setShowAgentFunctions(false);
                        }}
                      >
                        <Send className="w-4 h-4" />
                        <span className="text-sm">Create Contracts</span>
                      </button>
                      <button
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700/50 rounded transition-colors text-cyan-300"
                        onClick={() => {
                          handleAction('permits', 'button');
                          setShowAgentFunctions(false);
                        }}
                      >
                        <Brain className="w-4 h-4" />
                        <span className="text-sm">Permit Advisor</span>
                      </button>
                      <button
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700/50 rounded transition-colors text-cyan-300"
                        onClick={() => {
                          handleAction('properties', 'button');
                          setShowAgentFunctions(false);
                        }}
                      >
                        <GraduationCap className="w-4 h-4" />
                        <span className="text-sm">Verify Properties</span>
                      </button>
                      <button
                        className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-700/50 rounded transition-colors text-cyan-300"
                        onClick={() => {
                          handleAction('analytics', 'button');
                          setShowAgentFunctions(false);
                        }}
                      >
                        <Zap className="w-4 h-4" />
                        <span className="text-sm">View Analytics</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Model Selector */}
            <div className="relative">
              <Button
                variant="outline"
                size="default"
                className="bg-gray-800 text-cyan-500 border-cyan-900/50 hover:bg-gray-700 min-h-[44px] min-w-[100px] text-sm md:text-base"
                onClick={() => setShowModelSelector(!showModelSelector)}
              >
                {selectedModel === "agent" ? (
                  <><Brain className="w-5 h-5 md:w-4 md:h-4 mr-1 md:mr-2" /><span className="hidden sm:inline">Agent</span></>
                ) : (
                  <><Zap className="w-5 h-5 md:w-4 md:h-4 mr-1 md:mr-2" /><span className="hidden sm:inline">Legacy</span></>
                )}
                <ChevronDown className="w-4 h-4 md:w-3 md:h-3 ml-1" />
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
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[280px] sm:max-w-sm md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl md:rounded-lg text-base md:text-sm leading-relaxed ${
                message.sender === "user"
                  ? "bg-cyan-600 text-white shadow-lg"
                  : message.state === "thinking" || message.state === "analyzing" 
                    ? "bg-purple-900/50 text-purple-200 border border-purple-700/50 shadow-lg"
                    : "bg-gray-800 text-gray-200 shadow-lg"
              }`}
            >
              {message.state === "thinking" && (
                <div className="flex items-center space-x-3 mb-3">
                  <Brain className="w-5 h-5 md:w-4 md:h-4 text-purple-400 animate-pulse" />
                  <span className="text-purple-400 text-base md:text-sm font-medium">Analizando...</span>
                </div>
              )}
              {message.state === "analyzing" && (
                <div className="flex items-center space-x-3 mb-3">
                  <Zap className="w-5 h-5 md:w-4 md:h-4 text-cyan-400 animate-pulse" />
                  <span className="text-cyan-400 text-base md:text-sm font-medium">Agente Activo</span>
                </div>
              )}
              <div className="whitespace-pre-wrap">{message.content}</div>
              {message.taskResult && (
                <div className="mt-3 p-2 bg-green-900/30 border border-green-700/50 rounded text-green-200 text-sm">
                  <strong>✅ Tarea Completada</strong>
                  <div className="mt-1 text-xs text-green-300">
                    Resultado procesado por el agente autónomo
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {(isLoading || isProcessingTask) && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-200 px-5 py-4 md:px-4 md:py-2 rounded-2xl md:rounded-lg max-w-[280px] sm:max-w-sm md:max-w-md shadow-lg">
              <div className="flex items-center space-x-3 md:space-x-2">
                <div className="w-8 h-8 md:w-6 md:h-6">
                  <img
                    src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png"
                    alt="Mervin AI"
                    className="w-8 h-8 md:w-6 md:h-6 animate-pulse"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-cyan-400 font-medium text-base md:text-sm">
                    {isProcessingTask ? "Agente Trabajando" : "Procesando"}
                  </span>
                  <div className="flex">
                    <span className="animate-pulse text-cyan-400">.</span>
                    <span className="animate-pulse text-cyan-400 delay-200">.</span>
                    <span className="animate-pulse text-cyan-400 delay-500">.</span>
                  </div>
                </div>
              </div>
            </div>
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
            
            <div className="flex gap-3 md:gap-2">
              <Button
                variant="outline"
                size="icon"
                className="bg-gray-800 text-cyan-500 border-cyan-900/50 min-h-[48px] min-w-[48px] md:min-h-[40px] md:min-w-[40px] flex-shrink-0"
                title="Subir archivos"
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
                disabled={inputValue.trim() === "" || isLoading || isProcessingTask}
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
    </div>
  );
}