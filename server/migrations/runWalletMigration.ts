/**
 * WALLET MIGRATION RUNNER
 * Ejecuta la migración del schema de wallet en la base de datos Neon PostgreSQL.
 * Se llama automáticamente al arrancar el servidor si las tablas no existen.
 * 
 * Principio: SOLO cambios ADITIVOS — seguro para producción con 13 usuarios activos.
 */

import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function runWalletMigration(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  [WALLET-MIGRATION] DATABASE_URL not set — skipping migration');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔄 [WALLET-MIGRATION] Checking wallet schema...');

    // Verificar si las tablas ya existen
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('wallet_accounts', 'wallet_transactions', 'credit_packages')
    `);

    const existingTables = parseInt(checkResult.rows[0].count);

    if (existingTables === 3) {
      console.log('✅ [WALLET-MIGRATION] Wallet tables already exist — checking for updates...');
      
      // Solo verificar que monthly_credits_grant existe en subscription_plans
      await pool.query(`
        ALTER TABLE subscription_plans 
        ADD COLUMN IF NOT EXISTS monthly_credits_grant INTEGER NOT NULL DEFAULT 0
      `);
      
      // Actualizar valores si son 0 (por si se corrió antes sin los valores)
      await pool.query(`
        UPDATE subscription_plans SET monthly_credits_grant = 20   WHERE id = 5 AND monthly_credits_grant = 0;
        UPDATE subscription_plans SET monthly_credits_grant = 600  WHERE id = 9 AND monthly_credits_grant = 0;
        UPDATE subscription_plans SET monthly_credits_grant = 1500 WHERE id = 6 AND monthly_credits_grant = 0;
      `);
      
      console.log('✅ [WALLET-MIGRATION] Schema is up to date');
      return;
    }

    console.log(`📦 [WALLET-MIGRATION] Found ${existingTables}/3 tables — running full migration...`);

    // Leer y ejecutar el SQL de migración
    const sqlPath = join(__dirname, '001_wallet_schema.sql');
    const migrationSql = readFileSync(sqlPath, 'utf-8');

    // Ejecutar en una transacción para garantizar atomicidad
    await pool.query('BEGIN');
    
    try {
      // Ejecutar cada statement por separado para mejor manejo de errores
      const statements = migrationSql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.trim()) {
          await pool.query(statement);
        }
      }

      await pool.query('COMMIT');
      console.log('✅ [WALLET-MIGRATION] Migration completed successfully!');
      console.log('   Tables created: wallet_accounts, wallet_transactions, credit_packages');
      console.log('   Column added: subscription_plans.monthly_credits_grant');
      
    } catch (error) {
      await pool.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ [WALLET-MIGRATION] Migration failed:', error);
    // No lanzar el error — el servidor debe arrancar aunque la migración falle
    // Los features de wallet simplemente no estarán disponibles
  } finally {
    await pool.end();
  }
}
