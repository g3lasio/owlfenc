/**
 * WALLET ROUTES — PAY AS YOU GROW
 * Mervin AI / Owl Fenc App
 * 
 * Endpoints:
 * GET  /api/wallet/balance          → Balance y transacciones recientes
 * GET  /api/wallet/packages         → Paquetes de top-up disponibles
 * GET  /api/wallet/history          → Historial de transacciones (paginado)
 * POST /api/wallet/top-up/checkout  → Crear Checkout Session de Stripe
 * GET  /api/wallet/top-up/status    → Verificar estado de un checkout session
 * GET  /api/wallet/billing-status   → Estado completo de billing del usuario
 * POST /api/admin/credits/grant     → Admin: dar créditos a usuario(s)
 */

import { Router, Request, Response } from 'express';
import { walletService } from '../services/walletService';
import { stripeTopUpService } from '../services/stripeTopUpService';
import { billingModeService } from '../services/billingModeService';
import { userMappingService } from '../services/userMappingService';
import { FEATURE_CREDIT_COSTS } from '@shared/schema';
import { requireAuth } from '../middleware/unified-session-auth';
import { pool } from '../db';

const router = Router();

// ⚡ SERVER-SIDE WALLET BALANCE CACHE (30s TTL)
// Eliminates redundant DB queries when multiple components call /api/wallet/balance
// simultaneously on page load. Cache is invalidated when credits are spent.
const WALLET_BALANCE_CACHE = new Map<string, { data: any; expiresAt: number }>();
const WALLET_CACHE_TTL_MS = 30 * 1000; // 30 seconds

export function invalidateWalletCache(firebaseUid: string): void {
  WALLET_BALANCE_CACHE.delete(firebaseUid);
}

// ================================
// HELPER: Extraer Firebase UID del request
// ================================
function getFirebaseUid(req: Request): string | null {
  // El middleware de Firebase setea req.firebaseUser.uid (ver firebase-auth.ts)
  // Soportar múltiples patrones para compatibilidad con todos los middlewares del proyecto
  return (
    (req as any).firebaseUser?.uid ||        // Firebase Auth middleware (patrón principal)
    (req as any).user?.uid ||               // Passport/session middleware
    (req as any).user?.firebaseUid ||       // Custom session
    (req as any).firebaseUid ||             // Legacy
    (req.headers['x-firebase-uid'] as string) || // Header directo (mobile/API)
    null
  );
}

// ================================
// GET /api/wallet/balance
// ================================
router.get('/balance', requireAuth, async (req: Request, res: Response) => {
  try {
    const firebaseUid = getFirebaseUid(req);

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // ⚡ CACHE HIT: Return cached balance without DB query (30s TTL)
    const cached = WALLET_BALANCE_CACHE.get(firebaseUid);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json(cached.data);
    }

    // PRIMARY: Use raw pool.query for reliability during cold start.
    // Drizzle WebSocket pool can silently return empty results on first connection,
    // causing getOrCreateWallet to attempt a duplicate INSERT (fails with UNIQUE constraint)
    // and returning balance=0 instead of the real balance.
    let balance = 0;
    let totalEarned = 0;
    let totalSpent = 0;
    let isLocked = false;
    let recentTransactions: any[] = [];

    if (pool) {
      try {
        const walletResult = await pool.query(
          'SELECT balance_credits, total_credits_earned, total_credits_spent, is_locked FROM wallet_accounts WHERE firebase_uid = $1 LIMIT 1',
          [firebaseUid]
        );
        if (walletResult.rows.length > 0) {
          const row = walletResult.rows[0];
          balance = row.balance_credits ?? 0;
          totalEarned = row.total_credits_earned ?? 0;
          totalSpent = row.total_credits_spent ?? 0;
          isLocked = row.is_locked ?? false;
          console.log(`💰 [WALLET-BALANCE-RAW] uid=${firebaseUid} balance=${balance} earned=${totalEarned}`);
        } else {
          // No wallet yet — create via service (new user)
          console.log(`⚠️ [WALLET-BALANCE] No wallet found for ${firebaseUid}, creating via service...`);
          const walletData = await walletService.getWalletBalance(firebaseUid);
          balance = walletData.balance;
          totalEarned = walletData.totalEarned;
          totalSpent = walletData.totalSpent;
          isLocked = walletData.isLocked;
          recentTransactions = walletData.recentTransactions;
        }
        // Get recent transactions via raw query
        if (recentTransactions.length === 0) {
          const txResult = await pool.query(
            'SELECT * FROM wallet_transactions WHERE firebase_uid = $1 ORDER BY created_at DESC LIMIT 10',
            [firebaseUid]
          );
          // Map snake_case DB columns to camelCase for frontend compatibility
          recentTransactions = txResult.rows.map((row: any) => ({
            id: row.id,
            walletId: row.wallet_id,
            userId: row.user_id,
            firebaseUid: row.firebase_uid,
            type: row.type,
            direction: row.direction,
            amountCredits: row.amount_credits ?? 0,
            balanceAfter: row.balance_after ?? 0,
            featureName: row.feature_name,
            resourceId: row.resource_id,
            description: row.description,
            metadata: row.metadata,
            createdAt: row.created_at,
          }));
        }
      } catch (poolError) {
        console.error('⚠️ [WALLET-BALANCE] pool.query failed, falling back to Drizzle:', poolError);
        const walletData = await walletService.getWalletBalance(firebaseUid);
        balance = walletData.balance;
        totalEarned = walletData.totalEarned;
        totalSpent = walletData.totalSpent;
        isLocked = walletData.isLocked;
        recentTransactions = walletData.recentTransactions;
      }
    } else {
      // No pool available — use Drizzle service
      const walletData = await walletService.getWalletBalance(firebaseUid);
      balance = walletData.balance;
      totalEarned = walletData.totalEarned;
      totalSpent = walletData.totalSpent;
      isLocked = walletData.isLocked;
      recentTransactions = walletData.recentTransactions;
    }

    console.log(`💰 [WALLET-BALANCE] uid=${firebaseUid} balance=${balance} earned=${totalEarned}`);
    const responseData = {
      success: true,
      balance,
      totalEarned,
      totalSpent,
      isLocked,
      recentTransactions,
    };
    // ⚡ CACHE: Store for 30 seconds to prevent redundant DB queries
    WALLET_BALANCE_CACHE.set(firebaseUid, { data: responseData, expiresAt: Date.now() + WALLET_CACHE_TTL_MS });
    return res.json(responseData);

  } catch (error: any) {
    // RACE CONDITION RECOVERY: If getOrCreateWallet fails with duplicate key (23505),
    // it means a concurrent request already created the wallet. Just SELECT the balance directly.
    if (error?.code === '23505' || (error?.message && error.message.includes('duplicate key'))) {
      console.warn(`⚠️ [WALLET-ROUTES] Duplicate key on wallet create — recovering with direct SELECT for ${(error as any)?.firebaseUid || 'unknown'}`);
      try {
        if (pool) {
          const firebaseUid = (error as any)?.firebaseUid ||
            (error as any)?.req?.firebaseUser?.uid ||
            null;
          if (firebaseUid) {
            const recovery = await pool.query(
              'SELECT balance_credits, total_credits_earned, total_credits_spent, is_locked FROM wallet_accounts WHERE firebase_uid = $1 LIMIT 1',
              [firebaseUid]
            );
            if (recovery.rows.length > 0) {
              const row = recovery.rows[0];
              return res.json({
                success: true,
                balance: row.balance_credits ?? 0,
                totalEarned: row.total_credits_earned ?? 0,
                totalSpent: row.total_credits_spent ?? 0,
                isLocked: row.is_locked ?? false,
                recentTransactions: [],
              });
            }
          }
        }
      } catch (recoveryErr) {
        console.error('❌ [WALLET-ROUTES] Recovery SELECT also failed:', recoveryErr);
      }
      // Last resort: return 0 balance instead of 500 to avoid breaking the UI
      return res.json({ success: true, balance: 0, totalEarned: 0, totalSpent: 0, isLocked: false, recentTransactions: [] });
    }
    console.error('❌ [WALLET-ROUTES] Error getting balance:', error);
    return res.status(500).json({ error: 'Failed to get wallet balance' });
  }
});

// ================================
// GET /api/wallet/packages
// ================================
router.get('/packages', async (req: Request, res: Response) => {
  try {
    const packages = await walletService.getCreditPackages();

    // Agregar equivalencias en acciones para el frontend
    const packagesWithEquivalence = packages.map(pkg => {
      const totalCredits = pkg.credits + pkg.bonusCredits;
      const estimatesEquivalent = Math.floor(totalCredits / FEATURE_CREDIT_COSTS.aiEstimate);
      const contractsEquivalent = Math.floor(totalCredits / FEATURE_CREDIT_COSTS.contract);

      return {
        ...pkg,
        totalCredits,
        equivalence: {
          aiEstimates: estimatesEquivalent,
          contracts: contractsEquivalent,
          description: `Equivalent to ~${estimatesEquivalent} AI estimates`,
        },
      };
    });

    return res.json({
      success: true,
      packages: packagesWithEquivalence,
    });

  } catch (error) {
    console.error('❌ [WALLET-ROUTES] Error getting packages:', error);
    return res.status(500).json({ error: 'Failed to get credit packages' });
  }
});

// ================================
// GET /api/wallet/history
// ================================
router.get('/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const firebaseUid = getFirebaseUid(req);

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    const offset = parseInt(req.query.offset as string) || 0;

    const transactions = await walletService.getTransactionHistory(firebaseUid, limit, offset);

    return res.json({
      success: true,
      transactions,
      limit,
      offset,
    });

  } catch (error) {
    console.error('❌ [WALLET-ROUTES] Error getting history:', error);
    return res.status(500).json({ error: 'Failed to get transaction history' });
  }
});

// ================================
// POST /api/wallet/top-up/checkout
// ================================
router.post('/top-up/checkout', requireAuth, async (req: Request, res: Response) => {
  try {
    const firebaseUid = getFirebaseUid(req);

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { packageId } = req.body;

    if (!packageId || typeof packageId !== 'number') {
      return res.status(400).json({ error: 'packageId is required and must be a number' });
    }

    // Obtener email del usuario para el recibo de Stripe
    // El middleware de Firebase setea req.firebaseUser con el email verificado
    const userEmail: string | undefined = (req as any).firebaseUser?.email || undefined;

    // URLs de retorno
    const baseUrl = process.env.APP_URL || req.headers.origin || 'https://owlfenc.replit.app';
    const successUrl = `${baseUrl}/wallet/success`;
    const cancelUrl = `${baseUrl}/wallet`;

    const result = await stripeTopUpService.createTopUpCheckoutSession({
      firebaseUid,
      packageId,
      successUrl,
      cancelUrl,
      userEmail, // Para receipt_email en Stripe Checkout
    });

    return res.json({
      success: true,
      checkoutUrl: result.checkoutUrl,
      sessionId: result.sessionId,
    });

  } catch (error) {
    console.error('❌ [WALLET-ROUTES] Error creating checkout session:', error);
    return res.status(500).json({
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ================================
// GET /api/wallet/top-up/status?session_id=xxx
// ⚡ INSTANT CREDIT GRANT — verifies Stripe session AND grants credits immediately
// This is the primary credit-grant path. The webhook is a backup/redundancy.
// Idempotent: safe to call multiple times for the same session.
// ================================
router.get('/top-up/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionId = req.query.session_id as string;

    if (!sessionId) {
      return res.status(400).json({ error: 'session_id is required' });
    }

    const firebaseUid = getFirebaseUid(req);
    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // 1. Verify payment status with Stripe
    const status = await stripeTopUpService.getCheckoutSessionStatus(sessionId);

    let creditsGranted = false;
    let creditsJustGranted = false;
    let creditsAmount = 0;
    let currentBalance: number | null = null;
    let packageName: string | null = null;

    if (status.paymentStatus === 'paid') {
      // 2. Get full session details to extract metadata (package_id, firebase_uid)
      try {
        const sessionDetails = await stripeTopUpService.getCheckoutSessionDetails(sessionId);
        const packageId = sessionDetails.packageId;
        const sessionFirebaseUid = sessionDetails.firebaseUid || firebaseUid;

        if (packageId) {
          // 3. Ensure user exists in PostgreSQL (create if first-time buyer)
          try {
            const userEmail = (req as any).firebaseUser?.email;
            await userMappingService.getOrCreateUserIdForFirebaseUid(sessionFirebaseUid, userEmail);
          } catch (userErr) {
            console.warn(`⚠️ [WALLET-ROUTES] Could not ensure PG user for ${sessionFirebaseUid}:`, userErr);
          }

          // 4. Ensure wallet exists
          await walletService.getOrCreateWallet(sessionFirebaseUid);

          // 5. Grant credits INSTANTLY and idempotently
          const result = await walletService.processTopUpCompletion(
            sessionId,
            sessionDetails.paymentIntentId || sessionId,
            sessionFirebaseUid,
            sessionDetails.amountTotal || 0,
            packageId
          );

          creditsGranted = true;
          creditsJustGranted = result?.wasNew ?? true;
          creditsAmount = result?.creditsGranted ?? 0;
          packageName = sessionDetails.packageName || null;

          // 6. Invalidate balance cache so next /balance call returns fresh data
          invalidateWalletCache(sessionFirebaseUid);

          console.log(`⚡ [WALLET-ROUTES] Instant grant: ${creditsAmount} credits to ${sessionFirebaseUid} (session: ${sessionId}, new: ${creditsJustGranted})`);
        }
      } catch (grantErr) {
        console.error('❌ [WALLET-ROUTES] Error during instant credit grant:', grantErr);
        // Don't fail the request — credits may have been granted by webhook already
      }

      // 7. Return fresh balance
      currentBalance = await walletService.getBalance(firebaseUid);
      invalidateWalletCache(firebaseUid);
    }

    return res.json({
      success: true,
      ...status,
      creditsGranted,
      creditsJustGranted,
      creditsAmount,
      packageName,
      currentBalance,
    });

  } catch (error) {
    console.error('❌ [WALLET-ROUTES] Error checking session status:', error);
    return res.status(500).json({ error: 'Failed to check session status' });
  }
});

// ================================
// GET /api/wallet/billing-status
// ================================
router.get('/billing-status', requireAuth, async (req: Request, res: Response) => {
  try {
    const firebaseUid = getFirebaseUid(req);

    if (!firebaseUid) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const status = await billingModeService.getUserBillingStatus(firebaseUid);

    return res.json({
      success: true,
      ...status,
      // Agregar costos de features para el frontend
      featureCosts: FEATURE_CREDIT_COSTS,
    });

  } catch (error) {
    console.error('❌ [WALLET-ROUTES] Error getting billing status:', error);
    return res.status(500).json({ error: 'Failed to get billing status' });
  }
});

// ================================
// POST /api/admin/credits/grant
// Admin: dar créditos a usuario(s)
// ================================
router.post('/admin/grant', async (req: Request, res: Response) => {
  try {
    // Verificar que es admin
    const adminKey = req.headers['x-admin-key'] as string;
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { targetType, firebaseUid, planId, credits, description, expiresAt, idempotencyKey: callerKey } = req.body;

    if (!credits || typeof credits !== 'number' || credits <= 0) {
      return res.status(400).json({ error: 'credits must be a positive number' });
    }

    if (!description) {
      return res.status(400).json({ error: 'description is required' });
    }

    const adminUid = (req as any).user?.uid || 'admin';
    const results: Array<{ firebaseUid: string; success: boolean; error?: string }> = [];

    // V4 FIX: Deterministic idempotency keys to prevent double-grant on retry/double-submit.
    // The key is derived from the grant's semantic content, NOT from Date.now().
    // If the caller provides an explicit idempotencyKey in the request body, use it.
    // Otherwise, derive it from: adminUid + targetFirebaseUid + credits + description.
    // This means the same admin grant request is idempotent regardless of how many times it's submitted.
    const buildIdempotencyKey = (targetUid: string): string => {
      if (callerKey) return `admin:${callerKey}:${targetUid}`;
      const descSlug = description.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
      return `admin:${adminUid}:${targetUid}:${credits}cr:${descSlug}`;
    };

    if (targetType === 'single' && firebaseUid) {
      // Dar créditos a un usuario específico
      try {
        await walletService.getOrCreateWallet(firebaseUid);
        await walletService.addCredits({
          firebaseUid,
          amountCredits: credits,
          type: 'admin_adjustment',
          description,
          expiresAt: expiresAt ? new Date(expiresAt) : undefined,
          idempotencyKey: buildIdempotencyKey(firebaseUid),
          metadata: { grantedBy: adminUid, reason: description },
        });
        results.push({ firebaseUid, success: true });
      } catch (error) {
        results.push({ firebaseUid, success: false, error: String(error) });
      }

    } else if (targetType === 'all') {
      // Dar créditos a TODOS los usuarios
      const { db: pgDb } = await import('../db');
      if (!pgDb) {
        return res.status(500).json({ error: 'Database not available' });
      }

      const { walletAccounts } = await import('@shared/schema');
      const allWallets = await pgDb.select({ firebaseUid: walletAccounts.firebaseUid }).from(walletAccounts);

      for (const wallet of allWallets) {
        try {
          await walletService.addCredits({
            firebaseUid: wallet.firebaseUid,
            amountCredits: credits,
            type: 'admin_adjustment',
            description,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            idempotencyKey: buildIdempotencyKey(wallet.firebaseUid),
            metadata: { grantedBy: adminUid, reason: description, bulkGrant: true },
          });
          results.push({ firebaseUid: wallet.firebaseUid, success: true });
        } catch (error) {
          results.push({ firebaseUid: wallet.firebaseUid, success: false, error: String(error) });
        }
      }

    } else {
      return res.status(400).json({ error: 'targetType must be "single" or "all"' });
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return res.json({
      success: true,
      message: `Granted ${credits} credits to ${successCount} user(s)`,
      successCount,
      errorCount,
      results,
    });

  } catch (error) {
    console.error('❌ [WALLET-ROUTES] Error granting credits:', error);
    return res.status(500).json({ error: 'Failed to grant credits' });
  }
});

// ================================
// POST /api/wallet/backfill (Admin: crear wallets para usuarios existentes)
// ================================
router.post('/backfill', async (req: Request, res: Response) => {
  try {
    const adminKey = req.headers['x-admin-key'] as string;
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey || adminKey !== expectedKey) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('🔄 [WALLET-ROUTES] Starting backfill for existing users...');
    const result = await walletService.backfillExistingUsers();

    return res.json({
      success: true,
      message: `Backfill complete: ${result.created} created, ${result.skipped} skipped, ${result.errors} errors`,
      ...result,
    });

  } catch (error) {
    console.error('❌ [WALLET-ROUTES] Error running backfill:', error);
    return res.status(500).json({ error: 'Failed to run backfill' });
  }
});

export default router;
