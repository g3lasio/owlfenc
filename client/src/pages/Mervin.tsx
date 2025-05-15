import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Image as ImageIcon, 
  Paperclip, 
  Camera, 
  Send, 
  MessageSquare,
  Home,
  ClipboardCheck,
  Users,
  CircleDollarSign,
  FileSearch,
  FileSpreadsheet,
  Building,
  CheckSquare,
  BarChart4,
  BrainCircuit,
  Search,
  Database,
  Loader,
  ClipboardList
} from "lucide-react";

interface ActionButton {
  id: string;
  text: string;
  icon: JSX.Element;
  action: string;
  description: string;
}

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  attachment?: {
    type: "image" | "file";
    url: string;
    name: string;
  };
  actionButtons?: ActionButton[];
  state?: "thinking" | "analyzing" | "deepSearching" | "reading" | "calculating" | "none";
  typewriterEffect?: boolean;
  visibleContent?: string;
}

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. Puedo ayudarte con las siguientes funciones:",
      sender: "assistant",
      actionButtons: [
        { 
          id: "estimados", 
          text: "Estimados", 
          icon: <FileSpreadsheet className="h-5 w-5" />, 
          action: "estimados",
          description: "Cálculos precisos"
        },
        { 
          id: "contratos", 
          text: "Contratos", 
          icon: <ClipboardList className="h-5 w-5" />, 
          action: "contratos",
          description: "Documentos legales"
        },
        { 
          id: "permisos", 
          text: "Permisos", 
          icon: <ClipboardCheck className="h-5 w-5" />, 
          action: "permisos",
          description: "Regulaciones"
        },
        { 
          id: "ownership", 
          text: "Propiedades", 
          icon: <Building className="h-5 w-5" />, 
          action: "propiedades",
          description: "Verificación"
        },
        { 
          id: "insights", 
          text: "Analítica", 
          icon: <BarChart4 className="h-5 w-5" />, 
          action: "insights",
          description: "Datos e insights"
        }
      ],
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: "user"
    };

    // Add user message to chat
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    try {
      // Simulamos respuesta para esta versión inicial
      setTimeout(() => {
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          content: "Estoy aquí para ayudarte. ¿Te gustaría generar un contrato, verificar una propiedad, consultar permisos, gestionar clientes o revisar facturación?",
          sender: "assistant"
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      console.error("Error al procesar mensaje:", error);
      toast({
        title: "Error",
        description: "No pude procesar tu mensaje. Por favor intenta de nuevo.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: "file" | "image") => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Simular carga de archivo (en una implementación real, se subiría a un servidor)
    setIsLoading(true);

    setTimeout(() => {
      const userMessage: Message = {
        id: `user-file-${Date.now()}`,
        content: type === "image" ? "He adjuntado una imagen." : "He adjuntado un archivo.",
        sender: "user",
        attachment: {
          type: type,
          url: URL.createObjectURL(file),
          name: file.name
        }
      };

      setMessages(prev => [...prev, userMessage]);
      setIsLoading(false);

      // Simular respuesta del asistente
      setIsLoading(true);
      setTimeout(() => {
        const assistantMessage: Message = {
          id: `assistant-file-${Date.now()}`,
          content: type === "image" 
            ? "He recibido tu imagen. ¿Qué te gustaría hacer con ella?" 
            : "He recibido tu archivo. ¿Qué información necesitas extraer de él?",
          sender: "assistant"
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }, 1000);
    }, 1500);

    // Reset input
    event.target.value = "";
  };

  const handleServiceSelection = (service: string) => {
    setIsLoading(true);
    
    // Primero, agregar un mensaje temporal "pensando"
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      content: "Preparando información sobre " + service + "...",
      sender: "assistant",
      state: "thinking"
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    scrollToBottom();
    
    // Simular un tiempo de procesamiento
    setTimeout(() => {
      // Eliminar el mensaje de pensando
      setMessages(prev => prev.filter(msg => msg.id !== thinkingMessage.id));
      
      let message = "";
      let state: "none" | "analyzing" | "deepSearching" = "none";

      switch(service) {
        case "estimados":
          message = "Puedo ayudarte a generar estimados precisos para tus proyectos de cercas. Para empezar, necesito algunos detalles básicos:\n\n• Tipo de cerca (madera, vinilo, metal, etc.)\n• Longitud aproximada en pies lineales\n• Altura deseada\n• Ubicación (ciudad/condado)\n• ¿Incluye alguna puerta o características especiales?";
          break;
        case "contratos":
          message = "Puedo ayudarte a generar un contrato profesional y legal. ¿Te gustaría:\n\n• Crear un nuevo contrato desde cero\n• Usar una plantilla existente\n• Modificar un contrato anterior";
          state = "analyzing";
          break;
        case "propiedades":
          message = "Para verificar los detalles de una propiedad, necesito la dirección completa del inmueble. Esta información me permitirá:\n\n• Confirmar al propietario actual\n• Verificar los límites de la propiedad\n• Comprobar si hay restricciones\n• Analizar el historial de transacciones";
          state = "deepSearching";
          break;
        case "permisos":
          message = "Para ayudarte con información sobre permisos y regulaciones, necesito saber:\n\n• Ubicación exacta (ciudad/condado)\n• Tipo de cerca que planeas instalar\n• Si la propiedad está en una zona con restricciones (HOA)\n• Si la cerca estará en el límite de la propiedad";
          break;
        case "insights":
          message = "Puedo proporcionar análisis detallados sobre:\n\n• Tendencias de costos de materiales\n• Comparativas de proyectos anteriores\n• Métricas de rentabilidad por tipo de proyecto\n• Predicciones de demanda por zona\n\n¿Qué tipo de insights te gustaría explorar?";
          state = "analyzing";
          break;
        default:
          message = "¿En qué te puedo ayudar hoy?";
      }

      const assistantMessage: Message = {
        id: `assistant-service-${Date.now()}`,
        content: message,
        sender: "assistant",
        state: state
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      scrollToBottom();
    }, 1500);
  };

  // Scroll to bottom when messages change
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Usar useEffect para manejar efectos secundarios
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex-1 flex flex-col relative h-full overflow-hidden bg-black">
      {/* Encabezado fijo */}
      <div className="fixed top-0 left-0 right-0 p-4 pb-2 bg-black z-30 border-b border-cyan-900/30 shadow-md">
        <h1 className="text-2xl font-bold text-center text-white">Mervin AI</h1>
      </div>
      
      {/* Espaciador para compensar el header fijo */}
      <div className="h-16"></div>

      {/* Área de mensajes con scroll, con padding inferior para dar espacio al input fijo y footer global */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20 bg-black hide-scrollbar">
        {messages.map((message, index) => (
          <Card 
            key={message.id} 
            className={`${message.sender === "assistant" 
              ? "bg-gray-900 border-cyan-900/40 animate-fadeIn" 
              : "bg-gray-800 border-cyan-800/30 animate-slideInRight"} 
              transition-all duration-300 shadow-md hover:shadow-lg`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardContent className="pt-4">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center mr-3 flex-shrink-0">
                  {message.sender === "assistant" ? 
                    <div className="mervin-logo-container">
                      <img 
                        src="https://i.postimg.cc/4yc9M62C/White-logo-no-background.png" 
                        alt="Mervin AI" 
                        className="mervin-logo w-8 h-8 object-contain" 
                      />
                      <div className="glow-effect"></div>
                    </div> : 
                    <div className="w-5 h-5 rounded-full bg-cyan-400" />
                  }
                </div>
                <div className="flex-1">
                  {/* Indicadores de estado */}
                  {message.state === "thinking" && (
                    <div className="flex items-center text-xs text-cyan-500 mb-1 animate-pulse">
                      <BrainCircuit className="h-3 w-3 mr-1" />
                      <span>Pensando...</span>
                    </div>
                  )}
                  
                  {message.state === "analyzing" && (
                    <div className="flex items-center text-xs text-blue-500 mb-1">
                      <div className="relative h-3 w-3 mr-1">
                        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                        <FileSearch className="h-3 w-3 relative" />
                      </div>
                      <span>Analizando datos...</span>
                    </div>
                  )}
                  
                  {message.state === "deepSearching" && (
                    <div className="flex items-center text-xs text-indigo-500 mb-1">
                      <div className="relative h-3 w-3 mr-1">
                        <div className="absolute inset-0 border border-indigo-500 rounded-full animate-spin"></div>
                        <Search className="h-3 w-3 relative" />
                      </div>
                      <span>Búsqueda profunda...</span>
                    </div>
                  )}
                  
                  {message.state === "reading" && (
                    <div className="flex items-center text-xs text-emerald-500 mb-1">
                      <div className="relative h-3 w-3 mr-1">
                        <div className="absolute inset-0 bg-emerald-500/50 rounded-full animate-scan-x"></div>
                        <FileText className="h-3 w-3 relative" />
                      </div>
                      <span>Leyendo documento...</span>
                    </div>
                  )}
                  
                  {message.state === "calculating" && (
                    <div className="flex items-center text-xs text-amber-500 mb-1">
                      <div className="relative h-3 w-3 mr-1">
                        <div className="absolute inset-0 bg-amber-500/50 rounded-full animate-spin-slow"></div>
                        <Database className="h-3 w-3 relative" />
                      </div>
                      <span>Calculando estimados...</span>
                    </div>
                  )}
                  
                  {message.sender === "assistant" && (
                    <div className="mb-2">
                      <span className="text-cyan-400 font-semibold">Mervin AI</span>
                    </div>
                  )}
                  {message.typewriterEffect && message.sender === "assistant" ? (
                    <p className="whitespace-pre-wrap typewriter-text">{message.visibleContent}</p>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}

                  {/* Botones de acción */}
                  {message.actionButtons && message.actionButtons.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {message.actionButtons.map(button => (
                        <button
                          key={button.id}
                          onClick={() => handleServiceSelection(button.action)}
                          className="flex flex-col items-center bg-gradient-to-b from-cyan-900/30 to-cyan-950/50 hover:from-cyan-800/40 hover:to-cyan-900/60 transition-all p-2 rounded-lg border border-cyan-500/20 group w-full h-20 shadow-md hover:shadow-cyan-500/30 backdrop-blur-sm"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-800/70 to-cyan-950/90 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform ring-1 ring-cyan-500/30">
                            <div className="text-cyan-400">
                              {button.icon}
                            </div>
                          </div>
                          <span className="text-xs font-medium text-center text-cyan-400 font-quantico leading-tight">{button.text}</span>
                          <span className="text-[9px] text-center text-cyan-300/70 mt-0.5 line-clamp-1">{button.description}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {message.attachment && (
                    <div className="mt-2 p-2 border rounded-md max-w-xs">
                      {message.attachment.type === "image" ? (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">{message.attachment.name}</p>
                          <img 
                            src={message.attachment.url} 
                            alt="Adjunto" 
                            className="max-w-full rounded" 
                          />
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="text-sm truncate">{message.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {isLoading && (
          <Card className="bg-gray-900 border-cyan-900/40">
            <CardContent className="pt-4">
              <div className="flex items-start">
                <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center mr-3 flex-shrink-0">
                  <div className="mervin-logo-container">
                    <img src="/mervin-logo.png" alt="Mervin AI" className="mervin-logo w-full h-full object-contain" />
                    <div className="glow-effect"></div>
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <p className="text-cyan-500 font-quantico">Procesando</p>
                    <div className="ml-1 flex items-center">
                      <span className="animate-bounce-dot delay-0 text-cyan-400">.</span>
                      <span className="animate-bounce-dot delay-1 text-cyan-400">.</span>
                      <span className="animate-bounce-dot delay-2 text-cyan-400">.</span>
                    </div>
                  </div>
                  <div className="mt-1 w-40 h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full animate-progress-bar"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quitamos el footer del chat */}
      
      {/* Barra de input fija en la parte inferior */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black border-t border-cyan-900/30 shadow-lg z-20 w-full max-w-full md:left-[224px] md:max-w-[calc(100%-224px)]">
        {showAttachOptions && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-900 border border-cyan-900/50 rounded-md shadow-md p-2 flex flex-wrap gap-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                imageInputRef.current?.click();
                setShowAttachOptions(false);
              }}
              className="bg-gray-800 border-cyan-900/50 text-cyan-500 hover:bg-gray-700"
            >
              <ImageIcon className="h-4 w-4 mr-1" /> 
              Imagen
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                fileInputRef.current?.click();
                setShowAttachOptions(false);
              }}
              className="bg-gray-800 border-cyan-900/50 text-cyan-500 hover:bg-gray-700"
            >
              <FileText className="h-4 w-4 mr-1" /> 
              Archivo
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                toast({
                  title: "Cámara",
                  description: "La funcionalidad de cámara será implementada próximamente."
                });
                setShowAttachOptions(false);
              }}
              className="bg-gray-800 border-cyan-900/50 text-cyan-500 hover:bg-gray-700"
            >
              <Camera className="h-4 w-4 mr-1" /> 
              Cámara
            </Button>
          </div>
        )}

        <div className="flex gap-2 mt-auto border border-cyan-900/50 rounded-md p-1 bg-gray-900">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowAttachOptions(!showAttachOptions)}
            className="text-cyan-500/70 hover:text-cyan-400"
          >
            <Paperclip className="h-5 w-5" />
          </Button>

          <Input
            placeholder="Escribe tu mensaje..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
            className="flex-1 border-0 bg-gray-900 text-white focus-visible:ring-0 focus-visible:ring-offset-0"
          />

          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading}
            size="icon"
            className="rounded-full bg-cyan-500 hover:bg-cyan-400"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>

        {/* Inputs ocultos para archivos */}
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={(e) => handleFileChange(e, "file")}
          accept=".pdf,.doc,.docx,.txt"
          className="hidden" 
        />
        <input 
          type="file" 
          ref={imageInputRef}
          onChange={(e) => handleFileChange(e, "image")}
          accept="image/*"
          className="hidden" 
        />
      </div>
    </div>
  );
}