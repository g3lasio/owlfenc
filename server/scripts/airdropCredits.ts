/**
 * SCRIPT DE AIRDROP — PAY AS YOU GROW
 * Mervin AI / Owl Fenc App
 * 
 * Otorga 500 créditos de cortesía a los usuarios actuales.
 * Este script es seguro de ejecutar múltiples veces gracias a la idempotencia.
 */

import { pgDb } from '../db';
import { walletAccounts, users } from '@shared/schema';
import { walletService } from '../services/walletService';
import { eq, sql } from 'drizzle-orm';

async function runAirdrop() {
  console.log('🚀 [AIRDROP] Starting 500 credits airdrop for existing users...');

  try {
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
    let errorCount = 0;

    for (const user of allUsers) {
      if (!user.firebaseUid) continue;

      try {
        // 2. Asegurar que el usuario tenga una wallet
        // getOrCreateWallet ya maneja la creación si no existe
        const wallet = await walletService.getOrCreateWallet(user.firebaseUid);
        
        // 3. Otorgar los 500 créditos
        // Usamos una idempotencyKey única para este airdrop específico
        // para evitar duplicados si el script se corre dos veces.
        const idempotencyKey = `airdrop_launch_500_credits:${user.firebaseUid}`;
        
        const result = await walletService.addCredits({
          firebaseUid: user.firebaseUid,
          amount: 500,
          type: 'grant',
          description: '🎁 Launch Bonus: 500 AI Credits',
          idempotencyKey,
        });

        if (result.success) {
          console.log(`✅ [AIRDROP] 500 credits granted to ${user.email || user.firebaseUid} (Balance: ${result.balanceAfter})`);
          successCount++;
        } else {
          if (result.error?.includes('Idempotency key already used')) {
            console.log(`ℹ️  [AIRDROP] User ${user.email || user.firebaseUid} already received this airdrop.`);
            successCount++;
          } else {
            console.error(`❌ [AIRDROP] Failed to grant credits to ${user.email}: ${result.error}`);
            errorCount++;
          }
        }
      } catch (err) {
        console.error(`❌ [AIRDROP] Error processing user ${user.email}:`, err);
        errorCount++;
      }
    }

    console.log('\n--- AIRDROP SUMMARY ---');
    console.log(`✅ Success/Already Granted: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log('-----------------------\n');

  } catch (error) {
    console.error('💥 [AIRDROP] Critical error during airdrop:', error);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  runAirdrop().then(() => process.exit(0)).catch(() => process.exit(1));
}

export { runAirdrop };
