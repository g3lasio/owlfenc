import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileSpreadsheet, 
  ClipboardList, 
  ClipboardCheck, 
  Building, 
  BarChart4, 
  FileText, 
  ImageIcon, 
  Camera, 
  BrainCircuit, 
  FileSearch, 
  Send, 
  Database,
  Paperclip, 
  Globe 
} from "lucide-react";

// Tipo para el mensaje de chat
type MessageAttachment = {
  type: 'image' | 'file';
  name: string;
  url: string;
  size?: number;
};

type MessageButton = {
  id: string;
  text: string;
  icon: React.ReactNode;
  action: string;
  description: string;
};

type Message = {
  id: string;
  content: string;
  sender: "user" | "assistant";
  attachment?: MessageAttachment;
  actionButtons?: MessageButton[];
  state?: "thinking" | "analyzing" | "deepSearching" | "reading" | "calculating" | "none";
};

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAttachOptions, setShowAttachOptions] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Función para desplazarse al final de los mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Efecto para mostrar el mensaje de bienvenida al cargar
  useEffect(() => {
    const welcomeMessage: Message = {
      id: "welcome",
      content: "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. Puedo ayudarte con las siguientes funciones:",
      sender: "assistant",
      actionButtons: [
        { 
          id: "estimados", 
          text: "Estimates", 
          icon: <FileSpreadsheet className="h-5 w-5" />, 
          action: "estimados",
          description: ""
        },
        { 
          id: "contratos", 
          text: "Contracts", 
          icon: <ClipboardList className="h-5 w-5" />, 
          action: "contratos",
          description: ""
        },
        { 
          id: "permisos", 
          text: "Permits", 
          icon: <ClipboardCheck className="h-5 w-5" />, 
          action: "permisos",
          description: ""
        },
        { 
          id: "ownership", 
          text: "Properties", 
          icon: <Building className="h-5 w-5" />, 
          action: "propiedades",
          description: ""
        },
        { 
          id: "insights", 
          text: "Analytics", 
          icon: <BarChart4 className="h-5 w-5" />, 
          action: "insights",
          description: ""
        }
      ]
    };
    
    setMessages([welcomeMessage]);
  }, []);
  
  // Scroll al fondo cuando cambian los mensajes
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Manejar el envío de mensajes
  const handleSendMessage = async () => {
    if (!inputValue.trim() && !isLoading) return;
    
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: "user"
    };
    
    setInputValue("");
    setIsLoading(true);

    // Añadimos el mensaje del usuario al historial
    setMessages(prev => [...prev, userMessage]);

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
        description: "No se pudo procesar tu mensaje. Inténtalo de nuevo más tarde.",
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  // Manejar tecla Enter en el input
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Manejar la subida de archivos
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'file') => {
    const file = event.target.files && event.target.files[0];
    
    if (!file) return;

    // Simular carga del archivo
    setTimeout(() => {
      // Crear URL para el archivo
      const fileUrl = URL.createObjectURL(file);
      
      // Crear mensaje de usuario con archivo adjunto
      const userMessage: Message = {
        id: `user-file-${Date.now()}`,
        content: `He subido ${type === 'image' ? 'una imagen' : 'un archivo'}: ${file.name}`,
        sender: "user",
        attachment: {
          type,
          name: file.name,
          url: fileUrl,
          size: file.size
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
          sender: "assistant",
          state: type === "image" ? "analyzing" : "reading"
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
    
    // Agregar un mensaje temporal "pensando"
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
      let state: "none" | "analyzing" | "deepSearching" | "reading" | "calculating" = "none";

      switch(service) {
        case "estimados":
          message = "Puedo ayudarte a generar estimados precisos para tus proyectos de cercas. Para empezar, necesito algunos detalles básicos:\n\n• Tipo de cerca (madera, vinilo, metal, etc.)\n• Longitud aproximada en pies lineales\n• Altura deseada\n• Ubicación (ciudad/condado)\n• ¿Incluye alguna puerta o características especiales?";
          state = "calculating";
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
          state = "reading";
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
    }, 1500);
  };

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-black">
      {/* Encabezado fijo */}
      <div className="sticky top-0 p-4 pb-2 bg-black z-30 border-b border-cyan-900/30 shadow-md">
        <h1 className="text-2xl font-bold text-center text-white">Mervin AI</h1>
      </div>

      {/* Área de mensajes con scroll */}
      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-6 bg-black chat-area">
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <p className="text-cyan-500 opacity-50">Iniciando conversación...</p>
          </div>
        )}
        {messages.map((message, index) => (
          <Card 
            key={message.id} 
            className={`${message.sender === "assistant" 
              ? "bg-gray-900 border-cyan-900/40 animate-fadeIn max-w-[85%] ml-0 mr-auto" 
              : "bg-blue-900/30 border-blue-500/30 animate-slideInRight max-w-[85%] ml-auto mr-0"} 
              transition-all duration-300 shadow-md hover:shadow-lg message-card`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <CardContent className="pt-4">
              <div className="flex items-start">
                {message.sender === "assistant" && (
                  <div className="w-10 h-10 rounded-full bg-cyan-900/30 flex items-center justify-center mr-3 flex-shrink-0">
                    <div className="mervin-logo-container">
                      <img 
                        src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png" 
                        alt="Mervin AI" 
                        className="mervin-logo w-8 h-8 object-contain" 
                      />
                      <div className="glow-effect"></div>
                    </div>
                  </div>
                )}
                <div className={`flex-1 ${message.sender === "user" ? "text-right" : ""}`}>
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
                    <div className="flex items-center text-xs text-purple-500 mb-1">
                      <div className="relative h-3 w-3 mr-1">
                        <div className="absolute inset-0 bg-purple-500 rounded-full animate-spin-slow opacity-75"></div>
                        <Globe className="h-3 w-3 relative" />
                      </div>
                      <span>Búsqueda profunda...</span>
                    </div>
                  )}
                  
                  {message.state === "reading" && (
                    <div className="flex items-center text-xs text-green-500 mb-1">
                      <div className="relative h-3 w-3 mr-1">
                        <div className="absolute inset-0 bg-green-500 rounded-full animate-pulse opacity-75"></div>
                        <FileText className="h-3 w-3 relative" />
                      </div>
                      <span>Leyendo documentos...</span>
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
                  
                  {message.sender === "assistant" ? (
                    <div className="mb-2">
                      <span className="text-cyan-400 font-semibold">Mervin AI</span>
                    </div>
                  ) : (
                    <div className="mb-2">
                      <span className="text-blue-400 font-semibold">You</span>
                    </div>
                  )}
                  <div className="message-container">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {/* Botones de acción */}
                  {message.actionButtons && message.actionButtons.length > 0 && (
                    <div className="mt-4 grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {message.actionButtons.map(button => (
                        <button
                          key={button.id}
                          onClick={() => handleServiceSelection(button.action)}
                          className="flex flex-col items-center bg-gradient-to-b from-cyan-900/30 to-cyan-950/50 hover:from-cyan-800/40 hover:to-cyan-900/60 transition-all p-2 rounded-lg border border-cyan-500/20 group w-full h-16 shadow-md hover:shadow-cyan-500/30 backdrop-blur-sm"
                        >
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-800/70 to-cyan-950/90 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform ring-1 ring-cyan-500/30">
                            <div className="text-cyan-400">
                              {button.icon}
                            </div>
                          </div>
                          <span className="text-sm font-medium text-center text-cyan-400 font-quantico leading-tight">{button.text}</span>
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
                    <img src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png" alt="Mervin AI" className="mervin-logo w-full h-full object-contain" />
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

      {/* Barra de input fija en la parte inferior */}
      <div className="sticky bottom-0 left-0 right-0 p-4 bg-black border-t border-cyan-900/30 shadow-lg z-20 w-full">
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

        <div className="w-full flex items-center gap-2">
          <input 
            type="file" 
            accept="image/*" 
            ref={imageInputRef} 
            onChange={(e) => handleFileChange(e, 'image')} 
            style={{ display: 'none' }} 
          />
          <input 
            type="file" 
            accept=".pdf,.doc,.docx,.txt" 
            ref={fileInputRef} 
            onChange={(e) => handleFileChange(e, 'file')} 
            style={{ display: 'none' }} 
          />
          
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowAttachOptions(!showAttachOptions)}
            className="bg-gray-800 border-cyan-900/50 text-cyan-500 hover:bg-gray-700"
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="relative flex-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              className="w-full px-4 py-2 bg-gray-800 border border-cyan-900/50 rounded-full text-white focus:outline-none focus:border-cyan-500/70 placeholder-gray-500"
              ref={inputRef}
              disabled={isLoading}
            />
          </div>
          
          <Button
            variant="default"
            size="icon"
            onClick={handleSendMessage}
            disabled={isLoading || !inputValue.trim()}
            className={`rounded-full bg-gradient-to-r from-cyan-600 to-cyan-800 hover:from-cyan-500 hover:to-cyan-700 transition-all ${!inputValue.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}