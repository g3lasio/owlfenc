/**
 * Servicio de Detección de Autenticación Biométrica
 * Detecta soporte para WebAuthn y authenticators de plataforma (Face ID, Touch ID, etc.)
 */

export interface BiometricCapabilities {
  isWebAuthnSupported: boolean;
  isPlatformAuthenticatorAvailable: boolean;
  isUserVerifyingPlatformAuthenticatorAvailable: boolean;
  supportedMethods: string[];
  deviceInfo: {
    isMobile: boolean;
    isIOS: boolean;
    isAndroid: boolean;
    hasTouch: boolean;
    browserName: string;
  };
}

export interface BiometricDetectionResult {
  supported: boolean;
  capabilities: BiometricCapabilities;
  message: string;
  recommendedMethod?: string;
}

/**
 * Detecta las capacidades biométricas del dispositivo y navegador actual
 */
export async function detectBiometricCapabilities(): Promise<BiometricDetectionResult> {
  console.log('🔐 [BIOMETRIC-DETECTION] Iniciando detección de capacidades...');

  const deviceInfo = getDeviceInfo();
  console.log('📱 [BIOMETRIC-DETECTION] Información del dispositivo:', deviceInfo);

  // Verificar soporte básico de WebAuthn
  const isWebAuthnSupported = typeof window !== 'undefined' && 
    'credentials' in navigator && 
    'create' in navigator.credentials &&
    typeof PublicKeyCredential !== 'undefined';

  if (!isWebAuthnSupported) {
    console.log('❌ [BIOMETRIC-DETECTION] WebAuthn no soportado');
    return {
      supported: false,
      capabilities: createEmptyCapabilities(deviceInfo),
      message: 'Tu navegador no soporta autenticación biométrica'
    };
  }

  console.log('✅ [BIOMETRIC-DETECTION] WebAuthn soportado');

  let isPlatformAuthenticatorAvailable = false;
  let isUserVerifyingPlatformAuthenticatorAvailable = false;

  try {
    // Verificar disponibilidad de authenticator de plataforma
    if (PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      isUserVerifyingPlatformAuthenticatorAvailable = 
        await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    }

    if (PublicKeyCredential.isConditionalMediationAvailable) {
      isPlatformAuthenticatorAvailable = 
        await PublicKeyCredential.isConditionalMediationAvailable();
    }

    console.log('🔍 [BIOMETRIC-DETECTION] Platform authenticator:', isUserVerifyingPlatformAuthenticatorAvailable);
    console.log('🔍 [BIOMETRIC-DETECTION] Conditional mediation:', isPlatformAuthenticatorAvailable);

  } catch (error) {
    console.warn('⚠️ [BIOMETRIC-DETECTION] Error verificando authenticator:', error);
  }

  // Lógica mejorada para iOS: si es iOS y tiene WebAuthn, asumir soporte biométrico
  // Ya que Apple Safari puede no reportar correctamente isUserVerifyingPlatformAuthenticatorAvailable
  const effectiveHasAuthenticator = isUserVerifyingPlatformAuthenticatorAvailable || 
    (deviceInfo.isIOS && deviceInfo.hasTouch);

  const supportedMethods = getSupportedBiometricMethods(deviceInfo, effectiveHasAuthenticator);
  const recommendedMethod = getRecommendedMethod(deviceInfo, supportedMethods);

  const capabilities: BiometricCapabilities = {
    isWebAuthnSupported,
    isPlatformAuthenticatorAvailable,
    isUserVerifyingPlatformAuthenticatorAvailable,
    supportedMethods,
    deviceInfo
  };

  const isSupported = isWebAuthnSupported && effectiveHasAuthenticator;
  const message = generateCapabilityMessage(deviceInfo, isSupported, supportedMethods);

  console.log('🎯 [BIOMETRIC-DETECTION] Resultado final:', { isSupported, supportedMethods, recommendedMethod });

  return {
    supported: isSupported,
    capabilities,
    message,
    recommendedMethod
  };
}

/**
 * Obtiene información detallada del dispositivo y navegador
 */
function getDeviceInfo() {
  const userAgent = navigator.userAgent;
  const isMobile = /iPhone|iPad|iPod|Android|BlackBerry|Opera Mini|IEMobile|WPDesktop/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Detección específica de dispositivos Apple
  const isIPad = /iPad/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPhone = /iPhone/.test(userAgent);
  const isIPod = /iPod/.test(userAgent);
  
  let browserName = 'Unknown';
  if (userAgent.includes('Chrome')) browserName = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browserName = 'Safari';
  else if (userAgent.includes('Firefox')) browserName = 'Firefox';
  else if (userAgent.includes('Edge')) browserName = 'Edge';

  return {
    isMobile,
    isIOS,
    isAndroid,
    hasTouch,
    browserName,
    isIPad,
    isIPhone,
    isIPod
  };
}

/**
 * Determina los métodos biométricos soportados según el dispositivo específico
 */
function getSupportedBiometricMethods(deviceInfo: any, hasAuthenticator: boolean): string[] {
  if (!hasAuthenticator) return [];

  const methods: string[] = [];

  if (deviceInfo.isIOS) {
    // Para dispositivos iOS específicos
    if (deviceInfo.isIPad) {
      methods.push('Touch ID');
    } else if (deviceInfo.isIPhone) {
      methods.push('Face ID');
    } else {
      // Otros dispositivos iOS o no específicamente identificados
      methods.push('Face ID', 'Touch ID');
    }
  } else if (deviceInfo.isAndroid) {
    methods.push('Huella Digital', 'Reconocimiento Facial');
  } else {
    methods.push('Windows Hello', 'Touch ID', 'Huella Digital');
  }

  return methods;
}

/**
 * Recomienda el mejor método según el dispositivo específico
 */
function getRecommendedMethod(deviceInfo: any, supportedMethods: string[]): string | undefined {
  // Para dispositivos iOS específicos, determinar el método correcto
  if (deviceInfo.isIOS) {
    if (deviceInfo.isIPad) {
      return 'Touch ID';
    } else if (deviceInfo.isIPhone) {
      return 'Face ID';
    } else {
      return 'Touch ID / Face ID';
    }
  } else if (deviceInfo.isAndroid) {
    return 'Huella Digital';
  } else {
    return 'Windows Hello';
  }

  if (supportedMethods.length === 0) return undefined;
}

/**
 * Genera mensaje informativo sobre las capacidades detectadas
 */
function generateCapabilityMessage(deviceInfo: any, isSupported: boolean, methods: string[]): string {
  if (!isSupported) {
    if (deviceInfo.isMobile) {
      return 'Autenticación biométrica no disponible en este dispositivo';
    } else {
      return 'Autenticación biométrica no configurada. Configura Windows Hello o Touch ID';
    }
  }

  if (deviceInfo.isIOS) {
    return `Iniciar sesión con ${methods.join(' o ')}`;
  } else if (deviceInfo.isAndroid) {
    return 'Iniciar sesión con huella digital o reconocimiento facial';
  } else {
    return 'Iniciar sesión con Windows Hello';
  }
}

/**
 * Crea objeto de capacidades vacío
 */
function createEmptyCapabilities(deviceInfo: any): BiometricCapabilities {
  return {
    isWebAuthnSupported: false,
    isPlatformAuthenticatorAvailable: false,
    isUserVerifyingPlatformAuthenticatorAvailable: false,
    supportedMethods: [],
    deviceInfo
  };
}

/**
 * Verifica si el dispositivo y navegador soportan WebAuthn
 */
export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && 
    'credentials' in navigator && 
    'create' in navigator.credentials &&
    typeof PublicKeyCredential !== 'undefined';
}

/**
 * Verifica rápidamente si hay soporte biométrico (sin async)
 */
export function hasBasicBiometricSupport(): boolean {
  const deviceInfo = getDeviceInfo();
  const hasWebAuthn = isWebAuthnSupported();
  
  // En móviles es más probable que tengan biometría configurada
  if (deviceInfo.isMobile && hasWebAuthn) {
    return true;
  }
  
  // En desktop puede ser más variable
  return hasWebAuthn;
}

/**
 * Obtiene una descripción rápida del método disponible
 */
export function getBiometricMethodDescription(): string {
  const deviceInfo = getDeviceInfo();
  
  if (deviceInfo.isIOS) {
    return 'Face ID / Touch ID';
  } else if (deviceInfo.isAndroid) {
    return 'Huella Digital';
  } else {
    return 'Biometría';
  }
}