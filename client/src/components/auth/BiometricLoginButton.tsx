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
    if (!isSupported || isLoading || disabled) {
      console.log('🚫 [BIOMETRIC-BUTTON] Login bloqueado:', { isSupported, isLoading, disabled });
      return;
    }

    // Si no hay email, usar el último email guardado o permitir login sin email
    let loginEmail = email;
    if (!loginEmail) {
      // Intentar obtener el último email usado
      loginEmail = localStorage.getItem('last_biometric_email') || '';
      
      if (!loginEmail) {
        // Si no hay email guardado, usar un identificador único del dispositivo
        loginEmail = `device_${navigator.userAgent.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}@biometric.local`;
        console.log('🔐 [BIOMETRIC-BUTTON] Usando identificador de dispositivo:', loginEmail);
      }
    }

    console.log('🔐 [BIOMETRIC-BUTTON] Iniciando login biométrico para:', loginEmail);
    setIsLoading(true);

    try {
      // Guardar email para futuros logins
      if (loginEmail && !loginEmail.includes('@biometric.local')) {
        localStorage.setItem('last_biometric_email', loginEmail);
      }
      
      // Intentar autenticación biométrica con manejo de errores mejorado
      console.log('🔐 [BIOMETRIC-BUTTON] Llamando a webauthnService.authenticateUser');
      const credential = await webauthnService.authenticateUser(loginEmail);
      
      if (!credential) {
        console.log('❌ [BIOMETRIC-BUTTON] No se obtuvo credencial');
        toast({
          title: "Error biométrico",
          description: "No se pudo obtener la credencial biométrica",
          variant: "destructive",
        });
        return;
      }
      
      if (!credential) {
        throw new Error('No se recibió credencial de autenticación');
      }

      console.log('✅ [BIOMETRIC-BUTTON] Credencial biométrica obtenida');

      // Procesar respuesta del servidor
      const response = await fetch('/api/webauthn/authenticate/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential,
          email: loginEmail
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success && result.user) {
        console.log('🎉 [BIOMETRIC-BUTTON] Login completado exitosamente');
        
        toast({
          title: "Autenticación exitosa",
          description: `Bienvenido de vuelta, ${result.user.displayName || result.user.email}!`,
          variant: "default",
        });

        onSuccess(result.user);
      } else {
        throw new Error(result.message || result.error || 'Error en la autenticación');
      }

    } catch (error: any) {
      console.error('❌ [BIOMETRIC-BUTTON] Error en login biométrico:', error);
      
      let errorMessage = 'Error en la autenticación biométrica';
      
      // Manejo más robusto de errores
      const errorString = error?.message || error?.toString() || 'Error desconocido';
      
      if (errorString.includes('cancelado') || errorString.includes('canceled') || errorString.includes('abort')) {
        errorMessage = 'Autenticación cancelada por el usuario';
      } else if (errorString.includes('no autorizado') || errorString.includes('not allowed') || errorString.includes('NotAllowedError')) {
        errorMessage = 'Acceso biométrico no autorizado. Verifica que tu dispositivo tenga configurada autenticación biométrica';
      } else if (errorString.includes('no soportada') || errorString.includes('not supported') || errorString.includes('NotSupportedError')) {
        errorMessage = 'Autenticación biométrica no soportada en este dispositivo';
      } else if (errorString.includes('no encontraron credenciales') || errorString.includes('no credentials') || errorString.includes('InvalidStateError')) {
        errorMessage = 'No hay credenciales biométricas configuradas. Registra tu biometría primero';
      } else if (errorString.includes('Network') || errorString.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo';
      } else if (errorString.includes('timeout') || errorString.includes('TimeoutError')) {
        errorMessage = 'La autenticación expiró. Intenta de nuevo';
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
    if (isLoading) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }

    if (methodDescription.includes('Face ID') || methodDescription.includes('Touch ID')) {
      return <Smartphone className="w-4 h-4" />;
    } else if (methodDescription.includes('Huella') || methodDescription.includes('Fingerprint')) {
      return <Fingerprint className="w-4 h-4" />;
    } else {
      return <Shield className="w-4 h-4" />;
    }
  };

  const isCompactMode = className?.includes('min-w-0');
  
  return (
    <Button
      type="button"
      variant="outline"
      className={isCompactMode 
        ? `rounded-md bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 transition-all duration-300 ${className}`
        : `w-full border-2 border-primary/20 hover:border-primary/40 hover:bg-primary/5 ${className}`
      }
      onClick={handleBiometricLogin}
      disabled={isLoading || disabled}
      title={isCompactMode ? `Sign in with ${methodDescription}` : undefined}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          {!isCompactMode && <span className="ml-2">Authenticating...</span>}
        </>
      ) : (
        <>
          {getIcon()}
          {isCompactMode ? (
            <span className="ml-1 text-sm font-medium">
              Biometric
            </span>
          ) : (
            <span className="ml-2 font-medium">
              Sign in with {methodDescription}
            </span>
          )}
        </>
      )}
    </Button>
  );
}

export default BiometricLoginButton;