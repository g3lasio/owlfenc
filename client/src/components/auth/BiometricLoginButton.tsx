/**
 * Componente de Botón de Login Biométrico
 * Maneja Face ID, Touch ID y autenticación por huella digital
 * Soporta flujo de popup para entornos iframe
 */

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Smartphone, Shield, Loader2 } from 'lucide-react';
import { detectBiometricCapabilities, getBiometricMethodDescription } from '@/lib/biometric-detection';
import { webauthnService } from '@/lib/webauthn-service';
import { useToast } from '@/hooks/use-toast';
import { getExpectedPopupOrigin } from '@/lib/window-context';

interface BiometricLoginButtonProps {
  onSuccess: (userData: any) => void;
  onError?: (error: string) => void;
  email?: string;
  className?: string;
  disabled?: boolean;
}

interface PopupMessage {
  type: 'WEBAUTHN_INIT' | 'WEBAUTHN_SUCCESS' | 'WEBAUTHN_ERROR';
  nonce?: string;
  email?: string;
  action?: 'authenticate' | 'register';
  credential?: any;
  challengeKey?: string;
  error?: string;
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
  
  // Referencias para manejo de popup
  const popupWindowRef = useRef<Window | null>(null);
  const popupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const popupNonceRef = useRef<string>('');

  useEffect(() => {
    detectSupport();
  }, []);

  // Cleanup: Cerrar popup y limpiar timeouts al desmontar
  useEffect(() => {
    return () => {
      if (popupWindowRef.current && !popupWindowRef.current.closed) {
        popupWindowRef.current.close();
      }
      if (popupTimeoutRef.current) {
        clearTimeout(popupTimeoutRef.current);
      }
    };
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

  /**
   * Flujo de autenticación mediante popup (para entornos iframe)
   */
  const handlePopupAuth = async (loginEmail: string): Promise<{ credential: any; challengeKey: string }> => {
    console.log('🪟 [POPUP-AUTH] Iniciando autenticación en popup');
    
    return new Promise((resolve, reject) => {
      // Generar nonce para seguridad
      const nonce = `nonce_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      popupNonceRef.current = nonce;
      
      // Abrir popup
      const popupWidth = 500;
      const popupHeight = 600;
      const left = (window.screen.width - popupWidth) / 2;
      const top = (window.screen.height - popupHeight) / 2;
      
      const popupUrl = `/webauthn-popup`;
      const popupFeatures = `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=no,scrollbars=no,status=no,toolbar=no,menubar=no`;
      
      console.log('🪟 [POPUP-AUTH] Abriendo popup:', popupUrl);
      const popupWindow = window.open(popupUrl, 'webauthn_popup', popupFeatures);
      
      if (!popupWindow) {
        console.error('❌ [POPUP-AUTH] Popup bloqueado por el navegador');
        toast({
          title: "Popup bloqueado",
          description: "Por favor, permite popups para este sitio y vuelve a intentar",
          variant: "destructive",
        });
        reject(new Error('Popup bloqueado por el navegador'));
        return;
      }
      
      popupWindowRef.current = popupWindow;
      
      // Timeout de 90 segundos
      popupTimeoutRef.current = setTimeout(() => {
        console.error('❌ [POPUP-AUTH] Timeout esperando respuesta del popup');
        popupWindow.close();
        window.removeEventListener('message', messageHandler);
        toast({
          title: "Tiempo agotado",
          description: "La autenticación biométrica tardó demasiado. Intenta de nuevo",
          variant: "destructive",
        });
        reject(new Error('Timeout de autenticación'));
      }, 90000);
      
      // Escuchar mensajes del popup
      const messageHandler = (event: MessageEvent) => {
        // Validar origen
        const expectedOrigin = getExpectedPopupOrigin();
        if (event.origin !== expectedOrigin) {
          console.warn('⚠️ [POPUP-AUTH] Origen no confiable:', event.origin);
          return;
        }
        
        const message: PopupMessage = event.data;
        console.log('📨 [POPUP-AUTH] Mensaje recibido del popup:', message.type);
        
        // Manejar mensaje INIT (popup está listo)
        if (message.type === 'WEBAUTHN_INIT') {
          console.log('✅ [POPUP-AUTH] Popup listo, enviando instrucciones');
          
          // Enviar mensaje INIT con parámetros
          const initMessage: PopupMessage = {
            type: 'WEBAUTHN_INIT',
            nonce: nonce,
            email: loginEmail,
            action: 'authenticate'
          };
          
          popupWindow.postMessage(initMessage, expectedOrigin);
        }
        
        // Manejar resultado exitoso
        else if (message.type === 'WEBAUTHN_SUCCESS') {
          // Validar nonce
          if (message.nonce !== nonce) {
            console.error('❌ [POPUP-AUTH] Nonce no coincide');
            return;
          }
          
          console.log('✅ [POPUP-AUTH] Autenticación exitosa desde popup');
          
          // Limpiar
          if (popupTimeoutRef.current) {
            clearTimeout(popupTimeoutRef.current);
          }
          window.removeEventListener('message', messageHandler);
          
          // Resolver promesa con credencial
          resolve({
            credential: message.credential,
            challengeKey: message.challengeKey!
          });
        }
        
        // Manejar error
        else if (message.type === 'WEBAUTHN_ERROR') {
          // Validar nonce
          if (message.nonce !== nonce) {
            console.error('❌ [POPUP-AUTH] Nonce no coincide en error');
            return;
          }
          
          console.error('❌ [POPUP-AUTH] Error desde popup:', message.error);
          
          // Limpiar
          if (popupTimeoutRef.current) {
            clearTimeout(popupTimeoutRef.current);
          }
          window.removeEventListener('message', messageHandler);
          
          // Rechazar promesa
          reject(new Error(message.error || 'Error desconocido desde popup'));
        }
      };
      
      window.addEventListener('message', messageHandler);
      
      // Polling para detectar si el popup fue cerrado manualmente
      const pollInterval = setInterval(() => {
        if (popupWindow.closed) {
          console.log('🔒 [POPUP-AUTH] Popup cerrado por el usuario');
          clearInterval(pollInterval);
          if (popupTimeoutRef.current) {
            clearTimeout(popupTimeoutRef.current);
          }
          window.removeEventListener('message', messageHandler);
          reject(new Error('Popup cerrado por el usuario'));
        }
      }, 500);
    });
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
      
      let authResult: { credential: any; challengeKey: string };
      
      // Intentar autenticación biométrica directa (con Permissions-Policy headers)
      try {
        console.log('🔐 [BIOMETRIC-BUTTON] Llamando a webauthnService.authenticateUser');
        authResult = await webauthnService.authenticateUser(loginEmail);
        console.log('✅ [BIOMETRIC-BUTTON] WebAuthn directo exitoso en iframe (Permissions-Policy funcionando)');
      } catch (webauthnError: any) {
        console.log('⚠️ [BIOMETRIC-BUTTON] WebAuthn directo falló:', webauthnError);
        
        // Detectar errores específicos de iframe que requieren popup
        const errorMessage = webauthnError?.message || webauthnError?.toString() || '';
        const errorName = webauthnError?.name || '';
        
        // Errores que indican restricción de iframe:
        // - NotAllowedError: Usuario canceló o iframe bloqueado
        // - SecurityError: Iframe sin permisos
        // - NotSupportedError: API no disponible en este contexto
        const isIframeError = 
          errorMessage.includes('not enabled in this document') ||
          errorMessage.includes('not the same as its ancestors') ||
          errorMessage.includes('cross-origin') ||
          (errorName === 'NotAllowedError' && errorMessage.includes('document')) ||
          errorName === 'SecurityError';
        
        if (isIframeError) {
          console.log('🪟 [BIOMETRIC-BUTTON] Error de iframe detectado, intentando flujo de popup como fallback');
          toast({
            title: "Abriendo ventana de autenticación",
            description: "Tu navegador requiere una ventana separada para autenticación biométrica",
          });
          
          // Usar flujo de popup como fallback
          try {
            authResult = await handlePopupAuth(loginEmail);
            console.log('✅ [BIOMETRIC-BUTTON] Popup fallback exitoso');
          } catch (popupError: any) {
            console.error('❌ [BIOMETRIC-BUTTON] Popup fallback también falló:', popupError);
            throw popupError; // Re-lanzar para manejo general
          }
        } else {
          // Re-lanzar otros errores (no relacionados con iframe)
          console.log('❌ [BIOMETRIC-BUTTON] Error no relacionado con iframe, re-lanzando');
          throw webauthnError;
        }
      }
      
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
      } else if (errorString.includes('Popup bloqueado')) {
        errorMessage = 'Popup bloqueado. Por favor permite popups para este sitio';
      } else if (errorString.includes('Popup cerrado')) {
        errorMessage = 'Autenticación cancelada';
      } else if (errorString.includes('Timeout')) {
        errorMessage = 'Tiempo agotado. Por favor intenta de nuevo';
      } else if (errorString.includes('no autorizado') || errorString.includes('not allowed') || errorString.includes('NotAllowedError')) {
        errorMessage = 'Acceso biométrico no autorizado. Verifica que tu dispositivo tenga configurada autenticación biométrica';
      } else if (errorString.includes('no soportada') || errorString.includes('not supported') || errorString.includes('NotSupportedError')) {
        errorMessage = 'Autenticación biométrica no soportada en este dispositivo';
      } else if (errorString.includes('no encontraron credenciales') || errorString.includes('no credentials') || errorString.includes('InvalidStateError') || errorString.includes('Credencial no encontrada') || errorString.includes('no encontrada')) {
        errorMessage = 'No hay credenciales biométricas registradas. Inicia sesión primero con email/contraseña';
      } else if (errorString.includes('Network') || errorString.includes('fetch')) {
        errorMessage = 'Error de conexión. Verifica tu internet e intenta de nuevo';
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
      data-testid="button-biometric-login"
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
