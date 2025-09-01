/**
 * MIDDLEWARE DE IDENTIDAD UNIFICADA
 * 
 * Garantiza que TODOS los endpoints usen el sistema unificado de identidad
 * Elimina para siempre la confusión de IDs de usuario
 */

import { Request, Response, NextFunction } from 'express';
import { userIdentityService } from '../services/UserIdentityService';

// Extender el tipo Request para incluir identidad unificada
declare global {
  namespace Express {
    interface Request {
      unifiedUserId?: string;
      userIdentity?: {
        firebaseUid: string;
        email: string;
        postgresUserId: number;
      };
    }
  }
}

/**
 * Middleware principal de identidad unificada
 * USAR ESTE MIDDLEWARE EN TODOS LOS ENDPOINTS QUE REQUIEREN AUTENTICACIÓN
 */
export const requireUnifiedIdentity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validar que el usuario esté autenticado con Firebase
    const { firebaseUid, email } = userIdentityService.validateUserIdentity(req);
    
    // Obtener ID unificado (siempre Firebase UID)
    const unifiedUserId = await userIdentityService.getUnifiedUserId(firebaseUid, email);
    
    // Obtener identidad completa
    const userIdentity = await userIdentityService.getUserIdentity(firebaseUid, email);
    
    // Intentar migración automática de datos legacy si es necesario
    await userIdentityService.migrateLegacyUserData(email, firebaseUid);
    
    // Agregar al request para uso en endpoints
    req.unifiedUserId = unifiedUserId;
    req.userIdentity = userIdentity;
    
    // Logging para auditoría
    userIdentityService.logIdentityUsage(
      req.route?.path || req.path, 
      firebaseUid, 
      'requireUnifiedIdentity'
    );
    
    next();
  } catch (error) {
    console.error('❌ [UNIFIED-IDENTITY] Error en middleware:', error);
    return res.status(401).json({
      success: false,
      error: 'Autenticación requerida',
      message: 'Por favor inicia sesión nuevamente'
    });
  }
};

/**
 * Middleware opcional para endpoints que pueden funcionar sin autenticación
 * pero que se benefician de la identidad unificada si está disponible
 */
export const optionalUnifiedIdentity = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.firebaseUser?.uid && req.firebaseUser?.email) {
      const { firebaseUid, email } = userIdentityService.validateUserIdentity(req);
      const unifiedUserId = await userIdentityService.getUnifiedUserId(firebaseUid, email);
      const userIdentity = await userIdentityService.getUserIdentity(firebaseUid, email);
      
      req.unifiedUserId = unifiedUserId;
      req.userIdentity = userIdentity;
      
      userIdentityService.logIdentityUsage(
        req.route?.path || req.path, 
        firebaseUid, 
        'optionalUnifiedIdentity'
      );
    }
    
    next();
  } catch (error) {
    console.warn('⚠️ [UNIFIED-IDENTITY] Error en identidad opcional:', error);
    // Continuar sin identidad en caso de error
    next();
  }
};

/**
 * Helper para obtener ID de usuario desde request
 * SIEMPRE usar esta función en lugar de acceder directamente a req.firebaseUser.uid
 */
export const getUserIdFromRequest = (req: Request): string => {
  if (!req.unifiedUserId) {
    throw new Error('❌ [UNIFIED-IDENTITY] ID unificado no disponible - usar requireUnifiedIdentity middleware');
  }
  return req.unifiedUserId;
};

/**
 * Helper para obtener identidad completa desde request
 */
export const getUserIdentityFromRequest = (req: Request) => {
  if (!req.userIdentity) {
    throw new Error('❌ [UNIFIED-IDENTITY] Identidad completa no disponible - usar requireUnifiedIdentity middleware');
  }
  return req.userIdentity;
};

/**
 * Middleware de validación de consistencia (para debugging)
 * Verificar que no se esté usando patterns legacy en el request
 */
export const validateIdentityConsistency = (req: Request, res: Response, next: NextFunction) => {
  // Verificar que no se esté usando email-based IDs en el body o query
  const requestData = { ...req.body, ...req.query };
  
  for (const [key, value] of Object.entries(requestData)) {
    if (typeof value === 'string' && value.includes('user_') && value.includes('_gmail_com')) {
      console.warn(`⚠️ [IDENTITY-CONSISTENCY] Detectado patrón legacy en ${key}: ${value}`);
      console.warn(`⚠️ [IDENTITY-CONSISTENCY] Endpoint: ${req.method} ${req.path}`);
    }
  }
  
  next();
};