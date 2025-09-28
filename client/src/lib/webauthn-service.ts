/**
 * Servicio WebAuthn para Autenticación Biométrica
 * Maneja registro y autenticación con Face ID, Touch ID y huella digital
 */

export interface WebAuthnCredential {
  id: string;
  rawId: string;
  response: {
    clientDataJSON: string;
    attestationObject?: string;
    authenticatorData?: string;
    signature?: string;
    userHandle?: string | null;
  };
  type: string;
}

export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    alg: number;
    type: string;
  }>;
  authenticatorSelection: {
    authenticatorAttachment: 'platform';
    userVerification: 'required';
    requireResidentKey: boolean;
  };
  attestation: string;
  timeout: number;
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  allowCredentials?: Array<{
    id: string;
    type: string;
    transports: string[];
  }>;
  userVerification: string;
  timeout: number;
}

export class WebAuthnService {
  private static instance: WebAuthnService;
  
  public static getInstance(): WebAuthnService {
    if (!WebAuthnService.instance) {
      WebAuthnService.instance = new WebAuthnService();
    }
    return WebAuthnService.instance;
  }

  /**
   * Registra una nueva credencial biométrica para el usuario
   */
  async registerCredential(email: string): Promise<WebAuthnCredential> {
    console.log('🔐 [WEBAUTHN] Iniciando registro de credencial para:', email);

    try {
      // Solicitar opciones de registro al servidor con manejo de errores
      console.log('🌐 [WEBAUTHN] Solicitando opciones de registro al servidor');
      const optionsResponse = await fetch('/api/webauthn/register/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      console.log('📡 [WEBAUTHN] Respuesta del servidor:', optionsResponse.status);
      
      if (!optionsResponse.ok) {
        const errorData = await optionsResponse.text();
        console.error('❌ [WEBAUTHN] Error del servidor:', errorData);
        throw new Error(`Server error: ${optionsResponse.status} - ${errorData}`);
      }

      const options: WebAuthnRegistrationOptions = await optionsResponse.json();
      console.log('📝 [WEBAUTHN] Opciones de registro recibidas');

      // Convertir opciones para WebAuthn API
      const publicKeyOptions = this.prepareRegistrationOptions(options);

      console.log('🎯 [WEBAUTHN] Iniciando creación de credencial...');
      
      // Crear credencial usando WebAuthn
      const credential = await navigator.credentials.create({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('No se pudo crear la credencial');
      }

      console.log('✅ [WEBAUTHN] Credencial creada exitosamente');

      // Preparar credencial para enviar al servidor
      const webauthnCredential = this.processRegistrationCredential(credential);

      // Completar registro en el servidor
      const completeResponse = await fetch('/api/webauthn/register/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          credential: webauthnCredential
        }),
      });

      if (!completeResponse.ok) {
        throw new Error(`Error completando registro: ${completeResponse.statusText}`);
      }

      const result = await completeResponse.json();
      console.log('🎉 [WEBAUTHN] Registro completado exitosamente');

      return webauthnCredential;

    } catch (error: any) {
      console.error('❌ [WEBAUTHN] Error en registro:', error);
      
      // Manejar errores específicos de WebAuthn
      if (error.name === 'NotAllowedError') {
        throw new Error('Registro cancelado o no autorizado');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Autenticación biométrica no soportada');
      } else if (error.name === 'SecurityError') {
        throw new Error('Error de seguridad. Verifica que estés en HTTPS');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('Ya tienes una credencial registrada en este dispositivo');
      }
      
      throw error;
    }
  }

  /**
   * Autentica al usuario usando credencial biométrica
   * Implementa mejores prácticas para iOS Safari
   */
  async authenticateUser(email?: string): Promise<{ credential: WebAuthnCredential, challengeKey: string, options: any }> {
    console.log('🔐 [WEBAUTHN] Iniciando autenticación biométrica');

    try {
      // Verificar soporte antes de proceder
      await this.verifyWebAuthnSupport();

      // Solicitar opciones de autenticación al servidor
      const optionsResponse = await fetch('/api/webauthn/authenticate/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        const errorText = await optionsResponse.text();
        throw new Error(`Error del servidor (${optionsResponse.status}): ${errorText}`);
      }

      const options: WebAuthnAuthenticationOptions = await optionsResponse.json();
      console.log('📝 [WEBAUTHN] Opciones de autenticación recibidas');

      // Convertir opciones para WebAuthn API con mejores prácticas iOS
      const publicKeyOptions = this.prepareAuthenticationOptions(options);

      console.log('🎯 [WEBAUTHN] Iniciando autenticación...');
      
      // CRÍTICO: Obtener credencial usando WebAuthn con timeout
      const assertion = await Promise.race([
        navigator.credentials.get({
          publicKey: publicKeyOptions
        }) as Promise<PublicKeyCredential>,
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout: Touch ID authentication timed out')), 60000)
        )
      ]);

      if (!assertion) {
        throw new Error('No se pudo obtener la credencial');
      }

      console.log('✅ [WEBAUTHN] Autenticación exitosa');

      // Preparar assertion para enviar al servidor
      const webauthnCredential = this.processAuthenticationCredential(assertion);

      // Retornar credencial, challengeKey y opciones para que el componente los use
      return {
        credential: webauthnCredential,
        challengeKey: options.challenge,
        options: options
      };

    } catch (error: any) {
      console.error('❌ [WEBAUTHN] Error en autenticación:', error);
      
      // Manejo avanzado de errores específicos de iOS Safari
      return this.handleWebAuthnError(error);
    }
  }

  /**
   * Prepara las opciones de registro para WebAuthn API
   */
  private prepareRegistrationOptions(options: WebAuthnRegistrationOptions): PublicKeyCredentialCreationOptions {
    return {
      challenge: this.base64urlToArrayBuffer(options.challenge),
      rp: options.rp,
      user: {
        ...options.user,
        id: this.base64urlToArrayBuffer(options.user.id),
      },
      pubKeyCredParams: options.pubKeyCredParams as any,
      authenticatorSelection: options.authenticatorSelection,
      attestation: options.attestation as any,
      timeout: options.timeout,
    };
  }

  /**
   * Prepara las opciones de autenticación para WebAuthn API
   * Implementa mejores prácticas para iOS Safari Touch ID
   */
  private prepareAuthenticationOptions(options: WebAuthnAuthenticationOptions): PublicKeyCredentialRequestOptions {
    // Configurar allowCredentials con transports apropiados para iOS Touch ID
    const allowCredentials = options.allowCredentials?.map(cred => {
      const credential = {
        id: this.base64urlToArrayBuffer(cred.id),
        type: 'public-key' as const,
        // CRÍTICO: iOS Safari Touch ID requiere 'internal' transport
        transports: this.isIOSSafari() 
          ? ['internal' as AuthenticatorTransport]
          : (cred.transports as AuthenticatorTransport[] || ['internal' as AuthenticatorTransport])
      };
      return credential;
    }) || [];

    return {
      challenge: this.base64urlToArrayBuffer(options.challenge),
      allowCredentials,
      userVerification: 'required', // Forzar verificación biométrica
      timeout: options.timeout || 60000, // 60 segundos timeout por defecto
    };
  }

  /**
   * Procesa la credencial de registro para enviar al servidor
   */
  private processRegistrationCredential(credential: PublicKeyCredential): WebAuthnCredential {
    const response = credential.response as AuthenticatorAttestationResponse;
    
    return {
      id: credential.id,
      rawId: this.arrayBufferToBase64url(credential.rawId),
      response: {
        clientDataJSON: this.arrayBufferToBase64url(response.clientDataJSON),
        attestationObject: this.arrayBufferToBase64url(response.attestationObject),
      },
      type: credential.type,
    };
  }

  /**
   * Procesa la credencial de autenticación para enviar al servidor
   */
  private processAuthenticationCredential(credential: PublicKeyCredential): WebAuthnCredential {
    const response = credential.response as AuthenticatorAssertionResponse;
    
    return {
      id: credential.id,
      rawId: this.arrayBufferToBase64url(credential.rawId),
      response: {
        clientDataJSON: this.arrayBufferToBase64url(response.clientDataJSON),
        authenticatorData: this.arrayBufferToBase64url(response.authenticatorData),
        signature: this.arrayBufferToBase64url(response.signature),
        userHandle: response.userHandle ? this.arrayBufferToBase64url(response.userHandle) : null,
      },
      type: credential.type,
    };
  }

  /**
   * Convierte base64url a ArrayBuffer
   */
  private base64urlToArrayBuffer(base64url: string): ArrayBuffer {
    // Añadir padding si es necesario
    const padding = '='.repeat((4 - base64url.length % 4) % 4);
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/') + padding;
    
    const binaryString = atob(base64);
    const buffer = new ArrayBuffer(binaryString.length);
    const view = new Uint8Array(buffer);
    
    for (let i = 0; i < binaryString.length; i++) {
      view[i] = binaryString.charCodeAt(i);
    }
    
    return buffer;
  }

  /**
   * Verifica si es iOS Safari (crítico para WebAuthn)
   */
  private isIOSSafari(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && 
           /Safari/.test(navigator.userAgent);
  }

  /**
   * Verifica soporte de WebAuthn antes de usar
   */
  private async verifyWebAuthnSupport(): Promise<void> {
    if (!window.PublicKeyCredential) {
      throw new Error('WebAuthn no soportado en este navegador');
    }

    try {
      const available = await Promise.race([
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 3000))
      ]);
      
      if (!available) {
        throw new Error('Autenticador biométrico no disponible');
      }
    } catch (error) {
      console.error('❌ [WEBAUTHN] Error verificando soporte:', error);
      throw new Error('Error verificando capacidades biométricas');
    }
  }

  /**
   * Manejo avanzado de errores específicos de iOS Safari
   */
  private handleWebAuthnError(error: any): never {
    let errorMessage = 'Error en la autenticación biométrica';
    
    if (error.name === 'NotAllowedError') {
      if (error.message?.includes('User gesture is not detected')) {
        errorMessage = 'Por favor, toca el botón biométrico directamente';
      } else if (error.message?.includes('cancelled by the user')) {
        errorMessage = 'Autenticación cancelada por el usuario';
      } else if (error.message?.includes('Operation failed')) {
        errorMessage = 'Touch ID/Face ID falló. Intenta de nuevo';
      } else {
        errorMessage = 'Acceso denegado o cancelado';
      }
    } else if (error.name === 'NotSupportedError') {
      errorMessage = 'Autenticación biométrica no soportada en este dispositivo';
    } else if (error.name === 'SecurityError') {
      errorMessage = 'Error de seguridad. Verifica que uses HTTPS';
    } else if (error.name === 'InvalidStateError') {
      errorMessage = 'No se encontraron credenciales biométricas registradas';
    } else if (error.name === 'AbortError') {
      errorMessage = 'Autenticación interrumpida o tiempo agotado';
    } else if (error.message?.includes('Timeout')) {
      errorMessage = 'Tiempo agotado. Intenta de nuevo';
    }
    
    throw new Error(errorMessage);
  }

  /**
   * Convierte ArrayBuffer a base64url
   */
  private arrayBufferToBase64url(buffer: ArrayBuffer): string {
    const view = new Uint8Array(buffer);
    let binary = '';
    
    for (let i = 0; i < view.byteLength; i++) {
      binary += String.fromCharCode(view[i]);
    }
    
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }
}

// Export singleton instance
export const webauthnService = WebAuthnService.getInstance();