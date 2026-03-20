/**
 * FIND SESSION AND RECOVER CREDITS
 * ============================================================
 * Finds the Checkout Session ID for a given Payment Intent ID.
 * If no Checkout Session exists (payment made directly via PaymentIntent),
 * it uses the Payment Intent ID as the idempotency key and grants credits.
 *
 * USAGE:
 *   npx tsx server/scripts/find-and-recover-session.ts \
 *     --payment-intent pi_3TD6ErBAAfD6dhk7o8ZYxW1 \
 *     --firebase-uid YApI8KoWjiNOfgo6spWFf252L832 \
 *     --package-id 1
 *
 * Add --dry-run to simulate without writing to DB.
 */

import dotenv from 'dotenv';
dotenv.config();

import Stripe from 'stripe';

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const paymentIntentId = get('--payment-intent');
  const firebaseUid = get('--firebase-uid');
  const packageIdStr = get('--package-id');
  const dryRun = args.includes('--dry-run');

  if (!paymentIntentId || !firebaseUid || !packageIdStr) {
    console.error('❌ Missing required arguments.');
    console.error('Usage: npx tsx server/scripts/find-and-recover-session.ts \\');
    console.error('         --payment-intent pi_... \\');
    console.error('         --firebase-uid <UID> \\');
    console.error('         --package-id <number> \\');
    console.error('         [--dry-run]');
    process.exit(1);
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeKey) {
    console.error('❌ STRIPE_SECRET_KEY not set in environment');
    process.exit(1);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2025-06-30.basil' as any });

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  FIND SESSION & RECOVER CREDITS');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Payment Intent : ${paymentIntentId}`);
  console.log(`  Firebase UID   : ${firebaseUid}`);
  console.log(`  Package ID     : ${packageIdStr}`);
  console.log(`  Mode           : ${dryRun ? 'DRY RUN' : '⚠️  LIVE'}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');

  // 1. Try to find a Checkout Session for this Payment Intent
  let sessionId: string | null = null;
  let amountTotal = 0;

  console.log(`🔍 Looking up Checkout Session for ${paymentIntentId}...`);
  try {
    const sessions = await stripe.checkout.sessions.list({
      payment_intent: paymentIntentId,
      limit: 5,
    });

    if (sessions.data.length > 0) {
      const session = sessions.data[0];
      sessionId = session.id;
      amountTotal = session.amount_total || 0;
      console.log(`✅ Found Checkout Session: ${sessionId}`);
      console.log(`   Status   : ${session.status}`);
      console.log(`   Amount   : $${(amountTotal / 100).toFixed(2)}`);
    } else {
      console.log(`ℹ️  No Checkout Session found — using Payment Intent directly.`);
    }
  } catch (err: any) {
    console.log(`ℹ️  Could not list sessions: ${err.message} — using Payment Intent directly.`);
  }

  // 2. If no session found, verify the Payment Intent itself
  if (!sessionId) {
    console.log(`🔍 Verifying Payment Intent ${paymentIntentId}...`);
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log(`   Status : ${pi.status}`);
    console.log(`   Amount : $${((pi.amount_received || 0) / 100).toFixed(2)}`);

    if (pi.status !== 'succeeded') {
      console.error(`❌ Payment Intent status is "${pi.status}" — only "succeeded" payments should be recovered.`);
      process.exit(1);
    }

    amountTotal = pi.amount_received || pi.amount;
    // Use the payment intent ID as the idempotency key (prefixed with topup:pi:)
    sessionId = `pi_recovery:${paymentIntentId}`;
    console.log(`✅ Payment confirmed succeeded. Using recovery key: ${sessionId}`);
  }

  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN — would grant credits with:');
    console.log(`   Firebase UID : ${firebaseUid}`);
    console.log(`   Session Key  : ${sessionId}`);
    console.log(`   Package ID   : ${packageIdStr}`);
    console.log(`   Amount       : $${(amountTotal / 100).toFixed(2)}`);
    console.log('');
    console.log('Remove --dry-run to apply.');
    process.exit(0);
  }

  // 3. Connect to DB and grant credits
  const { db: pgDb } = await import('../db');
  const { walletService } = await import('../services/walletService');
  const { creditPackages } = await import('@shared/schema');
  const { walletTransactions } = await import('@shared/wallet-schema');
  const { eq } = await import('drizzle-orm');

  if (!pgDb) {
    console.error('❌ Database not available. Check DATABASE_URL.');
    process.exit(1);
  }

  // Check idempotency — was this already processed?
  const idempotencyKey = `topup:${sessionId}`;
  const existing = await pgDb
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    console.log('✅ Credits were ALREADY granted for this payment (idempotent).');
    console.log(`   Transaction ID : ${existing[0].id}`);
    console.log(`   Credits granted: ${existing[0].amountCredits}`);
    console.log(`   Balance after  : ${existing[0].balanceAfter}`);
    process.exit(0);
  }

  // Look up the credit package
  const packageId = parseInt(packageIdStr, 10);
  const pkgResult = await pgDb
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.id, packageId))
    .limit(1);

  if (pkgResult.length === 0) {
    console.error(`❌ Credit package ${packageId} not found.`);
    const all = await pgDb.select({ id: creditPackages.id, name: creditPackages.name, credits: creditPackages.credits, bonus: creditPackages.bonusCredits }).from(creditPackages);
    console.error('Available packages:');
    all.forEach(p => console.error(`  ID ${p.id}: ${p.name} — ${p.credits + p.bonus} credits`));
    process.exit(1);
  }

  const pkg = pkgResult[0];
  const totalCredits = pkg.credits + pkg.bonusCredits;

  console.log(`📦 Package: "${pkg.name}" — ${totalCredits} credits`);
  console.log(`🎁 Granting ${totalCredits} credits to ${firebaseUid}...`);

  // Ensure wallet exists
  await walletService.getOrCreateWallet(firebaseUid);

  // Grant credits using addCredits directly (since we have no real session ID)
  await walletService.addCredits({
    firebaseUid,
    amountCredits: totalCredits,
    type: 'topup',
    description: `${pkg.name} — ${totalCredits} credits (${pkg.credits} + ${pkg.bonusCredits} bonus) [manual recovery]`,
    idempotencyKey,
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: sessionId,
    topUpAmountCents: amountTotal,
    metadata: {
      packageId,
      packageName: pkg.name,
      baseCredits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
      recoveredManually: true,
      recoveredAt: new Date().toISOString(),
    },
    expiresAt: undefined,
  });

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log(`✅ SUCCESS: ${totalCredits} credits granted to ${firebaseUid}`);
  console.log(`   Package  : ${pkg.name}`);
  console.log(`   User     : m3rvin20@outlook.com`);
  console.log(`   PI       : ${paymentIntentId}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');
  console.log('Next: Notify the user that their 50 Mervin AI credits are now available.');
  process.exit(0);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
