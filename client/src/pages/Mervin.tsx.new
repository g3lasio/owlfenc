import React, { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Send, 
  Paperclip, 
  FileSpreadsheet, 
  ClipboardList, 
  ClipboardCheck, 
  Building, 
  BarChart4
} from "lucide-react";

// Tipos para los mensajes
type Message = {
  id: string;
  content: string;
  sender: "user" | "assistant";
  state?: "analyzing" | "thinking" | "none";
  action?: string;
}

// Botones de acción principales con iconos
const actionButtons = [
  { id: "estimates", text: "Estimates", action: "estimates", icon: <FileSpreadsheet className="h-5 w-5" /> },
  { id: "contracts", text: "Contracts", action: "contracts", icon: <ClipboardList className="h-5 w-5" /> },
  { id: "permits", text: "Permits", action: "permits", icon: <ClipboardCheck className="h-5 w-5" /> },
  { id: "properties", text: "Properties", action: "properties", icon: <Building className="h-5 w-5" /> },
  { id: "analytics", text: "Analytics", action: "analytics", icon: <BarChart4 className="h-5 w-5" /> }
];

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Inicializar con mensaje de bienvenida
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        content: "¡Hola! Soy Mervin, tu asistente virtual especializado en proyectos de construcción y cercas. Puedo ayudarte con las siguientes funciones:",
        sender: "assistant",
        action: "menu"
      }
    ]);
  }, []);

  // Manejar envío de mensajes
  const handleSendMessage = () => {
    if (inputValue.trim() === "" || isLoading) return;

    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: inputValue,
      sender: "user"
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    
    // Simular respuesta
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: "Estoy aquí para ayudarte. ¿Te gustaría generar un contrato, verificar una propiedad, consultar permisos, gestionar clientes o revisar facturación?",
        sender: "assistant"
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      
      // Desplazar al final
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1500);
  };

  // Manejar selección de acción
  const handleAction = (action: string) => {
    setIsLoading(true);
    
    // Mensaje temporal "Analizando..."
    const thinkingMessage: Message = {
      id: `thinking-${Date.now()}`,
      content: "Analizando datos...",
      sender: "assistant",
      state: "analyzing"
    };
    
    setMessages(prev => [...prev, thinkingMessage]);
    
    // Desplazar al final
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    
    // Simular respuesta
    setTimeout(() => {
      // Eliminar mensaje de pensando
      setMessages(prev => prev.filter(m => m.id !== thinkingMessage.id));
      
      // Determinar respuesta según acción
      let response = "";
      switch(action) {
        case "estimates":
          response = "Puedo ayudarte a generar estimados precisos para tus proyectos de cercas. Para empezar, necesito algunos detalles básicos como tipo de cerca, longitud, altura y ubicación.";
          break;
        case "contracts":
          response = "Puedo ayudarte a generar un contrato profesional y legal. ¿Te gustaría crear un nuevo contrato desde cero, usar una plantilla existente o modificar un contrato anterior?";
          break;
        case "permits":
          response = "Para ayudarte con información sobre permisos y regulaciones, necesito saber la ubicación exacta, tipo de cerca que planeas instalar y si la propiedad está en una zona con restricciones.";
          break;
        case "properties":
          response = "Para verificar los detalles de una propiedad, necesito la dirección completa del inmueble. Esto me permitirá confirmar al propietario actual y verificar los límites de la propiedad.";
          break;
        case "analytics":
          response = "Puedo proporcionar análisis detallados sobre tendencias de costos de materiales, comparativas de proyectos anteriores y métricas de rentabilidad por tipo de proyecto.";
          break;
        default:
          response = "¿En qué puedo ayudarte hoy?";
      }
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: response,
        sender: "assistant"
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
      
      // Desplazar al final
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }, 1500);
  };

  // Manejar tecla Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white overflow-hidden">
      {/* Contenedor de mensajes (scrollable) */}
      <div className="flex-1 overflow-y-auto pb-24">
        <div className="p-4 space-y-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`max-w-[85%] rounded-lg p-3 ${
                message.sender === "assistant" 
                  ? "bg-gray-900 text-white mr-auto" 
                  : "bg-blue-900 text-white ml-auto"
              }`}
            >
              {/* Avatar y nombre para mensajes de Mervin */}
              {message.sender === "assistant" && (
                <div className="flex items-center mb-2">
                  <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center mr-2">
                    <img 
                      src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png" 
                      alt="Mervin AI" 
                      className="w-6 h-6"
                    />
                  </div>
                  <span className="text-cyan-400 font-semibold">Mervin AI</span>
                  
                  {/* Estado de análisis */}
                  {message.state === "analyzing" && (
                    <div className="ml-2 text-xs text-blue-400 flex items-center">
                      <span>Analizando datos...</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Nombre para mensajes del usuario */}
              {message.sender === "user" && (
                <div className="text-right mb-1">
                  <span className="text-blue-400 font-semibold">You</span>
                </div>
              )}
              
              {/* Contenido del mensaje */}
              <div className="whitespace-pre-wrap">{message.content}</div>
              
              {/* Botones de acción - solo en el mensaje inicial o cuando se solicita menú */}
              {message.action === "menu" && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {actionButtons.map((button) => (
                    <button
                      key={button.id}
                      onClick={() => handleAction(button.action)}
                      className="bg-cyan-900/30 hover:bg-cyan-800/50 text-cyan-400 rounded p-2 text-sm font-medium transition-colors duration-200 flex flex-col items-center justify-center"
                    >
                      <div className="mb-1 flex items-center justify-center w-6 h-6">
                        {button.icon}
                      </div>
                      {button.text}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          
          {/* Mensaje de carga */}
          {isLoading && (
            <div className="max-w-[85%] rounded-lg p-3 bg-gray-900 mr-auto">
              <div className="flex items-center">
                <div className="w-8 h-8 rounded-full bg-cyan-900/30 flex items-center justify-center mr-2">
                  <img 
                    src="https://i.postimg.cc/W4nKDvTL/logo-mervin.png" 
                    alt="Mervin AI" 
                    className="w-6 h-6"
                  />
                </div>
                <span className="text-cyan-400">Procesando</span>
                <div className="ml-1 flex">
                  <span className="animate-pulse text-cyan-400">.</span>
                  <span className="animate-pulse text-cyan-400 delay-200">.</span>
                  <span className="animate-pulse text-cyan-400 delay-500">.</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Elemento para scroll automático */}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Área de input FIJA en la parte inferior, fuera del scroll */}
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
      
      {/* Footer fijo y minimalista */}
      <div className="fixed bottom-0 left-0 right-0 bg-black text-center p-1 text-xs text-gray-500 border-t border-gray-900/20">
        <div className="flex justify-between px-4">
          <span>Política de privacidad</span>
          <span>Términos</span>
          <span>© 2025 Owl</span>
        </div>
      </div>
    </div>
  );
}