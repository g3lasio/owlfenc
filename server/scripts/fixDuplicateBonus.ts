/**
 * ONE-TIME CORRECTION SCRIPT — Fix duplicate welcome bonus for userId=39
 * 
 * Problem: info@chyrris.com (userId=39) received 480 bonus credits instead of 120
 * because 4 separate bonus grants were made with different idempotency keys.
 * 
 * This script:
 * 1. Lists all bonus transactions for userId=39
 * 2. Keeps the OLDEST bonus transaction (the legitimate first one)
 * 3. Deletes the 3 duplicate bonus transactions
 * 4. Corrects the wallet balance to 120
 * 
 * Run once: npx tsx server/scripts/fixDuplicateBonus.ts
 * DELETE THIS FILE after running.
 */

import { db as pgDb } from '../db';
import { walletAccounts, walletTransactions } from '../../shared/wallet-schema';
import { eq, and, sql } from 'drizzle-orm';

const TARGET_USER_ID = 39;
const CORRECT_BONUS_CREDITS = 120;

async function fixDuplicateBonus() {
  if (!pgDb) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  console.log(`\n🔍 Fetching all bonus transactions for userId=${TARGET_USER_ID}...\n`);

  // 1. Get all bonus credit transactions for this user
  const bonusTransactions = await pgDb.execute(sql`
    SELECT id, amount_credits, description, idempotency_key, created_at, balance_after
    FROM wallet_transactions
    WHERE user_id = ${TARGET_USER_ID}
      AND type = 'bonus'
      AND direction = 'credit'
    ORDER BY created_at ASC
  `);

  console.log(`Found ${bonusTransactions.rows.length} bonus transactions:`);
  bonusTransactions.rows.forEach((row: any, i: number) => {
    console.log(`  [${i + 1}] id=${row.id} | amount=${row.amount_credits} | key=${row.idempotency_key} | date=${row.created_at}`);
  });

  if (bonusTransactions.rows.length === 0) {
    console.log('✅ No bonus transactions found — nothing to fix.');
    process.exit(0);
  }

  if (bonusTransactions.rows.length === 1) {
    console.log('✅ Only 1 bonus transaction found — balance is correct.');
    process.exit(0);
  }

  // 2. Keep the FIRST (oldest) transaction, delete the rest
  const keepTransaction = bonusTransactions.rows[0] as any;
  const duplicateIds = bonusTransactions.rows.slice(1).map((r: any) => r.id);

  console.log(`\n✅ Keeping transaction id=${keepTransaction.id} (oldest, legitimate)`);
  console.log(`🗑️  Deleting ${duplicateIds.length} duplicate transactions: ids=${duplicateIds.join(', ')}`);

  // 3. Delete duplicate transactions
  await pgDb.execute(sql`
    DELETE FROM wallet_transactions
    WHERE id = ANY(${sql.raw(`ARRAY[${duplicateIds.join(',')}]`)})
      AND user_id = ${TARGET_USER_ID}
      AND type = 'bonus'
  `);

  console.log(`✅ Deleted ${duplicateIds.length} duplicate bonus transactions`);

  // 4. Recalculate correct balance
  // Get current total credits (all types) minus the duplicates we just removed
  const balanceResult = await pgDb.execute(sql`
    SELECT 
      COALESCE(SUM(CASE WHEN direction = 'credit' THEN amount_credits ELSE 0 END), 0) AS total_credits,
      COALESCE(SUM(CASE WHEN direction = 'debit' THEN amount_credits ELSE 0 END), 0) AS total_debits
    FROM wallet_transactions
    WHERE user_id = ${TARGET_USER_ID}
  `);

  const totalCredits = Number((balanceResult.rows[0] as any)?.total_credits ?? 0);
  const totalDebits = Number((balanceResult.rows[0] as any)?.total_debits ?? 0);
  const correctBalance = totalCredits - totalDebits;

  console.log(`\n📊 Recalculated balance:`);
  console.log(`   Total credits: ${totalCredits}`);
  console.log(`   Total debits:  ${totalDebits}`);
  console.log(`   Correct balance: ${correctBalance}`);

  // 5. Update wallet balance
  await pgDb.execute(sql`
    UPDATE wallet_accounts
    SET balance_credits = ${correctBalance},
        updated_at = NOW()
    WHERE user_id = ${TARGET_USER_ID}
  `);

  console.log(`\n✅ Wallet balance updated to ${correctBalance} credits for userId=${TARGET_USER_ID}`);
  console.log(`\n🎉 DONE — info@chyrris.com now has ${correctBalance} credits (was 480)\n`);

  // 6. Verify
  const verification = await pgDb.execute(sql`
    SELECT balance_credits FROM wallet_accounts WHERE user_id = ${TARGET_USER_ID}
  `);
  const finalBalance = (verification.rows[0] as any)?.balance_credits;
  console.log(`🔍 Verification: wallet_accounts.balance_credits = ${finalBalance}`);

  if (finalBalance !== correctBalance) {
    console.error(`❌ MISMATCH: expected ${correctBalance}, got ${finalBalance}`);
    process.exit(1);
  }

  console.log(`✅ Verified correct.\n`);
  process.exit(0);
}

fixDuplicateBonus().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
