import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
try {
  // Direct raw query to see exact column values
  const r1 = await pool.query(`SELECT * FROM wallet_accounts WHERE firebase_uid = 'qztot1YEy3UWz605gIH2iwwWhW53'`);
  console.log('=== RAW wallet_accounts row ===');
  console.log(JSON.stringify(r1.rows[0], null, 2));
  
  // Check column names
  const r2 = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'wallet_accounts' ORDER BY ordinal_position`);
  console.log('\n=== wallet_accounts COLUMNS ===');
  console.table(r2.rows);
  
  // Check if there's a Drizzle column mapping issue - the ORM might use camelCase but DB has snake_case
  const r3 = await pool.query(`SELECT balance_credits, total_credits_earned, total_credits_spent FROM wallet_accounts WHERE firebase_uid = 'qztot1YEy3UWz605gIH2iwwWhW53'`);
  console.log('\n=== DIRECT BALANCE QUERY ===');
  console.log('balance_credits:', r3.rows[0]?.balance_credits);
  console.log('total_credits_earned:', r3.rows[0]?.total_credits_earned);
  
} catch(e) { console.error(e.message); } finally { await pool.end(); }
