import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  FastForward, 
  Upload, 
  Building2, 
  Mail, 
  Phone, 
  MapPin,
  User,
  Zap,
  CheckCircle,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  type: 'mervin' | 'user' | 'system';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  requiresInput?: 'text' | 'selection' | 'file' | 'email' | 'phone';
  inputPlaceholder?: string;
}

interface CompanyProfile {
  companyName: string;
  address: string;
  phone: string;
  email: string;
  logo?: File;
  businessType: string;
  projectVolume: string;
  mainChallenge: string;
}

const ChatOnboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>({
    companyName: '',
    address: '',
    phone: '',
    email: currentUser?.email || '',
    businessType: '',
    projectVolume: '',
    mainChallenge: ''
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'amigo';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Conversación progresiva con Mervin
  const conversationFlow = [
    {
      message: `¡Hola ${userName}! 🦉 Soy Mervin, tu asistente inteligente de Owl Fenc. \n\nEstoy súper emocionado de conocerte y ayudarte a revolucionar tu negocio. Tengo algunas preguntas rápidas para personalizar tu experiencia.\n\n¿Empezamos? Te prometo que será divertido 😊`,
      suggestions: ['¡Claro, empecemos!', 'Tengo prisa, ¿puedo saltarme esto?'],
      requiresInput: 'selection' as const
    },
    {
      message: `Perfecto, ${userName}! 🎯\n\nPrimero, cuéntame: **¿Qué tipo de trabajos haces principalmente?**\n\nEsto me ayudará a configurar las herramientas perfectas para ti.`,
      suggestions: [
        '🏗️ Cercas y decoración exterior',
        '🏠 Techos y reparaciones', 
        '🔨 Construcción general',
        '🎨 Remodelaciones interiores',
        '⚡ Múltiples especialidades'
      ],
      requiresInput: 'selection' as const
    },
    {
      message: `¡Excelente elección! 💪\n\n**¿Aproximadamente cuántos proyectos manejas por mes?**\n\nEsto me ayuda a ajustar las funciones según tu volumen de trabajo.`,
      suggestions: [
        '1-5 proyectos (empezando)',
        '6-15 proyectos (creciendo)', 
        '16-30 proyectos (establecido)',
        '30+ proyectos (empresa grande)'
      ],
      requiresInput: 'selection' as const
    },
    {
      message: `Entendido! 🎯\n\n**¿Cuál dirías que es tu mayor reto actualmente?**\n\nQuiero asegurarme de que Owl Fenc resuelva exactamente lo que necesitas.`,
      suggestions: [
        '📊 Crear estimados profesionales',
        '🎯 Conseguir más clientes',
        '💰 Gestionar pagos y contratos',
        '📋 Organizar mis proyectos',
        '🚀 Todo lo anterior'
      ],
      requiresInput: 'selection' as const
    },
    {
      message: `¡Perfecto! Ya veo cómo ayudarte mejor 🔥\n\nAhora, configuremos tu **perfil empresarial**. Esta información aparecerá en tus estimados y contratos profesionales, así que tus clientes verán que eres totalmente legítimo.\n\n**¿Cuál es el nombre de tu empresa?**`,
      requiresInput: 'text' as const,
      inputPlaceholder: 'Ej: Construcciones García, ABC Roofing, etc.'
    },
    {
      message: `¡${companyProfile.companyName} suena increíble! 🏢\n\n**¿Cuál es la dirección de tu empresa?**\n\nEsta aparecerá en tus documentos oficiales para generar confianza con los clientes.`,
      requiresInput: 'text' as const,
      inputPlaceholder: 'Ej: 123 Main St, Ciudad, Estado 12345'
    },
    {
      message: `Perfecto! 📍\n\n**¿Cuál es tu número de teléfono comercial?**\n\nTus clientes lo verán en estimados y contratos para contactarte fácilmente.`,
      requiresInput: 'phone' as const,
      inputPlaceholder: 'Ej: (555) 123-4567'
    },
    {
      message: `¡Excelente! 📞\n\n**¿Quieres subir el logo de tu empresa?** (Opcional)\n\nSi tienes uno, aparecerá en todos tus documentos. Si no, no te preocupes - puedes agregarlo después.`,
      suggestions: ['📷 Subir logo', '⏭️ Saltear por ahora'],
      requiresInput: 'selection' as const
    },
    {
      message: `¡Increíble, ${userName}! 🎉\n\nYa tienes todo configurado. Te he activado un **Trial Master por 21 días** con acceso COMPLETO a todas las funciones premium.\n\n✅ Sin marcas de agua\n✅ Estimados ilimitados con IA\n✅ Contratos profesionales\n✅ Mervin AI avanzado\n✅ Y mucho más...\n\n**¿Listo para crear tu primer estimado profesional?**`,
      suggestions: ['🚀 ¡Sí, empecemos!', '📊 Ver mi dashboard'],
      requiresInput: 'selection' as const
    }
  ];

  const addMessage = (content: string, type: 'mervin' | 'user' | 'system' = 'mervin', suggestions?: string[], requiresInput?: Message['requiresInput'], inputPlaceholder?: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      suggestions,
      requiresInput,
      inputPlaceholder
    };
    setMessages(prev => [...prev, message]);
  };

  const generateAIResponse = async (userInput: string, context: string): Promise<string> => {
    try {
      const response = await fetch('/api/openai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `Eres Mervin, el asistente AI amigable y profesional de Owl Fenc. Estás ayudando a ${userName} a configurar su perfil empresarial durante el onboarding. 

PERSONALIDAD:
- Entusiasta pero profesional
- Usa emojis moderadamente  
- Habla en español
- Mantén respuestas entre 1-3 oraciones
- Sé encouraging y motivador

CONTEXTO ACTUAL: ${context}

INSTRUCCIONES:
- Si es una respuesta positiva, celebra y continúa
- Si detectas dudas, ofrece ayuda adicional
- Mantén el enfoque en el onboarding
- No hagas preguntas múltiples, una cosa a la vez`
            },
            {
              role: 'user', 
              content: userInput
            }
          ]
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.message || data.content;
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
    }
    
    // Fallback a respuestas predefinidas si falla la AI
    return "¡Perfecto! Continuemos con el siguiente paso. 🚀";
  };

  const simulateTyping = async (message: string, suggestions?: string[], requiresInput?: Message['requiresInput'], inputPlaceholder?: string, useAI?: boolean, userInput?: string) => {
    setIsTyping(true);
    
    let finalMessage = message;
    
    // Usar AI para respuestas más naturales si está habilitado
    if (useAI && userInput) {
      const contextMap = [
        "onboarding inicial",
        "tipo de negocio", 
        "volumen de proyectos",
        "retos principales",
        "configuración de empresa",
        "dirección de empresa", 
        "teléfono de empresa",
        "logo de empresa",
        "finalización de onboarding"
      ];
      
      const aiResponse = await generateAIResponse(userInput, contextMap[currentStep] || "onboarding");
      if (aiResponse) {
        finalMessage = aiResponse;
      }
    }
    
    // Simular tiempo de escritura basado en longitud del mensaje
    const typingTime = Math.min(Math.max(finalMessage.length * 30, 1000), 3000);
    
    await new Promise(resolve => setTimeout(resolve, typingTime));
    
    setIsTyping(false);
    addMessage(finalMessage, 'mervin', suggestions, requiresInput, inputPlaceholder);
  };

  const handleUserResponse = async (response: string) => {
    // Agregar respuesta del usuario
    addMessage(response, 'user');
    
    // Actualizar datos del perfil según el paso
    const updatedProfile = { ...companyProfile };
    
    switch(currentStep) {
      case 1: // Tipo de negocio
        updatedProfile.businessType = response;
        break;
      case 2: // Volumen de proyectos
        updatedProfile.projectVolume = response;
        break;
      case 3: // Reto principal
        updatedProfile.mainChallenge = response;
        break;
      case 4: // Nombre de empresa
        updatedProfile.companyName = response;
        break;
      case 5: // Dirección
        updatedProfile.address = response;
        break;
      case 6: // Teléfono
        updatedProfile.phone = response;
        break;
    }
    
    setCompanyProfile(updatedProfile);
    setCurrentInput('');
    
    // Avanzar al siguiente paso
    const nextStep = currentStep + 1;
    setCurrentStep(nextStep);
    
    if (nextStep < conversationFlow.length) {
      // Procesar mensaje dinámico
      let nextMessage = conversationFlow[nextStep].message;
      if (nextStep === 5 && updatedProfile.companyName) {
        nextMessage = nextMessage.replace('${companyProfile.companyName}', updatedProfile.companyName);
      }
      
      // Usar AI para respuestas más naturales después del paso 1
      const useAI = nextStep > 1;
      
      await simulateTyping(
        nextMessage,
        conversationFlow[nextStep].suggestions,
        conversationFlow[nextStep].requiresInput,
        conversationFlow[nextStep].inputPlaceholder,
        useAI,
        response
      );
    } else {
      // Onboarding completo
      await completeOnboarding(updatedProfile);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion.includes('saltarme') || suggestion.includes('Saltear')) {
      handleSkip();
    } else if (suggestion.includes('Subir logo')) {
      fileInputRef.current?.click();
    } else if (suggestion.includes('dashboard')) {
      onComplete();
    } else if (suggestion.includes('empecemos')) {
      // Crear primer estimado o ir a dashboard
      onComplete();
    } else {
      handleUserResponse(suggestion);
    }
  };

  const handleSkip = async () => {
    addMessage('⏭️ Saltear este paso', 'user');
    
    toast({
      title: "Paso omitido",
      description: "Puedes completar tu perfil después en Configuración",
    });
    
    // Activar trial automáticamente y completar
    await activateTrial();
    onComplete();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCompanyProfile(prev => ({ ...prev, logo: file }));
      addMessage(`📷 Logo subido: ${file.name}`, 'user');
      
      // Continuar al siguiente paso
      setCurrentStep(prev => prev + 1);
      if (currentStep + 1 < conversationFlow.length) {
        simulateTyping(
          conversationFlow[currentStep + 1].message,
          conversationFlow[currentStep + 1].suggestions,
          conversationFlow[currentStep + 1].requiresInput,
          conversationFlow[currentStep + 1].inputPlaceholder
        );
      }
    }
  };

  const activateTrial = async () => {
    try {
      // Activar trial automáticamente
      const token = await currentUser?.getIdToken();
      if (!token) {
        console.error('No auth token available');
        return;
      }
      
      const response = await fetch('/api/subscription/activate-trial', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          userId: currentUser?.uid,
          email: currentUser?.email 
        })
      });
      
      if (response.ok) {
        toast({
          title: "🎉 Trial activado",
          description: "Tienes 21 días de acceso completo a todas las funciones premium",
        });
      }
    } catch (error) {
      console.error('Error activating trial:', error);
    }
  };

  const completeOnboarding = async (profile: CompanyProfile) => {
    try {
      // Guardar perfil de empresa
      const formData = new FormData();
      Object.entries(profile).forEach(([key, value]) => {
        if (value) {
          if (key === 'logo' && value instanceof File) {
            formData.append(key, value);
          } else {
            formData.append(key, value.toString());
          }
        }
      });
      
      // Guardar perfil en el backend
      await fetch('/api/user/company-profile', { 
        method: 'POST', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: currentUser?.uid,
          ...profile
        })
      });
      
      await activateTrial();
      
      toast({
        title: "🎉 ¡Onboarding completado!",
        description: "Tu perfil está configurado y tu trial está activo",
      });
      
      // Pequeña pausa antes de completar
      setTimeout(() => {
        onComplete();
      }, 2000);
      
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Hubo un problema al configurar tu perfil",
      });
    }
  };

  const handleSendMessage = () => {
    if (currentInput.trim()) {
      handleUserResponse(currentInput.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Inicializar conversación
  useEffect(() => {
    const initConversation = async () => {
      await simulateTyping(
        conversationFlow[0].message,
        conversationFlow[0].suggestions,
        conversationFlow[0].requiresInput
      );
    };
    
    initConversation();
  }, []);

  const currentMessage = messages[messages.length - 1];
  const showInput = currentMessage?.requiresInput === 'text' || currentMessage?.requiresInput === 'phone' || currentMessage?.requiresInput === 'email';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6 border-cyan-200 bg-white/80 backdrop-blur">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 bg-gradient-to-r from-cyan-500 to-blue-600">
                  <AvatarFallback className="text-white font-bold text-lg">🦉</AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                    Configuración con Mervin AI
                  </h1>
                  <p className="text-gray-600">Personaliza tu experiencia en unos minutos</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-green-100 text-green-700 border-green-300">
                  <Zap className="h-3 w-3 mr-1" />
                  Trial Master Activado
                </Badge>
                <Button variant="outline" size="sm" onClick={handleSkip}>
                  <FastForward className="h-4 w-4 mr-2" />
                  Saltear Todo
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Chat Area */}
        <Card className="h-[600px] flex flex-col border-cyan-200 bg-white/90 backdrop-blur">
          <CardContent className="flex-1 p-6 overflow-auto">
            <div className="space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.type === 'mervin' && (
                    <Avatar className="h-8 w-8 bg-gradient-to-r from-cyan-500 to-blue-600 flex-shrink-0">
                      <AvatarFallback className="text-white text-sm">🦉</AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    message.type === 'user' 
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white ml-auto' 
                      : 'bg-white border border-gray-200 shadow-sm'
                  )}>
                    <div className="text-sm leading-relaxed whitespace-pre-line">
                      {message.content}
                    </div>
                    
                    {message.suggestions && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {message.suggestions.map((suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="text-xs hover:bg-cyan-50 hover:border-cyan-300"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {message.type === 'user' && (
                    <Avatar className="h-8 w-8 bg-gradient-to-r from-gray-400 to-gray-600 flex-shrink-0">
                      <AvatarFallback className="text-white text-sm">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3">
                  <Avatar className="h-8 w-8 bg-gradient-to-r from-cyan-500 to-blue-600">
                    <AvatarFallback className="text-white text-sm">🦉</AvatarFallback>
                  </Avatar>
                  <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </CardContent>
          
          {/* Input Area */}
          {showInput && (
            <div className="border-t bg-gray-50/80 p-4">
              <div className="flex gap-3">
                <Input
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={currentMessage?.inputPlaceholder || "Escribe tu respuesta..."}
                  className="flex-1"
                  disabled={isTyping}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={!currentInput.trim() || isTyping}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
        
        {/* Hidden file input for logo upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ChatOnboarding;