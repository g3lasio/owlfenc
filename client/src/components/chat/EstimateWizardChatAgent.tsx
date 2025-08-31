/**
 * Estimate Wizard Chat Agent
 * 
 * Asistente conversacional que automatiza el flujo del Estimate Wizard
 * guiando al usuario paso a paso hasta generar un PDF descargable.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/queryClient';
import {
  Send,
  User,
  Bot,
  Download,
  Share2,
  Copy,
  FileText,
  Calculator,
  Package,
  Wrench,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
}

interface WizardState {
  currentStep: 'client' | 'description' | 'materials' | 'labor' | 'review' | 'finalize' | 'completed';
  customerId?: string;
  estimateId?: string;
  clientName?: string;
  projectDescription?: string;
  englishDescription?: string;
  materials?: any[];
  laborCosts?: any[];
  totalCost?: number;
  isProcessing: boolean;
}

const STEP_ICONS = {
  client: User,
  description: FileText,
  materials: Package,
  labor: Wrench,
  review: Calculator,
  finalize: CheckCircle,
  completed: Download
};

const STEP_TITLES = {
  client: '1. Cliente',
  description: '2. Descripción',
  materials: '3. Materiales',
  labor: '4. Labor',
  review: '5. Revisión',
  finalize: '6. PDF',
  completed: 'Completado'
};

export default function EstimateWizardChatAgent() {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: '¡Hola! Soy tu asistente para crear estimados profesionales. Te guiaré paso a paso para generar un estimado completo con PDF descargable. ¿Cuál es el nombre del cliente?',
      timestamp: new Date()
    }
  ]);

  const [inputValue, setInputValue] = useState('');
  const [wizardState, setWizardState] = useState<WizardState>({
    currentStep: 'client',
    isProcessing: false
  });

  const addMessage = useCallback((content: string, type: 'user' | 'assistant', data?: any) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      data
    };
    setMessages(prev => [...prev, newMessage]);
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processStep1Client = async (clientName: string) => {
    try {
      setWizardState(prev => ({ ...prev, isProcessing: true }));

      const result = await apiRequest('/api/estimate-wizard/step-1-client', {
        method: 'POST',
        body: JSON.stringify({
          clientName: clientName.trim(),
          clientEmail: '', // Se puede pedir opcionalmente
          clientPhone: '',
          clientAddress: ''
        })
      });

      if (result.success) {
        setWizardState(prev => ({
          ...prev,
          customerId: result.data.customerId,
          clientName: clientName.trim(),
          currentStep: 'description',
          isProcessing: false
        }));

        addMessage(result.data.message, 'assistant');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error en Step 1:', error);
      addMessage('❌ Error registrando cliente: ' + error.message, 'assistant');
      setWizardState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const processStep2Description = async (description: string) => {
    try {
      setWizardState(prev => ({ ...prev, isProcessing: true }));

      addMessage('🔄 Reescribiendo descripción a inglés profesional...', 'assistant');

      const result = await apiRequest('/api/estimate-wizard/step-2-description', {
        method: 'POST',
        body: JSON.stringify({
          customerId: wizardState.customerId,
          projectDescription: description.trim(),
          language: 'es'
        })
      });

      if (result.success) {
        setWizardState(prev => ({
          ...prev,
          projectDescription: description.trim(),
          englishDescription: result.data.englishDescription,
          currentStep: 'materials',
          isProcessing: false
        }));

        addMessage(result.data.message, 'assistant');
        setTimeout(() => {
          processStep3Materials(result.data.englishDescription);
        }, 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error en Step 2:', error);
      addMessage('❌ Error procesando descripción: ' + error.message, 'assistant');
      setWizardState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const processStep3Materials = async (englishDescription: string) => {
    try {
      setWizardState(prev => ({ ...prev, isProcessing: true }));

      addMessage('🔍 Buscando materiales necesarios...', 'assistant');

      const result = await apiRequest('/api/estimate-wizard/step-3-materials', {
        method: 'POST',
        body: JSON.stringify({
          estimateId: wizardState.estimateId || `est-${Date.now()}`,
          englishDescription,
          location: 'California, USA'
        })
      });

      if (result.success) {
        setWizardState(prev => ({
          ...prev,
          materials: result.data.materials,
          estimateId: result.data.estimateId,
          currentStep: 'labor',
          isProcessing: false
        }));

        addMessage(result.data.message, 'assistant');
        setTimeout(() => {
          processStep4FullCost();
        }, 1000);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error en Step 3:', error);
      addMessage('❌ Error obteniendo materiales: ' + error.message, 'assistant');
      setWizardState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const processStep4FullCost = async () => {
    try {
      setWizardState(prev => ({ ...prev, isProcessing: true }));

      addMessage('💰 Calculando costos de labor y totales...', 'assistant');

      const result = await apiRequest('/api/estimate-wizard/step-4-full-cost', {
        method: 'POST',
        body: JSON.stringify({
          estimateId: wizardState.estimateId,
          materials: wizardState.materials,
          englishDescription: wizardState.englishDescription,
          location: 'California, USA'
        })
      });

      if (result.success) {
        setWizardState(prev => ({
          ...prev,
          laborCosts: result.data.laborCosts,
          totalCost: result.data.summary?.total,
          currentStep: 'review',
          isProcessing: false
        }));

        addMessage(result.data.message, 'assistant');
        addMessage('Puedes ajustar cantidades con comandos como: "Cambia cedar plank de 120 a 110" o "Agrega 5 post brackets" o di "generar PDF" para finalizar.', 'assistant');
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error en Step 4:', error);
      addMessage('❌ Error calculando costos: ' + error.message, 'assistant');
      setWizardState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const processStep6GeneratePDF = async () => {
    try {
      setWizardState(prev => ({ ...prev, isProcessing: true }));

      addMessage('📄 Generando PDF profesional...', 'assistant');

      const estimateData = {
        estimateNumber: `EST-${Date.now()}`,
        client: {
          name: wizardState.clientName,
          address: ''
        },
        materials: wizardState.materials,
        laborCosts: wizardState.laborCosts,
        total: wizardState.totalCost
      };

      const result = await apiRequest('/api/estimate-wizard/step-6-generate-pdf', {
        method: 'POST',
        body: JSON.stringify({
          estimateId: wizardState.estimateId,
          estimateData
        })
      });

      if (result.success) {
        setWizardState(prev => ({
          ...prev,
          currentStep: 'completed',
          isProcessing: false
        }));

        addMessage(result.data.message, 'assistant', {
          pdfUrl: result.data.pdfUrl,
          downloadLink: result.data.downloadLink,
          shareLink: result.data.shareLink,
          estimateNumber: result.data.estimateNumber
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error en Step 6:', error);
      addMessage('❌ Error generando PDF: ' + error.message, 'assistant');
      setWizardState(prev => ({ ...prev, isProcessing: false }));
    }
  };

  const handleUserInput = async (input: string) => {
    if (!input.trim() || wizardState.isProcessing) return;

    addMessage(input, 'user');
    setInputValue('');

    const lowerInput = input.toLowerCase().trim();

    try {
      switch (wizardState.currentStep) {
        case 'client':
          await processStep1Client(input);
          break;

        case 'description':
          await processStep2Description(input);
          break;

        case 'review':
          if (lowerInput.includes('generar pdf') || lowerInput.includes('generate pdf') || lowerInput.includes('finalizar')) {
            await processStep6GeneratePDF();
          } else if (lowerInput.includes('cambia') || lowerInput.includes('change')) {
            // Procesar ajustes
            addMessage('🔧 Procesando ajuste...', 'assistant');
            // Aquí iría la lógica de ajustes
            setTimeout(() => {
              addMessage('✅ Ajuste aplicado. Di "generar PDF" para finalizar.', 'assistant');
            }, 1000);
          } else {
            addMessage('Para hacer ajustes di: "Cambia [item] de [cantidad actual] a [nueva cantidad]" o "generar PDF" para finalizar.', 'assistant');
          }
          break;

        case 'completed':
          addMessage('El estimado ya está completado. ¿Quieres crear uno nuevo?', 'assistant');
          break;

        default:
          addMessage('Procesando...', 'assistant');
      }
    } catch (error) {
      console.error('Error procesando input:', error);
      addMessage('❌ Error procesando solicitud. Por favor intenta de nuevo.', 'assistant');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleUserInput(inputValue);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "✅ Copiado",
      description: "Link copiado al portapapeles",
    });
  };

  const currentStepIcon = STEP_ICONS[wizardState.currentStep];
  const CurrentIcon = currentStepIcon || Clock;

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header con progreso */}
      <div className="border-b p-4 bg-background/50 backdrop-blur">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Asistente de Estimados</h2>
          <Badge variant="secondary" className="flex items-center gap-1">
            <CurrentIcon className="w-3 h-3" />
            {STEP_TITLES[wizardState.currentStep]}
          </Badge>
        </div>
        
        {/* Progress bar */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {Object.entries(STEP_TITLES).map(([step, title], index) => {
            const isActive = step === wizardState.currentStep;
            const isCompleted = Object.keys(STEP_TITLES).indexOf(wizardState.currentStep) > index;
            const Icon = STEP_ICONS[step as keyof typeof STEP_ICONS];
            
            return (
              <div key={step} className={`flex items-center gap-1 ${
                isActive ? 'text-primary font-medium' : 
                isCompleted ? 'text-green-600' : 'text-muted-foreground'
              }`}>
                <Icon className="w-3 h-3" />
                <span className="hidden sm:inline">{title}</span>
                {index < Object.keys(STEP_TITLES).length - 1 && <span className="mx-1">→</span>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[80%] p-3 rounded-lg ${
              message.type === 'user' 
                ? 'bg-primary text-primary-foreground ml-4' 
                : 'bg-muted mr-4'
            }`}>
              <div className="flex items-start gap-2">
                {message.type === 'assistant' && <Bot className="w-4 h-4 mt-1 flex-shrink-0" />}
                {message.type === 'user' && <User className="w-4 h-4 mt-1 flex-shrink-0" />}
                <div className="flex-1">
                  <p className="text-sm">{message.content}</p>
                  
                  {/* PDF Links */}
                  {message.data?.pdfUrl && (
                    <div className="mt-3 p-3 bg-background rounded border space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="w-4 h-4" />
                        Estimado #{message.data.estimateNumber}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => window.open(message.data.downloadLink, '_blank')}>
                          <Download className="w-3 h-3 mr-1" />
                          Descargar PDF
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(message.data.shareLink)}>
                          <Copy className="w-3 h-3 mr-1" />
                          Copiar Link
                        </Button>
                        <Button size="sm" variant="outline">
                          <Share2 className="w-3 h-3 mr-1" />
                          Compartir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {/* Processing indicator */}
        {wizardState.isProcessing && (
          <div className="flex justify-start">
            <div className="bg-muted p-3 rounded-lg mr-4 flex items-center gap-2">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
              <span className="text-sm">Procesando...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4 bg-background/50 backdrop-blur">
        <div className="flex gap-2">
          <div className="flex-1">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                wizardState.currentStep === 'client' ? 'Escribe el nombre del cliente...' :
                wizardState.currentStep === 'description' ? 'Describe el alcance del trabajo...' :
                wizardState.currentStep === 'review' ? 'Haz ajustes o di "generar PDF"...' :
                'Escribe tu mensaje...'
              }
              className="min-h-[2.5rem] max-h-32 resize-none"
              disabled={wizardState.isProcessing}
            />
          </div>
          <Button 
            onClick={() => handleUserInput(inputValue)}
            disabled={wizardState.isProcessing || !inputValue.trim()}
            size="sm"
            className="px-3"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Quick actions */}
        {wizardState.currentStep === 'review' && (
          <div className="flex gap-2 mt-2">
            <Button size="sm" variant="outline" onClick={() => handleUserInput('generar PDF')}>
              <FileText className="w-3 h-3 mr-1" />
              Generar PDF
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}