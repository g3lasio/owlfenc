import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import {
  Send,
  Paperclip,
  Zap,
  Brain,
  ChevronDown,
  GraduationCap,
  SkipForward,
} from "lucide-react";
import { ConversationEngine } from "../mervin-ai/core/ConversationEngine";
import { MervinAgent } from "../mervin-ai/core/MervinAgent";
import { OnboardingEngine } from "../mervin-ai/onboarding/OnboardingEngine";
import { SmartActionSystem } from "../components/mervin/SmartActionSystem";

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
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [isProcessingTask, setIsProcessingTask] = useState(false);
  const [isOnboardingMode, setIsOnboardingMode] = useState(false);
  const [showOnboardingProgress, setShowOnboardingProgress] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationEngineRef = useRef<ConversationEngine | null>(null);
  const mervinAgentRef = useRef<MervinAgent | null>(null);
  const onboardingEngineRef = useRef<OnboardingEngine | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { userPlan } = usePermissions();
  const { needsOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();

  // Initialize systems and onboarding detection
  useEffect(() => {
    if (!conversationEngineRef.current && currentUser?.uid) {
      conversationEngineRef.current = new ConversationEngine(currentUser.uid);
      
      // Initialize MervinAgent with correct config
      const agentConfig = {
        userId: currentUser.uid,
        userPermissions: userPlan,
        subscriptionLevel: String(userPlan?.id || 'trial'),
        debug: true
      };
      
      mervinAgentRef.current = new MervinAgent(agentConfig);
      console.log('🤖 [MERVIN-AGENT] Full autonomous agent initialized');
      
      // Initialize OnboardingEngine
      onboardingEngineRef.current = new OnboardingEngine();
      console.log('🎓 [ONBOARDING] Onboarding engine initialized');
    }
  }, [currentUser, userPlan]);

  // Handle onboarding mode activation
  useEffect(() => {
    if (!onboardingLoading && needsOnboarding && currentUser?.uid && onboardingEngineRef.current) {
      console.log('🎓 [ONBOARDING] Usuario nuevo detectado - activando modo onboarding');
      setIsOnboardingMode(true);
      setShowOnboardingProgress(true);
      
      // Set onboarding welcome message
      const onboardingEngine = onboardingEngineRef.current;
      const currentStep = onboardingEngine.getCurrentStep();
      
      const onboardingWelcome: Message = {
        id: "onboarding-welcome",
        content: currentStep.prompt,
        sender: "assistant",
      };
      
      setMessages([onboardingWelcome]);
      return;
    }
    
    // Regular initialization for existing users
    if (!onboardingLoading && !needsOnboarding && currentUser?.uid) {
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
  }, [currentUser, selectedModel, needsOnboarding, onboardingLoading, messages.length]);

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
      // ONBOARDING MODE - Handle onboarding flow
      if (isOnboardingMode && onboardingEngineRef.current) {
        console.log('🎓 [ONBOARDING] Processing onboarding response');
        
        // Remove thinking indicator
        setMessages(prev => prev.slice(0, -1));
        
        const onboardingEngine = onboardingEngineRef.current;
        const result = onboardingEngine.processUserResponse(currentInput);
        
        const responseMessage: Message = {
          id: "assistant-" + Date.now(),
          content: result.nextPrompt,
          sender: "assistant",
        };
        
        setMessages(prev => [...prev, responseMessage]);
        
        // Check if onboarding is complete
        if (result.isComplete) {
          console.log('🎉 [ONBOARDING] Onboarding completado!');
          
          // Save company profile if collected
          if (result.userData?.companyInfo) {
            await saveCompanyProfile(result.userData.companyInfo);
          }
          
          // Mark onboarding as completed
          completeOnboarding();
          setIsOnboardingMode(false);
          setShowOnboardingProgress(false);
          
          // Show success message and transition to normal mode
          setTimeout(() => {
            const transitionMessage: Message = {
              id: "transition-" + Date.now(),
              content: "¡Perfecto primo! Ahora ya estás listo para usar todas las funciones. Puedes preguntarme lo que necesites o usar los botones de acción rápida.",
              sender: "assistant",
            };
            setMessages(prev => [...prev, transitionMessage]);
          }, 1000);
        }
        
        return;
      }

      const engine = conversationEngineRef.current;
      const agent = mervinAgentRef.current;

      if (selectedModel === "agent" && agent) {
        // AUTONOMOUS AGENT MODE - Full power
        console.log('🤖 [AGENT-MODE] Processing with full autonomous capabilities');
        
        // Remove thinking message and add processing
        setMessages(prev => prev.slice(0, -1));
        
        const processingMessage: Message = {
          id: "processing-" + Date.now(),
          content: "🤖 **Modo Agente Autónomo Activado**\n\nAnalizando tu solicitud y coordinando acciones...\n\n*Procesando con inteligencia artificial avanzada...*",
          sender: "assistant",
          state: "analyzing"
        };
        setMessages(prev => [...prev, processingMessage]);
        
        // Execute with full agent capabilities
        const conversationHistory = messages
          .filter(m => m.sender === 'user')
          .map(m => ({ content: m.content, timestamp: new Date() }));
        
        const result = await agent.processUserInput(currentInput, conversationHistory);
        
        // Remove processing message
        setMessages(prev => prev.slice(0, -1));
        
        const responseContent = result.data?.conversationalResponse || 
          result.data?.response || 
          "¡Órale primo! Completé la tarea. ¿En qué más te puedo ayudar?";
        
        const agentResponse: Message = {
          id: "assistant-" + Date.now(),
          content: responseContent,
          sender: "assistant",
          taskResult: result
        };
        setMessages(prev => [...prev, agentResponse]);
        
      } else if (engine) {
        // LEGACY MODE - Conversational only
        console.log('💬 [LEGACY-MODE] Using conversational engine');
        setMessages(prev => prev.slice(0, -1)); // Remove thinking
        
        const response = await engine.processUserMessage(currentInput);
        
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          content: response.message,
          sender: "assistant",
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Fallback
        setMessages(prev => prev.slice(0, -1));
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          content: "¡Órale primo! Se me trabó un poco el sistema, pero aquí ando. ¿En qué te puedo ayudar?",
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

  // Handle skip onboarding
  const handleSkipOnboarding = () => {
    completeOnboarding();
    setIsOnboardingMode(false);
    setShowOnboardingProgress(false);
    
    // Show welcome message for regular mode
    const welcomeMessage: Message = {
      id: "skip-welcome-" + Date.now(),
      content: "¡Órale primo! Saltaste la configuración inicial, pero no te preocupes. Puedo ayudarte con estimados, contratos, permisos y más. ¿En qué puedo echarte la mano?",
      sender: "assistant",
    };
    
    setMessages([welcomeMessage]);
    
    toast({
      title: "Onboarding omitido",
      description: "Puedes configurar tu perfil después desde el menú principal.",
    });
  };

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
      const agent = mervinAgentRef.current;
      if (agent && selectedModel === "agent") {
        // Let the autonomous agent handle the task
        const taskPrompt = getTaskPrompt(action);
        const conversationHistory = messages
          .filter(m => m.sender === 'user')
          .map(m => ({ content: m.content, timestamp: new Date() }));
        
        const result = await agent.processUserInput(taskPrompt, conversationHistory);
        
        const responseContent = result.data?.conversationalResponse || 
          result.data?.response || 
          `¡Listo primo! Activé ${action} para ti. ¿Qué más necesitas?`;
        
        const resultMessage: Message = {
          id: "result-" + Date.now(),
          content: responseContent,
          sender: "assistant",
          taskResult: result
        };
        setMessages(prev => [...prev, resultMessage]);
      } else {
        // Legacy mode guidance
        const guidanceMessage: Message = {
          id: "guidance-" + Date.now(),
          content: `Para usar ${action}, háblame sobre lo que necesitas y te guío paso a paso, primo.`,
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
      estimates: "Quiero generar un estimado profesional. Inicia el proceso completo de estimación.",
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
                  className="w-full text-left px-4 py-4 md:px-3 md:py-2 text-cyan-400 hover:bg-gray-700 rounded-t-lg flex items-center min-h-[52px] md:min-h-[auto]"
                  onClick={() => {
                    setSelectedModel("agent");
                    setShowModelSelector(false);
                  }}
                >
                  <Brain className="w-5 h-5 md:w-4 md:h-4 mr-3 md:mr-2" />
                  <span className="text-base md:text-sm">Agent Mode</span>
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

      {/* Onboarding Progress Bar */}
      {showOnboardingProgress && onboardingEngineRef.current && (
        <div className="px-4 py-3 border-b border-cyan-900/30 bg-gradient-to-r from-cyan-900/20 to-purple-900/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <GraduationCap className="h-5 w-5 text-cyan-400" />
              <span className="text-sm font-medium text-cyan-300">Configuración Inicial</span>
            </div>
            <div className="text-xs text-gray-400">
              {onboardingEngineRef.current.getProgress().completed} de {onboardingEngineRef.current.getProgress().total}
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${onboardingEngineRef.current.getProgress().percentage}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Onboarding Instructions (only during onboarding) */}
      {isOnboardingMode && (
        <div className="px-3 py-2 md:p-4 border-b border-cyan-900/30">
          <div className="space-y-3">
            <div className="flex items-center justify-center space-x-2 text-cyan-300 text-sm">
              <GraduationCap className="h-4 w-4" />
              <span>Configuración guiada por Mervin</span>
            </div>
            
            {/* Mobile Onboarding Buttons */}
            <div className="flex flex-col gap-2 md:hidden">
              <Button
                variant="outline"
                className="bg-orange-800/50 text-orange-300 border-orange-700/50 hover:bg-orange-700/50 min-h-[52px] justify-start text-left p-4"
                onClick={handleSkipOnboarding}
              >
                <div className="flex items-center w-full">
                  <SkipForward className="h-6 w-6 mr-4 flex-shrink-0" />
                  <span className="text-base font-medium">Saltar Configuración</span>
                </div>
              </Button>
            </div>
            
            {/* Desktop Onboarding Buttons */}
            <div className="hidden md:flex justify-center space-x-3">
              <Button
                variant="outline"
                className="bg-orange-800/50 text-orange-300 border-orange-700/50 hover:bg-orange-700/50"
                onClick={handleSkipOnboarding}
              >
                <SkipForward className="h-4 w-4 mr-2" />
                Saltar Configuración
              </Button>
            </div>
          </div>
        </div>
      )}

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
                    className="w-8 h-8 md:w-6 md:h-6 animate-spin"
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
      <div className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-sm border-t border-cyan-900/30 pb-safe-area-inset-bottom">
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