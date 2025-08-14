/**
 * Sistema de persistencia mejorado para mantener sesiones por 30 días
 * con detección de cambio de dispositivo
 */

import { setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from './firebase';
import { deviceFingerprintService } from './device-fingerprint';

interface PersistentSession {
  userId: string;
  email: string;
  deviceFingerprint: string;
  createdAt: number;
  lastAccess: number;
  rememberMe: boolean;
}

class EnhancedPersistenceService {
  private readonly SESSION_KEY = 'persistent_session';
  private readonly SESSION_DURATION_DAYS = 30;
  private readonly SESSION_DURATION_MS = this.SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000;

  /**
   * Configurar persistencia de Firebase según opción "Recordarme"
   */
  async configurePersistence(rememberMe: boolean): Promise<void> {
    try {
      if (rememberMe) {
        // Persistencia local por 30 días
        await setPersistence(auth, browserLocalPersistence);
        console.log('🔐 [PERSISTENCE] Persistencia LOCAL configurada (30 días)');
      } else {
        // Solo durante la sesión del navegador
        await setPersistence(auth, browserSessionPersistence);
        console.log('🔐 [PERSISTENCE] Persistencia de SESIÓN configurada');
      }
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error configurando persistencia:', error);
      throw error;
    }
  }

  /**
   * Crear sesión persistente
   */
  createPersistentSession(userId: string, email: string, rememberMe: boolean): void {
    if (!rememberMe) {
      // Si no quiere ser recordado, limpiar cualquier sesión existente
      this.clearPersistentSession();
      return;
    }

    try {
      const deviceFingerprint = deviceFingerprintService.initializeDeviceTracking();
      
      const session: PersistentSession = {
        userId,
        email,
        deviceFingerprint: deviceFingerprint.id,
        createdAt: Date.now(),
        lastAccess: Date.now(),
        rememberMe
      };

      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      console.log('✅ [PERSISTENCE] Sesión persistente creada para:', email);
      
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error creando sesión persistente:', error);
    }
  }

  /**
   * Validar sesión persistente existente
   */
  validatePersistentSession(): { valid: boolean; reason?: string; session?: PersistentSession } {
    try {
      const saved = localStorage.getItem(this.SESSION_KEY);
      if (!saved) {
        return { valid: false, reason: 'No hay sesión guardada' };
      }

      const session: PersistentSession = JSON.parse(saved);
      
      // Verificar expiración
      const age = Date.now() - session.createdAt;
      if (age > this.SESSION_DURATION_MS) {
        console.log('⏰ [PERSISTENCE] Sesión expirada por tiempo');
        this.clearPersistentSession();
        return { valid: false, reason: 'Sesión expirada (30 días)' };
      }

      // Verificar dispositivo
      if (!deviceFingerprintService.isCurrentDevice()) {
        console.log('🔄 [PERSISTENCE] Dispositivo diferente detectado');
        this.clearPersistentSession();
        return { valid: false, reason: 'Dispositivo diferente detectado' };
      }

      // Actualizar último acceso
      session.lastAccess = Date.now();
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));

      console.log('✅ [PERSISTENCE] Sesión persistente válida para:', session.email);
      return { valid: true, session };

    } catch (error) {
      console.error('❌ [PERSISTENCE] Error validando sesión persistente:', error);
      this.clearPersistentSession();
      return { valid: false, reason: 'Error de validación' };
    }
  }

  /**
   * Actualizar última actividad de la sesión
   */
  updateLastActivity(): void {
    try {
      const saved = localStorage.getItem(this.SESSION_KEY);
      if (!saved) return;

      const session: PersistentSession = JSON.parse(saved);
      session.lastAccess = Date.now();
      localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
      
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error actualizando actividad:', error);
    }
  }

  /**
   * Limpiar sesión persistente
   */
  clearPersistentSession(): void {
    try {
      localStorage.removeItem(this.SESSION_KEY);
      deviceFingerprintService.clearFingerprint();
      console.log('🗑️ [PERSISTENCE] Sesión persistente eliminada');
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error eliminando sesión:', error);
    }
  }

  /**
   * Obtener información de la sesión actual
   */
  getSessionInfo(): PersistentSession | null {
    try {
      const saved = localStorage.getItem(this.SESSION_KEY);
      if (!saved) return null;
      
      return JSON.parse(saved) as PersistentSession;
    } catch (error) {
      console.error('❌ [PERSISTENCE] Error obteniendo info de sesión:', error);
      return null;
    }
  }

  /**
   * Verificar si hay una sesión "recordarme" activa
   */
  hasRememberMeSession(): boolean {
    const session = this.getSessionInfo();
    return session?.rememberMe === true;
  }

  /**
   * Inicializar monitoreo de actividad
   */
  initActivityMonitoring(): void {
    // Actualizar actividad en eventos de usuario
    const events = ['click', 'keypress', 'scroll', 'mousemove'];
    let lastActivity = Date.now();
    
    const updateActivity = () => {
      const now = Date.now();
      // Solo actualizar cada 5 minutos para no saturar localStorage
      if (now - lastActivity > 5 * 60 * 1000) {
        this.updateLastActivity();
        lastActivity = now;
      }
    };

    events.forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Limpiar al cerrar ventana si no es "recordarme"
    window.addEventListener('beforeunload', () => {
      const session = this.getSessionInfo();
      if (session && !session.rememberMe) {
        this.clearPersistentSession();
      }
    });
  }
}

export const enhancedPersistenceService = new EnhancedPersistenceService();