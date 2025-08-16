import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionContext";
import {
  Send,
  Paperclip,
  FileSpreadsheet,
  ClipboardList,
  ClipboardCheck,
  Building,
  BarChart4,
  Zap,
  Brain,
  ChevronDown,
} from "lucide-react";
import { ConversationEngine } from "../mervin-ai/core/ConversationEngine";
import { MervinAgent } from "../mervin-ai/core/MervinAgent";

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

// Action buttons
const actionButtons = [
  {
    id: "estimates",
    text: "Generate Estimates",
    action: "estimates",
    icon: <FileSpreadsheet className="h-5 w-5" />,
  },
  {
    id: "contracts",
    text: "Generate Contracts", 
    action: "contracts",
    icon: <ClipboardList className="h-5 w-5" />,
  },
  {
    id: "permits",
    text: "Permit Advisor",
    action: "permits", 
    icon: <ClipboardCheck className="h-5 w-5" />,
  },
  {
    id: "properties",
    text: "Verify Ownership",
    action: "properties",
    icon: <Building className="h-5 w-5" />,
  },
  {
    id: "analytics", 
    text: "Payment Tracker",
    action: "analytics",
    icon: <BarChart4 className="h-5 w-5" />,
  },
];

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<"legacy" | "agent">("agent");
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [currentTask, setCurrentTask] = useState<AgentTask | null>(null);
  const [isProcessingTask, setIsProcessingTask] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationEngineRef = useRef<ConversationEngine | null>(null);
  const mervinAgentRef = useRef<MervinAgent | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { userPlan } = usePermissions();

  // Initialize full agent system
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
    }
    
    const engine = conversationEngineRef.current;
    if (engine) {
      const welcomeContent = engine.generateWelcomeMessage(selectedModel === "agent");
      const welcomeMessage: Message = {
        id: "welcome",
        content: welcomeContent,
        sender: "assistant",
      };
      setMessages([welcomeMessage]);
    }
  }, [currentUser, selectedModel, userPlan]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleAction = async (action: string) => {
    setCurrentTask(action as AgentTask);
    setIsProcessingTask(true);
    
    const actionMessage: Message = {
      id: "action-" + Date.now(),
      content: `🚀 **Activando ${action.toUpperCase()}**\n\nInicializando agente autónomo para ${action}...`,
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
      {/* Header with Model Selector */}
      <div className="p-4 border-b border-cyan-900/30">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">Mervin AI Assistant</h1>
          
          {/* Model Selector */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="bg-gray-800 text-cyan-500 border-cyan-900/50 hover:bg-gray-700"
              onClick={() => setShowModelSelector(!showModelSelector)}
            >
              {selectedModel === "agent" ? (
                <><Brain className="w-4 h-4 mr-2" />Agent Mode</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Legacy</>
              )}
              <ChevronDown className="w-3 h-3 ml-1" />
            </Button>
            
            {showModelSelector && (
              <div className="absolute top-full right-0 mt-2 bg-gray-800 border border-cyan-900/50 rounded-lg shadow-lg z-50 min-w-[150px]">
                <button
                  className="w-full text-left px-3 py-2 text-cyan-400 hover:bg-gray-700 rounded-t-lg flex items-center"
                  onClick={() => {
                    setSelectedModel("agent");
                    setShowModelSelector(false);
                  }}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Agent Mode
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-cyan-400 hover:bg-gray-700 rounded-b-lg flex items-center"
                  onClick={() => {
                    setSelectedModel("legacy");
                    setShowModelSelector(false);
                  }}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Legacy
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-b border-cyan-900/30">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {actionButtons.map((button) => (
            <Button
              key={button.id}
              variant="outline"
              className="bg-gray-800 text-cyan-500 border-cyan-900/50 hover:bg-gray-700"
              onClick={() => handleAction(button.action)}
            >
              {button.icon}
              <span className="ml-2 hidden md:inline">{button.text}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                message.sender === "user"
                  ? "bg-cyan-600 text-white"
                  : message.state === "thinking" || message.state === "analyzing" 
                    ? "bg-purple-900/50 text-purple-200 border border-purple-700/50"
                    : "bg-gray-800 text-gray-200"
              }`}
            >
              {message.state === "thinking" && (
                <div className="flex items-center space-x-2 mb-2">
                  <Brain className="w-4 h-4 text-purple-400 animate-pulse" />
                  <span className="text-purple-400 text-sm font-medium">Analizando...</span>
                </div>
              )}
              {message.state === "analyzing" && (
                <div className="flex items-center space-x-2 mb-2">
                  <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="text-cyan-400 text-sm font-medium">Agente Activo</span>
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
            <div className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg max-w-xs lg:max-w-md">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6">
                  <img
                    src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png"
                    alt="Mervin AI"
                    className="w-6 h-6 animate-spin"
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-cyan-400 font-medium">
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

      {/* Input Area */}
      <div className="fixed bottom-8 left-0 right-0 p-3 bg-black border-t border-cyan-900/30">
        <div className="flex gap-2 max-w-screen-lg mx-auto">
          <Button
            variant="outline"
            size="icon"
            className="bg-gray-800 text-cyan-500 border-cyan-900/50"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="flex-1 bg-gray-800 border border-cyan-900/50 rounded-full px-4 py-2 text-white focus:outline-none focus:border-cyan-500"
            disabled={isLoading}
          />
          <Button
            variant="default"
            className="rounded-full bg-cyan-600 hover:bg-cyan-700"
            onClick={handleSendMessage}
            disabled={inputValue.trim() === "" || isLoading || isProcessingTask}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}