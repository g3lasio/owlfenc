/**
 * Página dedicada para configuración de email
 */

import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle } from "lucide-react";
import UnifiedEmailSetup from "@/components/email/UnifiedEmailSetup";
import { useToast } from "@/hooks/use-toast";

export default function EmailSetup() {
  const [location, setLocation] = useLocation();
  const [isComplete, setIsComplete] = useState(false);
  const [emailConfig, setEmailConfig] = useState<any>(null);
  const { toast } = useToast();

  const handleEmailSetupComplete = (config: any) => {
    setEmailConfig(config);
    setIsComplete(true);
    
    toast({
      title: "Configuración completada",
      description: "Tu proveedor de email ha sido configurado exitosamente.",
    });

    // Redirigir de vuelta a settings después de un momento
    setTimeout(() => {
      setLocation('/settings');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/settings')}
              className="text-slate-300 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Configuraciones
            </Button>
          </div>

          {!isComplete ? (
            <UnifiedEmailSetup 
              onComplete={handleEmailSetupComplete}
              isOnboarding={false}
            />
          ) : (
            <Card className="text-center">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">¡Configuración Completada!</CardTitle>
                <CardDescription>
                  Tu proveedor de email está listo para enviar estimados y contratos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg">
                    <h3 className="font-medium mb-2">Configuración Activa:</h3>
                    <p className="text-sm text-muted-foreground">
                      {emailConfig?.provider || 'Email personal'}
                    </p>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Serás redirigido automáticamente a la página de configuraciones...
                  </p>
                  
                  <Button 
                    onClick={() => navigate('/settings')}
                    className="mt-4"
                  >
                    Ir a Configuraciones Ahora
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}