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
  FileCheck,
  ClipboardCheck,
  HomeIcon,
  Users,
  CircleDollarSign
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
  attachment?: {
    type: "image" | "file";
    url: string;
    name: string;
  };
}

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "¡Hola! Soy Mervin, tu asistente virtual. Puedo ayudarte con:\n\n• Generación de contratos\n• Verificación de propiedades\n• Consulta de permisos\n• Gestión de clientes\n• Facturación y pagos\n\n¿En qué puedo ayudarte hoy?",
      sender: "assistant"
    }
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

  const handleShowFeatureOptions = () => {
    const assistantMessage: Message = {
      id: `assistant-options-${Date.now()}`,
      content: "¿Qué tipo de contrato te gustaría generar?",
      sender: "assistant"
    };
    setMessages(prev => [...prev, assistantMessage]);
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
    <div className="flex-1 flex flex-col overflow-hidden p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Mervin AI</h1>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => handleShowFeatureOptions()}
          >
            <FileText className="h-4 w-4 mr-1" /> 
            Generar Contrato
          </Button>
        </div>
      </div>
      
      {/* Tarjetas de opciones rápidas */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        <Card className="hover:bg-primary/5 cursor-pointer transition-colors">
          <CardContent className="p-3 flex flex-col items-center justify-center">
            <FileText className="h-5 w-5 mb-1 text-blue-500" />
            <span className="text-xs text-center">Contratos</span>
          </CardContent>
        </Card>
        <Card className="hover:bg-primary/5 cursor-pointer transition-colors">
          <CardContent className="p-3 flex flex-col items-center justify-center">
            <HomeIcon className="h-5 w-5 mb-1 text-green-500" />
            <span className="text-xs text-center">Propiedades</span>
          </CardContent>
        </Card>
        <Card className="hover:bg-primary/5 cursor-pointer transition-colors">
          <CardContent className="p-3 flex flex-col items-center justify-center">
            <ClipboardCheck className="h-5 w-5 mb-1 text-purple-500" />
            <span className="text-xs text-center">Permisos</span>
          </CardContent>
        </Card>
        <Card className="hover:bg-primary/5 cursor-pointer transition-colors">
          <CardContent className="p-3 flex flex-col items-center justify-center">
            <Users className="h-5 w-5 mb-1 text-amber-500" />
            <span className="text-xs text-center">Clientes</span>
          </CardContent>
        </Card>
        <Card className="hover:bg-primary/5 cursor-pointer transition-colors">
          <CardContent className="p-3 flex flex-col items-center justify-center">
            <CircleDollarSign className="h-5 w-5 mb-1 text-emerald-500" />
            <span className="text-xs text-center">Facturación</span>
          </CardContent>
        </Card>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2 border border-muted rounded-lg p-4 bg-background">
        {messages.map(message => (
          <Card 
            key={message.id} 
            className={`${message.sender === "assistant" ? "bg-muted" : "bg-primary/10"}`}
          >
            <CardContent className="pt-4">
              <div className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2 flex-shrink-0">
                  {message.sender === "assistant" ? 
                    <MessageSquare className="h-4 w-4 text-primary" /> : 
                    <div className="w-4 h-4 rounded-full bg-primary" />
                  }
                </div>
                <div className="flex-1">
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  
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
          <Card className="bg-muted">
            <CardContent className="pt-4">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <p>Pensando...</p>
              </div>
            </CardContent>
          </Card>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="relative">
        {showAttachOptions && (
          <div className="absolute bottom-full mb-2 bg-background border border-input rounded-md shadow-md p-2 flex space-x-1">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                imageInputRef.current?.click();
                setShowAttachOptions(false);
              }}
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
            >
              <Camera className="h-4 w-4 mr-1" /> 
              Cámara
            </Button>
          </div>
        )}
      
        <div className="flex gap-2 mt-auto border border-input rounded-md p-1 bg-background">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowAttachOptions(!showAttachOptions)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Paperclip className="h-5 w-5" />
          </Button>
          
          <Input
            placeholder="Escribe tu mensaje..."
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleSendMessage()}
            disabled={isLoading}
            className="flex-1 border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
          />
          
          <Button 
            onClick={handleSendMessage} 
            disabled={isLoading}
            size="icon"
            className="rounded-full"
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