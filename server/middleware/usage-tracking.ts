/**
 * Sistema de seguimiento de uso de funciones por suscripción
 * Rastrea el uso de cada función para aplicar límites según el plan
 */

import { Request, Response, NextFunction } from 'express';

// Almacenamiento en memoria para el contador de uso (en producción esto debería estar en base de datos)
class UsageTracker {
  private usage: Map<string, Map<string, number>> = new Map();

  /**
   * Registrar uso de una función
   */
  trackUsage(userId: string, feature: string, amount: number = 1): void {
    if (!this.usage.has(userId)) {
      this.usage.set(userId, new Map());
    }
    
    const userUsage = this.usage.get(userId)!;
    const currentUsage = userUsage.get(feature) || 0;
    userUsage.set(feature, currentUsage + amount);
    
    console.log(`📊 [USAGE-TRACKER] Usuario ${userId} - ${feature}: ${currentUsage + amount} usos`);
  }

  /**
   * Obtener uso actual de una función
   */
  getUsage(userId: string, feature: string): number {
    const userUsage = this.usage.get(userId);
    if (!userUsage) return 0;
    return userUsage.get(feature) || 0;
  }

  /**
   * Verificar si el usuario puede usar una función más veces
   */
  canUseFeature(userId: string, feature: string, limit: number): boolean {
    if (limit === -1) return true; // Ilimitado
    const currentUsage = this.getUsage(userId, feature);
    return currentUsage < limit;
  }

  /**
   * Resetear uso mensual (debería ejecutarse cada mes)
   */
  resetMonthlyUsage(userId?: string): void {
    if (userId) {
      this.usage.delete(userId);
      console.log(`🔄 [USAGE-TRACKER] Reseteado uso mensual para usuario: ${userId}`);
    } else {
      this.usage.clear();
      console.log(`🔄 [USAGE-TRACKER] Reseteado uso mensual para todos los usuarios`);
    }
  }
}

export const usageTracker = new UsageTracker();

/**
 * Middleware para verificar y rastrear límites de uso
 */
export const trackAndValidateUsage = (feature: string, limitKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.firebaseUser?.uid || !req.userSubscription) {
        return res.status(403).json({
          error: 'Información de autenticación o suscripción faltante',
          code: 'AUTH_INFO_MISSING'
        });
      }

      const userId = `user_${req.firebaseUser.email?.replace(/[@.]/g, '_')}`;
      const limits = req.userSubscription.limits;
      const featureLimit = limits[limitKey as keyof typeof limits];

      // Verificar si puede usar la función
      if (!usageTracker.canUseFeature(userId, feature, featureLimit)) {
        return res.status(403).json({
          error: `Límite mensual alcanzado para ${feature}`,
          code: 'USAGE_LIMIT_EXCEEDED',
          feature,
          limit: featureLimit,
          currentUsage: usageTracker.getUsage(userId, feature),
          upgradeUrl: '/subscription'
        });
      }

      // Añadir función para rastrear uso después de operación exitosa
      req.trackUsage = () => {
        usageTracker.trackUsage(userId, feature);
      };

      next();
    } catch (error) {
      console.error('❌ [USAGE-TRACKER] Error validando límites:', error);
      return res.status(500).json({
        error: 'Error interno validando límites de uso',
        code: 'USAGE_VALIDATION_ERROR'
      });
    }
  };
};

// Extender el tipo Request para incluir función de tracking
declare global {
  namespace Express {
    interface Request {
      trackUsage?: () => void;
    }
  }
}