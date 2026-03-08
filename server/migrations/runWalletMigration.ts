/**
 * WALLET MIGRATION RUNNER
 * Ejecuta las migraciones del schema de wallet en la base de datos Neon PostgreSQL.
 * Se llama automáticamente al arrancar el servidor.
 * 
 * Principio: SOLO cambios ADITIVOS — seguro para producción con 13 usuarios activos.
 * 
 * Migraciones:
 * 001 — Crea tablas wallet_accounts, wallet_transactions, credit_packages
 *        + columna monthly_credits_grant en subscription_plans
 * 002 — Actualiza monthly_credits_grant con los valores correctos por plan
 */

import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ================================
// PLAN IDs CONFIRMADOS (de stripePriceRegistry.ts)
// ================================
const PLAN_CREDITS: Record<number, number> = {
  4: 20,    // Free Trial       → 20 créditos/mes (igual que free, no bloquear durante trial)
  5: 20,    // Primo Chambeador → 20 créditos/mes
  9: 600,   // Mero Patrón      → 600 créditos/mes ($49.99/mes)
  6: 1500,  // Master Contractor → 1500 créditos/mes ($99.99/mes)
};

export async function runWalletMigration(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  [WALLET-MIGRATION] DATABASE_URL not set — skipping migration');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔄 [WALLET-MIGRATION] Checking wallet schema...');

    // ================================
    // PASO 1: Verificar si las tablas ya existen
    // ================================
    const checkResult = await pool.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('wallet_accounts', 'wallet_transactions', 'credit_packages')
    `);

    const existingTables = parseInt(checkResult.rows[0].count);

    if (existingTables < 3) {
      console.log(`📦 [WALLET-MIGRATION] Found ${existingTables}/3 tables — running migration 001...`);

      // Leer y ejecutar el SQL de migración 001
      const sqlPath = join(__dirname, '001_wallet_schema.sql');
      const migrationSql = readFileSync(sqlPath, 'utf-8');

      // Ejecutar en una transacción para garantizar atomicidad
      await pool.query('BEGIN');
      
      try {
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
        console.log('✅ [WALLET-MIGRATION] Migration 001 completed!');
        console.log('   Tables created: wallet_accounts, wallet_transactions, credit_packages');
        
      } catch (error) {
        await pool.query('ROLLBACK');
        throw error;
      }
    } else {
      console.log('✅ [WALLET-MIGRATION] Wallet tables already exist');
    }

    // ================================
    // PASO 2: Asegurar columna monthly_credits_grant
    // ================================
    await pool.query(`
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS monthly_credits_grant INTEGER NOT NULL DEFAULT 0
    `);
    console.log('✅ [WALLET-MIGRATION] Column monthly_credits_grant verified');

    // ================================
    // PASO 3: Actualizar grants mensuales por plan (idempotente)
    // Solo actualiza si el valor actual es 0 (no sobreescribe valores ya configurados)
    // ================================
    console.log('🔄 [WALLET-MIGRATION] Updating monthly_credits_grant for subscription plans...');
    
    for (const [planId, credits] of Object.entries(PLAN_CREDITS)) {
      const result = await pool.query(
        `UPDATE subscription_plans 
         SET monthly_credits_grant = $1 
         WHERE id = $2 AND monthly_credits_grant = 0
         RETURNING id, name, monthly_credits_grant`,
        [credits, parseInt(planId)]
      );
      
      if (result.rowCount && result.rowCount > 0) {
        const row = result.rows[0];
        console.log(`  ✅ Plan "${row.name}" (id=${planId}): ${credits} credits/month`);
      }
    }

    // Verificar el estado final
    const verifyResult = await pool.query(`
      SELECT id, name, monthly_credits_grant 
      FROM subscription_plans 
      WHERE id IN (4, 5, 6, 9) 
      ORDER BY id
    `);

    if (verifyResult.rows.length > 0) {
      console.log('📊 [WALLET-MIGRATION] Subscription plans credits summary:');
      for (const row of verifyResult.rows) {
        console.log(`   Plan ${row.id} "${row.name}": ${row.monthly_credits_grant} credits/month`);
      }
    }

    // ================================
    // PASO 4: Seed de credit_packages si están vacíos
    // ================================
    const packagesCheck = await pool.query(`SELECT COUNT(*) as count FROM credit_packages`);
    const packagesCount = parseInt(packagesCheck.rows[0].count);

    if (packagesCount === 0) {
      console.log('🌱 [WALLET-MIGRATION] Seeding credit_packages...');
      
      await pool.query(`
        INSERT INTO credit_packages (name, credits, bonus_credits, price_usd_cents, is_active, sort_order)
        VALUES 
          ('Starter Pack',  50,   0,  1000, true, 1),
          ('Pro Pack',      200,  25, 3000, true, 2),
          ('Power Pack',    600, 100, 7500, true, 3)
        ON CONFLICT DO NOTHING
      `);
      
      console.log('✅ [WALLET-MIGRATION] Credit packages seeded: Starter ($10), Pro ($30), Power ($75)');
    } else {
      console.log(`✅ [WALLET-MIGRATION] Credit packages already seeded (${packagesCount} packages)`);
    }

    console.log('🚀 [WALLET-MIGRATION] All migrations completed successfully!');

  } catch (error) {
    console.error('❌ [WALLET-MIGRATION] Migration failed:', error);
    // No lanzar el error — el servidor debe arrancar aunque la migración falle
    // Los features de wallet simplemente no estarán disponibles
  } finally {
    await pool.end();
  }
}
