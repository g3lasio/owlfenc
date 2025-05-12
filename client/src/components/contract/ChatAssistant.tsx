import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, User, Upload, MessageCircle } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
}

interface ContractData {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  clientAddress?: string;
  fenceType?: string;
  fenceHeight?: string;
  fenceLength?: string;
  projectTotal?: string;
  [key: string]: string | undefined;
}

interface ChatAssistantProps {
  initialData?: ContractData;
  onDataComplete: (data: ContractData) => void;
  onFileUpload?: (file: File) => void;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
  initialData = {}, 
  onDataComplete,
  onFileUpload
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [collectedData, setCollectedData] = useState<ContractData>(initialData);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Campos requeridos para el contrato
  const requiredFields = [
    { key: 'clientName', label: 'nombre del cliente' },
    { key: 'clientAddress', label: 'dirección del proyecto' },
    { key: 'fenceType', label: 'tipo de cerca' },
    { key: 'fenceHeight', label: 'altura de la cerca' },
    { key: 'fenceLength', label: 'longitud de la cerca' },
    { key: 'projectTotal', label: 'precio total del proyecto' }
  ];

  // Mensaje inicial del asistente
  useEffect(() => {
    // Agregar mensaje de bienvenida al inicio
    if (messages.length === 0) {
      // Determinar qué campos faltan del initialData
      const missing = requiredFields.filter(field => 
        !initialData[field.key] || initialData[field.key] === ''
      );
      setMissingFields(missing.map(f => f.key));

      // Crear mensaje de bienvenida basado en la información faltante
      let welcomeMessage = '¡Hola! Soy tu asistente conversacional para la generación de contratos. Puedes hablar conmigo libremente acerca del contrato que necesitas. ';
      
      if (missing.length === 0) {
        welcomeMessage += 'Veo que ya tienes toda la información necesaria para generar el contrato. ¿Quieres proceder o necesitas modificar algún dato?';
      } else if (Object.keys(initialData).some(key => initialData[key] && initialData[key] !== '')) {
        welcomeMessage += `He recibido parte de la información, pero necesito algunos datos adicionales para completar el contrato. Por favor proporciona: ${missing.map(f => f.label).join(', ')}.`;
      } else {
        welcomeMessage += 'Para generar un contrato, necesito recopilar información sobre el cliente y el proyecto. Puedes subir un PDF de un estimado aprobado o contarme sobre el proyecto que necesita contrato. También puedes usar el "Flujo Guiado" para responder preguntas específicas en orden.';
      }

      setMessages([
        {
          role: 'assistant',
          content: welcomeMessage,
          timestamp: new Date()
        }
      ]);
    }
  }, []);

  // Función para manejar el desplazamiento automático al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Función para enviar un mensaje
  const sendMessage = async () => {
    if (!input.trim()) return;

    // Agregar el mensaje del usuario a la conversación
    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Procesar entrada del usuario para identificar datos relevantes
      const updatedData = extractDataFromMessage(input, collectedData);
      setCollectedData(updatedData);
      
      // Determinar qué campos aún faltan
      const stillMissing = requiredFields.filter(field => 
        !updatedData[field.key] || updatedData[field.key] === ''
      ).map(f => f.key);
      
      setMissingFields(stillMissing);

      // Simular una pequeña demora para la respuesta del asistente
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Generar respuesta del asistente
      let responseContent = '';
      
      // Si ya no faltan campos, notificar que estamos listos
      if (stillMissing.length === 0) {
        responseContent = '¡Perfecto! Ahora tengo toda la información necesaria para generar el contrato. ¿Quieres revisar los datos antes de continuar?';
        // Notificar al componente padre que tenemos todos los datos
        onDataComplete(updatedData);
      } else {
        // Solicitar el siguiente campo faltante
        const nextField = requiredFields.find(f => stillMissing.includes(f.key));
        responseContent = `Gracias. Aún necesito el ${nextField?.label}. ¿Podrías proporcionármelo?`;
      }

      // Agregar respuesta del asistente
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      }]);
    } catch (error) {
      console.error('Error procesando el mensaje:', error);
      toast({
        title: 'Error',
        description: 'Hubo un problema al procesar tu mensaje. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para extraer datos relevantes del mensaje del usuario
  const extractDataFromMessage = (message: string, currentData: ContractData): ContractData => {
    const updatedData = { ...currentData };
    
    // Extraer nombre del cliente
    if (!updatedData.clientName || updatedData.clientName === '') {
      const nameMatch = message.match(/nombre(?:\s+del)?(?:\s+cliente)?(?:\s+es)?(?:\s*:)?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s.]+)(?:\.|,|$)/i);
      if (nameMatch && nameMatch[1].trim()) {
        updatedData.clientName = nameMatch[1].trim();
      }
    }
    
    // Extraer dirección
    if (!updatedData.clientAddress || updatedData.clientAddress === '') {
      const addressMatch = message.match(/direcci[oó]n(?:\s+es)?(?:\s*:)?\s*([A-Za-zÀ-ÖØ-öø-ÿ0-9\s.,#-]+)(?:\.|,|$)/i);
      if (addressMatch && addressMatch[1].trim()) {
        updatedData.clientAddress = addressMatch[1].trim();
      }
    }
    
    // Extraer tipo de cerca
    if (!updatedData.fenceType || updatedData.fenceType === '') {
      const fenceTypeMatch = message.match(/(?:cerca|vallado)(?:\s+es|tipo)?(?:\s*:)?\s*([A-Za-zÀ-ÖØ-öø-ÿ\s]+)(?:\.|,|$)/i);
      if (fenceTypeMatch && fenceTypeMatch[1].trim()) {
        updatedData.fenceType = fenceTypeMatch[1].trim();
      }
    }
    
    // Extraer altura de la cerca
    if (!updatedData.fenceHeight || updatedData.fenceHeight === '') {
      const heightMatch = message.match(/altura(?:\s+es)?(?:\s*:)?\s*(\d+(?:\.\d+)?)\s*(?:pies|ft|feet|pie|metros|m)/i);
      if (heightMatch && heightMatch[1]) {
        updatedData.fenceHeight = heightMatch[1];
      }
    }
    
    // Extraer longitud de la cerca
    if (!updatedData.fenceLength || updatedData.fenceLength === '') {
      const lengthMatch = message.match(/longitud(?:\s+es)?(?:\s*:)?\s*(\d+(?:\.\d+)?)\s*(?:pies|ft|feet|pie|metros|m)/i);
      if (lengthMatch && lengthMatch[1]) {
        updatedData.fenceLength = lengthMatch[1];
      }
    }
    
    // Extraer precio total
    if (!updatedData.projectTotal || updatedData.projectTotal === '') {
      const priceMatch = message.match(/(?:precio|costo|total)(?:\s+es)?(?:\s*:)?\s*(?:\$)?\s*(\d+(?:,\d+)?(?:\.\d+)?)/i);
      if (priceMatch && priceMatch[1]) {
        updatedData.projectTotal = priceMatch[1].replace(/,/g, '');
      }
    }
    
    // Extraer teléfono (opcional)
    if (!updatedData.clientPhone || updatedData.clientPhone === '') {
      const phoneMatch = message.match(/(?:tel[eé]fono|celular|móvil)(?:\s+es)?(?:\s*:)?\s*((?:\+\d{1,3})?[\s\d()-]{7,})/i);
      if (phoneMatch && phoneMatch[1].trim()) {
        updatedData.clientPhone = phoneMatch[1].trim();
      }
    }
    
    // Extraer email (opcional)
    if (!updatedData.clientEmail || updatedData.clientEmail === '') {
      const emailMatch = message.match(/(?:email|correo|e-mail)(?:\s+es)?(?:\s*:)?\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i);
      if (emailMatch && emailMatch[1].trim()) {
        updatedData.clientEmail = emailMatch[1].trim();
      }
    }
    
    return updatedData;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (onFileUpload) {
        onFileUpload(e.target.files[0]);
        
        // Agregar mensaje al chat
        setMessages(prev => [...prev, 
          {
            role: 'user',
            content: `He subido un archivo: ${e.target.files?.[0].name}`,
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'Estoy procesando el archivo subido. Dame un momento para extraer la información...',
            timestamp: new Date()
          }
        ]);
      }
    }
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-lg">
      <div className="p-3 border-b bg-muted/30">
        <h3 className="text-lg font-medium flex items-center">
          <MessageCircle className="mr-2 h-5 w-5 text-primary" />
          Asistente de Contratos - Conversación Libre
        </h3>
        <p className="text-xs text-muted-foreground">Puedes hablar libremente o subir un PDF para iniciar</p>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div 
            key={idx} 
            className={`flex mb-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`flex items-start max-w-[80%] ${
                msg.role === 'user' 
                  ? 'bg-primary text-primary-foreground flex-row-reverse'
                  : 'bg-muted/50'
              } rounded-lg p-3`}
            >
              <Avatar className="h-8 w-8 mr-2">
                {msg.role === 'user' ? (
                  <>
                    <AvatarFallback>U</AvatarFallback>
                    <User className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <AvatarImage src="/mervin-avatar.png" alt="Mervin" />
                    <AvatarFallback>AI</AvatarFallback>
                  </>
                )}
              </Avatar>
              <div className="ml-2">
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                <div className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex mb-4 justify-start">
            <div className="flex items-start max-w-[80%] bg-muted/50 rounded-lg p-3">
              <Avatar className="h-8 w-8 mr-2">
                <AvatarImage src="/mervin-avatar.png" alt="Mervin" />
                <AvatarFallback>AI</AvatarFallback>
              </Avatar>
              <div className="ml-2 space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Área de entrada de mensaje y botones */}
      <div className="border-t p-3 bg-background">
        <div className="flex space-x-2">
          {/* Botón de cargar archivo, solo visible si hay función de carga */}
          {onFileUpload && (
            <>
              <input
                type="file"
                id="chat-file-upload"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="chat-file-upload">
                <Button type="button" variant="outline" size="icon" className="flex-shrink-0">
                  <Upload className="h-4 w-4" />
                </Button>
              </label>
            </>
          )}
          
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            className="flex-1"
          />
          <Button onClick={sendMessage} disabled={isLoading} type="button" size="icon" className="flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Panel de datos recopilados (oculto para usuarios, útil para debugging) */}
        <div className="mt-2 text-xs text-muted-foreground hidden">
          <div>Datos recopilados: {JSON.stringify(collectedData)}</div>
          <div>Campos faltantes: {missingFields.join(', ')}</div>
        </div>
      </div>
    </div>
  );
};

export default ChatAssistant;