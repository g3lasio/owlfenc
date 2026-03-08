/**
 * CREDIT CHECK MIDDLEWARE — PAY AS YOU GROW
 * Mervin AI / Owl Fenc App
 * 
 * Verifica si el usuario tiene suficientes créditos antes de ejecutar una feature.
 * 
 * FEATURE FLAG: WALLET_ENFORCEMENT_ENABLED
 * - false (default) → Shadow mode: logea pero NO bloquea (para rollout gradual)
 * - true → Enforcement activo: bloquea si no hay créditos suficientes
 * 
 * REGLA DEL BRIEF: Si tienes créditos → puedes usar cualquier feature.
 * Si no tienes créditos → compra o suscríbete.
 */

import { Request, Response, NextFunction } from 'express';
import { walletService } from '../services/walletService';
import { FEATURE_CREDIT_COSTS, type FeatureName } from '@shared/schema';

// ================================
// FEATURE FLAG
// ================================
export function isWalletEnforcementEnabled(): boolean {
  return process.env.WALLET_ENFORCEMENT_ENABLED === 'true';
}

// ================================
// TIPOS
// ================================

export interface CreditCheckOptions {
  featureName: FeatureName;
  // Función para extraer el Firebase UID del request
  getFirebaseUid?: (req: Request) => string | null;
}

// ================================
// MIDDLEWARE FACTORY
// ================================

/**
 * Crea un middleware de verificación de créditos para una feature específica.
 * 
 * Uso:
 * router.post('/generate', requireCredits({ featureName: 'aiEstimate' }), handler);
 */
export function requireCredits(options: CreditCheckOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { featureName } = options;
    const requiredCredits = FEATURE_CREDIT_COSTS[featureName];

    // Features gratuitas — siempre pasar
    if (requiredCredits === 0) {
      next();
      return;
    }

    // Obtener Firebase UID del request
    const firebaseUid = extractFirebaseUid(req, options.getFirebaseUid);

    if (!firebaseUid) {
      // Si no hay UID, dejar pasar (el auth middleware ya maneja esto)
      next();
      return;
    }

    // Shadow mode: solo loggear, no bloquear
    if (!isWalletEnforcementEnabled()) {
      try {
        const balance = await walletService.getBalance(firebaseUid);
        const canAfford = balance >= requiredCredits;

        console.log(`👻 [CREDIT-SHADOW] ${featureName}: user=${firebaseUid}, balance=${balance}, required=${requiredCredits}, canAfford=${canAfford}`);

        // Adjuntar info al request para que el handler pueda loggear
        (req as any).walletShadow = {
          featureName,
          requiredCredits,
          currentBalance: balance,
          canAfford,
        };
      } catch (error) {
        console.error(`⚠️  [CREDIT-SHADOW] Error checking balance (non-blocking):`, error);
      }

      next();
      return;
    }

    // Enforcement activo
    try {
      const affordCheck = await walletService.canAfford(firebaseUid, requiredCredits);

      if (!affordCheck.canAfford) {
        console.log(`🚫 [CREDIT-CHECK] Insufficient credits for ${featureName}: user=${firebaseUid}, balance=${affordCheck.currentBalance}, required=${requiredCredits}`);

        res.status(402).json({
          error: 'INSUFFICIENT_CREDITS',
          message: `You need ${requiredCredits} credits to use ${featureName}. You have ${affordCheck.currentBalance}.`,
          currentBalance: affordCheck.currentBalance,
          requiredCredits,
          deficit: affordCheck.deficit,
          featureName,
          // Información para el frontend para mostrar el TopUpModal
          showTopUpModal: true,
        });
        return;
      }

      // Adjuntar info al request para que el handler deduzca después de la operación
      (req as any).walletInfo = {
        firebaseUid,
        featureName,
        requiredCredits,
        currentBalance: affordCheck.currentBalance,
      };

      next();

    } catch (error) {
      console.error(`❌ [CREDIT-CHECK] Error checking credits for ${featureName}:`, error);
      // En caso de error del sistema de wallet, dejar pasar (fail-open)
      // Esto protege contra downtime del wallet afectando la app principal
      next();
    }
  };
}

/**
 * Helper para deducir créditos DESPUÉS de que la operación fue exitosa.
 * Llamar desde el handler, no desde el middleware.
 * 
 * Uso:
 * const result = await generateEstimate(data);
 * await deductFeatureCredits(req, result.id, 'Generated AI estimate');
 */
export async function deductFeatureCredits(
  req: Request,
  resourceId?: string,
  description?: string
): Promise<void> {
  const walletInfo = (req as any).walletInfo;

  if (!walletInfo) {
    // Shadow mode o feature gratuita — no deducir
    return;
  }

  const { firebaseUid, featureName } = walletInfo;

  try {
    const result = await walletService.deductCredits({
      firebaseUid,
      featureName,
      resourceId,
      description,
      idempotencyKey: resourceId ? `${featureName}:${resourceId}` : undefined,
    });

    if (!result.success) {
      console.error(`⚠️  [CREDIT-DEDUCT] Failed to deduct credits for ${featureName}: ${result.error}`);
    } else {
      console.log(`💳 [CREDIT-DEDUCT] Deducted ${result.creditsDeducted} credits for ${featureName}. Balance: ${result.balanceAfter}`);
    }
  } catch (error) {
    console.error(`❌ [CREDIT-DEDUCT] Error deducting credits:`, error);
    // No lanzar — la operación ya fue exitosa
  }
}

// ================================
// HELPERS
// ================================

function extractFirebaseUid(req: Request, customExtractor?: (req: Request) => string | null): string | null {
  if (customExtractor) {
    return customExtractor(req);
  }

  // Buscar en los lugares más comunes donde se guarda el Firebase UID
  const uid =
    (req as any).user?.uid ||
    (req as any).user?.firebaseUid ||
    (req as any).firebaseUid ||
    req.headers['x-firebase-uid'] as string ||
    (req as any).session?.firebaseUid ||
    null;

  return uid || null;
}
