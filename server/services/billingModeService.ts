/**
 * BILLING MODE SERVICE — PAY AS YOU GROW
 * Determina el modo de billing de cada usuario y si puede acceder a Stripe Connect.
 * 
 * Modos:
 * - 'free'        → Primo Chambeador, 20 créditos/mes del grant
 * - 'payg'        → Sin suscripción, compra créditos on-demand
 * - 'subscriber'  → Mero Patrón (500/mes) o Master Contractor (1200/mes)
 * 
 * Regla de Stripe Connect:
 * - Requiere suscripción activa O $20+ en top-ups históricos
 */

import { db as pgDb } from '../db';
import { eq, sql, and, gte } from 'drizzle-orm';
import {
  walletAccounts,
  walletTransactions,
  userSubscriptions,
  subscriptionPlans,
} from '@shared/schema';

export type BillingMode = 'free' | 'payg' | 'subscriber';

export interface UserBillingStatus {
  mode: BillingMode;
  planId: number | null;
  planName: string | null;
  monthlyCreditsGrant: number;
  currentBalance: number;
  canUseStripeConnect: boolean;
  hasActiveSubscription: boolean;
  totalTopUpCents: number;
}

class BillingModeService {

  /**
   * Obtiene el estado completo de billing de un usuario.
   */
  async getUserBillingStatus(firebaseUid: string): Promise<UserBillingStatus> {
    if (!pgDb) {
      return this.getDefaultStatus();
    }

    // Obtener suscripción activa
    const subscriptionResult = await pgDb.execute(sql`
      SELECT us.plan_id, us.status, sp.name as plan_name, sp.monthly_credits_grant
      FROM user_subscriptions us
      JOIN users u ON u.id = us.user_id
      JOIN subscription_plans sp ON sp.id = us.plan_id
      WHERE u.firebase_uid = ${firebaseUid}
        AND us.status IN ('active', 'trialing')
      ORDER BY us.created_at DESC
      LIMIT 1
    `);

    const subscription = subscriptionResult.rows.length > 0 ? subscriptionResult.rows[0] : null;

    // Obtener wallet
    const walletResult = await pgDb
      .select({
        balanceCredits: walletAccounts.balanceCredits,
        totalTopUpAmountCents: walletAccounts.totalTopUpAmountCents,
      })
      .from(walletAccounts)
      .where(eq(walletAccounts.firebaseUid, firebaseUid))
      .limit(1);

    const wallet = walletResult.length > 0 ? walletResult[0] : null;
    const currentBalance = wallet?.balanceCredits || 0;
    const totalTopUpCents = wallet?.totalTopUpAmountCents || 0;

    // Determinar modo
    let mode: BillingMode;
    let hasActiveSubscription = false;

    if (subscription) {
      hasActiveSubscription = true;
      const planId = subscription.plan_id as number;
      // Plan 5 = Free (Primo Chambeador)
      mode = planId === 5 ? 'free' : 'subscriber';
    } else {
      mode = 'payg';
    }

    // Stripe Connect: suscripción activa (no free) O $20+ en top-ups
    const canUseStripeConnect = 
      (hasActiveSubscription && (subscription?.plan_id as number) !== 5) ||
      totalTopUpCents >= 2000; // $20 = 2000 cents

    return {
      mode,
      planId: subscription ? (subscription.plan_id as number) : null,
      planName: subscription ? (subscription.plan_name as string) : null,
      monthlyCreditsGrant: subscription ? (subscription.monthly_credits_grant as number || 0) : 0,
      currentBalance,
      canUseStripeConnect,
      hasActiveSubscription,
      totalTopUpCents,
    };
  }

  /**
   * Verifica si el usuario puede usar Stripe Connect.
   */
  async canUseStripeConnect(firebaseUid: string): Promise<boolean> {
    const status = await this.getUserBillingStatus(firebaseUid);
    return status.canUseStripeConnect;
  }

  private getDefaultStatus(): UserBillingStatus {
    return {
      mode: 'payg',
      planId: null,
      planName: null,
      monthlyCreditsGrant: 0,
      currentBalance: 0,
      canUseStripeConnect: false,
      hasActiveSubscription: false,
      totalTopUpCents: 0,
    };
  }
}

export const billingModeService = new BillingModeService();
