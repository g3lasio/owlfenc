/**
 * Sistema de huella digital del dispositivo para detectar cambios de dispositivo
 * y mejorar la seguridad del "recordar sesión"
 */

interface DeviceFingerprint {
  id: string;
  userAgent: string;
  screenResolution: string;
  timezone: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  timestamp: number;
}

class DeviceFingerprintService {
  private readonly STORAGE_KEY = 'device_fingerprint';
  private readonly DEVICE_TOLERANCE_DAYS = 30; // Días para considerar el mismo dispositivo

  /**
   * Generar huella digital única del dispositivo
   */
  generateFingerprint(): DeviceFingerprint {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    const canvasFingerprint = canvas.toDataURL();

    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.platform,
      navigator.cookieEnabled,
      canvasFingerprint.slice(-50), // Últimos 50 caracteres del canvas
      navigator.hardwareConcurrency || 'unknown',
      (navigator as any).deviceMemory || 'unknown'
    ];

    // Crear hash simple de los componentes
    const fingerprint = this.simpleHash(components.join('|'));

    return {
      id: fingerprint,
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      timestamp: Date.now()
    };
  }

  /**
   * Hash simple para generar ID único
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Guardar huella digital del dispositivo
   */
  saveFingerprint(fingerprint: DeviceFingerprint): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fingerprint));
      console.log('🔐 [DEVICE-FINGERPRINT] Huella digital guardada:', fingerprint.id);
    } catch (error) {
      console.error('❌ [DEVICE-FINGERPRINT] Error guardando huella digital:', error);
    }
  }

  /**
   * Obtener huella digital guardada
   */
  getSavedFingerprint(): DeviceFingerprint | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (!saved) return null;

      const fingerprint = JSON.parse(saved) as DeviceFingerprint;
      
      // Verificar que no sea muy antigua
      const daysSinceCreated = (Date.now() - fingerprint.timestamp) / (1000 * 60 * 60 * 24);
      if (daysSinceCreated > this.DEVICE_TOLERANCE_DAYS) {
        console.log('🕒 [DEVICE-FINGERPRINT] Huella digital expirada, removiendo');
        this.clearFingerprint();
        return null;
      }

      return fingerprint;
    } catch (error) {
      console.error('❌ [DEVICE-FINGERPRINT] Error obteniendo huella digital:', error);
      return null;
    }
  }

  /**
   * Verificar si el dispositivo actual coincide con el guardado
   */
  isCurrentDevice(): boolean {
    const saved = this.getSavedFingerprint();
    if (!saved) return false;

    const current = this.generateFingerprint();
    
    // Comparar componentes principales (permitir algunos cambios menores)
    const sameUserAgent = saved.userAgent === current.userAgent;
    const samePlatform = saved.platform === current.platform;
    const sameLanguage = saved.language === current.language;
    const sameTimezone = saved.timezone === current.timezone;
    
    // Permitir cambios en resolución de pantalla (ventana redimensionada, etc.)
    const similarResolution = this.compareResolutions(saved.screenResolution, current.screenResolution);

    const isMatch = sameUserAgent && samePlatform && sameLanguage && sameTimezone && similarResolution;
    
    console.log('🔍 [DEVICE-FINGERPRINT] Verificación de dispositivo:', {
      saved: saved.id,
      current: current.id,
      isMatch,
      components: {
        sameUserAgent,
        samePlatform,
        sameLanguage,
        sameTimezone,
        similarResolution
      }
    });

    return isMatch;
  }

  /**
   * Comparar resoluciones permitiendo diferencias menores
   */
  private compareResolutions(saved: string, current: string): boolean {
    if (saved === current) return true;

    // Permitir diferencias menores en resolución (zoom, ventana redimensionada)
    const [savedW, savedH] = saved.split('x').map(Number);
    const [currentW, currentH] = current.split('x').map(Number);
    
    const widthDiff = Math.abs(savedW - currentW) / savedW;
    const heightDiff = Math.abs(savedH - currentH) / savedH;
    
    // Permitir hasta 20% de diferencia en resolución
    return widthDiff <= 0.2 && heightDiff <= 0.2;
  }

  /**
   * Limpiar huella digital guardada
   */
  clearFingerprint(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ [DEVICE-FINGERPRINT] Huella digital eliminada');
    } catch (error) {
      console.error('❌ [DEVICE-FINGERPRINT] Error eliminando huella digital:', error);
    }
  }

  /**
   * Inicializar seguimiento del dispositivo
   */
  initializeDeviceTracking(): DeviceFingerprint {
    const fingerprint = this.generateFingerprint();
    this.saveFingerprint(fingerprint);
    return fingerprint;
  }
}

export const deviceFingerprintService = new DeviceFingerprintService();