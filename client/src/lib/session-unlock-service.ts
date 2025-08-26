/**
 * 🔐 SESSION UNLOCK SERVICE
 * Biometría para desbloquear sesiones Firebase guardadas (NO autenticación directa)
 * 
 * Concepto: La biometría NO es un proveedor externo de auth, sino desbloqueo local
 * de una sesión Firebase ya existente usando el refresh token guardado.
 */

import { auth } from './firebase';
import { signInWithCustomToken } from 'firebase/auth';
import { webauthnService } from './webauthn-service';
import { deviceFingerprintService } from './device-fingerprint';

interface SecureSessionData {
  userId: string;
  email: string;
  refreshToken: string;
  deviceFingerprint: string;
  biometricCredentialId: string;
  createdAt: number;
  lastUnlock: number;
  sessionDurationDays: number;
}

interface SessionUnlockResult {
  success: boolean;
  user?: any;
  error?: string;
  needsReauth?: boolean;
}

export class SessionUnlockService {
  private static instance: SessionUnlockService;
  private readonly SECURE_SESSION_KEY = 'secure_biometric_session';
  private readonly DEFAULT_SESSION_DAYS = 30;

  public static getInstance(): SessionUnlockService {
    if (!SessionUnlockService.instance) {
      SessionUnlockService.instance = new SessionUnlockService();
    }
    return SessionUnlockService.instance;
  }

  /**
   * Registrar desbloqueo biométrico después del login Firebase exitoso
   * IMPORTANTE: Solo se llama DESPUÉS de login con Firebase
   */
  async registerSessionUnlock(firebaseUser: any, rememberDays: number = 30): Promise<boolean> {
    console.log('🔐 [SESSION-UNLOCK] Registrando desbloqueo biométrico para:', firebaseUser.email);

    try {
      // 1. Obtener refresh token de Firebase (token persistente)
      const refreshToken = firebaseUser.refreshToken;
      if (!refreshToken) {
        throw new Error('No se pudo obtener refresh token de Firebase');
      }

      console.log('🔑 [SESSION-UNLOCK] Refresh token obtenido');

      // 2. Registrar credencial WebAuthn para desbloqueo (NO para autenticación)
      const credential = await webauthnService.registerCredential(firebaseUser.email);
      
      console.log('✅ [SESSION-UNLOCK] Credencial WebAuthn registrada:', credential.id);

      // 3. Guardar datos de sesión de forma segura
      const deviceFingerprint = deviceFingerprintService.initializeDeviceTracking();
      
      const secureSession: SecureSessionData = {
        userId: firebaseUser.uid,
        email: firebaseUser.email,
        refreshToken: refreshToken,
        deviceFingerprint: deviceFingerprint.id,
        biometricCredentialId: credential.id,
        createdAt: Date.now(),
        lastUnlock: Date.now(),
        sessionDurationDays: rememberDays
      };

      // Guardar sesión encriptada (en producción usar encryption real)
      const encryptedSession = this.encryptSessionData(secureSession);
      localStorage.setItem(this.SECURE_SESSION_KEY, encryptedSession);

      console.log('🎉 [SESSION-UNLOCK] Desbloqueo biométrico configurado exitosamente');
      return true;

    } catch (error) {
      console.error('❌ [SESSION-UNLOCK] Error registrando desbloqueo:', error);
      throw error;
    }
  }

  /**
   * Verificar si hay una sesión que se puede desbloquear
   */
  canUnlockSession(): { canUnlock: boolean; email?: string; method?: string } {
    try {
      const sessionData = this.getStoredSessionData();
      if (!sessionData) {
        return { canUnlock: false };
      }

      // Verificar si la sesión no ha expirado
      const age = Date.now() - sessionData.createdAt;
      const maxAge = sessionData.sessionDurationDays * 24 * 60 * 60 * 1000;
      
      if (age > maxAge) {
        console.log('⏰ [SESSION-UNLOCK] Sesión expirada');
        this.clearStoredSession();
        return { canUnlock: false };
      }

      // Verificar dispositivo
      if (!deviceFingerprintService.isCurrentDevice()) {
        console.log('🔄 [SESSION-UNLOCK] Dispositivo diferente detectado');
        this.clearStoredSession();
        return { canUnlock: false };
      }

      // Determinar método biométrico disponible
      const deviceInfo = deviceFingerprintService.getDeviceInfo();
      let method = 'biometría';
      if (deviceInfo.isIOS) {
        method = 'Face ID / Touch ID';
      } else if (deviceInfo.isAndroid) {
        method = 'huella digital';
      }

      console.log('✅ [SESSION-UNLOCK] Sesión disponible para desbloqueo');
      return { 
        canUnlock: true, 
        email: sessionData.email,
        method 
      };

    } catch (error) {
      console.error('❌ [SESSION-UNLOCK] Error verificando sesión:', error);
      return { canUnlock: false };
    }
  }

  /**
   * Desbloquear sesión usando biometría
   * CONCEPTO: Biometría desbloquea → usa refresh token → restaura Firebase
   */
  async unlockSession(): Promise<SessionUnlockResult> {
    console.log('🔓 [SESSION-UNLOCK] Iniciando desbloqueo biométrico...');

    try {
      // 1. Verificar que hay sesión para desbloquear
      const sessionData = this.getStoredSessionData();
      if (!sessionData) {
        return { 
          success: false, 
          error: 'No hay sesión guardada para desbloquear',
          needsReauth: true 
        };
      }

      console.log('📱 [SESSION-UNLOCK] Solicitando verificación biométrica...');

      // 2. Verificación biométrica (NO autenticación)
      await webauthnService.authenticateUser(sessionData.email);
      
      console.log('✅ [SESSION-UNLOCK] Verificación biométrica exitosa');

      // 3. Usar refresh token para restaurar sesión Firebase
      console.log('🔑 [SESSION-UNLOCK] Restaurando sesión Firebase con refresh token...');
      
      // Solicitar nuevo custom token usando el refresh token guardado
      const response = await fetch('/api/auth/refresh-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          refreshToken: sessionData.refreshToken,
          credentialId: sessionData.biometricCredentialId 
        })
      });

      if (!response.ok) {
        throw new Error(`Error restaurando sesión: ${response.status}`);
      }

      const { customToken, user: userData } = await response.json();

      // 4. Autenticar con Firebase usando el custom token
      const userCredential = await signInWithCustomToken(auth, customToken);
      
      console.log('🎉 [SESSION-UNLOCK] Sesión Firebase restaurada exitosamente');

      // 5. Actualizar último desbloqueo
      sessionData.lastUnlock = Date.now();
      const encryptedSession = this.encryptSessionData(sessionData);
      localStorage.setItem(this.SECURE_SESSION_KEY, encryptedSession);

      return { 
        success: true, 
        user: userCredential.user 
      };

    } catch (error: any) {
      console.error('❌ [SESSION-UNLOCK] Error en desbloqueo:', error);
      
      // Manejar errores específicos
      let errorMessage = 'Error desbloqueando sesión';
      let needsReauth = false;

      if (error.message?.includes('cancelado') || error.message?.includes('NotAllowedError')) {
        errorMessage = 'Desbloqueo cancelado por el usuario';
      } else if (error.message?.includes('refresh token') || error.message?.includes('token expired')) {
        errorMessage = 'Sesión expirada, necesitas iniciar sesión nuevamente';
        needsReauth = true;
        this.clearStoredSession();
      } else if (error.message?.includes('not found') || error.message?.includes('credential')) {
        errorMessage = 'Credencial biométrica no encontrada';
        needsReauth = true;
        this.clearStoredSession();
      }

      return { 
        success: false, 
        error: errorMessage,
        needsReauth 
      };
    }
  }

  /**
   * Limpiar sesión guardada
   */
  clearStoredSession(): void {
    try {
      localStorage.removeItem(this.SECURE_SESSION_KEY);
      console.log('🗑️ [SESSION-UNLOCK] Sesión guardada eliminada');
    } catch (error) {
      console.error('❌ [SESSION-UNLOCK] Error limpiando sesión:', error);
    }
  }

  /**
   * Obtener datos de sesión guardada (desencriptados)
   */
  private getStoredSessionData(): SecureSessionData | null {
    try {
      const encrypted = localStorage.getItem(this.SECURE_SESSION_KEY);
      if (!encrypted) return null;

      return this.decryptSessionData(encrypted);
    } catch (error) {
      console.error('❌ [SESSION-UNLOCK] Error obteniendo sesión:', error);
      return null;
    }
  }

  /**
   * Encriptar datos de sesión (implementación básica - en producción usar crypto real)
   */
  private encryptSessionData(data: SecureSessionData): string {
    // En producción: usar WebCrypto API para encriptación real
    // Por ahora: base64 encode para demo
    return btoa(JSON.stringify(data));
  }

  /**
   * Desencriptar datos de sesión
   */
  private decryptSessionData(encrypted: string): SecureSessionData {
    // En producción: usar WebCrypto API para desencriptación real
    // Por ahora: base64 decode para demo
    return JSON.parse(atob(encrypted));
  }

  /**
   * Verificar si el dispositivo tiene capacidad biométrica
   */
  async checkBiometricCapability(): Promise<boolean> {
    try {
      const { detectBiometricCapabilities } = await import('./biometric-detection');
      const result = await detectBiometricCapabilities();
      return result.supported;
    } catch (error) {
      console.error('❌ [SESSION-UNLOCK] Error verificando biometría:', error);
      return false;
    }
  }
}

// Export singleton instance
export const sessionUnlockService = SessionUnlockService.getInstance();