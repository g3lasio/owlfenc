import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  Send,
  MessageSquare,
  Zap,
  Settings,
  User,
  Bot,
  RefreshCw,
  Download,
  FileText,
  Search,
  Building,
  Wrench,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
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
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Queries
  const { data: userProfile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/mervin/profile"],
    enabled: !!currentUser,
  });

  const { data: sessions, isLoading: sessionsLoading } = useQuery({
    queryKey: ["/api/mervin/sessions"],
    enabled: !!currentUser,
  });

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ["/api/mervin/sessions", currentSessionId, "messages"],
    enabled: !!currentSessionId,
  });

  const { data: recentActions } = useQuery({
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
    if (!messageInput.trim() || !currentSessionId) return;

    if (isOnboarding) {
      onboardingMutation.mutate({
        step: onboardingStep,
        response: messageInput.trim()
      });
    } else {
      sendMessageMutation.mutate({
        sessionId: currentSessionId,
        message: messageInput.trim(),
        mode: currentMode
      });
    }
    setMessageInput("");
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
    <div className="container mx-auto max-w-7xl p-4 h-screen flex flex-col">
      {/* Header with mode switcher */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold">Mervin AI Assistant</h1>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={currentMode === "mervin" ? "default" : "secondary"}>
              <MessageSquare className="h-3 w-3 mr-1" />
              {currentMode === "mervin" ? "Modo Conversación" : "Modo Agente"}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => switchMode(currentMode === "mervin" ? "mervin_agent" : "mervin")}
            >
              <Zap className="h-4 w-4 mr-1" />
              {currentMode === "mervin" ? "Activar Modo Agente" : "Desactivar Modo Agente"}
            </Button>
          </div>
        </div>
        
        {/* Mode explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <div className="flex items-start gap-2">
            {currentMode === "mervin" ? (
              <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5" />
            ) : (
              <Zap className="h-5 w-5 text-orange-600 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-sm">
                {currentMode === "mervin" 
                  ? "Modo Conversación - Chat Experto" 
                  : "Modo Agente - Chat + Acciones"}
              </p>
              <p className="text-xs text-gray-600">
                {currentMode === "mervin"
                  ? "Conversa conmigo sobre construcción, materiales, estimaciones y más"
                  : "Además de conversar, puedo generar facturas, contratos y buscar propietarios"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* Sidebar */}
        <div className="w-80 space-y-4">
          {/* New Session Button */}
          <Button 
            onClick={startNewSession}
            disabled={createSessionMutation.isPending}
            className="w-full"
          >
            {createSessionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <MessageSquare className="h-4 w-4 mr-2" />
            )}
            Nueva Conversación
          </Button>

          {/* Session History */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Conversaciones Recientes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(sessions as any)?.sessions?.map((session: ChatSession) => (
                <Button
                  key={session.sessionId}
                  variant={currentSessionId === session.sessionId ? "default" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() => selectSession(session.sessionId)}
                >
                  <div className="flex items-center gap-2 w-full">
                    {session.mode === "mervin_agent" ? (
                      <Zap className="h-3 w-3 text-orange-500" />
                    ) : (
                      <MessageSquare className="h-3 w-3 text-blue-500" />
                    )}
                    <span className="truncate">
                      {session.title || "Nueva conversación"}
                    </span>
                  </div>
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Recent Actions (Agent mode only) */}
          {currentMode === "mervin_agent" && recentActions && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Acciones Recientes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {(recentActions as any)?.actions?.slice(0, 5).map((action: AgentAction) => (
                  <div key={action.id} className="flex items-center gap-2 text-sm">
                    {getActionIcon(action.actionType)}
                    <span className="flex-1 truncate">
                      {formatActionType(action.actionType)}
                    </span>
                    <Badge className={`text-xs ${getStatusColor(action.status)}`}>
                      {action.status === "success" && <CheckCircle className="h-3 w-3" />}
                      {action.status === "error" && <AlertCircle className="h-3 w-3" />}
                      {action.status === "pending" && <Clock className="h-3 w-3" />}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Main Chat Area */}
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {currentSessionId ? "Conversación Activa" : "Selecciona o inicia una conversación"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentSessionId ? (
                <>
                  {messagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span className="ml-2">Cargando mensajes...</span>
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
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-100 text-gray-900"
                          }`}
                        >
                          <div className="flex items-start gap-2">
                            {message.role === "assistant" && (
                              <Bot className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            {message.role === "user" && (
                              <User className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="whitespace-pre-wrap">{message.content}</p>
                              {message.toolCalls && (
                                <div className="mt-2 space-y-1">
                                  {message.toolCalls.map((tool: any, index: number) => (
                                    <div key={index} className="text-xs bg-white bg-opacity-20 rounded p-2">
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
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <Bot className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p>Inicia una nueva conversación para comenzar</p>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            {currentSessionId && (
              <div className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Escribe tu mensaje... ${currentMode === "mervin_agent" ? "(Modo Agente activado)" : ""}`}
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button 
                    onClick={sendMessage}
                    disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  >
                    {sendMessageMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MervinUnified;