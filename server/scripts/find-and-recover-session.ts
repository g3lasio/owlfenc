/**
 * FIND SESSION AND RECOVER CREDITS
 * ============================================================
 * Finds the Checkout Session ID for a given Payment Intent ID,
 * then grants the credits to the user.
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

  // 1. Find the Checkout Session for this Payment Intent
  console.log(`🔍 Looking up Checkout Session for ${paymentIntentId}...`);

  const sessions = await stripe.checkout.sessions.list({
    payment_intent: paymentIntentId,
    limit: 5,
  });

  if (sessions.data.length === 0) {
    console.error('❌ No Checkout Session found for this Payment Intent.');
    console.error('   This may happen if the payment was not made through Stripe Checkout.');
    process.exit(1);
  }

  const session = sessions.data[0];
  console.log(`✅ Found Checkout Session: ${session.id}`);
  console.log(`   Status   : ${session.status}`);
  console.log(`   Amount   : $${((session.amount_total || 0) / 100).toFixed(2)}`);
  console.log(`   Metadata : ${JSON.stringify(session.metadata)}`);
  console.log('');

  if (session.status !== 'complete') {
    console.error(`❌ Session status is "${session.status}" — only "complete" sessions should be processed.`);
    process.exit(1);
  }

  if (dryRun) {
    console.log('🔍 DRY RUN — would run recovery with:');
    console.log(`   npx tsx server/scripts/recover-topup-credits.ts \\`);
    console.log(`     --firebase-uid ${firebaseUid} \\`);
    console.log(`     --session-id ${session.id} \\`);
    console.log(`     --package-id ${packageIdStr}`);
    console.log('');
    console.log('Remove --dry-run to apply.');
    process.exit(0);
  }

  // 2. Run the recovery
  const { db: pgDb } = await import('../db');
  const { walletService } = await import('../services/walletService');
  const { creditPackages } = await import('@shared/schema');
  const { eq } = await import('drizzle-orm');
  const { walletTransactions } = await import('@shared/wallet-schema');

  if (!pgDb) {
    console.error('❌ Database not available. Check DATABASE_URL.');
    process.exit(1);
  }

  // Check idempotency
  const idempotencyKey = `topup:${session.id}`;
  const existing = await pgDb
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    console.log('✅ Credits were ALREADY granted for this session (idempotent).');
    console.log(`   Transaction ID : ${existing[0].id}`);
    console.log(`   Credits granted: ${existing[0].amountCredits}`);
    console.log(`   Balance after  : ${existing[0].balanceAfter}`);
    process.exit(0);
  }

  // Look up package
  const packageId = parseInt(packageIdStr, 10);
  const pkgResult = await pgDb
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.id, packageId))
    .limit(1);

  if (pkgResult.length === 0) {
    console.error(`❌ Credit package ${packageId} not found.`);
    process.exit(1);
  }

  const pkg = pkgResult[0];
  const totalCredits = pkg.credits + pkg.bonusCredits;

  console.log(`📦 Package: "${pkg.name}" — ${totalCredits} credits`);
  console.log(`🎁 Granting ${totalCredits} credits to ${firebaseUid}...`);

  await walletService.getOrCreateWallet(firebaseUid);
  await walletService.processTopUpCompletion(
    session.id,
    typeof session.payment_intent === 'string' ? session.payment_intent : paymentIntentId,
    firebaseUid,
    session.amount_total || 0,
    packageId
  );

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log(`✅ SUCCESS: ${totalCredits} credits granted to ${firebaseUid}`);
  console.log(`   Package  : ${pkg.name}`);
  console.log(`   Session  : ${session.id}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');
  console.log('Notify the user (m3rvin20@outlook.com) that their 50 credits are now available.');
  process.exit(0);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
