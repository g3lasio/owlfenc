/**
 * URL Builder Utility - Generación Dinámica de URLs para Desarrollo y Producción
 * Soluciona el problema de URLs hardcodeadas que fallan en deployment
 */

import { Request } from 'express';

export interface UrlBuildOptions {
  // Usar HTTPS en producción, HTTP en desarrollo local
  forceHttps?: boolean;
  // Dominio personalizado para override
  customDomain?: string;
  // Path base para la aplicación
  basePath?: string;
}

/**
 * Construye URL dinámica basada en la request HTTP actual
 * Funciona automáticamente en cualquier entorno: desarrollo, Replit, producción, etc.
 */
export function buildDynamicUrl(req: Request, path: string, options: UrlBuildOptions = {}): string {
  const {
    forceHttps = false,
    customDomain,
    basePath = ''
  } = options;

  // 1. Detectar protocolo dinámicamente
  let protocol = req.protocol;
  
  // En producción o cuando se fuerza HTTPS
  if (forceHttps || isProductionEnvironment(req)) {
    protocol = 'https';
  }

  // 2. Detectar host dinámicamente
  let host = customDomain || req.get('host') || 'localhost:5000';
  
  // 3. Construir URL completa
  const fullPath = basePath + (path.startsWith('/') ? path : '/' + path);
  const fullUrl = `${protocol}://${host}${fullPath}`;
  
  console.log(`🔗 [URL-BUILDER] Generada URL dinámica: ${fullUrl}`);
  console.log(`🔗 [URL-BUILDER] Entorno detectado:`, {
    protocol,
    host,
    originalHost: req.get('host'),
    userAgent: req.get('user-agent')?.substring(0, 50) + '...',
    isProduction: isProductionEnvironment(req)
  });
  
  return fullUrl;
}

/**
 * Detecta si estamos en entorno de producción
 */
function isProductionEnvironment(req: Request): boolean {
  const host = req.get('host') || '';
  
  // Detectores de producción
  const productionIndicators = [
    // Dominios de producción comunes
    'chyrris.com',
    'app.chyrris.com',
    'api.chyrris.com',
    // Hosting providers comunes
    '.vercel.app',
    '.netlify.app',
    '.herokuapp.com',
    '.fly.dev',
    '.railway.app',
    // Custom domains (no contienen localhost ni replit)
    !host.includes('localhost') && 
    !host.includes('replit.dev') && 
    !host.includes('127.0.0.1') &&
    host.includes('.')
  ];
  
  return productionIndicators.some(indicator => {
    if (typeof indicator === 'boolean') return indicator;
    return host.includes(indicator);
  });
}

/**
 * Genera URL para restablecimiento de contraseña
 */
export function buildPasswordResetUrl(req: Request, token: string): string {
  return buildDynamicUrl(req, `/reset-password?token=${token}`, {
    forceHttps: true // Passwords siempre por HTTPS
  });
}

/**
 * Genera URLs para sistema de firma dual
 * 🔒 SIEMPRE usa chyrris.com para URLs de firma (con SSL wildcard configurado)
 */
export function buildSignatureUrls(req: Request, contractId: string): {
  contractorSignUrl: string;
  clientSignUrl: string;
} {
  const signatureDomain = getSignatureDomain(req);
  
  return {
    contractorSignUrl: buildDynamicUrl(req, `/sign/${contractId}/contractor`, {
      forceHttps: true,
      customDomain: signatureDomain
    }),
    clientSignUrl: buildDynamicUrl(req, `/sign/${contractId}/client`, {
      forceHttps: true,
      customDomain: signatureDomain
    })
  };
}

/**
 * Obtiene el dominio correcto para URLs de firma
 * Producción: chyrris.com
 * Desarrollo: host actual
 */
function getSignatureDomain(req: Request): string {
  const currentHost = req.get('host') || 'localhost:5000';
  
  // Si estamos en desarrollo local o Replit dev, usar el host actual
  if (currentHost.includes('localhost') || 
      currentHost.includes('127.0.0.1') || 
      currentHost.includes('replit.dev')) {
    console.log('🔧 [URL-BUILDER] Desarrollo detectado, usando host actual:', currentHost);
    return currentHost;
  }
  
  // En producción, SIEMPRE usar chyrris.com para URLs de firma
  console.log('🌐 [URL-BUILDER] Producción detectada, usando chyrris.com para firma');
  return 'chyrris.com';
}

/**
 * Obtiene el dominio correcto para URLs compartibles de estimados
 * Producción: chyrris.com
 * Desarrollo: host actual
 */
export function getEstimateSharableDomain(req: Request): string {
  const currentHost = req.get('host') || 'localhost:5000';
  
  // Si estamos en desarrollo local o Replit dev, usar el host actual
  if (currentHost.includes('localhost') || 
      currentHost.includes('127.0.0.1') || 
      currentHost.includes('replit.dev')) {
    console.log('🔧 [URL-BUILDER] Desarrollo detectado, usando host actual para estimados:', currentHost);
    return currentHost;
  }
  
  // En producción, SIEMPRE usar chyrris.com para URLs de estimados compartidos
  console.log('🌐 [URL-BUILDER] Producción detectada, usando chyrris.com para estimados');
  return 'chyrris.com';
}

/**
 * Genera URL para verificación de email de contratista
 */
export function buildEmailVerificationUrl(req: Request, token: string, success: boolean = true): string {
  const params = new URLSearchParams({
    verified: success.toString(),
    ...(success ? {} : { error: 'Verification failed' })
  });
  
  return buildDynamicUrl(req, `/profile?${params.toString()}`, {
    forceHttps: true
  });
}

/**
 * Genera URL base de la aplicación
 */
export function buildAppBaseUrl(req: Request): string {
  return buildDynamicUrl(req, '', {
    forceHttps: true
  });
}

/**
 * Logging para debugging de URLs
 */
export function logUrlGeneration(context: string, originalUrl: string, newUrl: string): void {
  console.log(`🔄 [URL-MIGRATION] ${context}:`);
  console.log(`   Antes: ${originalUrl}`);
  console.log(`   Después: ${newUrl}`);
}