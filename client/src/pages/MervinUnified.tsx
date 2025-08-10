import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Send,
  MessageSquare,
  Zap,
  Brain,
  Bot,
  User,
  FileSpreadsheet,
  ClipboardList,
  ClipboardCheck,
  Building,
  BarChart4,
  Loader2,
  DollarSign,
  FileText,
  Search,
  Wrench
} from "lucide-react";

// Types
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  messageType: "text" | "tool_call";
  toolCalls?: any[];
  toolResponses?: any[];
  createdAt: string;
}

interface ChatSession {
  id: number;
  sessionId: string;
  firebaseUid: string;
  mode: "mervin" | "mervin_agent";
  title: string | null;
  isActive: boolean;
  createdAt: string;
  lastMessageAt: string;
}

interface UserProfile {
  id: number;
  firebaseUid: string;
  name?: string;
  role?: string;
  workType?: string;
  location?: string;
  onboardingCompleted: boolean;
  onboardingStep: number;
}

interface AgentAction {
  id: number;
  actionType: string;
  status: "pending" | "success" | "error";
  actionResponse?: any;
  errorMessage?: string;
  createdAt: string;
}

type ChatMode = "mervin" | "mervin_agent";

// Botones de acción principales con iconos (restaurados del original)
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

const MervinUnified: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Core state
  const [currentMode, setCurrentMode] = useState<ChatMode>("mervin");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/mervin/profile"],
    enabled: !!currentUser,
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/mervin/sessions"],
    enabled: !!currentUser,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/mervin/sessions", currentSessionId, "messages"],
    enabled: !!currentSessionId,
  });

  const { data: recentActions = [] } = useQuery({
    queryKey: ["/api/mervin/actions"],
    enabled: !!currentUser && currentMode === "mervin_agent",
  });

  // Mutations
  const createSessionMutation = useMutation({
    mutationFn: async (mode: ChatMode) => {
      const response = await apiRequest("POST", "/api/mervin/sessions", { mode });
      return await response.json();
    },
    onSuccess: (response: any) => {
      setCurrentSessionId(response.session.sessionId);
      queryClient.invalidateQueries({ queryKey: ["/api/mervin/sessions"] });
    }
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ sessionId, message, mode }: { sessionId: string; message: string; mode: ChatMode }) => {
      const response = await apiRequest("POST", "/api/mervin/chat", { sessionId, message, mode });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mervin/sessions", currentSessionId, "messages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mervin/actions"] });
      setMessageInput("");
    }
  });

  const onboardingMutation = useMutation({
    mutationFn: async ({ step, response }: { step: number; response: string }) => {
      const apiResponse = await apiRequest("POST", "/api/mervin/onboarding", { step, response });
      return await apiResponse.json();
    },
    onSuccess: (response: any) => {
      if (response.completed) {
        setIsOnboarding(false);
        setOnboardingStep(0);
        queryClient.invalidateQueries({ queryKey: ["/api/mervin/profile"] });
      } else {
        setOnboardingStep(response.nextStep);
      }
    }
  });

  // Effects
  useEffect(() => {
    if (userProfile && !(userProfile as any)?.onboardingCompleted) {
      setIsOnboarding(true);
      setOnboardingStep((userProfile as any)?.onboardingStep || 1);
    }
  }, [userProfile]);

  // Inicializar con mensaje de bienvenida (restaurado del original)
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: "welcome",
        role: "assistant",
        content: "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. Puedo ayudarte con las siguientes funciones:",
        messageType: "text",
        createdAt: new Date().toISOString(),
      };
      // No establecemos mensajes aquí, los manejamos desde el backend
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [currentSessionId]);

  // Helper functions
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const startNewSession = async () => {
    createSessionMutation.mutate(currentMode);
  };

  const switchMode = (newMode: ChatMode) => {
    setCurrentMode(newMode);
    setCurrentSessionId(null);
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;

    if (isOnboarding) {
      onboardingMutation.mutate({
        step: onboardingStep,
        response: messageInput.trim()
      });
    } else {
      if (!currentSessionId) {
        await startNewSession();
        return;
      }
      sendMessageMutation.mutate({
        sessionId: currentSessionId,
        message: messageInput.trim(),
        mode: currentMode
      });
    }
  };

  const handleActionClick = async (action: string) => {
    if (currentMode === "mervin_agent") {
      // Solo en modo agente se pueden ejecutar acciones
      if (!currentSessionId) {
        await startNewSession();
      }
      const actionMessage = `Ejecutar acción: ${action}`;
      sendMessageMutation.mutate({ 
        sessionId: currentSessionId!, 
        message: actionMessage, 
        mode: currentMode 
      });
    } else {
      // En modo normal, solo conversación
      toast({
        title: "Modo Conversación",
        description: "Cambia a Modo Agente para ejecutar acciones automáticas",
        variant: "default",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const selectSession = (sessionId: string) => {
    setCurrentSessionId(sessionId);
  };

  const formatActionType = (actionType: string) => {
    switch (actionType) {
      case "generate_invoice":
        return "Generar Factura";
      case "generate_contract":
        return "Generar Contrato";
      case "lookup_property_owner":
        return "Buscar Propietario";
      default:
        return actionType;
    }
  };

  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case "generate_invoice":
        return <DollarSign className="h-4 w-4" />;
      case "generate_contract":
        return <FileText className="h-4 w-4" />;
      case "lookup_property_owner":
        return <Search className="h-4 w-4" />;
      default:
        return <Wrench className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-100 text-green-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Loading states
  if (profileLoading || sessionsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Cargando Mervin...</span>
      </div>
    );
  }

  // Onboarding flow
  if (isOnboarding) {
    return (
      <div className="container mx-auto max-w-4xl p-4 h-screen flex flex-col">
        <Card className="flex-1 flex flex-col">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Bot className="h-6 w-6 text-blue-600" />
              ¡Hola! Soy Mervin - Configuración Inicial
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md">
                <div className="mb-4">
                  <span className="text-sm text-gray-500">Paso {onboardingStep} de 4</span>
                </div>
                {onboardingStep === 1 && (
                  <p className="text-lg mb-4">
                    ¡Bienvenido! Soy Mervin, tu asistente de construcción. ¿Cómo te llamas?
                  </p>
                )}
                {onboardingMutation.data && (onboardingMutation.data as any)?.message && (
                  <p className="text-lg mb-4 bg-gray-100 p-4 rounded-lg">
                    {String((onboardingMutation.data as any).message)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Escribe tu respuesta..."
                disabled={onboardingMutation.isPending}
              />
              <Button 
                onClick={sendMessage}
                disabled={!messageInput.trim() || onboardingMutation.isPending}
              >
                {onboardingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
        {/* Header con estilo cyberpunk original y dropdown de modo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-12 w-12 text-cyan-400 animate-pulse" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              Mervin
            </h1>
          </div>
          
          {/* Dropdown de modo */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <Select value={currentMode} onValueChange={(value: ChatMode) => switchMode(value)}>
              <SelectTrigger className="w-64 border border-cyan-400/30 bg-slate-800/50 text-cyan-400">
                <SelectValue placeholder="Seleccionar modo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mervin">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Modo Conversación
                  </div>
                </SelectItem>
                <SelectItem value="mervin_agent">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Modo Agente
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Explicación del modo actual */}
          <div className="max-w-md mx-auto">
            <div className="bg-slate-800/50 border border-cyan-400/30 rounded-lg p-4">
              <div className="flex items-center gap-2 justify-center mb-2">
                {currentMode === "mervin" ? (
                  <MessageSquare className="h-5 w-5 text-cyan-400" />
                ) : (
                  <Zap className="h-5 w-5 text-orange-400" />
                )}
                <span className="text-cyan-400 font-medium">
                  {currentMode === "mervin" ? "Modo Conversación" : "Modo Agente"}
                </span>
              </div>
              <p className="text-slate-300 text-sm">
                {currentMode === "mervin"
                  ? "Conversa conmigo sobre construcción, materiales, estimaciones y más"
                  : "Además de conversar, puedo generar facturas, contratos y buscar propietarios"}
              </p>
            </div>
          </div>
        </div>

        {/* Main content area - Restaurado del diseño original */}
        <div className="flex-1 flex flex-col">
          {/* Messages area con estilo cyberpunk */}
          <div className="flex-1 bg-slate-800/30 border border-cyan-400/20 rounded-lg mb-6 p-6 overflow-y-auto">
            {/* Show messages if we have a session */}
            {currentSessionId && messages ? (
              <div className="space-y-4">
                {messagesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <span className="ml-2 text-cyan-400">Cargando mensajes...</span>
                  </div>
                ) : (
                  (messages as any)?.messages?.map((message: ChatMessage) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === "user"
                            ? "bg-cyan-600/20 border border-cyan-400/30 text-cyan-100"
                            : "bg-slate-700/50 border border-slate-600/30 text-slate-100"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.role === "assistant" && (
                            <Bot className="h-4 w-4 mt-0.5 flex-shrink-0 text-cyan-400" />
                          )}
                          {message.role === "user" && (
                            <User className="h-4 w-4 mt-0.5 flex-shrink-0 text-cyan-400" />
                          )}
                          <div className="flex-1">
                            <p className="whitespace-pre-wrap">{message.content}</p>
                            {message.toolCalls && (
                              <div className="mt-2 space-y-1">
                                {message.toolCalls.map((tool: any, index: number) => (
                                  <div key={index} className="text-xs bg-orange-500/20 border border-orange-400/30 rounded p-2 text-orange-300">
                                    🔧 Ejecutando: {formatActionType(tool.function.name)}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            ) : (
              /* Welcome message and action buttons - Restaurado del original */
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-cyan-100 text-lg mb-8">
                    ¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. 
                    {currentMode === "mervin_agent" 
                      ? " En modo agente puedo ejecutar acciones automáticamente." 
                      : " Puedo ayudarte con las siguientes funciones:"}
                  </p>
                </div>

                {/* Action buttons - Restaurados del original con estilo cyberpunk */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {actionButtons.map((button) => (
                    <Button
                      key={button.id}
                      onClick={() => handleActionClick(button.action)}
                      className={`
                        h-20 bg-slate-800/50 border-2 border-cyan-400/30 
                        hover:border-cyan-400/60 hover:bg-cyan-400/10 
                        text-cyan-100 hover:text-cyan-50 transition-all duration-300
                        ${currentMode === "mervin" ? "opacity-75 hover:opacity-60" : ""}
                      `}
                      variant="outline"
                    >
                      <div className="flex items-center gap-3">
                        {button.icon}
                        <span className="font-medium">{button.text}</span>
                      </div>
                    </Button>
                  ))}
                </div>

                {currentMode === "mervin" && (
                  <div className="text-center">
                    <p className="text-orange-300 text-sm">
                      💡 Cambia a Modo Agente para ejecutar acciones automáticamente
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input area - Estilo cyberpunk */}
          <div className="bg-slate-800/50 border border-cyan-400/30 rounded-lg p-4">
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={
                  currentSessionId 
                    ? "Escribe tu mensaje..." 
                    : "Inicia una conversación escribiendo aquí..."
                }
                disabled={isLoading || sendMessageMutation.isPending}
                className="flex-1 bg-slate-700/50 border-slate-600/50 text-cyan-100 placeholder-slate-400 focus:border-cyan-400/50"
              />
              <Button 
                onClick={sendMessage}
                disabled={!messageInput.trim() || isLoading || sendMessageMutation.isPending}
                className="bg-cyan-600/20 border border-cyan-400/30 hover:bg-cyan-400/20 text-cyan-400"
                variant="outline"
              >
                {(isLoading || sendMessageMutation.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MervinUnified;