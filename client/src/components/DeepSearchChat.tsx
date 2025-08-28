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
        // Actualizar resultado si hay cambios
        if (result.updatedResult) {
          setCurrentResult(result.updatedResult);
          setHasChanges(true);
          onResultsUpdated(result.updatedResult);
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

        // Toast de éxito si hubo cambios
        if (result.updatedResult) {
          toast({
            title: 'Estimado actualizado',
            description: 'He aplicado los cambios solicitados al estimado.'
          });
        }

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
    onApplyChanges();
    toast({
      title: 'Cambios aplicados',
      description: 'Los refinamientos han sido aplicados al estimado principal.'
    });
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
      
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-purple-600" />
            DeepSearch Chat Interactivo
          </DialogTitle>
          <DialogDescription>
            Refina y ajusta tu estimado en tiempo real con IA conversacional
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-1 gap-4 min-h-[600px]">
          {/* Panel de chat */}
          <div className="flex-1 flex flex-col">
            {/* Área de mensajes */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50 rounded-lg space-y-4 max-h-[400px]">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
                      message.sender === 'user'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-slate-800 shadow-sm border border-slate-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">
                      {message.content.split('\n').map((line, index) => (
                        <div key={index}>
                          {formatMessageLine(line)}
                        </div>
                      ))}
                    </div>
                    
                    {/* Acciones sugeridas */}
                    {message.suggestedActions && message.suggestedActions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {message.suggestedActions.map((action, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestedAction(action)}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors"
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    <div className={`text-xs mt-2 opacity-70 ${message.sender === 'user' ? 'text-purple-100' : 'text-slate-500'}`}>
                      {message.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-800 shadow-sm border border-slate-200 rounded-lg px-4 py-3">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span>Analizando y procesando...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Área de input */}
            <div className="mt-4">
              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Describe qué quieres ajustar... (ej: 'Los precios de labor parecen altos para Texas')"
                    className="w-full resize-none border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                    maxLength={500}
                    disabled={isProcessing}
                  />
                </div>
                
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isProcessing}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              <div className="flex justify-between items-center mt-1 text-xs text-slate-500">
                <span>Enter para enviar • Shift+Enter para nueva línea</span>
                <span>{inputValue.length}/500</span>
              </div>
            </div>
          </div>

          {/* Panel de resumen actual */}
          <div className="w-80">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-purple-600" />
                  Estimado Actual
                  {hasChanges && (
                    <Badge className="bg-orange-500 text-white">
                      Actualizado
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resumen de materiales */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-1">
                      <Package className="h-4 w-4" />
                      Materiales
                    </span>
                    <Badge variant="outline">{currentResult.materials.length}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-lg">
                      {formatCurrency(currentResult.totalMaterialsCost)}
                    </span>
                  </div>
                </div>

                {/* Resumen de labor */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      Labor
                    </span>
                    <Badge variant="outline">{currentResult.laborCosts.length}</Badge>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-lg">
                      {formatCurrency(currentResult.totalLaborCost)}
                    </span>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold text-xl text-green-600">
                      {formatCurrency(currentResult.grandTotal)}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 text-right">
                    Confianza: {Math.round(currentResult.confidence * 100)}%
                  </div>
                </div>

                {/* Botón aplicar cambios */}
                {hasChanges && (
                  <Button 
                    onClick={handleApplyChanges}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Aplicar Cambios
                  </Button>
                )}
              </CardContent>
            </Card>
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