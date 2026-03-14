/**
 * WALLET SERVICE — PAY AS YOU GROW
 * Mervin AI / Owl Fenc App
 * 
 * Servicio central. ÚNICO punto de entrada para todas las operaciones de wallet.
 * Arquitectura: Payment Intents + Internal Ledger
 * 
 * PATRÓN CRÍTICO: Deducción Atómica
 * UPDATE wallet_accounts SET balance_credits = balance_credits - $amount
 * WHERE firebase_uid = $uid AND balance_credits >= $amount
 * RETURNING balance_credits;
 * → Si retorna 0 filas = saldo insuficiente (atómico a nivel DB, sin race conditions)
 */

import { db as pgDb } from '../db';
import { eq, sql, desc, and } from 'drizzle-orm';
import {
  walletAccounts,
  walletTransactions,
  creditPackages,
  subscriptionPlans,
  users,
  type WalletAccount,
  type WalletTransaction,
  type CreditPackage,
  FEATURE_CREDIT_COSTS,
  type FeatureName,
  PLAN_MONTHLY_CREDITS,
} from '@shared/schema';

// ================================
// TIPOS DE RESULTADO
// ================================

export interface DeductionResult {
  success: boolean;
  creditsDeducted: number;
  balanceAfter: number;
  transactionId: number;
  error?: 'INSUFFICIENT_CREDITS' | 'WALLET_LOCKED' | 'WALLET_NOT_FOUND' | 'DB_ERROR';
  currentBalance?: number;
  requiredCredits?: number;
}

export interface AddCreditsResult {
  success: boolean;
  creditsAdded: number;
  balanceAfter: number;
  transactionId: number;
  error?: string;
}

export interface CanAffordResult {
  canAfford: boolean;
  currentBalance: number;
  requiredCredits: number;
  deficit: number;
}

export interface WalletBalanceResponse {
  balance: number;
  totalEarned: number;
  totalSpent: number;
  recentTransactions: WalletTransaction[];
  isLocked: boolean;
}

// ================================
// WALLET SERVICE
// ================================

class WalletService {

  /**
   * Obtiene o crea una wallet para un usuario.
   * Idempotente — seguro llamar múltiples veces.
   */
  async getOrCreateWallet(firebaseUid: string, userId?: number): Promise<WalletAccount> {
    if (!pgDb) throw new Error('Database not available');

    // STEP 1: Fast path — try to get existing wallet first
    const existing = await pgDb
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.firebaseUid, firebaseUid))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // STEP 2: Resolve userId from PostgreSQL
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const userRecord = await pgDb
        .select({ id: users.id })
        .from(users)
        .where(eq(users.firebaseUid, firebaseUid))
        .limit(1);

      if (userRecord.length === 0) {
        throw new Error(`User with firebaseUid ${firebaseUid} not found in PostgreSQL`);
      }
      resolvedUserId = userRecord[0].id;
    }

    // STEP 3: Atomic UPSERT — handles both unique constraints (firebase_uid AND user_id)
    // Case A: No wallet exists → INSERT creates it
    // Case B: Wallet exists with same firebase_uid → DO UPDATE sets updated_at (no-op effectively)
    // Case C: Wallet exists with same user_id but different firebase_uid → DO UPDATE fixes the firebase_uid
    // This covers the scenario where airdrop created a wallet row with a stale/empty firebase_uid
    try {
      await pgDb.execute(sql`
        INSERT INTO wallet_accounts (user_id, firebase_uid, balance_credits, total_credits_earned, total_credits_spent, total_top_up_amount_cents, is_locked, created_at, updated_at)
        VALUES (${resolvedUserId}, ${firebaseUid}, 0, 0, 0, 0, false, NOW(), NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          firebase_uid = CASE
            WHEN wallet_accounts.firebase_uid = '' OR wallet_accounts.firebase_uid IS NULL
            THEN EXCLUDED.firebase_uid
            ELSE wallet_accounts.firebase_uid
          END,
          updated_at = NOW()
      `);
    } catch (insertErr: any) {
      // Ignore unique constraint violations — wallet was created by a concurrent request
      if (insertErr.code !== '23505') throw insertErr;
      console.warn(`[WALLET] Unique constraint on insert for ${firebaseUid} (userId: ${resolvedUserId}), will re-SELECT`);
    }

    // STEP 4: Re-SELECT by firebase_uid first, then fallback to user_id
    let afterInsert = await pgDb
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.firebaseUid, firebaseUid))
      .limit(1);

    // Fallback: if not found by firebase_uid, try by user_id (covers edge case where firebase_uid mismatch)
    if (afterInsert.length === 0 && resolvedUserId) {
      console.warn(`[WALLET] Not found by firebase_uid, trying user_id=${resolvedUserId}`);
      afterInsert = await pgDb
        .select()
        .from(walletAccounts)
        .where(eq(walletAccounts.userId, resolvedUserId))
        .limit(1);

      // If found by user_id, update the firebase_uid to fix the mismatch
      if (afterInsert.length > 0 && afterInsert[0].firebaseUid !== firebaseUid) {
        console.warn(`[WALLET] Fixing firebase_uid mismatch for userId=${resolvedUserId}: '${afterInsert[0].firebaseUid}' → '${firebaseUid}'`);
        await pgDb.execute(sql`
          UPDATE wallet_accounts SET firebase_uid = ${firebaseUid}, updated_at = NOW()
          WHERE user_id = ${resolvedUserId}
        `);
        afterInsert[0].firebaseUid = firebaseUid;
      }
    }

    if (afterInsert.length === 0) {
      throw new Error(`Wallet not found after insert for firebaseUid ${firebaseUid} (userId: ${resolvedUserId})`);
    }

    const isNew = afterInsert[0].balanceCredits === 0 && afterInsert[0].totalCreditsEarned === 0;
    if (isNew) {
      console.log(`✅ [WALLET] Created new wallet for user ${firebaseUid} (userId: ${resolvedUserId})`);
    }
    return afterInsert[0];
  }

  /**
   * Obtiene el balance actual de un usuario.
   */
  async getBalance(firebaseUid: string): Promise<number> {
    if (!pgDb) return 0;

    const wallet = await pgDb
      .select({ balanceCredits: walletAccounts.balanceCredits })
      .from(walletAccounts)
      .where(eq(walletAccounts.firebaseUid, firebaseUid))
      .limit(1);

    return wallet.length > 0 ? wallet[0].balanceCredits : 0;
  }

  /**
   * Obtiene la wallet completa por Firebase UID.
   */
  async getWalletByFirebaseUid(firebaseUid: string): Promise<WalletAccount | null> {
    if (!pgDb) return null;

    const result = await pgDb
      .select()
      .from(walletAccounts)
      .where(eq(walletAccounts.firebaseUid, firebaseUid))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  }

  /**
   * Obtiene el balance completo con transacciones recientes.
   */
  async getWalletBalance(firebaseUid: string): Promise<WalletBalanceResponse> {
    if (!pgDb) {
      return { balance: 0, totalEarned: 0, totalSpent: 0, recentTransactions: [], isLocked: false };
    }

    const wallet = await this.getOrCreateWallet(firebaseUid);
    
    const recentTransactions = await pgDb
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.firebaseUid, firebaseUid))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(10);

    return {
      balance: wallet.balanceCredits,
      totalEarned: wallet.totalCreditsEarned,
      totalSpent: wallet.totalCreditsSpent,
      recentTransactions,
      isLocked: wallet.isLocked,
    };
  }

  /**
   * Obtiene el historial completo de transacciones (paginado).
   */
  async getTransactionHistory(
    firebaseUid: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<WalletTransaction[]> {
    if (!pgDb) return [];

    return pgDb
      .select()
      .from(walletTransactions)
      .where(eq(walletTransactions.firebaseUid, firebaseUid))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Verifica si el usuario puede pagar sin deducir.
   */
  async canAfford(firebaseUid: string, requiredCredits: number): Promise<CanAffordResult> {
    const currentBalance = await this.getBalance(firebaseUid);
    const canAfford = currentBalance >= requiredCredits;

    return {
      canAfford,
      currentBalance,
      requiredCredits,
      deficit: canAfford ? 0 : requiredCredits - currentBalance,
    };
  }

  /**
   * DEDUCCIÓN ATÓMICA DE CRÉDITOS
   * Usa UPDATE atómico con WHERE balance >= amount para prevenir race conditions.
   * Si retorna 0 filas = saldo insuficiente.
   * 
   * IMPORTANTE: Llamar DESPUÉS de que la operación de IA es exitosa, NUNCA antes.
   */
  async deductCredits(params: {
    firebaseUid: string;
    featureName: FeatureName;
    resourceId?: string;
    description?: string;
    metadata?: Record<string, unknown>;
    idempotencyKey?: string;
  }): Promise<DeductionResult> {
    if (!pgDb) {
      return { success: false, creditsDeducted: 0, balanceAfter: 0, transactionId: 0, error: 'DB_ERROR' };
    }

    const creditsToDeduct = FEATURE_CREDIT_COSTS[params.featureName];

    // Features gratuitas — no deducir
    if (creditsToDeduct === 0) {
      return { success: true, creditsDeducted: 0, balanceAfter: await this.getBalance(params.firebaseUid), transactionId: -1 };
    }

    // Obtener wallet
    const wallet = await this.getWalletByFirebaseUid(params.featureName === 'basicEstimate' ? params.firebaseUid : params.firebaseUid);
    
    if (!wallet) {
      // Intentar crear wallet automáticamente
      try {
        await this.getOrCreateWallet(params.firebaseUid);
      } catch {
        return { success: false, creditsDeducted: 0, balanceAfter: 0, transactionId: 0, error: 'WALLET_NOT_FOUND' };
      }
    }

    const currentWallet = wallet || await this.getWalletByFirebaseUid(params.firebaseUid);
    if (!currentWallet) {
      return { success: false, creditsDeducted: 0, balanceAfter: 0, transactionId: 0, error: 'WALLET_NOT_FOUND' };
    }

    // Verificar si la wallet está bloqueada
    if (currentWallet.isLocked) {
      return { 
        success: false, 
        creditsDeducted: 0, 
        balanceAfter: currentWallet.balanceCredits, 
        transactionId: 0, 
        error: 'WALLET_LOCKED',
        currentBalance: currentWallet.balanceCredits,
        requiredCredits: creditsToDeduct,
      };
    }

    // Verificar idempotencia
    if (params.idempotencyKey) {
      const existing = await pgDb
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.idempotencyKey, params.idempotencyKey))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⚡ [WALLET] Idempotent deduction — key already processed: ${params.idempotencyKey}`);
        return {
          success: true,
          creditsDeducted: existing[0].amountCredits,
          balanceAfter: existing[0].balanceAfter,
          transactionId: existing[0].id,
        };
      }
    }

    // DEDUCCIÓN ATÓMICA — el corazón del sistema
    const updateResult = await pgDb.execute(sql`
      UPDATE wallet_accounts 
      SET 
        balance_credits = balance_credits - ${creditsToDeduct},
        total_credits_spent = total_credits_spent + ${creditsToDeduct},
        updated_at = NOW()
      WHERE firebase_uid = ${params.firebaseUid} 
        AND balance_credits >= ${creditsToDeduct}
        AND is_locked = false
      RETURNING balance_credits, id
    `);

    if (!updateResult.rows || updateResult.rows.length === 0) {
      // Saldo insuficiente o wallet bloqueada
      const currentBalance = await this.getBalance(params.firebaseUid);
      return {
        success: false,
        creditsDeducted: 0,
        balanceAfter: currentBalance,
        transactionId: 0,
        error: 'INSUFFICIENT_CREDITS',
        currentBalance,
        requiredCredits: creditsToDeduct,
      };
    }

    const newBalance = updateResult.rows[0].balance_credits as number;
    const walletId = updateResult.rows[0].id as number;

    // Registrar la transacción en el ledger
    const transaction = await pgDb
      .insert(walletTransactions)
      .values({
        walletId,
        userId: currentWallet.userId,
        firebaseUid: params.firebaseUid,
        type: 'feature_use',
        direction: 'debit',
        amountCredits: creditsToDeduct,
        balanceAfter: newBalance,
        featureName: params.featureName,
        resourceId: params.resourceId,
        description: params.description || `Used ${params.featureName} (${creditsToDeduct} credits)`,
        metadata: params.metadata ? params.metadata as any : null,
        idempotencyKey: params.idempotencyKey,
      })
      .returning({ id: walletTransactions.id });

    console.log(`💳 [WALLET] Deducted ${creditsToDeduct} credits for ${params.featureName}. Balance: ${newBalance}`);

    return {
      success: true,
      creditsDeducted: creditsToDeduct,
      balanceAfter: newBalance,
      transactionId: transaction[0].id,
    };
  }

  /**
   * AGREGAR CRÉDITOS
   * Para top-ups, grants de suscripción, bonos y ajustes admin.
   */
  async addCredits(params: {
    firebaseUid: string;
    amountCredits: number;
    type: 'topup' | 'subscription_grant' | 'bonus' | 'refund' | 'admin_adjustment';
    description: string;
    idempotencyKey?: string;
    stripePaymentIntentId?: string;
    stripeCheckoutSessionId?: string;
    topUpAmountCents?: number;
    subscriptionPlanId?: number;
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  }): Promise<AddCreditsResult> {
    if (!pgDb) {
      return { success: false, creditsAdded: 0, balanceAfter: 0, transactionId: 0, error: 'DB_ERROR' };
    }

    // Verificar idempotencia
    if (params.idempotencyKey) {
      const existing = await pgDb
        .select()
        .from(walletTransactions)
        .where(eq(walletTransactions.idempotencyKey, params.idempotencyKey))
        .limit(1);

      if (existing.length > 0) {
        console.log(`⚡ [WALLET] Idempotent add — key already processed: ${params.idempotencyKey}`);
        return {
          success: true,
          creditsAdded: existing[0].amountCredits,
          balanceAfter: existing[0].balanceAfter,
          transactionId: existing[0].id,
        };
      }
    }

    // Obtener o crear wallet (fuera de la transacción para evitar deadlocks)
    const wallet = await this.getOrCreateWallet(params.firebaseUid);

    // V7 FIX: Wrap balance update + ledger insert in a single DB transaction.
    // Previously these were two separate queries: if the server crashed between them,
    // the balance would be updated but no ledger entry would exist — creating an audit gap.
    // With db.transaction(), both operations succeed or both are rolled back atomically.
    const isTopUp = params.type === 'topup';

    const { newBalance, walletId, transactionId } = await pgDb.transaction(async (tx) => {
      // Step 1: Update balance atomically
      const updateResult = await tx.execute(sql`
        UPDATE wallet_accounts 
        SET 
          balance_credits = balance_credits + ${params.amountCredits},
          total_credits_earned = total_credits_earned + ${params.amountCredits},
          ${isTopUp ? sql`total_top_up_amount_cents = total_top_up_amount_cents + ${params.topUpAmountCents || 0},` : sql``}
          updated_at = NOW()
        WHERE firebase_uid = ${params.firebaseUid}
        RETURNING balance_credits, id
      `);

      if (!updateResult.rows || updateResult.rows.length === 0) {
        throw new Error('Wallet not found during addCredits transaction');
      }

      const newBal = updateResult.rows[0].balance_credits as number;
      const wId = updateResult.rows[0].id as number;

      // Step 2: Insert ledger entry in the same transaction
      const txRecord = await tx
        .insert(walletTransactions)
        .values({
          walletId: wId,
          userId: wallet.userId,
          firebaseUid: params.firebaseUid,
          type: params.type,
          direction: 'credit',
          amountCredits: params.amountCredits,
          balanceAfter: newBal,
          description: params.description,
          idempotencyKey: params.idempotencyKey,
          stripePaymentIntentId: params.stripePaymentIntentId,
          stripeCheckoutSessionId: params.stripeCheckoutSessionId,
          topUpAmountCents: params.topUpAmountCents,
          subscriptionPlanId: params.subscriptionPlanId,
          expiresAt: params.expiresAt,
          metadata: params.metadata ? params.metadata as any : null,
        })
        .returning({ id: walletTransactions.id });

      return { newBalance: newBal, walletId: wId, transactionId: txRecord[0].id };
    }).catch((txError: unknown) => {
      // Unwrap 'Wallet not found' as a non-error return
      if (txError instanceof Error && txError.message.includes('Wallet not found')) {
        return null;
      }
      throw txError;
    });

    if (!newBalance && newBalance !== 0) {
      return { success: false, creditsAdded: 0, balanceAfter: 0, transactionId: 0, error: 'Wallet not found' };
    }

    console.log(`✅ [WALLET] Added ${params.amountCredits} credits (${params.type}). New balance: ${newBalance}`);

    return {
      success: true,
      creditsAdded: params.amountCredits,
      balanceAfter: newBalance,
      transactionId,
    };
  }

  /**
   * PROCESAR COMPLETACIÓN DE TOP-UP
   * Llamado SOLO desde el webhook de Stripe (checkout.session.completed).
   * NUNCA desde success_url.
   */
  async processTopUpCompletion(
    sessionId: string,
    paymentIntentId: string,
    firebaseUid: string,
    amountCents: number,
    packageId: number
  ): Promise<void> {
    if (!pgDb) throw new Error('Database not available');

    // Obtener el paquete de créditos
    const packageResult = await pgDb
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.id, packageId))
      .limit(1);

    if (packageResult.length === 0) {
      throw new Error(`Credit package ${packageId} not found`);
    }

    const pkg = packageResult[0];
    const totalCredits = pkg.credits + pkg.bonusCredits;

    // Idempotency key basado en el checkout session ID
    const idempotencyKey = `topup:${sessionId}`;

    await this.addCredits({
      firebaseUid,
      amountCredits: totalCredits,
      type: 'topup',
      description: `${pkg.name} — ${totalCredits} credits (${pkg.credits} + ${pkg.bonusCredits} bonus)`,
      idempotencyKey,
      stripePaymentIntentId: paymentIntentId,
      stripeCheckoutSessionId: sessionId,
      topUpAmountCents: amountCents,
      metadata: {
        packageId,
        packageName: pkg.name,
        baseCredits: pkg.credits,
        bonusCredits: pkg.bonusCredits,
      },
      // Top-up credits NUNCA expiran
      expiresAt: undefined,
    });

    console.log(`🎉 [WALLET] Top-up completed: ${totalCredits} credits for user ${firebaseUid}`);
  }

  /**
   * GRANT MENSUAL DE CRÉDITOS POR SUSCRIPCIÓN
   * Llamado desde webhook invoice.payment_succeeded.
   * Créditos expiran 60 días tras fin del período de billing.
   */
  async grantMonthlySubscriptionCredits(
    firebaseUid: string,
    planId: number,
    periodEnd: Date,
    invoiceId: string,
    subscriptionId: string
  ): Promise<void> {
    if (!pgDb) throw new Error('Database not available');

    // Obtener créditos del plan
    const planResult = await pgDb
      .select({ monthly_credits_grant: subscriptionPlans.monthly_credits_grant, name: subscriptionPlans.name })
      .from(subscriptionPlans)
      .where(eq(subscriptionPlans.id, planId))
      .limit(1);

    const creditsToGrant = planResult.length > 0 
      ? (planResult[0].monthly_credits_grant || PLAN_MONTHLY_CREDITS[planId as keyof typeof PLAN_MONTHLY_CREDITS] || 0)
      : (PLAN_MONTHLY_CREDITS[planId as keyof typeof PLAN_MONTHLY_CREDITS] || 0);

    if (creditsToGrant === 0) {
      console.log(`ℹ️  [WALLET] Plan ${planId} has 0 credits grant — skipping`);
      return;
    }

    // Idempotency key: subscriptionId + invoiceId
    const idempotencyKey = `subscription_grant:${subscriptionId}:${invoiceId}`;

    // Créditos de suscripción expiran 60 días tras fin del período
    const expiresAt = new Date(periodEnd);
    expiresAt.setDate(expiresAt.getDate() + 60);

    const planName = planResult.length > 0 ? planResult[0].name : `Plan ${planId}`;

    await this.addCredits({
      firebaseUid,
      amountCredits: creditsToGrant,
      type: 'subscription_grant',
      description: `Monthly credits — ${planName} (${creditsToGrant} credits)`,
      idempotencyKey,
      subscriptionPlanId: planId,
      expiresAt,
      metadata: {
        planId,
        planName,
        invoiceId,
        subscriptionId,
        periodEnd: periodEnd.toISOString(),
      },
    });

    console.log(`🎁 [WALLET] Granted ${creditsToGrant} credits to ${firebaseUid} for plan ${planName}`);
  }

  /**
   * BLOQUEAR WALLET (para fraude / chargeback)
   */
  async lockWallet(firebaseUid: string, reason: string): Promise<void> {
    if (!pgDb) return;

    await pgDb
      .update(walletAccounts)
      .set({ isLocked: true, lockedReason: reason, updatedAt: new Date() })
      .where(eq(walletAccounts.firebaseUid, firebaseUid));

    console.log(`🔒 [WALLET] Locked wallet for ${firebaseUid}: ${reason}`);
  }

  /**
   * DESBLOQUEAR WALLET (admin)
   */
  async unlockWallet(firebaseUid: string): Promise<void> {
    if (!pgDb) return;

    await pgDb
      .update(walletAccounts)
      .set({ isLocked: false, lockedReason: null, updatedAt: new Date() })
      .where(eq(walletAccounts.firebaseUid, firebaseUid));

    console.log(`🔓 [WALLET] Unlocked wallet for ${firebaseUid}`);
  }

  /**
   * OBTENER PAQUETES DE CRÉDITOS DISPONIBLES
   */
  async getCreditPackages(): Promise<CreditPackage[]> {
    if (!pgDb) return [];

    return pgDb
      .select()
      .from(creditPackages)
      .where(eq(creditPackages.isActive, true))
      .orderBy(creditPackages.sortOrder);
  }

  /**
   * BACKFILL: Crear wallets para usuarios existentes (script de migración)
   * Dar 50 créditos de bienvenida a cada usuario existente.
   */
  async backfillExistingUsers(): Promise<{ created: number; skipped: number; errors: number }> {
    if (!pgDb) throw new Error('Database not available');

    const allUsers = await pgDb
      .select({ id: users.id, firebaseUid: users.firebaseUid, email: users.email })
      .from(users)
      .where(sql`firebase_uid IS NOT NULL`);

    let created = 0, skipped = 0, errors = 0;

    for (const user of allUsers) {
      if (!user.firebaseUid) { skipped++; continue; }

      try {
        const existing = await this.getWalletByFirebaseUid(user.firebaseUid);
        
        if (existing) {
          skipped++;
          continue;
        }

        // Crear wallet
        const wallet = await this.getOrCreateWallet(user.firebaseUid, user.id);

        // Dar 50 créditos de bienvenida
        await this.addCredits({
          firebaseUid: user.firebaseUid,
          amountCredits: 50,
          type: 'bonus',
          description: 'Welcome credits — Mervin AI Wallet launch',
          idempotencyKey: `welcome_bonus:${user.firebaseUid}`,
          metadata: { reason: 'launch_bonus', userEmail: user.email },
        });

        created++;
        console.log(`✅ [WALLET-BACKFILL] Created wallet + 50 welcome credits for ${user.email}`);

      } catch (error) {
        console.error(`❌ [WALLET-BACKFILL] Error for user ${user.email}:`, error);
        errors++;
      }
    }

    console.log(`📊 [WALLET-BACKFILL] Done: ${created} created, ${skipped} skipped, ${errors} errors`);
    return { created, skipped, errors };
  }
}

export const walletService = new WalletService();
