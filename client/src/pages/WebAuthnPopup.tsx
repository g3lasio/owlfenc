/**
 * Popup dedicado para autenticación WebAuthn
 * Se abre desde un iframe para realizar autenticación biométrica
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Fingerprint, Smartphone, Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { webauthnService } from '@/lib/webauthn-service';
import { getExpectedPopupOrigin, detectWindowContext } from '@/lib/window-context';

interface PopupMessage {
  type: 'WEBAUTHN_INIT' | 'WEBAUTHN_SUCCESS' | 'WEBAUTHN_ERROR';
  nonce?: string;
  email?: string;
  action?: 'authenticate' | 'register';
  credential?: any;
  challengeKey?: string;
  error?: string;
}

export default function WebAuthnPopup() {
  const [status, setStatus] = useState<'init' | 'processing' | 'success' | 'error'>('init');
  const [message, setMessage] = useState('Preparando autenticación biométrica...');
  const [errorDetails, setErrorDetails] = useState('');
  const [authParams, setAuthParams] = useState<{ email?: string; action: 'authenticate' | 'register'; nonce?: string } | null>(null);

  useEffect(() => {
    console.log('🔐 [WEBAUTHN-POPUP] Popup iniciado');
    const context = detectWindowContext();
    
    // Verificar que estamos en un popup
    if (!context.isPopup) {
      console.error('❌ [WEBAUTHN-POPUP] No está en contexto de popup');
      setStatus('error');
      setMessage('Esta página solo funciona como popup');
      setErrorDetails('Contexto de ventana inválido');
      return;
    }

    // Verificar que hay un opener
    if (!window.opener) {
      console.error('❌ [WEBAUTHN-POPUP] No hay ventana padre');
      setStatus('error');
      setMessage('No se encontró la ventana padre');
      setErrorDetails('window.opener es null');
      return;
    }

    console.log('✅ [WEBAUTHN-POPUP] Contexto válido, esperando mensaje INIT del padre');
    
    // Escuchar mensaje de inicialización del padre
    const handleMessage = async (event: MessageEvent) => {
      console.log('📨 [WEBAUTHN-POPUP] Mensaje recibido:', { origin: event.origin, type: event.data?.type });
      
      // Validar origen
      const expectedOrigin = getExpectedPopupOrigin();
      if (event.origin !== expectedOrigin) {
        console.error('❌ [WEBAUTHN-POPUP] Origen no confiable:', event.origin, 'esperado:', expectedOrigin);
        return;
      }

      const message: PopupMessage = event.data;
      
      // Procesar mensaje INIT
      if (message.type === 'WEBAUTHN_INIT') {
        console.log('🔐 [WEBAUTHN-POPUP] Mensaje INIT recibido, iniciando autenticación');
        setAuthParams({
          email: message.email,
          action: message.action || 'authenticate',
          nonce: message.nonce
        });
      }
    };

    window.addEventListener('message', handleMessage);
    
    // Notificar al padre que estamos listos
    if (window.opener) {
      const readyMessage: PopupMessage = { type: 'WEBAUTHN_INIT' };
      window.opener.postMessage(readyMessage, getExpectedPopupOrigin());
      console.log('✅ [WEBAUTHN-POPUP] Mensaje READY enviado al padre');
    }

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Ejecutar autenticación cuando recibimos los parámetros
  useEffect(() => {
    if (!authParams) return;

    const performWebAuthn = async () => {
      setStatus('processing');
      setMessage(`Iniciando ${authParams.action === 'register' ? 'registro' : 'autenticación'} biométrica...`);
      
      try {
        console.log('🔐 [WEBAUTHN-POPUP] Ejecutando WebAuthn:', authParams.action);
        
        if (authParams.action === 'authenticate') {
          // Autenticación
          const result = await webauthnService.authenticateUser(authParams.email);
          console.log('✅ [WEBAUTHN-POPUP] Autenticación exitosa');
          
          setStatus('success');
          setMessage('Autenticación biométrica exitosa');
          
          // Enviar resultado al padre
          const successMessage: PopupMessage = {
            type: 'WEBAUTHN_SUCCESS',
            credential: result.credential,
            challengeKey: result.challengeKey,
            nonce: authParams.nonce
          };
          
          if (window.opener) {
            window.opener.postMessage(successMessage, getExpectedPopupOrigin());
            console.log('📤 [WEBAUTHN-POPUP] Resultado enviado al padre');
            
            // Cerrar popup después de un breve delay
            setTimeout(() => {
              console.log('🔒 [WEBAUTHN-POPUP] Cerrando popup');
              window.close();
            }, 1500);
          }
          
        } else {
          // Registro
          const credential = await webauthnService.registerCredential(authParams.email!);
          console.log('✅ [WEBAUTHN-POPUP] Registro exitoso');
          
          setStatus('success');
          setMessage('Registro biométrico exitoso');
          
          // Enviar resultado al padre
          const successMessage: PopupMessage = {
            type: 'WEBAUTHN_SUCCESS',
            credential: credential,
            nonce: authParams.nonce
          };
          
          if (window.opener) {
            window.opener.postMessage(successMessage, getExpectedPopupOrigin());
            console.log('📤 [WEBAUTHN-POPUP] Resultado enviado al padre');
            
            // Cerrar popup después de un breve delay
            setTimeout(() => {
              console.log('🔒 [WEBAUTHN-POPUP] Cerrando popup');
              window.close();
            }, 1500);
          }
        }
        
      } catch (error: any) {
        console.error('❌ [WEBAUTHN-POPUP] Error en WebAuthn:', error);
        
        setStatus('error');
        setMessage('Error en autenticación biométrica');
        setErrorDetails(error.message || 'Error desconocido');
        
        // Enviar error al padre
        const errorMessage: PopupMessage = {
          type: 'WEBAUTHN_ERROR',
          error: error.message || 'Error desconocido',
          nonce: authParams.nonce
        };
        
        if (window.opener) {
          window.opener.postMessage(errorMessage, getExpectedPopupOrigin());
          console.log('📤 [WEBAUTHN-POPUP] Error enviado al padre');
        }
      }
    };

    performWebAuthn();
  }, [authParams]);

  const getIcon = () => {
    if (status === 'processing') {
      return <Loader2 className="w-16 h-16 text-primary animate-spin" />;
    } else if (status === 'success') {
      return <CheckCircle className="w-16 h-16 text-green-500" />;
    } else if (status === 'error') {
      return <AlertCircle className="w-16 h-16 text-red-500" />;
    } else {
      return <Shield className="w-16 h-16 text-primary" />;
    }
  };

  const getStatusColor = () => {
    if (status === 'success') return 'border-green-200 bg-green-50';
    if (status === 'error') return 'border-red-200 bg-red-50';
    if (status === 'processing') return 'border-blue-200 bg-blue-50';
    return 'border-gray-200 bg-white';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className={`w-full max-w-md shadow-2xl ${getStatusColor()} transition-all duration-300`}>
        <CardHeader className="text-center pb-6">
          <div className="flex justify-center mb-4">
            {getIcon()}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'init' && 'Autenticación Biométrica'}
            {status === 'processing' && 'Autenticando...'}
            {status === 'success' && '¡Éxito!'}
            {status === 'error' && 'Error'}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="text-center">
          {status === 'processing' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Fingerprint className="w-5 h-5" />
                <span>Usa tu Touch ID o Face ID cuando se solicite</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-3/4"></div>
              </div>
            </div>
          )}
          
          {status === 'success' && (
            <div className="space-y-3">
              <p className="text-green-700 font-medium">
                Autenticación completada exitosamente
              </p>
              <p className="text-sm text-muted-foreground">
                Esta ventana se cerrará automáticamente...
              </p>
            </div>
          )}
          
          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-red-700 font-medium">
                {errorDetails}
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.close()}
                className="w-full"
              >
                Cerrar ventana
              </Button>
            </div>
          )}
          
          {status === 'init' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Esperando instrucciones de la ventana principal...
              </p>
              <div className="flex items-center justify-center gap-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce delay-200"></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
