/**
 * SCRIPT DE AIRDROP — PAY AS YOU GROW
 * Mervin AI / Owl Fenc App
 * 
 * Otorga 120 créditos de cortesía a los usuarios actuales.
 * Este script es seguro de ejecutar múltiples veces gracias a la idempotencia.
 * 
 * IDEMPOTENCY KEY: 'airdrop_launch_120_credits:user:{userId}'
 * Keyed on userId (not firebaseUid) so it's stable across Firebase UID changes.
 * Additionally, walletService.addCredits() enforces a hard 120-credit bonus cap
 * per userId, so even if this script runs multiple times, no user gets > 120 bonus credits.
 */

import { db as pgDb } from '../db';
import { users } from '@shared/schema';
import { walletService } from '../services/walletService';
import { sql } from 'drizzle-orm';

const AIRDROP_CREDITS = 120;
const AIRDROP_KEY_PREFIX = 'airdrop_launch_120_credits:user';
const AIRDROP_DESCRIPTION = '🎁 Welcome Bonus: 120 AI Credits — On us';

async function runAirdrop() {
  console.log(`🚀 [AIRDROP] Starting ${AIRDROP_CREDITS} credits airdrop for existing users...`);

  try {
    // Guard: si la DB no está disponible, salir silenciosamente
    if (!pgDb) {
      console.warn('⚠️  [AIRDROP] Database not available — skipping airdrop');
      return;
    }

    // 1. Obtener todos los usuarios que tienen un Firebase UID
    const allUsers = await pgDb
      .select({ 
        id: users.id, 
        firebaseUid: users.firebaseUid,
        email: users.email 
      })
      .from(users)
      .where(sql`firebase_uid IS NOT NULL`);

    console.log(`👥 [AIRDROP] Found ${allUsers.length} users in the database.`);

    let successCount = 0;
    let alreadyGrantedCount = 0;  // Blocked by idempotency key
    let capReachedCount = 0;       // Blocked by bonus cap (userId already has 120 bonus credits)
    let errorCount = 0;

    for (const user of allUsers) {
      if (!user.firebaseUid || !user.id) continue;

      try {
        // 2. Asegurar que el usuario tenga una wallet
        await walletService.getOrCreateWallet(user.firebaseUid);
        
        // 3. Otorgar los 120 créditos con idempotencyKey única keyed on userId
        // This is stable across Firebase UID changes (unlike the old firebaseUid-based key)
        const idempotencyKey = `${AIRDROP_KEY_PREFIX}:${user.id}`;
        
        const result = await walletService.addCredits({
          firebaseUid: user.firebaseUid,
          amountCredits: AIRDROP_CREDITS,
          type: 'bonus',
          description: AIRDROP_DESCRIPTION,
          idempotencyKey,
        });

        if (result.error === 'BONUS_CAP_REACHED') {
          // User already has 120 bonus credits from a previous grant (different key or path)
          capReachedCount++;
        } else if (result.creditsAdded === 0 && result.success) {
          // Idempotency key already processed — same key, same run
          alreadyGrantedCount++;
        } else if (result.success && result.creditsAdded > 0) {
          console.log(`✅ [AIRDROP] ${AIRDROP_CREDITS} credits granted to ${user.email || user.firebaseUid} (Balance: ${result.balanceAfter})`);
          successCount++;
        } else {
          console.error(`❌ [AIRDROP] Failed to grant credits to ${user.email}: ${result.error}`);
          errorCount++;
        }
      } catch (err) {
        console.error(`❌ [AIRDROP] Error processing user ${user.email}:`, err);
        errorCount++;
      }
    }

    console.log('\n--- AIRDROP SUMMARY ---');
    console.log(`✅ Newly Granted: ${successCount}`);
    console.log(`ℹ️  Already Received (idempotent): ${alreadyGrantedCount}`);
    console.log(`🚫 Bonus Cap Reached (already has 120): ${capReachedCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('-----------------------\n');

  } catch (error) {
    console.error('💥 [AIRDROP] Critical error during airdrop:', error);
  }
}

// Ejecutar si se llama directamente (tsx server/scripts/airdropCredits.ts)
// NOTE: require.main is not available in ESM — this file is imported as a module
// To run standalone: npx tsx server/scripts/airdropCredits.ts

export { runAirdrop };
