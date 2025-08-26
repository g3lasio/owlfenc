/**
 * 🔐 BIOMETRIC SETUP BUTTON (PARA DESBLOQUEO DE SESIÓN)
 * Permite configurar desbloqueo biométrico DESPUÉS del login Firebase exitoso
 * CONCEPTO: Biometría para desbloquear sesiones guardadas, NO para autenticación directa
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Smartphone, Shield, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { detectBiometricCapabilities } from '@/lib/biometric-detection';
import { sessionUnlockService } from '@/lib/session-unlock-service';

interface BiometricSetupButtonProps {
  onSetupComplete?: () => void;
  className?: string;
  rememberDays?: number;
}

export function BiometricSetupButton({ 
  onSetupComplete, 
  className = "",
  rememberDays = 30 
}: BiometricSetupButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const handleSetupSessionUnlock = async () => {
    if (!currentUser || isLoading) {
      console.log('🚫 [BIOMETRIC-SETUP] No se puede configurar: sin usuario o ya cargando');
      return;
    }

    console.log('🔐 [BIOMETRIC-SETUP] Iniciando configuración de desbloqueo para:', currentUser.email);
    setIsLoading(true);
    
    try {
      // 1. Detectar capacidades biométricas
      const capabilities = await detectBiometricCapabilities();
      
      if (!capabilities.supported) {
        toast({
          title: "Desbloqueo biométrico no disponible",
          description: "Tu dispositivo no soporta Face ID, Touch ID o huella digital.",
          variant: "destructive",
        });
        return;
      }

      // 2. Mostrar mensaje informativo sobre desbloqueo
      toast({
        title: "Configurando desbloqueo rápido",
        description: `Se te pedirá usar ${capabilities.recommendedMethod} para configurar desbloqueo en este dispositivo.`,
      });

      // 3. Registrar desbloqueo biométrico (NO autenticación directa)
      console.log('📱 [BIOMETRIC-SETUP] Registrando desbloqueo biométrico...');
      const success = await sessionUnlockService.registerSessionUnlock(currentUser, rememberDays);
      
      if (success) {
        setIsSetupComplete(true);
        console.log('✅ [BIOMETRIC-SETUP] Desbloqueo configurado exitosamente');
        
        toast({
          title: "¡Desbloqueo rápido configurado!",
          description: `Tu sesión se guardó de forma segura. En próximas visitas puedes usar ${capabilities.recommendedMethod} para desbloquear rápidamente.`,
        });

        // Llamar callback si se proporciona
        onSetupComplete?.();
      }

    } catch (error: any) {
      console.error('❌ [BIOMETRIC-SETUP] Error configurando desbloqueo:', error);
      
      let errorMessage = 'No se pudo configurar el desbloqueo biométrico';
      
      if (error.message?.includes('canceled') || error.message?.includes('cancelado')) {
        errorMessage = 'Configuración cancelada. Puedes intentar más tarde.';
      } else if (error.message?.includes('not allowed') || error.message?.includes('no autorizado')) {
        errorMessage = 'Acceso biométrico denegado. Verifica la configuración de tu dispositivo.';
      } else if (error.message?.includes('not supported') || error.message?.includes('no soportada')) {
        errorMessage = 'Desbloqueo biométrico no soportado en este dispositivo.';
      } else if (error.message?.includes('already registered') || error.message?.includes('ya registrada')) {
        errorMessage = 'Ya tienes desbloqueo biométrico configurado en este dispositivo.';
      }
      
      toast({
        title: "Error de configuración",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // No mostrar si no hay usuario autenticado
  if (!currentUser) {
    console.log('🚫 [BIOMETRIC-SETUP] No hay usuario autenticado');
    return null;
  }

  // Si ya está configurado, mostrar estado de éxito
  if (isSetupComplete) {
    return (
      <Button
        variant="outline"
        className={`w-full border-green-200 bg-green-50 text-green-700 hover:bg-green-100 ${className}`}
        disabled
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Desbloqueo rápido configurado
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      onClick={handleSetupSessionUnlock}
      disabled={isLoading}
      className={`w-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 ${className}`}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Configurando...
        </>
      ) : (
        <>
          <Shield className="w-4 h-4 mr-2" />
          Configurar desbloqueo rápido
        </>
      )}
    </Button>
  );
}

export default BiometricSetupButton;