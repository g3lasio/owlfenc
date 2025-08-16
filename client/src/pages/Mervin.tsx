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

// Basic types
type MessageSender = "user" | "assistant";
type Message = {
  id: string;
  content: string;
  sender: MessageSender;
};

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversationEngineRef = useRef<ConversationEngine | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const { userPlan } = usePermissions();

  // Initialize conversation engine and welcome message
  useEffect(() => {
    if (!conversationEngineRef.current && currentUser?.uid) {
      conversationEngineRef.current = new ConversationEngine(currentUser.uid);
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
  }, [currentUser, selectedModel]);

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

    try {
      const engine = conversationEngineRef.current;
      if (engine) {
        // Use intelligent conversation engine
        const response = await engine.processUserMessage(currentInput);
        
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          content: response.message,
          sender: "assistant",
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        // Fallback response
        const assistantMessage: Message = {
          id: "assistant-" + Date.now(),
          content: "¡Órale primo! Se me trabó un poco el sistema, pero aquí ando. ¿En qué te puedo ayudar?",
          sender: "assistant",
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error generating response:", error);
      const errorMessage: Message = {
        id: "assistant-" + Date.now(),
        content: "¡Órale! Se me trabó tantito, pero aquí sigo. ¿Puedes repetirme qué necesitas, compadre?",
        sender: "assistant",
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const handleAction = (action: string) => {
    const actionMessage: Message = {
      id: "action-" + Date.now(),
      content: `Iniciando ${action}...`,
      sender: "assistant",
    };
    setMessages(prev => [...prev, actionMessage]);
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
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.sender === "user"
                  ? "bg-cyan-600 text-white"
                  : "bg-gray-800 text-gray-200"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 text-gray-200 px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <span>Procesando</span>
                <div className="ml-1 flex">
                  <span className="animate-pulse text-cyan-400">.</span>
                  <span className="animate-pulse text-cyan-400 delay-200">.</span>
                  <span className="animate-pulse text-cyan-400 delay-500">.</span>
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
            disabled={inputValue.trim() === "" || isLoading}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}