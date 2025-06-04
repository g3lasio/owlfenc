/**
 * Panel de Automatización con IA
 * Interfaz para configurar todo automáticamente
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Zap, Bot, Sparkles, ArrowRight, Clock } from "lucide-react";
import axios from 'axios';

interface AutomationResult {
  success: boolean;
  message: string;
  actions_taken: string[];
  next_steps?: string[];
  automated_config?: any;
}

export default function AIAutomationPanel() {
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationProgress, setAutomationProgress] = useState(0);
  const [automationResult, setAutomationResult] = useState<AutomationResult | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const { toast } = useToast();

  // Datos del usuario para automatización
  const [userInfo, setUserInfo] = useState({
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    businessType: 'contractor'
  });

  const handleAutoSetup = async () => {
    if (!userInfo.companyName || !userInfo.email) {
      toast({
        title: "Información requerida",
        description: "Por favor ingresa al menos el nombre de tu empresa y email.",
        variant: "destructive",
      });
      return;
    }

    setIsAutomating(true);
    setAutomationProgress(0);
    setAutomationResult(null);

    try {
      // Simular progreso de automatización
      const steps = [
        'Analizando información del negocio...',
        'Configurando email automáticamente...',
        'Configurando sistema de pagos...',
        'Generando plantillas profesionales...',
        'Optimizando configuraciones...',
        'Finalizando automatización...'
      ];

      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(steps[i]);
        setAutomationProgress(((i + 1) / steps.length) * 100);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Llamar al servicio de automatización
      const response = await axios.post('/api/ai-automation/auto-setup', userInfo);
      
      setAutomationResult(response.data);
      
      if (response.data.success) {
        toast({
          title: "Automatización completada",
          description: response.data.message,
        });
      } else {
        toast({
          title: "Error en automatización",
          description: response.data.message,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Error en automatización:', error);
      toast({
        title: "Error de conexión",
        description: "No se pudo completar la automatización.",
        variant: "destructive",
      });
    } finally {
      setIsAutomating(false);
      setCurrentStep('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Panel principal de automatización */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-100 border-blue-200">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl">Configuración Automática con IA</CardTitle>
              <CardDescription>
                Deja que la IA configure todo por ti en segundos
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAutomating && !automationResult && (
            <>
              <Alert>
                <Sparkles className="h-4 w-4" />
                <AlertDescription>
                  <strong>¿Cansado de configuraciones manuales?</strong> Nuestra IA puede configurar 
                  automáticamente tu email, pagos, plantillas y más en menos de 30 segundos.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de tu Empresa *</Label>
                  <Input
                    id="companyName"
                    value={userInfo.companyName}
                    onChange={(e) => setUserInfo({...userInfo, companyName: e.target.value})}
                    placeholder="Ej: ABC Construcciones"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Tu Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userInfo.email}
                    onChange={(e) => setUserInfo({...userInfo, email: e.target.value})}
                    placeholder="tu@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    value={userInfo.phone}
                    onChange={(e) => setUserInfo({...userInfo, phone: e.target.value})}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">Ciudad</Label>
                  <Input
                    id="city"
                    value={userInfo.city}
                    onChange={(e) => setUserInfo({...userInfo, city: e.target.value})}
                    placeholder="Tu ciudad"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button 
                  onClick={handleAutoSetup}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  size="lg"
                >
                  <Zap className="mr-2 h-5 w-5" />
                  Configurar Todo Automáticamente
                </Button>
              </div>

              <div className="text-xs text-gray-600 bg-white/50 p-3 rounded-lg">
                <strong>Qué configurará automáticamente:</strong>
                <ul className="mt-1 space-y-1">
                  <li>• Email profesional para envío de estimados</li>
                  <li>• Sistema de pagos con Stripe</li>
                  <li>• Plantillas profesionales personalizadas</li>
                  <li>• Perfil de empresa optimizado</li>
                  <li>• Integraciones esenciales</li>
                </ul>
              </div>
            </>
          )}

          {isAutomating && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center space-x-2 text-blue-600 mb-3">
                  <Bot className="h-5 w-5 animate-pulse" />
                  <span className="font-medium">IA trabajando...</span>
                </div>
                <p className="text-sm text-gray-600">{currentStep}</p>
              </div>
              
              <Progress value={automationProgress} className="h-3" />
              
              <div className="text-center text-xs text-gray-500">
                {Math.round(automationProgress)}% completado
              </div>
            </div>
          )}

          {automationResult && (
            <div className="space-y-4">
              <Alert className={automationResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                <CheckCircle className={`h-4 w-4 ${automationResult.success ? "text-green-600" : "text-red-600"}`} />
                <AlertDescription>
                  <strong>{automationResult.success ? "¡Éxito!" : "Error"}</strong> {automationResult.message}
                </AlertDescription>
              </Alert>

              {automationResult.success && automationResult.actions_taken && (
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <h4 className="font-medium text-green-800 mb-2">Configuraciones Completadas:</h4>
                  <ul className="space-y-1">
                    {automationResult.actions_taken.map((action, index) => (
                      <li key={index} className="flex items-center text-sm text-green-700">
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {automationResult.next_steps && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-800 mb-2">Próximos Pasos:</h4>
                  <ul className="space-y-1">
                    {automationResult.next_steps.map((step, index) => (
                      <li key={index} className="flex items-center text-sm text-blue-700">
                        <ArrowRight className="h-3 w-3 mr-2 text-blue-500" />
                        {step}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <Button 
                onClick={() => {
                  setAutomationResult(null);
                  setUserInfo({
                    companyName: '',
                    email: '',
                    phone: '',
                    address: '',
                    city: '',
                    state: '',
                    businessType: 'contractor'
                  });
                }}
                variant="outline"
                className="w-full"
              >
                Nueva Configuración
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Panel de beneficios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            ¿Por qué usar automatización con IA?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Zap className="h-6 w-6 text-green-600" />
              </div>
              <h4 className="font-medium mb-2">Ahorra Tiempo</h4>
              <p className="text-sm text-gray-600">
                30 segundos vs 2-3 horas de configuración manual
              </p>
            </div>
            <div className="text-center p-4">
              <div className="bg-blue-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
              <h4 className="font-medium mb-2">Cero Errores</h4>
              <p className="text-sm text-gray-600">
                La IA evita errores comunes de configuración
              </p>
            </div>
            <div className="text-center p-4">
              <div className="bg-purple-100 p-3 rounded-full w-fit mx-auto mb-3">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <h4 className="font-medium mb-2">Optimización</h4>
              <p className="text-sm text-gray-600">
                Configuraciones optimizadas para tu industria
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}