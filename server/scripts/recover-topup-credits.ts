/**
 * MANUAL CREDIT RECOVERY SCRIPT
 * ============================================================
 * Use this script to manually grant credits to a user who paid
 * via Stripe Checkout but whose credits were NOT granted because
 * the webhook was failing (STRIPE_WEBHOOK_SECRET not set or raw
 * body was consumed by express.json() before signature verification).
 *
 * USAGE:
 *   npx tsx server/scripts/recover-topup-credits.ts \
 *     --firebase-uid <FIREBASE_UID> \
 *     --session-id <STRIPE_CHECKOUT_SESSION_ID> \
 *     --package-id <CREDIT_PACKAGE_ID> \
 *     --dry-run
 *
 * Remove --dry-run to actually grant the credits.
 *
 * FINDING THE DATA:
 *   - Firebase UID: Firebase Console → Authentication → Users
 *   - Session ID: Stripe Dashboard → Payments → find the payment → Checkout Session ID
 *   - Package ID: Check credit_packages table in your DB
 *
 * IDEMPOTENCY:
 *   The idempotency key is `topup:<session_id>` — the same key used by the
 *   webhook handler. Running this script twice for the same session is safe;
 *   the second run will be a no-op.
 */

import dotenv from 'dotenv';
dotenv.config();

import { db as pgDb } from '../db';
import { walletService } from '../services/walletService';
import { creditPackages } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };

  const firebaseUid = get('--firebase-uid');
  const sessionId = get('--session-id');
  const packageIdStr = get('--package-id');
  const dryRun = args.includes('--dry-run');

  if (!firebaseUid || !sessionId || !packageIdStr) {
    console.error('❌ Missing required arguments.');
    console.error('Usage: npx tsx server/scripts/recover-topup-credits.ts \\');
    console.error('         --firebase-uid <UID> \\');
    console.error('         --session-id <cs_live_...> \\');
    console.error('         --package-id <number> \\');
    console.error('         [--dry-run]');
    process.exit(1);
  }

  const packageId = parseInt(packageIdStr, 10);
  if (isNaN(packageId)) {
    console.error('❌ --package-id must be a number');
    process.exit(1);
  }

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  MANUAL CREDIT RECOVERY');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Firebase UID : ${firebaseUid}`);
  console.log(`  Session ID   : ${sessionId}`);
  console.log(`  Package ID   : ${packageId}`);
  console.log(`  Mode         : ${dryRun ? 'DRY RUN (no changes)' : '⚠️  LIVE (will write to DB)'}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');

  if (!pgDb) {
    console.error('❌ Database not available. Check DATABASE_URL environment variable.');
    process.exit(1);
  }

  // 1. Look up the credit package
  const pkgResult = await pgDb
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.id, packageId))
    .limit(1);

  if (pkgResult.length === 0) {
    console.error(`❌ Credit package ${packageId} not found in database.`);
    console.error('   Available packages:');
    const all = await pgDb.select().from(creditPackages);
    all.forEach(p => console.error(`   ID ${p.id}: ${p.name} — ${p.credits + p.bonusCredits} credits`));
    process.exit(1);
  }

  const pkg = pkgResult[0];
  const totalCredits = pkg.credits + pkg.bonusCredits;

  console.log(`📦 Package found: "${pkg.name}"`);
  console.log(`   Base credits  : ${pkg.credits}`);
  console.log(`   Bonus credits : ${pkg.bonusCredits}`);
  console.log(`   Total credits : ${totalCredits}`);
  console.log('');

  // 2. Check idempotency — was this session already processed?
  const idempotencyKey = `topup:${sessionId}`;
  const { walletTransactions } = await import('@shared/wallet-schema');
  const existing = await pgDb
    .select()
    .from(walletTransactions)
    .where(eq(walletTransactions.idempotencyKey, idempotencyKey))
    .limit(1);

  if (existing.length > 0) {
    console.log('✅ This session was ALREADY processed (idempotent).');
    console.log(`   Transaction ID : ${existing[0].id}`);
    console.log(`   Credits granted: ${existing[0].amountCredits}`);
    console.log(`   Balance after  : ${existing[0].balanceAfter}`);
    console.log('');
    console.log('No action needed — credits were already granted.');
    process.exit(0);
  }

  console.log(`⚠️  Session ${sessionId} has NOT been processed yet.`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN — would grant:');
    console.log(`   ${totalCredits} credits to Firebase UID: ${firebaseUid}`);
    console.log(`   Idempotency key: ${idempotencyKey}`);
    console.log('');
    console.log('Run without --dry-run to apply.');
    process.exit(0);
  }

  // 3. Grant credits using the same logic as the webhook handler
  console.log(`🎁 Granting ${totalCredits} credits to ${firebaseUid}...`);

  try {
    await walletService.getOrCreateWallet(firebaseUid);
    await walletService.processTopUpCompletion(
      sessionId,
      'manual_recovery', // paymentIntentId placeholder
      firebaseUid,
      pkg.priceUsdCents,
      packageId
    );

    console.log('');
    console.log('══════════════════════════════════════════════════════');
    console.log(`✅ SUCCESS: ${totalCredits} credits granted to ${firebaseUid}`);
    console.log(`   Package  : ${pkg.name}`);
    console.log(`   Session  : ${sessionId}`);
    console.log(`   Key      : ${idempotencyKey}`);
    console.log('══════════════════════════════════════════════════════');
    console.log('');
    console.log('Next steps:');
    console.log('1. Verify the credit balance in the app or database.');
    console.log('2. Notify the user that their credits have been applied.');
    process.exit(0);
  } catch (error: any) {
    console.error('');
    console.error('❌ FAILED to grant credits:', error.message);
    console.error('   Full error:', error);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
