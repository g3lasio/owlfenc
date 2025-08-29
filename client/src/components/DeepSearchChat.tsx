/**
 * DEEPSEARCH CHAT INTERACTIVO
 * 
 * Sistema de chat para refinamiento en tiempo real de resultados DeepSearch.
 * Permite a los contratistas hacer ajustes específicos, pedir mayor precisión,
 * y obtener mejores resultados adaptados a sus necesidades exactas.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Send, MessageCircle, Zap, DollarSign, Package, AlertCircle, CheckCircle2, Loader2, RefreshCw, Target, Plus } from 'lucide-react';
import Anthropic from '@anthropic-ai/sdk';

interface DeepSearchResult {
  projectType: string;
  projectScope: string;
  materials: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    totalPrice: number;
    supplier?: string;
    specifications?: string;
  }>;
  laborCosts: Array<{
    category: string;
    description: string;
    hours: number;
    rate: number;
    total: number;
  }>;
  additionalCosts: Array<{
    category: string;
    description: string;
    cost: number;
    required: boolean;
  }>;
  totalMaterialsCost: number;
  totalLaborCost: number;
  totalAdditionalCost: number;
  grandTotal: number;
  confidence: number;
  recommendations: string[];
  warnings: string[];
  location?: string;
}

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  suggestedActions?: string[];
}

interface DeepSearchChatProps {
  initialResult: DeepSearchResult;
  projectDescription: string;
  location?: string;
  onResultsUpdated: (updatedResult: DeepSearchResult) => void;
  onApplyChanges: () => void;
}

export function DeepSearchChat({ 
  initialResult, 
  projectDescription, 
  location,
  onResultsUpdated,
  onApplyChanges
}: DeepSearchChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResult, setCurrentResult] = useState<DeepSearchResult>(initialResult);
  const [hasChanges, setHasChanges] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Scroll automático al final
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mensaje de bienvenida cuando se abre el chat
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        content: `¡Hola! Soy tu asistente de DeepSearch. He analizado tu proyecto y generé **${currentResult.materials.length} materiales** por un total de **$${currentResult.grandTotal.toFixed(2)}**.

🎯 **¿Cómo puedo ayudarte a mejorar este estimado?**

Puedes pedirme:
• "Necesito más precisión en los costos de labor"
• "Los precios parecen altos para mi zona"
• "Falta incluir [material específico]"
• "Quiero ver alternativas más económicas"
• "Cambia la cantidad de [material] a [nueva cantidad]"

¿Qué te gustaría ajustar?`,
        sender: 'assistant',
        timestamp: new Date(),
        suggestedActions: [
          'Revisar precios de labor',
          'Agregar material faltante',
          'Buscar alternativas económicas',
          'Ajustar cantidades',
          'Verificar para mi ubicación'
        ]
      };
      setMessages([welcomeMessage]);
    }
  }, [isOpen, currentResult]);

  // Enviar mensaje
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsProcessing(true);

    try {
      await processUserRequest(userMessage.content);
    } catch (error) {
      console.error('Error processing chat message:', error);
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        content: `❌ **Error procesando tu solicitud**\n\n${(error as Error).message}\n\nPor favor intenta de nuevo o reformula tu pregunta.`,
        sender: 'assistant',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      toast({
        title: 'Error',
        description: 'No pude procesar tu solicitud. Inténtalo de nuevo.',
        variant: 'destructive'
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Procesar solicitud del usuario
  const processUserRequest = async (userInput: string) => {
    console.log('🔍 [DEEPSEARCH-CHAT] Procesando solicitud:', userInput);

    // Mensaje de procesando
    const processingMessage: ChatMessage = {
      id: `processing_${Date.now()}`,
      content: '🤔 **Analizando tu solicitud...**\n\nEstoy revisando el estimado para hacer los ajustes que necesitas.',
      sender: 'assistant',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, processingMessage]);

    try {
      // Llamar al endpoint de refinamiento de DeepSearch
      const response = await fetch('/api/deepsearch/refine', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userRequest: userInput,
          currentResult: currentResult,
          projectDescription,
          location,
          conversationHistory: messages.filter(m => m.sender === 'user').map(m => m.content)
        })
      });

      if (!response.ok) {
        throw new Error('Error al procesar la solicitud de refinamiento');
      }

      const result = await response.json();
      
      // Remover mensaje de procesando
      setMessages(prev => prev.filter(m => m.id !== processingMessage.id));

      if (result.success) {
        console.log("🤖 [AI-REFINEMENT] Respuesta recibida:", result);
        
        // Siempre marcar como que hay cambios después de una conversación exitosa
        setHasChanges(true);
        
        // Actualizar resultado si viene específicamente un resultado actualizado
        if (result.updatedResult) {
          console.log("🔄 [AI-REFINEMENT] Actualizando resultado:", result.updatedResult);
          setCurrentResult(result.updatedResult);
        }

        // Agregar respuesta del asistente
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}`,
          content: result.response,
          sender: 'assistant',
          timestamp: new Date(),
          suggestedActions: result.suggestedActions || []
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Toast informativo 
        toast({
          title: 'Refinamiento completado',
          description: 'Haz clic en "Aplicar Cambios" para actualizar tu estimado.',
          duration: 4000
        });

      } else {
        throw new Error(result.error || 'Error desconocido');
      }

    } catch (error) {
      // Remover mensaje de procesando en caso de error
      setMessages(prev => prev.filter(m => m.id !== processingMessage.id));
      throw error;
    }
  };

  // Manejar acción sugerida
  const handleSuggestedAction = (action: string) => {
    setInputValue(action);
    inputRef.current?.focus();
  };

  // Manejar tecla Enter
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Aplicar cambios al estimado principal
  const handleApplyChanges = () => {
    // Aplicar los cambios actualizados al estimado principal
    if (currentResult && onResultsUpdated) {
      onResultsUpdated(currentResult);
    }
    
    // Llamar callback adicional si existe
    if (onApplyChanges) {
      onApplyChanges();
    }
    
    toast({
      title: 'Cambios aplicados exitosamente',
      description: 'El estimado ha sido actualizado con los refinamientos de IA.',
      duration: 3000
    });
    
    // Cerrar el chat automáticamente
    setIsOpen(false);
    setHasChanges(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 hover:from-purple-100 hover:to-blue-100 text-purple-700 hover:text-purple-800"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Refinar con Chat IA
          {hasChanges && (
            <Badge className="ml-2 bg-orange-500 text-white">
              Actualizado
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[98vw] sm:max-w-5xl lg:max-w-6xl h-[95vh] sm:h-[90vh] flex flex-col p-3 sm:p-6">
        <DialogHeader className="flex-shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2 text-slate-800">
            <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />
            <span className="text-base sm:text-lg">Chat IA de Refinamiento</span>
          </DialogTitle>
          <DialogDescription className="text-slate-600 text-sm">
            Refina tu estimado conversando con la IA
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Área de mensajes */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-gradient-to-b from-slate-50 to-slate-100 rounded-lg space-y-3 border border-slate-200 min-h-0">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] sm:max-w-[80%] rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base ${
                      message.sender === 'user'
                        ? 'bg-purple-600 text-white shadow-lg'
                        : 'bg-white text-slate-800 shadow-md border border-slate-300'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {message.content.split('\n').map((line, index) => (
                        <div key={index}>
                          {formatMessageLine(line)}
                        </div>
                      ))}
                    </div>
                    
                    {/* Botón aplicar cambios - SOLO para mensajes de IA que proponen cambios */}
                    {message.sender === 'assistant' && hasChanges && (
                      <div className="mt-3">
                        <button
                          onClick={handleApplyChanges}
                          className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors border border-green-300"
                        >
                          ✅ Aplicar cambios y cerrar
                        </button>
                      </div>
                    )}
                    
                    {/* Acciones sugeridas */}
                    {message.suggestedActions && message.suggestedActions.length > 0 && (
                      <div className="mt-2 sm:mt-3 flex flex-wrap gap-1">
                        {message.suggestedActions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestedAction(action)}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors border border-purple-200"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className={`text-xs mt-1 sm:mt-2 opacity-70 ${message.sender === 'user' ? 'text-purple-100' : 'text-slate-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-blue-50 text-blue-800 shadow-md border border-blue-200 rounded-lg px-3 sm:px-4 py-2 sm:py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm sm:text-base">Analizando y procesando...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Área de input */}
            <div className="flex-shrink-0 mt-3 bg-white rounded-lg border border-slate-300 p-3 shadow-sm">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ej: 'Los precios parecen altos para mi zona' o 'Cambia cantidad de postes a 15'"
                    className="w-full resize-none border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-slate-800 bg-white placeholder-slate-500 text-sm sm:text-base"
                    rows={2}
                    maxLength={500}
                    disabled={isProcessing}
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isProcessing}
                  className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg flex-shrink-0"
                  size="sm"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex justify-between items-center mt-2 text-xs text-slate-600">
                <span className="hidden sm:inline">Enter para enviar • Shift+Enter para nueva línea</span>
                <span className="sm:hidden">Enter: enviar</span>
                <span className="text-slate-500">{inputValue.length}/500</span>
              </div>
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}

// Utilidad para formatear líneas de mensaje
const formatMessageLine = (line: string) => {
  // Formatear texto en negrita
  if (line.includes('**')) {
    const parts = line.split('**');
    return (
      <>
        {parts.map((part, index) => 
          index % 2 === 0 ? part : <strong key={index}>{part}</strong>
        )}
      </>
    );
  }
  
  // Formatear listas con •
  if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
    return <div className="ml-4">{line}</div>;
  }
  
  return line;
};