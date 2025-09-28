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

    // SEGURIDAD: Solo permitir emails reales - sin sintéticos
    const storedEmail = localStorage.getItem('last_biometric_email') || '';
    let loginEmail = email || storedEmail;
    
    if (!loginEmail || loginEmail.includes('@touch.local') || loginEmail.includes('@biometric.local')) {
      console.error('🛡️ [BIOMETRIC-SECURITY] No hay email válido - WebAuthn requiere cuenta existente');
      toast({
        title: "Autenticación requerida",
        description: "Necesitas iniciar sesión primero antes de usar autenticación biométrica",
        variant: "destructive"
      });
      return;
    }

    console.log('🔐 [BIOMETRIC-BUTTON] Iniciando login biométrico para:', loginEmail);
    setIsLoading(true);

    try {
      // SEGURIDAD: Solo guardar emails válidos y reales
      if (loginEmail && 
          !loginEmail.includes('@touch.local') && 
          !loginEmail.includes('@biometric.local') &&
          loginEmail.includes('@') && 
          loginEmail.length > 5) {
        localStorage.setItem('last_biometric_email', loginEmail);
      }
      
      // Intentar autenticación biométrica con manejo de errores mejorado
      console.log('🔐 [BIOMETRIC-BUTTON] Llamando a webauthnService.authenticateUser');
      const authResult = await webauthnService.authenticateUser(loginEmail);
      
      if (!authResult || !authResult.credential) {
        console.log('❌ [BIOMETRIC-BUTTON] No se obtuvo credencial');
        toast({
          title: "Error biométrico",
          description: "No se pudo obtener la credencial biométrica",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ [BIOMETRIC-BUTTON] Credencial biométrica obtenida');

      // Usar challengeKey del resultado
      const { credential, challengeKey } = authResult;

      // Procesar respuesta del servidor que incluye custom Firebase token
      const response = await fetch('/api/webauthn/authenticate/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential,
          challengeKey, // CRÍTICO: Incluir challengeKey requerido
          email: loginEmail
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error del servidor (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      if (result.success && result.user && result.customToken) {
        console.log('🎉 [BIOMETRIC-BUTTON] Autenticación WebAuthn exitosa, procesando Firebase custom token...');
        
        // 🔥 FIREBASE INTEGRATION: Autenticar con Firebase usando custom token
        try {
          const { signInWithCustomToken } = await import('firebase/auth');
          const { auth } = await import('@/lib/firebase');
          
          console.log('🔑 [BIOMETRIC-FIREBASE] Autenticando con Firebase usando custom token...');
          const userCredential = await signInWithCustomToken(auth, result.customToken);
          
          console.log('✅ [BIOMETRIC-FIREBASE] Autenticación Firebase exitosa:', userCredential.user.email);
          
          // Logging de auditoría en el cliente
          console.log('🔐 [BIOMETRIC-CLIENT-AUDIT] Firebase auth completed:', {
            uid: userCredential.user.uid,
            email: userCredential.user.email,
            authMethod: result.authMethod,
            deviceType: result.deviceType,
            timestamp: new Date().toISOString()
          });
          
          toast({
            title: "Autenticación biométrica exitosa",
            description: `Bienvenido de vuelta, ${userCredential.user.displayName || userCredential.user.email}!`,
            variant: "default",
          });

          // Pasar tanto la respuesta del servidor como el usuario de Firebase
          onSuccess({
            firebaseUser: userCredential.user,
            serverUser: result.user,
            authMethod: result.authMethod,
            deviceType: result.deviceType
          });
          
        } catch (firebaseError: any) {
          console.error('❌ [BIOMETRIC-FIREBASE] Error autenticando con Firebase:', firebaseError);
          
          let firebaseErrorMessage = 'Error completando autenticación con Firebase';
          if (firebaseError?.code === 'auth/invalid-custom-token') {
            firebaseErrorMessage = 'Token de autenticación inválido. Intenta de nuevo.';
          } else if (firebaseError?.code === 'auth/custom-token-mismatch') {
            firebaseErrorMessage = 'Error de configuración de autenticación. Contacta soporte.';
          }
          
          toast({
            title: "Error de autenticación",
            description: firebaseErrorMessage,
            variant: "destructive",
          });
          
          throw new Error(firebaseErrorMessage);
        }
        
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
      } else if (errorString.includes('no encontraron credenciales') || errorString.includes('no credentials') || errorString.includes('InvalidStateError') || errorString.includes('Credencial no encontrada') || errorString.includes('no encontrada')) {
        // ARREGLADO: Mejor manejo de registro automático
        console.log('🛠️ [BIOMETRIC-BUTTON] No hay credenciales, intentando registro automático');
        
        toast({
          title: "Configurando autenticación biométrica",
          description: "No hay credenciales guardadas. Configurando acceso biométrico...",
          variant: "default",
        });
        
        await handleAutoRegister(loginEmail);
        return;
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

  // ARREGLADO: Registro automático mejorado con mejor manejo de errores
  const handleAutoRegister = async (email: string) => {
    // ARREGLADO: Permitir registro incluso con emails generados
    if (!email) {
      toast({
        title: "Error de registro",
        description: "Email requerido para configurar autenticación biométrica.",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('🔐 [BIOMETRIC-REGISTER] Iniciando registro automático para:', email);
      
      // ARREGLADO: Simplificado - no verificar usuario, crear si es necesario en servidor
      toast({
        title: "Configurando Touch ID",
        description: "Coloca tu dedo en el sensor Touch ID cuando se solicite...",
        variant: "default",
      });

      // Registrar credencial biométrica directamente
      const credential = await webauthnService.registerCredential(email);
      
      if (credential) {
        console.log('✅ [BIOMETRIC-REGISTER] Credencial registrada exitosamente');
        
        toast({
          title: "✅ Touch ID configurado",
          description: "Autenticación biométrica lista. Intentando login...",
          variant: "default",
        });

        // Intentar login inmediatamente después del registro
        setTimeout(() => {
          handleBiometricLogin();
        }, 1500); // ARREGLADO: Más tiempo para que se complete el registro
      }
    } catch (error: any) {
      console.error('❌ [BIOMETRIC-REGISTER] Error en registro automático:', error);
      
      let errorMsg = 'Error configurando autenticación biométrica';
      if (error.message?.includes('cancelado') || error.message?.includes('canceled')) {
        errorMsg = 'Configuración cancelada';
      } else if (error.message?.includes('no autorizado') || error.message?.includes('NotAllowedError')) {
        errorMsg = 'Acceso biométrico denegado';
      }
      
      toast({
        title: "Error de configuración",
        description: errorMsg,
        variant: "destructive",
      });
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