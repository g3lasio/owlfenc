/**
 * MONTHLY CREDITS SERVICE
 * 
 * Grants monthly credits to ALL users based on their current plan:
 * - Primo Chambeador (Free, planId=5): 20 credits/month
 * - Mero Patrón (planId=9): 500 credits/month (via invoice.payment_succeeded webhook)
 * - Master Contractor (planId=6): 1200 credits/month (via invoice.payment_succeeded webhook)
 *
 * NOTE: Paid plan monthly credits are granted via the Stripe webhook
 * (invoice.payment_succeeded → handleWalletSubscriptionGrant).
 * This service handles ONLY the free plan (Primo Chambeador) which has no Stripe invoice.
 *
 * Schedule: Runs daily at 2:00 AM UTC.
 * On each run, it finds free-plan users whose monthly grant is due (based on their
 * wallet creation date or last monthly grant date) and grants 20 credits.
 *
 * Idempotency: Each grant uses a key of format `monthly_free:YYYY-MM:firebaseUid`
 * so running the job multiple times in the same month is safe.
 */

import { db as pgDb } from '../db.js';
import { walletAccounts, walletTransactions } from '@shared/wallet-schema';
import { users, userSubscriptions } from '@shared/schema';
import { eq, and, isNull, sql, lt, gte } from 'drizzle-orm';
import { walletService } from './walletService.js';
import { PLAN_IDS, PLAN_MONTHLY_CREDITS } from '@shared/wallet-schema';

const FREE_PLAN_ID = PLAN_IDS?.PRIMO_CHAMBEADOR ?? 5;
const FREE_PLAN_MONTHLY_CREDITS = (PLAN_MONTHLY_CREDITS as Record<number, number>)[FREE_PLAN_ID] ?? 20;

export interface MonthlyGrantResult {
  processed: number;
  granted: number;
  skipped: number;
  errors: number;
  details: Array<{ firebaseUid: string; status: 'granted' | 'skipped' | 'error'; reason?: string }>;
}

class MonthlyCreditsService {
  private isRunning = false;

  /**
   * Grant monthly credits to all free-plan users whose grant is due this month.
   * Safe to call multiple times — idempotency key prevents double grants.
   */
  async grantFreeMonthlyCredits(): Promise<MonthlyGrantResult> {
    if (this.isRunning) {
      console.log('⏳ [MONTHLY-CREDITS] Job already running, skipping duplicate execution');
      return { processed: 0, granted: 0, skipped: 0, errors: 0, details: [] };
    }

    this.isRunning = true;
    const result: MonthlyGrantResult = { processed: 0, granted: 0, skipped: 0, errors: 0, details: [] };

    try {
      console.log('🎁 [MONTHLY-CREDITS] Starting free plan monthly credit grants...');

      if (!pgDb) {
        throw new Error('Database not available');
      }

      // Get the current year-month for idempotency key (e.g., "2026-03")
      const now = new Date();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const idempotencyPrefix = `monthly_free:${yearMonth}:`;

      // Find all wallet accounts for free-plan users
      // We join with user_subscriptions to find users on planId=5 (free)
      // Users with no subscription record are also considered free plan
      const freeUsers = await pgDb
        .select({
          firebaseUid: walletAccounts.firebaseUid,
          walletId: walletAccounts.id,
        })
        .from(walletAccounts)
        .leftJoin(
          userSubscriptions,
          sql`${walletAccounts.userId} = ${userSubscriptions.userId} AND ${userSubscriptions.status} = 'active'`
        )
        .where(
          // Users with no active paid subscription OR explicitly on free plan
          sql`(${userSubscriptions.planId} IS NULL OR ${userSubscriptions.planId} = ${FREE_PLAN_ID})`
        );

      console.log(`🔍 [MONTHLY-CREDITS] Found ${freeUsers.length} free-plan wallet accounts`);
      result.processed = freeUsers.length;

      for (const user of freeUsers) {
        const { firebaseUid } = user;
        const idempotencyKey = `${idempotencyPrefix}${firebaseUid}`;

        try {
          // Check if already granted this month (idempotency check)
          const existing = await pgDb
            .select({ id: walletTransactions.id })
            .from(walletTransactions)
            .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
            .limit(1);

          if (existing.length > 0) {
            result.skipped++;
            result.details.push({ firebaseUid, status: 'skipped', reason: 'already_granted_this_month' });
            continue;
          }

          // Grant 20 credits
          const grantResult = await walletService.addCredits({
            firebaseUid,
            amountCredits: FREE_PLAN_MONTHLY_CREDITS,
            type: 'subscription_grant',
            description: `Monthly credits — Primo Chambeador (${FREE_PLAN_MONTHLY_CREDITS} credits)`,
            idempotencyKey,
            subscriptionPlanId: FREE_PLAN_ID,
            metadata: {
              planId: FREE_PLAN_ID,
              planName: 'Primo Chambeador',
              yearMonth,
              grantedAt: now.toISOString(),
            },
          });

          if (grantResult.success) {
            result.granted++;
            result.details.push({ firebaseUid, status: 'granted' });
            console.log(`✅ [MONTHLY-CREDITS] Granted ${FREE_PLAN_MONTHLY_CREDITS} credits to ${firebaseUid}`);
          } else {
            result.errors++;
            result.details.push({ firebaseUid, status: 'error', reason: grantResult.error || 'unknown' });
          }
        } catch (userErr) {
          result.errors++;
          result.details.push({
            firebaseUid,
            status: 'error',
            reason: userErr instanceof Error ? userErr.message : 'unknown',
          });
          console.error(`❌ [MONTHLY-CREDITS] Error granting credits to ${firebaseUid}:`, userErr);
        }
      }

      console.log(
        `✅ [MONTHLY-CREDITS] Done. Processed: ${result.processed}, Granted: ${result.granted}, ` +
        `Skipped: ${result.skipped}, Errors: ${result.errors}`
      );
    } catch (err) {
      console.error('❌ [MONTHLY-CREDITS] Fatal error in monthly credit grant job:', err);
    } finally {
      this.isRunning = false;
    }

    return result;
  }

  /**
   * Schedule the monthly credit grant job.
   * Uses a simple setInterval-based scheduler that runs daily at 2:00 AM UTC.
   * On startup, also checks if the grant for the current month is pending.
   */
  startScheduler(): void {
    console.log('⏰ [MONTHLY-CREDITS] Starting monthly credits scheduler...');

    // Run immediately on startup to catch any missed grants
    this.runIfDue().catch(err =>
      console.error('❌ [MONTHLY-CREDITS] Startup check failed:', err)
    );

    // Then check every 24 hours
    setInterval(() => {
      this.runIfDue().catch(err =>
        console.error('❌ [MONTHLY-CREDITS] Scheduled check failed:', err)
      );
    }, 24 * 60 * 60 * 1000); // 24 hours

    console.log('✅ [MONTHLY-CREDITS] Scheduler started (runs daily)');
  }

  /**
   * Run the grant job only if the current hour is 2 AM UTC (or if it's the startup check).
   * This prevents multiple runs per day when the interval fires slightly off.
   */
  private async runIfDue(): Promise<void> {
    const now = new Date();
    const hourUTC = now.getUTCHours();

    // Run at 2 AM UTC, or on startup (first run)
    if (hourUTC === 2 || process.env.MONTHLY_CREDITS_FORCE_RUN === 'true') {
      console.log('🎁 [MONTHLY-CREDITS] Running monthly free plan credit grants...');
      await this.grantFreeMonthlyCredits();
    } else {
      console.log(`⏰ [MONTHLY-CREDITS] Not yet time to run (current UTC hour: ${hourUTC}, target: 2)`);
    }
  }
}

export const monthlyCreditsService = new MonthlyCreditsService();
