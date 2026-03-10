import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  // Check all wallets for owl@chyrris.com
  const r1 = await pool.query(`
    SELECT wa.id, wa.firebase_uid, wa.balance_credits, wa.user_id, u.email, u.firebase_uid as user_firebase_uid
    FROM wallet_accounts wa
    LEFT JOIN users u ON u.id = wa.user_id
    WHERE u.email = 'owl@chyrris.com' OR wa.firebase_uid = 'qztot1YEy3UWz605gIH2iwwWhW53'
    ORDER BY wa.id
  `);
  console.log('=== WALLETS FOR owl@chyrris.com ===');
  console.table(r1.rows);

  // Check users table for owl@chyrris.com
  const r2 = await pool.query(`SELECT id, email, firebase_uid FROM users WHERE email = 'owl@chyrris.com'`);
  console.log('=== USER RECORD ===');
  console.table(r2.rows);

  // Check if there's a wallet balance log
  const r3 = await pool.query(`
    SELECT wt.id, wt.firebase_uid, wt.amount_credits, wt.balance_after, wt.type, wt.description, wt.created_at
    FROM wallet_transactions wt
    WHERE wt.firebase_uid = 'qztot1YEy3UWz605gIH2iwwWhW53'
    ORDER BY wt.created_at DESC LIMIT 10
  `);
  console.log('=== TRANSACTIONS FOR owl@chyrris.com ===');
  console.table(r3.rows);
} catch(e) { console.error(e.message); } finally { await pool.end(); }
