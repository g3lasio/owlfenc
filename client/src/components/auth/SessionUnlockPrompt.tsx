/**
 * 🔓 SESSION UNLOCK PROMPT
 * Componente que muestra la opción de desbloqueo biométrico cuando hay sesión guardada
 * Concepto: Biometría para desbloquear sesión Firebase existente (NO autenticación)
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Fingerprint, Smartphone, Shield, Loader2, Lock, User } from 'lucide-react';
import { sessionUnlockService } from '@/lib/session-unlock-service';
import { useToast } from '@/hooks/use-toast';

interface SessionUnlockPromptProps {
  onUnlockSuccess: (user: any) => void;
  onNeedReauth: () => void;
  className?: string;
}

export function SessionUnlockPrompt({ 
  onUnlockSuccess, 
  onNeedReauth, 
  className = '' 
}: SessionUnlockPromptProps) {
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<{
    canUnlock: boolean;
    email?: string;
    method?: string;
  }>({ canUnlock: false });
  const { toast } = useToast();

  useEffect(() => {
    checkSessionAvailability();
  }, []);

  const checkSessionAvailability = () => {
    const info = sessionUnlockService.canUnlockSession();
    setSessionInfo(info);
    
    if (info.canUnlock) {
      console.log('🔓 [SESSION-UNLOCK-PROMPT] Sesión disponible para desbloqueo:', info.email);
    }
  };

  const handleUnlock = async () => {
    if (isUnlocking || !sessionInfo.canUnlock) return;

    console.log('🔓 [SESSION-UNLOCK-PROMPT] Iniciando desbloqueo...');
    setIsUnlocking(true);

    try {
      // Mostrar mensaje informativo
      toast({
        title: "Desbloqueando sesión",
        description: `Se te pedirá usar ${sessionInfo.method} para desbloquear tu sesión guardada.`,
      });

      // Intentar desbloquear sesión
      const result = await sessionUnlockService.unlockSession();

      if (result.success && result.user) {
        console.log('✅ [SESSION-UNLOCK-PROMPT] Desbloqueo exitoso');
        
        toast({
          title: "Sesión desbloqueada",
          description: `Bienvenido de vuelta, ${result.user.displayName || sessionInfo.email}!`,
        });

        onUnlockSuccess(result.user);
      } else {
        throw new Error(result.error || 'Error desconocido en desbloqueo');
      }

    } catch (error: any) {
      console.error('❌ [SESSION-UNLOCK-PROMPT] Error en desbloqueo:', error);
      
      let errorMessage = 'Error desbloqueando la sesión';
      let needsReauth = false;

      const errorString = error?.message || error?.toString() || '';
      
      if (errorString.includes('cancelado') || errorString.includes('canceled')) {
        errorMessage = 'Desbloqueo cancelado. Puedes intentar nuevamente o iniciar sesión normalmente.';
      } else if (errorString.includes('expirada') || errorString.includes('expired') || errorString.includes('token')) {
        errorMessage = 'Tu sesión guardada ha expirado. Necesitas iniciar sesión nuevamente.';
        needsReauth = true;
      } else if (errorString.includes('no encontrada') || errorString.includes('not found')) {
        errorMessage = 'Credencial biométrica no encontrada. Necesitas iniciar sesión nuevamente.';
        needsReauth = true;
      } else if (errorString.includes('no autorizado') || errorString.includes('not allowed')) {
        errorMessage = 'Acceso biométrico no autorizado. Verifica la configuración de tu dispositivo.';
      }

      toast({
        title: "Error de desbloqueo",
        description: errorMessage,
        variant: "destructive",
      });

      if (needsReauth) {
        setTimeout(() => {
          onNeedReauth();
        }, 2000);
      }

    } finally {
      setIsUnlocking(false);
    }
  };

  const handleUseNormalLogin = () => {
    console.log('🔐 [SESSION-UNLOCK-PROMPT] Usuario eligió login normal');
    onNeedReauth();
  };

  // No mostrar si no hay sesión para desbloquear
  if (!sessionInfo.canUnlock) {
    return null;
  }

  const getIcon = () => {
    if (isUnlocking) {
      return <Loader2 className="w-6 h-6 animate-spin text-primary" />;
    }

    const method = sessionInfo.method || '';
    if (method.includes('Face ID') || method.includes('Touch ID')) {
      return <Smartphone className="w-6 h-6 text-primary" />;
    } else if (method.includes('huella')) {
      return <Fingerprint className="w-6 h-6 text-primary" />;
    } else {
      return <Shield className="w-6 h-6 text-primary" />;
    }
  };

  return (
    <Card className={`w-full max-w-md mx-auto shadow-lg border-primary/20 ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Sesión Guardada</h2>
        </div>
        <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>{sessionInfo.email}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Botón principal de desbloqueo */}
        <Button
          onClick={handleUnlock}
          disabled={isUnlocking}
          className="w-full h-12 text-base font-medium bg-primary hover:bg-primary/90"
          size="lg"
        >
          {isUnlocking ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Desbloqueando...
            </>
          ) : (
            <>
              {getIcon()}
              <span className="ml-2">
                Desbloquear con {sessionInfo.method}
              </span>
            </>
          )}
        </Button>

        {/* Botón secundario para login normal */}
        <Button
          onClick={handleUseNormalLogin}
          disabled={isUnlocking}
          variant="outline"
          className="w-full"
        >
          <User className="w-4 h-4 mr-2" />
          Usar login normal
        </Button>

        {/* Mensaje explicativo */}
        <div className="text-xs text-center text-muted-foreground bg-muted/50 rounded-md p-2">
          💡 <strong>¿Qué es esto?</strong><br />
          Tu sesión está guardada de forma segura en este dispositivo. 
          Usa {sessionInfo.method} para acceder rápidamente sin introducir tu contraseña.
        </div>
      </CardContent>
    </Card>
  );
}

export default SessionUnlockPrompt;