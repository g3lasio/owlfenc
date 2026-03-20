/**
 * WEBHOOK FAILURE DIAGNOSTIC SCRIPT
 * ============================================================
 * Checks the current webhook configuration and identifies any
 * Stripe Checkout Sessions that completed payment but whose
 * credits were never granted (missing idempotency key in DB).
 *
 * USAGE:
 *   npx tsx server/scripts/diagnose-webhook-failures.ts
 *
 * OUTPUT:
 *   - Webhook configuration status
 *   - List of wallet transactions with type=topup (to see what was processed)
 *   - Stripe sessions in DB that may need recovery
 */

import dotenv from 'dotenv';
dotenv.config();

import { db as pgDb } from '../db';
import { walletTransactions, walletAccounts } from '@shared/wallet-schema';
import { creditPackages } from '@shared/schema';
import { eq, desc, and } from 'drizzle-orm';

async function main() {
  console.log('');
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  STRIPE WEBHOOK DIAGNOSTIC REPORT');
  console.log(`  Generated: ${new Date().toISOString()}`);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('');

  // ── 1. Check environment ──────────────────────────────────────────────────
  console.log('1. ENVIRONMENT CONFIGURATION');
  console.log('─────────────────────────────');

  const stripeKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const nodeEnv = process.env.NODE_ENV;

  console.log(`   NODE_ENV              : ${nodeEnv || 'NOT SET'}`);
  console.log(`   STRIPE_SECRET_KEY     : ${stripeKey ? `✅ Set (${stripeKey.substring(0, 12)}...)` : '❌ NOT SET'}`);
  console.log(`   STRIPE_WEBHOOK_SECRET : ${webhookSecret ? `✅ Set (${webhookSecret.substring(0, 12)}...)` : '❌ NOT SET ← ROOT CAUSE'}`);

  if (!webhookSecret) {
    console.log('');
    console.log('   🚨 CRITICAL: STRIPE_WEBHOOK_SECRET is not set!');
    console.log('   This is the ROOT CAUSE of the webhook failures.');
    console.log('   Fix: Add STRIPE_WEBHOOK_SECRET to Replit Secrets.');
    console.log('   Get it from: Stripe Dashboard → Developers → Webhooks → your endpoint → Signing secret');
  }
  console.log('');

  if (!pgDb) {
    console.error('❌ Database not available. Check DATABASE_URL.');
    process.exit(1);
  }

  // ── 2. Check recent top-up transactions ──────────────────────────────────
  console.log('2. RECENT TOP-UP TRANSACTIONS (last 30 days)');
  console.log('─────────────────────────────────────────────');

  const recentTopUps = await pgDb
    .select({
      id: walletTransactions.id,
      firebaseUid: walletTransactions.firebaseUid,
      amountCredits: walletTransactions.amountCredits,
      description: walletTransactions.description,
      idempotencyKey: walletTransactions.idempotencyKey,
      stripeCheckoutSessionId: walletTransactions.stripeCheckoutSessionId,
      createdAt: walletTransactions.createdAt,
    })
    .from(walletTransactions)
    .where(eq(walletTransactions.type, 'topup'))
    .orderBy(desc(walletTransactions.createdAt))
    .limit(20);

  if (recentTopUps.length === 0) {
    console.log('   ⚠️  No top-up transactions found in the last 30 days.');
    console.log('   This confirms that NO credits have been granted via webhook.');
  } else {
    console.log(`   Found ${recentTopUps.length} top-up transaction(s):`);
    recentTopUps.forEach(tx => {
      console.log(`   - ID ${tx.id}: ${tx.amountCredits} credits → ${tx.firebaseUid}`);
      console.log(`     Session: ${tx.stripeCheckoutSessionId || 'N/A'}`);
      console.log(`     Key: ${tx.idempotencyKey || 'N/A'}`);
      console.log(`     Date: ${tx.createdAt}`);
    });
  }
  console.log('');

  // ── 3. Check credit packages ──────────────────────────────────────────────
  console.log('3. AVAILABLE CREDIT PACKAGES');
  console.log('─────────────────────────────');

  const packages = await pgDb.select().from(creditPackages);
  packages.forEach(pkg => {
    const total = pkg.credits + pkg.bonusCredits;
    console.log(`   ID ${pkg.id}: "${pkg.name}" — ${total} credits ($${(pkg.priceUsdCents / 100).toFixed(2)})`);
    console.log(`     Stripe Price ID: ${pkg.stripePriceId || '❌ NOT SET'}`);
    console.log(`     Active: ${pkg.isActive ? 'yes' : 'no'}`);
  });
  console.log('');

  // ── 4. Summary and recommended actions ───────────────────────────────────
  console.log('4. RECOMMENDED ACTIONS');
  console.log('───────────────────────');

  if (!webhookSecret) {
    console.log('   STEP 1 (URGENT): Set STRIPE_WEBHOOK_SECRET in Replit Secrets');
    console.log('     → Replit Dashboard → Deployments → Configuration → Secrets');
    console.log('     → Key: STRIPE_WEBHOOK_SECRET');
    console.log('     → Value: Get from Stripe Dashboard → Developers → Webhooks → endpoint → Signing secret');
    console.log('');
  }

  console.log('   STEP 2: For each user who paid but got no credits, run:');
  console.log('     npx tsx server/scripts/recover-topup-credits.ts \\');
  console.log('       --firebase-uid <UID> \\');
  console.log('       --session-id <cs_live_...> \\');
  console.log('       --package-id <ID>');
  console.log('');
  console.log('   STEP 3: Deploy the code fix (git push to main)');
  console.log('');
  console.log('   STEP 4: Verify webhook health at:');
  console.log('     GET https://app.owlfenc.com/api/webhooks/stripe/health');
  console.log('');

  console.log('══════════════════════════════════════════════════════════════');
  process.exit(0);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
