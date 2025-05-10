import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface Message {
  id: string;
  content: string;
  sender: "user" | "assistant";
}

export default function Mervin() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      content: "¡Hola! Soy Mervin, tu asistente virtual. ¿En qué puedo ayudarte hoy?",
      sender: "assistant"
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
          content: "Estoy aquí para ayudarte con la generación de contratos, verificación de propiedad, consejos sobre permisos y más. ¿Qué necesitas hoy?",
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
      <h1 className="text-2xl font-bold mb-4">Mervin - Asistente Virtual</h1>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
        {messages.map(message => (
          <Card key={message.id} className={`${message.sender === "assistant" ? "bg-muted" : "bg-primary/10"}`}>
            <CardContent className="pt-4">
              <p className="whitespace-pre-wrap">{message.content}</p>
            </CardContent>
          </Card>
        ))}
        {isLoading && (
          <Card className="bg-muted">
            <CardContent className="pt-4">
              <p>Pensando...</p>
            </CardContent>
          </Card>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="flex gap-2 mt-auto">
        <Input
          placeholder="Escribe tu mensaje..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSendMessage()}
          disabled={isLoading}
          className="flex-1"
        />
        <Button onClick={handleSendMessage} disabled={isLoading}>
          Enviar
        </Button>
      </div>
    </div>
  );
}