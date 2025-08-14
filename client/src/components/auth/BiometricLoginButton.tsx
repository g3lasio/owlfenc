/**
 * Componente de Botón de Login Biométrico
 * Maneja Face ID, Touch ID y autenticación por huella digital
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Smartphone, Shield, Loader2 } from 'lucide-react';
import { detectBiometricCapabilities, getBiometricMethodDescription } from '@/lib/biometric-detection';
import { webauthnService } from '@/lib/webauthn-service';
import { useToast } from '@/hooks/use-toast';

interface BiometricLoginButtonProps {
  onSuccess: (userData: any) => void;
  onError?: (error: string) => void;
  email?: string;
  className?: string;
  disabled?: boolean;
}

export function BiometricLoginButton({ 
  onSuccess, 
  onError, 
  email, 
  className = '',
  disabled = false 
}: BiometricLoginButtonProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [methodDescription, setMethodDescription] = useState('');
  const [isDetecting, setIsDetecting] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    detectSupport();
  }, []);

  const detectSupport = async () => {
    console.log('🔐 [BIOMETRIC-BUTTON] Detectando soporte biométrico...');
    setIsDetecting(true);
    
    try {
      const result = await detectBiometricCapabilities();
      console.log('🔍 [BIOMETRIC-BUTTON] Resultado detección:', result);
      
      setIsSupported(result.supported);
      setMethodDescription(result.recommendedMethod || getBiometricMethodDescription());
      
      if (result.supported) {
        console.log('✅ [BIOMETRIC-BUTTON] Autenticación biométrica disponible');
      } else {
        console.log('❌ [BIOMETRIC-BUTTON] Autenticación biométrica no disponible:', result.message);
      }
    } catch (error) {
      console.error('❌ [BIOMETRIC-BUTTON] Error detectando soporte:', error);
      setIsSupported(false);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleBiometricLogin = async () => {
    if (!isSupported || isLoading || disabled) return;

    console.log('🔐 [BIOMETRIC-BUTTON] Iniciando login biométrico');
    setIsLoading(true);

    try {
      // Intentar autenticación biométrica
      const credential = await webauthnService.authenticateUser(email);
      console.log('✅ [BIOMETRIC-BUTTON] Autenticación exitosa');

      // Procesar respuesta del servidor
      const response = await fetch('/api/webauthn/authenticate/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential
        }),
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.user) {
        console.log('🎉 [BIOMETRIC-BUTTON] Login completado exitosamente');
        
        toast({
          title: "Autenticación exitosa",
          description: `Bienvenido de vuelta!`,
          variant: "default",
        });

        onSuccess(result.user);
      } else {
        throw new Error(result.message || 'Error en la autenticación');
      }

    } catch (error: any) {
      console.error('❌ [BIOMETRIC-BUTTON] Error en login biométrico:', error);
      
      let errorMessage = 'Error en la autenticación biométrica';
      
      if (error.message.includes('cancelado') || error.message.includes('canceled')) {
        errorMessage = 'Autenticación cancelada por el usuario';
      } else if (error.message.includes('no autorizado') || error.message.includes('not allowed')) {
        errorMessage = 'Acceso biométrico no autorizado';
      } else if (error.message.includes('no soportada') || error.message.includes('not supported')) {
        errorMessage = 'Autenticación biométrica no soportada';
      } else if (error.message.includes('no encontraron credenciales') || error.message.includes('no credentials')) {
        errorMessage = 'No hay credenciales biométricas configuradas en este dispositivo';
      }

      toast({
        title: "Error de autenticación",
        description: errorMessage,
        variant: "destructive",
      });

      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // No mostrar el botón si no hay soporte o aún está detectando
  if (isDetecting || !isSupported) {
    return null;
  }

  const getIcon = () => {
    const deviceInfo = getBiometricMethodDescription();
    
    if (deviceInfo.includes('Face ID') || deviceInfo.includes('Touch ID')) {
      return <Smartphone className="w-4 h-4" />;
    } else if (deviceInfo.includes('Huella')) {
      return <Fingerprint className="w-4 h-4" />;
    } else {
      return <Shield className="w-4 h-4" />;
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={`w-full border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 ${className}`}
      onClick={handleBiometricLogin}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Autenticando...
        </>
      ) : (
        <>
          {getIcon()}
          <span className="ml-2">
            Iniciar sesión con {methodDescription}
          </span>
        </>
      )}
    </Button>
  );
}

export default BiometricLoginButton;