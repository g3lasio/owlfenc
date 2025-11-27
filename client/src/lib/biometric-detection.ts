/**
 * Servicio de Detección de Autenticación Biométrica
 * Detecta soporte para WebAuthn y authenticators de plataforma (Face ID, Touch ID, etc.)
 * 
 * IMPORTANTE: Detección mejorada para dispositivos Apple:
 * - iPhone X y posteriores: Face ID
 * - iPhone 8 y anteriores: Touch ID  
 * - iPad Pro (3rd gen+): Face ID
 * - iPad Air, iPad regular, iPad mini: Touch ID
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
    hasFaceID?: boolean;
    hasTouchID?: boolean;
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
 * Detecta si el dispositivo iOS tiene Face ID basado en características de pantalla
 * 
 * Dispositivos con Face ID:
 * - iPhone X, XS, XS Max, XR (2017-2018)
 * - iPhone 11, 11 Pro, 11 Pro Max (2019)
 * - iPhone 12 mini, 12, 12 Pro, 12 Pro Max (2020)
 * - iPhone 13 mini, 13, 13 Pro, 13 Pro Max (2021)
 * - iPhone 14, 14 Plus, 14 Pro, 14 Pro Max (2022)
 * - iPhone 15, 15 Plus, 15 Pro, 15 Pro Max (2023)
 * - iPhone 16 series (2024)
 * - iPad Pro 11" (all generations)
 * - iPad Pro 12.9" (3rd gen and later)
 * 
 * Estos dispositivos tienen resoluciones de pantalla específicas que podemos detectar
 */
function detectAppleBiometricType(isIPhone: boolean, isIPad: boolean, isIPadPro: boolean): { hasFaceID: boolean; hasTouchID: boolean } {
  // Si no es iOS, retornar false para ambos
  if (!isIPhone && !isIPad) {
    return { hasFaceID: false, hasTouchID: false };
  }
  
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const devicePixelRatio = window.devicePixelRatio || 1;
  
  // Dimensiones lógicas (en puntos CSS)
  const logicalWidth = Math.min(screenWidth, screenHeight);
  const logicalHeight = Math.max(screenWidth, screenHeight);
  
  console.log('📱 [BIOMETRIC-DETECTION] Detectando tipo biométrico Apple:', {
    screenWidth,
    screenHeight,
    devicePixelRatio,
    logicalWidth,
    logicalHeight,
    isIPhone,
    isIPad,
    isIPadPro
  });
  
  // iPad Pro (3rd gen+) tiene Face ID
  if (isIPadPro) {
    // iPad Pro 11" tiene 834x1194 puntos
    // iPad Pro 12.9" tiene 1024x1366 puntos
    // Los iPads Pro con Face ID tienen estas resoluciones específicas
    const isIPadPro11 = (logicalWidth >= 820 && logicalWidth <= 850) && (logicalHeight >= 1180 && logicalHeight <= 1210);
    const isIPadPro129 = (logicalWidth >= 1020 && logicalWidth <= 1030) && (logicalHeight >= 1360 && logicalHeight <= 1380);
    
    if (isIPadPro11 || isIPadPro129) {
      console.log('✅ [BIOMETRIC-DETECTION] iPad Pro con Face ID detectado');
      return { hasFaceID: true, hasTouchID: false };
    }
  }
  
  // iPad regular/Air/mini usa Touch ID
  if (isIPad && !isIPadPro) {
    console.log('✅ [BIOMETRIC-DETECTION] iPad con Touch ID detectado');
    return { hasFaceID: false, hasTouchID: true };
  }
  
  // Para iPhones, detectar por resolución de pantalla
  if (isIPhone) {
    // iPhones con Face ID tienen aspect ratio diferente (aproximadamente 2.16:1 vs 1.78:1 para Touch ID)
    const aspectRatio = logicalHeight / logicalWidth;
    
    // Face ID iPhones tienen aspect ratios mayores a 2.0 debido al notch
    // iPhone X: 375x812 = 2.17:1
    // iPhone 11 Pro: 375x812 = 2.17:1
    // iPhone 12: 390x844 = 2.16:1
    // iPhone 13: 390x844 = 2.16:1
    // iPhone 14: 390x844 = 2.16:1
    // iPhone 14 Pro: 393x852 = 2.17:1
    // iPhone 15: 393x852 = 2.17:1
    
    // Touch ID iPhones:
    // iPhone 8: 375x667 = 1.78:1
    // iPhone SE (2nd/3rd): 375x667 = 1.78:1
    
    const hasFaceIDRatio = aspectRatio >= 2.0;
    
    // También verificar anchura mínima (iPhones antiguos son más angostos)
    // iPhone SE tiene 320 puntos de ancho (dispositivos muy antiguos)
    const isModernWidth = logicalWidth >= 375;
    
    console.log('📐 [BIOMETRIC-DETECTION] Aspect ratio iPhone:', {
      aspectRatio,
      hasFaceIDRatio,
      isModernWidth
    });
    
    if (hasFaceIDRatio && isModernWidth) {
      console.log('✅ [BIOMETRIC-DETECTION] iPhone con Face ID detectado (aspect ratio moderno)');
      return { hasFaceID: true, hasTouchID: false };
    } else {
      console.log('✅ [BIOMETRIC-DETECTION] iPhone con Touch ID detectado (aspect ratio clásico)');
      return { hasFaceID: false, hasTouchID: true };
    }
  }
  
  // iPad sin determinación específica - asumir Touch ID (más común)
  if (isIPad) {
    console.log('⚠️ [BIOMETRIC-DETECTION] iPad sin tipo específico detectado - asumiendo Touch ID');
    return { hasFaceID: false, hasTouchID: true };
  }
  
  return { hasFaceID: false, hasTouchID: false };
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
  
  // Detectar iPad Pro específicamente
  // iPad Pro suele tener mayor resolución y puede detectarse por dimensiones
  const isIPadPro = isIPad && (
    (window.screen.width >= 1024 || window.screen.height >= 1024) || // 12.9"
    (window.screen.width >= 834 || window.screen.height >= 834)      // 11"
  );
  
  let browserName = 'Unknown';
  if (userAgent.includes('Chrome')) browserName = 'Chrome';
  else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) browserName = 'Safari';
  else if (userAgent.includes('Firefox')) browserName = 'Firefox';
  else if (userAgent.includes('Edge')) browserName = 'Edge';

  // Detectar tipo de biometría específica para dispositivos Apple
  const appleBiometricType = detectAppleBiometricType(isIPhone, isIPad, isIPadPro);

  return {
    isMobile,
    isIOS,
    isAndroid,
    hasTouch,
    browserName,
    isIPad,
    isIPhone,
    isIPod,
    isIPadPro,
    hasFaceID: appleBiometricType.hasFaceID,
    hasTouchID: appleBiometricType.hasTouchID
  };
}

/**
 * Determina los métodos biométricos soportados según el dispositivo específico
 * Usa la detección mejorada de Face ID vs Touch ID
 */
function getSupportedBiometricMethods(deviceInfo: any, hasAuthenticator: boolean): string[] {
  if (!hasAuthenticator) return [];

  const methods: string[] = [];

  if (deviceInfo.isIOS) {
    // Usar detección mejorada basada en características del dispositivo
    if (deviceInfo.hasFaceID) {
      methods.push('Face ID');
    } else if (deviceInfo.hasTouchID) {
      methods.push('Touch ID');
    } else {
      // Fallback: si no podemos determinar, ofrecer ambos
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
 * Usa la detección mejorada de Face ID vs Touch ID para dispositivos Apple
 */
function getRecommendedMethod(deviceInfo: any, supportedMethods: string[]): string | undefined {
  // Para dispositivos iOS específicos, usar la detección mejorada
  if (deviceInfo.isIOS) {
    if (deviceInfo.hasFaceID) {
      return 'Face ID';
    } else if (deviceInfo.hasTouchID) {
      return 'Touch ID';
    } else {
      // Si no podemos determinar, mostrar el genérico
      return 'Face ID / Touch ID';
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
 * Usa la detección mejorada de Face ID vs Touch ID para mensajes precisos
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
    // Usar detección mejorada para mensaje preciso
    if (deviceInfo.hasFaceID) {
      return 'Iniciar sesión con Face ID';
    } else if (deviceInfo.hasTouchID) {
      return 'Iniciar sesión con Touch ID';
    } else {
      return `Iniciar sesión con ${methods.join(' o ')}`;
    }
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