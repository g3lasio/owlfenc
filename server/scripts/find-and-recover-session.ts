/**
 * DIRECT CREDIT RECOVERY SCRIPT
 * ============================================================
 * Grants credits directly to a user without calling the Stripe API.
 * Use this when you have already confirmed the payment in the Stripe
 * Dashboard and just need to manually credit the user's wallet.
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

  const packageId = parseInt(packageIdStr, 10);

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log('  DIRECT CREDIT RECOVERY');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  Payment Intent : ${paymentIntentId}`);
  console.log(`  Firebase UID   : ${firebaseUid}`);
  console.log(`  Package ID     : ${packageId}`);
  console.log(`  Mode           : ${dryRun ? 'DRY RUN (no changes)' : '⚠️  LIVE (will write to DB)'}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');

  // Connect to DB
  const { db: pgDb } = await import('../db');
  const { walletService } = await import('../services/walletService');
  const { creditPackages } = await import('@shared/schema');
  const { walletTransactions } = await import('@shared/wallet-schema');
  const { eq } = await import('drizzle-orm');

  if (!pgDb) {
    console.error('❌ Database not available. Check DATABASE_URL.');
    process.exit(1);
  }

  // 1. Look up the credit package
  const pkgResult = await pgDb
    .select()
    .from(creditPackages)
    .where(eq(creditPackages.id, packageId))
    .limit(1);

  if (pkgResult.length === 0) {
    console.error(`❌ Credit package ${packageId} not found.`);
    const all = await pgDb
      .select({ id: creditPackages.id, name: creditPackages.name, credits: creditPackages.credits, bonus: creditPackages.bonusCredits })
      .from(creditPackages);
    console.error('Available packages:');
    all.forEach(p => console.error(`  ID ${p.id}: ${p.name} — ${p.credits + p.bonus} credits`));
    process.exit(1);
  }

  const pkg = pkgResult[0];
  const totalCredits = pkg.credits + pkg.bonusCredits;

  console.log(`📦 Package found: "${pkg.name}"`);
  console.log(`   Base credits  : ${pkg.credits}`);
  console.log(`   Bonus credits : ${pkg.bonusCredits}`);
  console.log(`   Total credits : ${totalCredits}`);
  console.log('');

  // 2. Check idempotency — was this payment already processed?
  const idempotencyKey = `topup:pi_recovery:${paymentIntentId}`;
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
    console.log('');
    console.log('No action needed — credits were already applied.');
    process.exit(0);
  }

  console.log(`⚠️  Payment ${paymentIntentId} has NOT been credited yet.`);
  console.log('');

  if (dryRun) {
    console.log('🔍 DRY RUN — would grant:');
    console.log(`   ${totalCredits} credits to Firebase UID: ${firebaseUid}`);
    console.log(`   Idempotency key: ${idempotencyKey}`);
    console.log('');
    console.log('Run without --dry-run to apply.');
    process.exit(0);
  }

  // 3. Ensure user exists in PostgreSQL (create if needed)
  console.log(`🔍 Ensuring user exists in PostgreSQL...`);
  const { userMappingService } = await import('../services/userMappingService');
  
  let pgUserId: number;
  try {
    pgUserId = await userMappingService.getOrCreateUserIdForFirebaseUid(
      firebaseUid,
      'm3rvin20@outlook.com' // email from Stripe Dashboard
    );
    console.log(`✅ User found/created in PostgreSQL with ID: ${pgUserId}`);
  } catch (err: any) {
    console.error('❌ Could not resolve PostgreSQL user ID:', err.message);
    process.exit(1);
  }

  // 4. Ensure wallet exists and grant credits
  console.log(`🎁 Granting ${totalCredits} credits to ${firebaseUid}...`);

  await walletService.getOrCreateWallet(firebaseUid, pgUserId);

  await walletService.addCredits({
    firebaseUid,
    amountCredits: totalCredits,
    type: 'topup',
    description: `${pkg.name} — ${totalCredits} credits (${pkg.credits} + ${pkg.bonusCredits} bonus) [manual recovery]`,
    idempotencyKey,
    stripePaymentIntentId: paymentIntentId,
    stripeCheckoutSessionId: `manual_recovery_${paymentIntentId}`,
    topUpAmountCents: pkg.priceUsdCents,
    metadata: {
      packageId,
      packageName: pkg.name,
      baseCredits: pkg.credits,
      bonusCredits: pkg.bonusCredits,
      recoveredManually: true,
      recoveredAt: new Date().toISOString(),
      reason: 'Webhook was failing due to missing STRIPE_WEBHOOK_SECRET — credits not granted at purchase time',
    },
    expiresAt: undefined,
  });

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log(`✅ SUCCESS: ${totalCredits} credits granted`);
  console.log(`   User     : ${firebaseUid} (m3rvin20@outlook.com)`);
  console.log(`   Package  : ${pkg.name}`);
  console.log(`   Credits  : ${totalCredits} (${pkg.credits} base + ${pkg.bonusCredits} bonus)`);
  console.log(`   PI       : ${paymentIntentId}`);
  console.log('══════════════════════════════════════════════════════');
  console.log('');
  console.log('✉️  Notify the user that their credits are now available in their account.');
  process.exit(0);
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
