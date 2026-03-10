// check-wallet.mjs — Run in Replit shell: node check-wallet.mjs
// Uses the same WebSocket setup as the server
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
neonConfig.fetchConnectionCache = true;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

try {
  const result = await pool.query(`
    SELECT 
      wa.firebase_uid,
      wa.balance_credits,
      wa.total_credits_earned,
      wa.total_credits_spent,
      wa.created_at,
      u.email
    FROM wallet_accounts wa
    LEFT JOIN users u ON u.firebase_uid = wa.firebase_uid
    ORDER BY wa.created_at DESC
    LIMIT 20
  `);
  
  console.log('\n=== WALLET ACCOUNTS ===');
  console.table(result.rows);
  
  // Check airdrop transactions
  const txResult = await pool.query(`
    SELECT 
      wt.firebase_uid,
      wt.type,
      wt.amount_credits,
      wt.balance_after,
      wt.description,
      wt.idempotency_key,
      wt.created_at
    FROM wallet_transactions wt
    WHERE wt.type = 'subscription_grant'
    ORDER BY wt.created_at DESC
    LIMIT 20
  `);
  
  console.log('\n=== AIRDROP TRANSACTIONS ===');
  console.table(txResult.rows);
  
} catch (err) {
  console.error('Error:', err.message);
} finally {
  await pool.end();
}
