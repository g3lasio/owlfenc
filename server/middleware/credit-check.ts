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
 * 
 * BUNDLE: contractWithSignature (18 créditos) = contract (12) + signatureProtocol (8) con descuento
 * El bundle se activa cuando el request incluye { includeSignature: true }
 */

import { Request, Response, NextFunction } from 'express';
import { walletService } from '../services/walletService';
import { invalidateWalletCache } from '../routes/wallet-routes';
import { FEATURE_CREDIT_COSTS, type FeatureName } from '@shared/schema';

// ================================
// FEATURE FLAG
// ================================
export function isWalletEnforcementEnabled(): boolean {
  // Case-insensitive: accepts 'true', 'True', 'TRUE' etc.
  return process.env.WALLET_ENFORCEMENT_ENABLED?.toLowerCase() === 'true';
}

// ================================
// V3 FIX: CIRCUIT BREAKER — Fail-Open with Error Tracking
// ================================
// When the wallet DB is unreachable, the middleware fails-open (lets requests through).
// This is intentional to protect app uptime, but we must:
//   1. Log every fail-open event with full error details (for incident investigation)
//   2. Track consecutive failures — after CIRCUIT_BREAKER_THRESHOLD, emit a CRITICAL alert
//   3. Expose a health flag so the monitoring system can detect wallet degradation
// The circuit does NOT block requests (that would break the app during DB downtime),
// but it makes the failure loud and observable.
let walletCircuitFailures = 0;
let walletCircuitOpenAt: Date | null = null;
const CIRCUIT_BREAKER_THRESHOLD = 5; // consecutive failures before CRITICAL alert

export function getWalletCircuitStatus(): { failures: number; openAt: Date | null; isOpen: boolean } {
  return {
    failures: walletCircuitFailures,
    openAt: walletCircuitOpenAt,
    isOpen: walletCircuitFailures >= CIRCUIT_BREAKER_THRESHOLD,
  };
}

function recordWalletFailure(featureName: string, error: unknown): void {
  walletCircuitFailures++;
  if (walletCircuitFailures === 1) {
    walletCircuitOpenAt = new Date();
  }
  console.error(
    `🚨 [CREDIT-CHECK-CIRCUIT] Wallet DB error #${walletCircuitFailures} for feature=${featureName}. ` +
    `Failing open (request allowed). Error: ${error instanceof Error ? error.message : String(error)}`
  );
  if (walletCircuitFailures >= CIRCUIT_BREAKER_THRESHOLD) {
    console.error(
      `🚨 [CREDIT-CHECK-CIRCUIT] CRITICAL: Wallet circuit open after ${walletCircuitFailures} consecutive failures. ` +
      `Features are running WITHOUT credit enforcement. First failure at: ${walletCircuitOpenAt?.toISOString()}`
    );
  }
}

function recordWalletSuccess(): void {
  if (walletCircuitFailures > 0) {
    console.log(`✅ [CREDIT-CHECK-CIRCUIT] Wallet recovered after ${walletCircuitFailures} failures. Circuit reset.`);
    walletCircuitFailures = 0;
    walletCircuitOpenAt = null;
  }
}

// ================================
// TIPOS
// ================================

export interface CreditCheckOptions {
  featureName: FeatureName;
  // Si true, detecta automáticamente el bundle contractWithSignature
  // cuando req.body.includeSignature === true y featureName === 'contract'
  detectBundle?: boolean;
  // Función para extraer el Firebase UID del request
  getFirebaseUid?: (req: Request) => string | null;
}

// ================================
// HELPER: Detectar bundle contractWithSignature
// ================================

/**
 * Detecta si el request debe usar el bundle contractWithSignature.
 * El bundle se activa cuando:
 * 1. featureName === 'contract'
 * 2. req.body.includeSignature === true (o req.body.withSignature === true)
 * 
 * Esto permite que el frontend envíe { includeSignature: true } en el body
 * para activar el bundle con descuento (18 créditos vs 12+8=20).
 */
function detectBundleFeature(req: Request, featureName: FeatureName): FeatureName {
  if (featureName !== 'contract') return featureName;

  const body = req.body || {};
  const includeSignature = body.includeSignature === true || body.withSignature === true;

  if (includeSignature) {
    console.log(`🔗 [CREDIT-CHECK] Bundle detected: contractWithSignature (18 credits instead of 20)`);
    return 'contractWithSignature';
  }

  return featureName;
}

// ================================
// MIDDLEWARE FACTORY
// ================================

/**
 * Crea un middleware de verificación de créditos para una feature específica.
 * 
 * Uso:
 * router.post('/generate', requireCredits({ featureName: 'aiEstimate' }), handler);
 * 
 * Para el bundle:
 * router.post('/generate', requireCredits({ featureName: 'contract', detectBundle: true }), handler);
 * → Si req.body.includeSignature === true, usa contractWithSignature (18 créditos)
 * → Si no, usa contract (12 créditos)
 */
export function requireCredits(options: CreditCheckOptions) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    let { featureName } = options;

    // Detectar bundle si está habilitado
    if (options.detectBundle) {
      featureName = detectBundleFeature(req, featureName);
    }

    const requiredCredits = FEATURE_CREDIT_COSTS[featureName];

    // Features gratuitas — siempre pasar
    if (requiredCredits === 0) {
      next();
      return;
    }

    // Obtener Firebase UID del request
    const firebaseUid = extractFirebaseUid(req, options.getFirebaseUid);

    if (!firebaseUid) {
      // Si no hay UID y se requieren créditos, bloquear con 401.
      // El requireAuth debería haber bloqueado antes, pero esto es una capa de seguridad adicional.
      console.warn(`🔒 [CREDIT-CHECK] No Firebase UID found for feature '${featureName}' — blocking request with 401`);
      res.status(401).json({
        success: false,
        error: 'Autenticación requerida para usar esta función',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    // Shadow mode: loggear Y deducir (enforcement desactivado = no bloquear, pero sí deducir)
    if (!isWalletEnforcementEnabled()) {
      try {
        const balance = await walletService.getBalance(firebaseUid);
        const canAfford = balance >= requiredCredits;

        console.log(
          `👻 [CREDIT-SHADOW] ${featureName}: user=${firebaseUid.substring(0, 8)}..., ` +
          `balance=${balance}, required=${requiredCredits}, canAfford=${canAfford}`
        );

        // Adjuntar walletShadow para logging
        (req as any).walletShadow = {
          featureName,
          requiredCredits,
          currentBalance: balance,
          canAfford,
        };

        // ✅ FIX: También adjuntar walletInfo para que deductFeatureCredits funcione
        // en Shadow Mode. Sin esto, los créditos nunca se deducen aunque la operación
        // sea exitosa, porque deductFeatureCredits verifica walletInfo antes de deducir.
        (req as any).walletInfo = {
          firebaseUid,
          featureName,
          requiredCredits,
          currentBalance: balance,
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
        console.log(
          `🚫 [CREDIT-CHECK] Insufficient credits for ${featureName}: ` +
          `user=${firebaseUid.substring(0, 8)}..., balance=${affordCheck.currentBalance}, required=${requiredCredits}`
        );

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

      // V3 FIX: Reset circuit breaker on successful wallet check
      recordWalletSuccess();

      next();

    } catch (error) {
      // V3 FIX: Record failure in circuit breaker (makes fail-open observable and alertable)
      // We still fail-open to protect app uptime during wallet DB downtime,
      // but now every failure is logged with full details and tracked for CRITICAL alerting.
      recordWalletFailure(featureName, error);
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
      // ⚡ Invalidate wallet cache so next /balance call reflects the new balance
      invalidateWalletCache(firebaseUid);
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
    (req as any).firebaseUser?.uid ||
    (req as any).user?.uid ||
    (req as any).user?.firebaseUid ||
    (req as any).firebaseUid ||
    req.headers['x-firebase-uid'] as string ||
    (req as any).session?.firebaseUid ||
    null;

  return uid || null;
}
