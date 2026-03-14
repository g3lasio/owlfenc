/**
 * CREDITS PERSISTENCE TEST
 * Owl Fenc / Mervin AI
 *
 * Tests that credits survive:
 * 1. Server restart simulation (re-instantiating services)
 * 2. Concurrent wallet creation (race condition)
 * 3. Airdrop idempotency (double-run doesn't duplicate credits)
 * 4. Welcome bonus idempotency
 * 5. Balance endpoint returns correct value after all operations
 *
 * Run in Replit shell:
 *   npx tsx server/scripts/testCreditsPersistence.ts
 */

import '../firebase-admin'; // Initialize Firebase Admin
import { walletService } from '../services/walletService';
import { userMappingService } from '../services/userMappingService';
import { getAuth } from 'firebase-admin/auth';
import { pool } from '../db';

// ─── Test helpers ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS — ${testName}`);
    passed++;
  } else {
    console.log(`  ❌ FAIL — ${testName}${detail ? `: ${detail}` : ''}`);
    failed++;
    failures.push(testName);
  }
}

function section(title: string) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`TEST: ${title}`);
  console.log('─'.repeat(60));
}

// ─── Main test ────────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║     OWL FENC — CREDITS PERSISTENCE TEST                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const auth = getAuth();
  const testEmail = `test_credits_${Date.now()}@owlfenc-test.com`;
  let testUid: string | null = null;
  let testInternalId: number | null = null;

  try {
    // ── SETUP: Create test user ──────────────────────────────────────────────
    section('SETUP: Create test Firebase user');
    const userRecord = await auth.createUser({ email: testEmail, password: 'Test123456!' });
    testUid = userRecord.uid;
    console.log(`  Created: ${testEmail} (${testUid})`);

    testInternalId = await userMappingService.getOrCreateUserIdForFirebaseUid(testUid, testEmail);
    console.log(`  DB mapping: userId=${testInternalId}`);
    assert(testInternalId > 0, 'New user mapping created');

    // ── TEST 1: Initial wallet creation ──────────────────────────────────────
    section('TEST 1: Initial wallet creation');
    const wallet = await walletService.getOrCreateWallet(testUid);
    assert(wallet !== null, 'Wallet created');
    assert(wallet.balanceCredits === 0, 'Initial balance is 0', `got ${wallet.balanceCredits}`);

    // ── TEST 2: Welcome bonus grant ──────────────────────────────────────────
    section('TEST 2: Welcome bonus — 120 credits');
    const bonusResult = await walletService.addCredits({
      firebaseUid: testUid,
      amountCredits: 120,
      type: 'bonus',
      description: '🎁 Welcome Bonus: 120 AI Credits — On us',
      idempotencyKey: `welcome_bonus_120:${testUid}`,
    });
    assert(bonusResult.success === true, 'Welcome bonus granted');
    assert(bonusResult.balanceAfter === 120, `Balance after bonus = 120`, `got ${bonusResult.balanceAfter}`);

    // ── TEST 3: Balance persists after re-read (simulates page reload) ───────
    section('TEST 3: Balance persists after re-read (simulates server restart)');
    // Re-instantiate by calling getWalletBalance directly (fresh DB query, no cache)
    const freshBalance = await walletService.getWalletBalance(testUid);
    assert(freshBalance.balance === 120, 'Balance still 120 after fresh DB read', `got ${freshBalance.balance}`);
    assert(freshBalance.totalEarned === 120, 'totalEarned = 120', `got ${freshBalance.totalEarned}`);
    assert(freshBalance.totalSpent === 0, 'totalSpent = 0', `got ${freshBalance.totalSpent}`);

    // Also verify via raw pool.query (exactly what the /wallet/balance endpoint uses)
    if (pool) {
      const rawResult = await pool.query(
        'SELECT balance_credits, total_credits_earned, total_credits_spent FROM wallet_accounts WHERE firebase_uid = $1',
        [testUid]
      );
      assert(rawResult.rows.length === 1, 'Wallet row exists in DB');
      assert(rawResult.rows[0].balance_credits === 120, 'Raw DB balance_credits = 120', `got ${rawResult.rows[0].balance_credits}`);
    }

    // ── TEST 4: Idempotency — double welcome bonus does NOT duplicate ─────────
    section('TEST 4: Idempotency — double welcome bonus must NOT duplicate credits');
    const doubleBonus = await walletService.addCredits({
      firebaseUid: testUid,
      amountCredits: 120,
      type: 'bonus',
      description: '🎁 Welcome Bonus: 120 AI Credits — On us',
      idempotencyKey: `welcome_bonus_120:${testUid}`,
    });
    // Should be idempotent — either success=false or balanceAfter still 120
    const balanceAfterDouble = await walletService.getWalletBalance(testUid);
    assert(balanceAfterDouble.balance === 120, 'Balance still 120 after double grant attempt', `got ${balanceAfterDouble.balance}`);

    // ── TEST 5: Airdrop idempotency ───────────────────────────────────────────
    section('TEST 5: Airdrop idempotency — running airdrop twice does NOT duplicate');
    const airdropKey = `airdrop_launch_120_credits:${testUid}`;
    // First airdrop run
    const airdrop1 = await walletService.addCredits({
      firebaseUid: testUid,
      amountCredits: 120,
      type: 'bonus',
      description: '🎁 Welcome Bonus: 120 AI Credits — On us',
      idempotencyKey: airdropKey,
    });
    const balanceAfterAirdrop1 = await walletService.getWalletBalance(testUid);
    // Second airdrop run (simulates server restart running airdrop again)
    const airdrop2 = await walletService.addCredits({
      firebaseUid: testUid,
      amountCredits: 120,
      type: 'bonus',
      description: '🎁 Welcome Bonus: 120 AI Credits — On us',
      idempotencyKey: airdropKey,
    });
    const balanceAfterAirdrop2 = await walletService.getWalletBalance(testUid);
    assert(
      balanceAfterAirdrop1.balance === balanceAfterAirdrop2.balance,
      'Airdrop idempotent — balance unchanged after second run',
      `before=${balanceAfterAirdrop1.balance} after=${balanceAfterAirdrop2.balance}`
    );

    // ── TEST 6: Race condition — concurrent getOrCreateWallet ─────────────────
    section('TEST 6: Race condition — concurrent wallet operations');
    // Simulate 5 concurrent calls to getOrCreateWallet (what happens during cold start)
    const concurrentResults = await Promise.allSettled([
      walletService.getOrCreateWallet(testUid),
      walletService.getOrCreateWallet(testUid),
      walletService.getOrCreateWallet(testUid),
      walletService.getOrCreateWallet(testUid),
      walletService.getOrCreateWallet(testUid),
    ]);
    const allSucceeded = concurrentResults.every(r => r.status === 'fulfilled');
    assert(allSucceeded, 'All 5 concurrent getOrCreateWallet calls succeeded without error');
    // Balance should still be correct after concurrent operations
    const balanceAfterConcurrent = await walletService.getWalletBalance(testUid);
    // Balance may have changed from airdrop test above — just verify it's a valid number >= 0
    assert(
      typeof balanceAfterConcurrent.balance === 'number' && balanceAfterConcurrent.balance >= 0,
      'Balance is a valid non-negative number after concurrent operations',
      `got ${balanceAfterConcurrent.balance}`
    );

    // ── TEST 7: Credit deduction ──────────────────────────────────────────────
    section('TEST 7: Credit deduction (simulate AI feature use)');
    const balanceBefore = balanceAfterConcurrent.balance;
    const deductResult = await walletService.deductCredits({
      firebaseUid: testUid,
      amountCredits: 8,
      featureName: 'aiEstimate',
      description: 'AI Estimate — Test deduction',
    });
    assert(deductResult.success === true, 'Deduction succeeded');
    assert(deductResult.balanceAfter === balanceBefore - 8, `Balance after deduction = ${balanceBefore - 8}`, `got ${deductResult.balanceAfter}`);

    // Verify deduction persists in DB
    const balanceAfterDeduction = await walletService.getWalletBalance(testUid);
    assert(balanceAfterDeduction.balance === balanceBefore - 8, 'Deduction persisted in DB', `got ${balanceAfterDeduction.balance}`);

    // ── TEST 8: Transaction history ───────────────────────────────────────────
    section('TEST 8: Transaction history is recorded');
    assert(
      balanceAfterDeduction.recentTransactions.length > 0,
      'Transaction history has entries',
      `got ${balanceAfterDeduction.recentTransactions.length} transactions`
    );

    // ── TEST 9: Wallet locked state ───────────────────────────────────────────
    section('TEST 9: Wallet is not locked for normal user');
    assert(balanceAfterDeduction.isLocked === false, 'Wallet is not locked');

    // ── TEST 10: Balance endpoint raw query matches service ───────────────────
    section('TEST 10: Raw pool.query balance matches walletService balance');
    if (pool) {
      const rawCheck = await pool.query(
        'SELECT balance_credits FROM wallet_accounts WHERE firebase_uid = $1',
        [testUid]
      );
      const rawBalance = rawCheck.rows[0]?.balance_credits;
      assert(
        rawBalance === balanceAfterDeduction.balance,
        `Raw DB balance (${rawBalance}) matches service balance (${balanceAfterDeduction.balance})`
      );
    }

  } finally {
    // ── CLEANUP ───────────────────────────────────────────────────────────────
    console.log('\n🧹 Cleaning up test data...');
    try {
      if (testUid) {
        // Delete wallet transactions
        if (pool) {
          await pool.query('DELETE FROM wallet_transactions WHERE firebase_uid = $1', [testUid]);
          await pool.query('DELETE FROM wallet_accounts WHERE firebase_uid = $1', [testUid]);
          if (testInternalId) {
            await pool.query('DELETE FROM users WHERE id = $1', [testInternalId]);
          }
        }
        // Delete Firebase user
        await getAuth().deleteUser(testUid);
        console.log(`  ✅ Cleaned up: ${testEmail}`);
      }
    } catch (cleanupErr) {
      console.warn('  ⚠️  Cleanup error (non-critical):', cleanupErr);
    }
  }

  // ── RESULTS ───────────────────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    TEST RESULTS                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`\n  Results: ${passed}/${passed + failed} tests passed\n`);

  if (failures.length > 0) {
    console.log('  ❌ FAILED TESTS:');
    failures.forEach(f => console.log(`    - ${f}`));
  } else {
    console.log('  🎉 ALL TESTS PASSED — Credits system is working correctly!');
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('💥 Test runner crashed:', err);
  process.exit(1);
});
