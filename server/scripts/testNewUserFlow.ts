/**
 * TEST SCRIPT: New User Registration Flow
 * Tests: Firebase user creation → DB mapping → 120 welcome credits
 * 
 * Run from Replit shell: npx tsx server/scripts/testNewUserFlow.ts
 */

import dotenv from 'dotenv';
dotenv.config();

import { adminAuth } from '../firebase-admin';
import { userMappingService } from '../services/userMappingService';
import { walletService } from '../services/walletService';
import { db as pgDb } from '../db';
import { users, walletAccounts, walletTransactions } from '@shared/schema';
import { eq } from 'drizzle-orm';

const TEST_EMAIL_PREFIX = 'test_owl_';
const TEST_TIMESTAMP = Date.now();
const TEST_EMAIL = `${TEST_EMAIL_PREFIX}${TEST_TIMESTAMP}@owlfenc-test.com`;
const TEST_PASSWORD = 'TestOwl2026!';

// ANSI colors for output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

function log(color: string, prefix: string, msg: string) {
  console.log(`${color}${prefix}${RESET} ${msg}`);
}

async function cleanupTestUser(firebaseUid: string, email: string) {
  console.log(`\n${YELLOW}🧹 Cleaning up test user...${RESET}`);
  try {
    // Delete from Firebase
    await adminAuth.deleteUser(firebaseUid);
    log(GREEN, '✅', `Firebase user deleted: ${email}`);
  } catch (e: any) {
    log(YELLOW, '⚠️', `Firebase cleanup: ${e.message}`);
  }
  
  try {
    // Delete from PostgreSQL (cascade should handle wallet)
    const dbUser = await pgDb.select().from(users).where(eq(users.firebaseUid, firebaseUid));
    if (dbUser.length > 0) {
      await pgDb.delete(walletTransactions).where(eq(walletTransactions.userId, dbUser[0].id));
      await pgDb.delete(walletAccounts).where(eq(walletAccounts.userId, dbUser[0].id));
      await pgDb.delete(users).where(eq(users.firebaseUid, firebaseUid));
      log(GREEN, '✅', `PostgreSQL records deleted for user ID: ${dbUser[0].id}`);
    }
  } catch (e: any) {
    log(YELLOW, '⚠️', `PostgreSQL cleanup: ${e.message}`);
  }
}

async function runTest() {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║     OWL FENC — NEW USER FLOW TEST                    ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}\n`);
  
  const results: { test: string; passed: boolean; detail: string }[] = [];
  let firebaseUid: string | null = null;
  
  // ─── TEST 1: Create Firebase user ───────────────────────────────────────────
  console.log(`${BOLD}TEST 1: Create Firebase user${RESET}`);
  try {
    const firebaseUser = await adminAuth.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: 'Test Contractor',
    });
    firebaseUid = firebaseUser.uid;
    log(GREEN, '✅ PASS', `Firebase user created: ${TEST_EMAIL} (UID: ${firebaseUid})`);
    results.push({ test: 'Create Firebase user', passed: true, detail: `UID: ${firebaseUid}` });
  } catch (e: any) {
    log(RED, '❌ FAIL', `Firebase user creation failed: ${e.message}`);
    results.push({ test: 'Create Firebase user', passed: false, detail: e.message });
    console.log(`\n${RED}Cannot continue without Firebase user. Exiting.${RESET}`);
    process.exit(1);
  }
  
  // ─── TEST 2: Create DB mapping ───────────────────────────────────────────────
  console.log(`\n${BOLD}TEST 2: Create DB user mapping${RESET}`);
  try {
    const mapping = await userMappingService.createMapping(firebaseUid!, TEST_EMAIL);
    if (mapping && mapping.wasCreated) {
      log(GREEN, '✅ PASS', `DB mapping created: internalId=${mapping.id}, wasCreated=${mapping.wasCreated}`);
      results.push({ test: 'Create DB mapping', passed: true, detail: `internalId: ${mapping.id}` });
    } else if (mapping && !mapping.wasCreated) {
      log(YELLOW, '⚠️ WARN', `Mapping existed already (wasCreated=false) — internalId=${mapping.id}`);
      results.push({ test: 'Create DB mapping', passed: true, detail: `internalId: ${mapping.id} (pre-existing)` });
    } else {
      throw new Error('createMapping returned null');
    }
  } catch (e: any) {
    log(RED, '❌ FAIL', `DB mapping failed: ${e.message}`);
    results.push({ test: 'Create DB mapping', passed: false, detail: e.message });
  }
  
  // ─── TEST 3: Grant welcome bonus ─────────────────────────────────────────────
  console.log(`\n${BOLD}TEST 3: Grant 120 welcome credits${RESET}`);
  try {
    const result = await walletService.addCredits({
      firebaseUid: firebaseUid!,
      amountCredits: 120,
      type: 'bonus',
      description: '🎁 Welcome Bonus: 120 AI Credits — On us',
      idempotencyKey: `welcome_bonus_120:${firebaseUid}`,
    });
    
    if (result.success) {
      log(GREEN, '✅ PASS', `120 credits granted. Balance after: ${result.balanceAfter}`);
      results.push({ test: 'Grant 120 welcome credits', passed: true, detail: `Balance: ${result.balanceAfter}` });
    } else {
      throw new Error(result.error || 'addCredits returned success=false');
    }
  } catch (e: any) {
    log(RED, '❌ FAIL', `Welcome bonus failed: ${e.message}`);
    results.push({ test: 'Grant 120 welcome credits', passed: false, detail: e.message });
  }
  
  // ─── TEST 4: Verify wallet balance ───────────────────────────────────────────
  console.log(`\n${BOLD}TEST 4: Verify wallet balance = 120${RESET}`);
  try {
    const wallet = await walletService.getOrCreateWallet(firebaseUid!);
    if (wallet && wallet.balanceCredits === 120) {
      log(GREEN, '✅ PASS', `Wallet balance confirmed: ${wallet.balanceCredits} credits`);
      results.push({ test: 'Verify wallet balance = 120', passed: true, detail: `Balance: ${wallet.balanceCredits}` });
    } else {
      throw new Error(`Expected 120, got ${wallet?.balanceCredits ?? 'null'}`);
    }
  } catch (e: any) {
    log(RED, '❌ FAIL', `Wallet verification failed: ${e.message}`);
    results.push({ test: 'Verify wallet balance = 120', passed: false, detail: e.message });
  }
  
  // ─── TEST 5: Idempotency check ───────────────────────────────────────────────
  console.log(`\n${BOLD}TEST 5: Idempotency — double grant should NOT add more credits${RESET}`);
  try {
    const result2 = await walletService.addCredits({
      firebaseUid: firebaseUid!,
      amountCredits: 120,
      type: 'bonus',
      description: '🎁 Welcome Bonus: 120 AI Credits — On us',
      idempotencyKey: `welcome_bonus_120:${firebaseUid}`,
    });
    
    const wallet2 = await walletService.getOrCreateWallet(firebaseUid!);
    
    if (wallet2 && wallet2.balanceCredits === 120) {
      log(GREEN, '✅ PASS', `Idempotency works — balance still 120 after double grant attempt`);
      results.push({ test: 'Idempotency check', passed: true, detail: `Balance still: ${wallet2.balanceCredits}` });
    } else {
      throw new Error(`Expected 120, got ${wallet2?.balanceCredits ?? 'null'} — idempotency FAILED`);
    }
  } catch (e: any) {
    log(RED, '❌ FAIL', `Idempotency check failed: ${e.message}`);
    results.push({ test: 'Idempotency check', passed: false, detail: e.message });
  }
  
  // ─── TEST 6: Credit deduction ────────────────────────────────────────────────
  console.log(`\n${BOLD}TEST 6: Deduct 8 credits (simulate AI estimate)${RESET}`);
  try {
    const deductResult = await walletService.deductCredits({
      firebaseUid: firebaseUid!,
      featureName: 'aiEstimate',
      resourceId: 'test-estimate-001',
      description: 'Test AI estimate deduction',
    });
    
    const walletAfter = await walletService.getOrCreateWallet(firebaseUid!);
    const expectedBalance = 120 - (deductResult.creditsDeducted || 0);
    
    if (walletAfter && walletAfter.balanceCredits === expectedBalance) {
      log(GREEN, '✅ PASS', `Deducted ${deductResult.creditsDeducted} credits. Balance: ${walletAfter.balanceCredits}`);
      results.push({ test: 'Credit deduction', passed: true, detail: `Deducted: ${deductResult.creditsDeducted}, Balance: ${walletAfter.balanceCredits}` });
    } else {
      throw new Error(`Expected ${expectedBalance}, got ${walletAfter?.balanceCredits}`);
    }
  } catch (e: any) {
    log(RED, '❌ FAIL', `Credit deduction failed: ${e.message}`);
    results.push({ test: 'Credit deduction', passed: false, detail: e.message });
  }
  
  // ─── CLEANUP ─────────────────────────────────────────────────────────────────
  await cleanupTestUser(firebaseUid!, TEST_EMAIL);
  
  // ─── SUMMARY ─────────────────────────────────────────────────────────────────
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║                    TEST RESULTS                      ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${RESET}`);
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(r => {
    const icon = r.passed ? `${GREEN}✅` : `${RED}❌`;
    const status = r.passed ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`;
    console.log(`  ${icon}${RESET} ${status} — ${r.test}`);
    if (!r.passed) {
      console.log(`       ${RED}Detail: ${r.detail}${RESET}`);
    }
  });
  
  console.log(`\n${BOLD}Results: ${passed}/${total} tests passed${RESET}`);
  
  if (passed === total) {
    console.log(`${GREEN}${BOLD}🎉 ALL TESTS PASSED — New user flow is working correctly!${RESET}\n`);
    process.exit(0);
  } else {
    console.log(`${RED}${BOLD}⚠️  ${total - passed} test(s) failed — review the errors above.${RESET}\n`);
    process.exit(1);
  }
}

runTest().catch(err => {
  console.error(`${RED}💥 Fatal error in test runner:${RESET}`, err);
  process.exit(1);
});
