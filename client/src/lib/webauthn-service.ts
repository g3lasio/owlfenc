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

      if (!optionsResponse.ok) {
        throw new Error(`Error obteniendo opciones: ${optionsResponse.statusText}`);
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
   */
  async authenticateUser(email?: string): Promise<WebAuthnCredential> {
    console.log('🔐 [WEBAUTHN] Iniciando autenticación biométrica');

    try {
      // Solicitar opciones de autenticación al servidor
      const optionsResponse = await fetch('/api/webauthn/authenticate/begin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!optionsResponse.ok) {
        throw new Error(`Error obteniendo opciones: ${optionsResponse.statusText}`);
      }

      const options: WebAuthnAuthenticationOptions = await optionsResponse.json();
      console.log('📝 [WEBAUTHN] Opciones de autenticación recibidas');

      // Convertir opciones para WebAuthn API
      const publicKeyOptions = this.prepareAuthenticationOptions(options);

      console.log('🎯 [WEBAUTHN] Iniciando autenticación...');
      
      // Obtener credencial usando WebAuthn
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyOptions
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('No se pudo obtener la credencial');
      }

      console.log('✅ [WEBAUTHN] Autenticación exitosa');

      // Preparar assertion para enviar al servidor
      const webauthnCredential = this.processAuthenticationCredential(assertion);

      // Completar autenticación en el servidor
      const completeResponse = await fetch('/api/webauthn/authenticate/complete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          credential: webauthnCredential
        }),
      });

      if (!completeResponse.ok) {
        throw new Error(`Error completando autenticación: ${completeResponse.statusText}`);
      }

      const result = await completeResponse.json();
      console.log('🎉 [WEBAUTHN] Autenticación completada exitosamente');

      return webauthnCredential;

    } catch (error: any) {
      console.error('❌ [WEBAUTHN] Error en autenticación:', error);
      
      // Manejar errores específicos de WebAuthn
      if (error.name === 'NotAllowedError') {
        throw new Error('Autenticación cancelada o no autorizada');
      } else if (error.name === 'NotSupportedError') {
        throw new Error('Autenticación biométrica no soportada');
      } else if (error.name === 'SecurityError') {
        throw new Error('Error de seguridad. Verifica que estés en HTTPS');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('No se encontraron credenciales para este dispositivo');
      }
      
      throw error;
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
   */
  private prepareAuthenticationOptions(options: WebAuthnAuthenticationOptions): PublicKeyCredentialRequestOptions {
    return {
      challenge: this.base64urlToArrayBuffer(options.challenge),
      allowCredentials: options.allowCredentials?.map(cred => ({
        id: this.base64urlToArrayBuffer(cred.id),
        type: 'public-key' as const,
        transports: cred.transports as AuthenticatorTransport[]
      })),
      userVerification: options.userVerification as any,
      timeout: options.timeout,
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