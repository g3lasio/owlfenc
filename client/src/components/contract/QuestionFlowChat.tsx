import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, User, Upload, Calendar, Check, ListChecks } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Question, 
  getNextQuestion, 
  formatAnswersForContract, 
  mapFormDataToContractForm 
} from "@/services/contractQuestionService";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";

interface ChatMessage {
  role: 'assistant' | 'user';
  content: string;
  timestamp: Date;
  questionId?: string;
}

interface QuestionFlowChatProps {
  initialData?: Record<string, any>;
  onComplete: (data: Record<string, any>) => void;
  onFileUpload?: (file: File) => void;
}

const QuestionFlowChat: React.FC<QuestionFlowChatProps> = ({ 
  initialData = {}, 
  onComplete,
  onFileUpload
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Inicializar el flujo de preguntas
  useEffect(() => {
    if (messages.length === 0) {
      // Mensaje de bienvenida
      setMessages([
        {
          role: 'assistant',
          content: '¡Hola! Estás en el asistente de Flujo Guiado. Te haré una serie de preguntas específicas en orden para recopilar toda la información necesaria para tu contrato de cerca. Responde a cada pregunta para avanzar al siguiente paso.',
          timestamp: new Date()
        }
      ]);

      // Cargar la primera pregunta
      const firstQuestion = getNextQuestion(null, {});
      if (firstQuestion) {
        setTimeout(() => {
          setCurrentQuestion(firstQuestion);
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: firstQuestion.prompt,
            timestamp: new Date(),
            questionId: firstQuestion.id
          }]);
        }, 1000);
      }
    }
  }, []);

  // Auto-scroll al último mensaje
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Procesar la respuesta y avanzar a la siguiente pregunta
  const processAnswer = (answer: string, questionId: string) => {
    if (!currentQuestion) return;

    // Guardar la respuesta
    const updatedAnswers = { ...answers };
    updatedAnswers[currentQuestion.field] = answer;
    setAnswers(updatedAnswers);

    // Conseguir la siguiente pregunta
    const nextQuestion = getNextQuestion(questionId, updatedAnswers);

    // Si hay más preguntas, mostrarla
    if (nextQuestion) {
      setCurrentQuestion(nextQuestion);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: nextQuestion.prompt,
          timestamp: new Date(),
          questionId: nextQuestion.id
        }]);
      }, 600);
    } else {
      // Finalizar el flujo
      const formattedData = formatAnswersForContract(updatedAnswers);
      const formData = mapFormDataToContractForm(formattedData);
      
      // Avisar que se ha terminado
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: '¡Perfecto! He recopilado toda la información necesaria para generar tu contrato. Puedes revisarla antes de continuar.',
          timestamp: new Date()
        }]);
        
        onComplete(formData);
      }, 800);
    }
  };

  // Manejar el envío de mensajes
  const handleSendMessage = () => {
    if (!input.trim() || !currentQuestion) return;

    // Añadir respuesta del usuario
    setMessages(prev => [...prev, {
      role: 'user',
      content: input,
      timestamp: new Date()
    }]);

    // Guardar la respuesta y avanzar
    const currentQuestionId = currentQuestion.id;
    processAnswer(input, currentQuestionId);
    
    // Limpiar el input
    setInput('');
  };

  // Manejar respuestas para preguntas de opción múltiple
  const handleSelectOption = (value: string) => {
    if (!currentQuestion) return;

    // Añadir respuesta del usuario
    setMessages(prev => [...prev, {
      role: 'user',
      content: value,
      timestamp: new Date()
    }]);

    // Guardar la respuesta y avanzar
    const currentQuestionId = currentQuestion.id;
    processAnswer(value, currentQuestionId);
  };

  // Manejar entrada de teclas
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Manejar subida de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onFileUpload) {
      onFileUpload(e.target.files[0]);
      
      // Añadir mensaje indicando que se está procesando el archivo
      setMessages(prev => [...prev, 
        {
          role: 'user',
          content: `He subido un archivo: ${e.target.files?.[0].name}`,
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: 'Estoy procesando el archivo para extraer la información necesaria. Esto podría tomar un momento...',
          timestamp: new Date()
        }
      ]);
    }
  };

  // Renderizar el control de entrada adecuado según el tipo de pregunta
  const renderInputControl = () => {
    if (!currentQuestion) return null;

    switch (currentQuestion.type) {
      case 'multiline':
        return (
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu respuesta..."
            className="flex-1 resize-none h-24"
          />
        );
      
      case 'choice':
        return (
          <div className="flex flex-col w-full space-y-2">
            <Select onValueChange={handleSelectOption}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {currentQuestion.options?.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );
      
      case 'date':
        return (
          <div className="flex w-full space-x-2">
            <Input
              type="date"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!input} type="button">
              <Calendar className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </div>
        );
      
      case 'number':
        return (
          <div className="flex w-full space-x-2">
            <Input
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ingresa un número..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!input} type="button">
              <Check className="h-4 w-4 mr-2" />
              Confirmar
            </Button>
          </div>
        );
      
      default:
        return (
          <div className="flex w-full space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu respuesta..."
              className="flex-1"
            />
            <Button onClick={handleSendMessage} disabled={!input} type="button" size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-[500px] border rounded-lg">
      <div className="p-3 border-b bg-primary/10">
        <h3 className="text-lg font-medium flex items-center">
          <ListChecks className="mr-2 h-5 w-5 text-primary" />
          Asistente de Contratos - Flujo Guiado
        </h3>
        <p className="text-xs text-muted-foreground">Responde a cada pregunta en orden para completar tu contrato</p>
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
        {/* Botón de cargar archivo, solo visible si hay función de carga */}
        {onFileUpload && (
          <div className="mb-2 flex justify-center">
            <input
              type="file"
              id="chat-file-upload"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            <label htmlFor="chat-file-upload">
              <Button type="button" variant="outline" className="flex items-center">
                <Upload className="h-4 w-4 mr-2" />
                Subir PDF de estimado
              </Button>
            </label>
          </div>
        )}
        
        {/* Control de entrada según el tipo de pregunta actual */}
        {renderInputControl()}
      </div>
    </div>
  );
};

export default QuestionFlowChat;