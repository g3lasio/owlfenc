/**
 * WALLET MIGRATION RUNNER
 * Ejecuta las migraciones del schema de wallet en la base de datos Neon PostgreSQL.
 * Se llama automáticamente al arrancar el servidor — ANTES de cualquier query a la DB.
 *
 * Principio: SOLO cambios ADITIVOS — seguro para producción con 13 usuarios activos.
 * Cada statement se ejecuta individualmente con su propio try/catch para máxima resiliencia.
 * NO usa transacción global — cada operación es idempotente (IF NOT EXISTS / ON CONFLICT).
 */

import { Pool } from '@neondatabase/serverless';

// ================================
// PLAN IDs CONFIRMADOS (de stripePriceRegistry.ts)
// ================================
const PLAN_CREDITS: Record<number, number> = {
  4: 20,    // Free Trial        → 20 créditos/mes
  5: 20,    // Primo Chambeador  → 20 créditos/mes (free)
  9: 500,   // Mero Patrón       → 500 créditos/mes ($49.99/mes)
  6: 1200,  // Master Contractor → 1200 créditos/mes ($99.99/mes)
};

async function runStatement(pool: Pool, label: string, sql: string, params?: any[]): Promise<void> {
  try {
    if (params) {
      await pool.query(sql, params);
    } else {
      await pool.query(sql);
    }
  } catch (err: any) {
    // Ignorar errores de "ya existe" — son esperados en re-arranques
    const ignorable = [
      '42701', // column already exists
      '42P07', // relation already exists
      '42710', // constraint already exists
      '23505', // unique violation (ON CONFLICT fallback)
    ];
    if (ignorable.includes(err.code)) {
      // Silencioso — ya existe, está bien
      return;
    }
    console.error(`❌ [WALLET-MIGRATION] Failed at [${label}]:`, err.message);
    throw err;
  }
}

export async function runWalletMigration(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  [WALLET-MIGRATION] DATABASE_URL not set — skipping migration');
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('🔄 [WALLET-MIGRATION] Starting wallet schema migration...');

    // ================================================================
    // PASO 1: Columna monthly_credits_grant en subscription_plans
    // CRÍTICO: Este paso debe correr PRIMERO para que getPlansFromDB() no falle
    // ================================================================
    await runStatement(pool, 'add monthly_credits_grant column', `
      ALTER TABLE subscription_plans 
      ADD COLUMN IF NOT EXISTS monthly_credits_grant INTEGER NOT NULL DEFAULT 0
    `);
    console.log('✅ [WALLET-MIGRATION] Column monthly_credits_grant ready');

    // ================================================================
    // PASO 2: Crear tabla wallet_accounts
    // ================================================================
    await runStatement(pool, 'create wallet_accounts', `
      CREATE TABLE IF NOT EXISTS wallet_accounts (
        id                        SERIAL PRIMARY KEY,
        user_id                   INTEGER NOT NULL,
        firebase_uid              VARCHAR(255) NOT NULL,
        balance_credits           INTEGER NOT NULL DEFAULT 0 CHECK (balance_credits >= 0),
        total_credits_earned      INTEGER NOT NULL DEFAULT 0,
        total_credits_spent       INTEGER NOT NULL DEFAULT 0,
        total_top_up_amount_cents INTEGER NOT NULL DEFAULT 0,
        stripe_customer_id        VARCHAR(255),
        is_locked                 BOOLEAN NOT NULL DEFAULT false,
        locked_reason             TEXT,
        created_at                TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at                TIMESTAMP DEFAULT NOW() NOT NULL,
        CONSTRAINT wallet_accounts_firebase_uid_unique UNIQUE (firebase_uid),
        CONSTRAINT wallet_accounts_user_id_unique UNIQUE (user_id)
      )
    `);

    await runStatement(pool, 'index wallet_accounts_firebase_uid', `
      CREATE INDEX IF NOT EXISTS wallet_accounts_firebase_uid_idx ON wallet_accounts (firebase_uid)
    `);
    console.log('✅ [WALLET-MIGRATION] Table wallet_accounts ready');

    // ================================================================
    // PASO 3: Crear tabla wallet_transactions
    // ================================================================
    await runStatement(pool, 'create wallet_transactions', `
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id                          SERIAL PRIMARY KEY,
        wallet_id                   INTEGER NOT NULL REFERENCES wallet_accounts(id),
        user_id                     INTEGER NOT NULL,
        firebase_uid                VARCHAR(255) NOT NULL,
        type                        VARCHAR(50) NOT NULL,
        direction                   VARCHAR(10) NOT NULL,
        amount_credits              INTEGER NOT NULL,
        balance_after               INTEGER NOT NULL,
        feature_name                VARCHAR(100),
        resource_id                 VARCHAR(255),
        subscription_plan_id        INTEGER,
        stripe_payment_intent_id    VARCHAR(255),
        stripe_checkout_session_id  VARCHAR(255),
        top_up_amount_cents         INTEGER,
        idempotency_key             VARCHAR(255) UNIQUE,
        description                 TEXT,
        metadata                    JSONB,
        expires_at                  TIMESTAMP,
        created_at                  TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);

    await runStatement(pool, 'index wallet_transactions_wallet_id', `
      CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx ON wallet_transactions (wallet_id)
    `);
    await runStatement(pool, 'index wallet_transactions_firebase_uid', `
      CREATE INDEX IF NOT EXISTS wallet_transactions_firebase_uid_idx ON wallet_transactions (firebase_uid)
    `);
    await runStatement(pool, 'index wallet_transactions_type', `
      CREATE INDEX IF NOT EXISTS wallet_transactions_type_idx ON wallet_transactions (type)
    `);
    await runStatement(pool, 'index wallet_transactions_created_at', `
      CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx ON wallet_transactions (created_at)
    `);
    console.log('✅ [WALLET-MIGRATION] Table wallet_transactions ready');

    // ================================================================
    // PASO 4: Crear tabla credit_packages
    // ================================================================
    await runStatement(pool, 'create credit_packages', `
      CREATE TABLE IF NOT EXISTS credit_packages (
        id                SERIAL PRIMARY KEY,
        name              VARCHAR(100) NOT NULL,
        credits           INTEGER NOT NULL,
        bonus_credits     INTEGER NOT NULL DEFAULT 0,
        price_usd_cents   INTEGER NOT NULL,
        stripe_price_id   VARCHAR(255),
        is_active         BOOLEAN NOT NULL DEFAULT true,
        sort_order        INTEGER NOT NULL DEFAULT 0,
        created_at        TIMESTAMP DEFAULT NOW() NOT NULL
      )
    `);
    console.log('✅ [WALLET-MIGRATION] Table credit_packages ready');

    // ================================================================
    // PASO 5: Seed de credit_packages (idempotente por nombre)
    // ================================================================
    const packagesCheck = await pool.query(`SELECT COUNT(*) as count FROM credit_packages`);
    const packagesCount = parseInt(packagesCheck.rows[0].count);

    if (packagesCount === 0) {
      await runStatement(pool, 'seed starter pack', `
        INSERT INTO credit_packages (name, credits, bonus_credits, price_usd_cents, is_active, sort_order)
        VALUES ('Starter Pack', 50, 0, 1000, true, 1)
      `);
      await runStatement(pool, 'seed pro pack', `
        INSERT INTO credit_packages (name, credits, bonus_credits, price_usd_cents, is_active, sort_order)
        VALUES ('Pro Pack', 200, 25, 3000, true, 2)
      `);
      await runStatement(pool, 'seed power pack', `
        INSERT INTO credit_packages (name, credits, bonus_credits, price_usd_cents, is_active, sort_order)
        VALUES ('Power Pack', 600, 100, 7500, true, 3)
      `);
      console.log('✅ [WALLET-MIGRATION] Credit packages seeded: Starter ($10), Pro ($30), Power ($75)');
    } else {
      console.log(`✅ [WALLET-MIGRATION] Credit packages already exist (${packagesCount} packages)`);
    }

    // ================================================================
    // PASO 6: Actualizar monthly_credits_grant por plan (siempre actualiza para mantener sync con código)
    // ================================================================
    console.log('🔄 [WALLET-MIGRATION] Updating monthly_credits_grant for subscription plans...');
    
    for (const [planId, credits] of Object.entries(PLAN_CREDITS)) {
      const result = await pool.query(
        `UPDATE subscription_plans 
         SET monthly_credits_grant = $1 
         WHERE id = $2
         RETURNING id, name, monthly_credits_grant`,
        [credits, parseInt(planId)]
      );
      
      if (result.rowCount && result.rowCount > 0) {
        const row = result.rows[0];
        console.log(`  ✅ Plan "${row.name}" (id=${planId}): ${credits} credits/month`);
      }
    }

    // Verificar el estado final de los planes
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

    // ================================================================
    // PASO 7: permit_search_history — fix schema mismatch
    // The table may exist with different columns than the current schema.
    // We add any missing columns idempotently (IF NOT EXISTS).
    // ================================================================
    console.log('🔄 [WALLET-MIGRATION] Ensuring permit_search_history schema is correct...');

    // Create table if it doesn't exist at all
    await runStatement(pool, 'permit_search_history CREATE', `
      CREATE TABLE IF NOT EXISTS permit_search_history (
        id          TEXT PRIMARY KEY,
        query       TEXT NOT NULL DEFAULT '',
        results     JSONB,
        user_id     INTEGER NOT NULL,
        search_date TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Add any columns that may be missing (idempotent — 42701 is ignored by runStatement)
    await runStatement(pool, 'permit_search_history ADD query',
      `ALTER TABLE permit_search_history ADD COLUMN IF NOT EXISTS query TEXT NOT NULL DEFAULT ''`);
    await runStatement(pool, 'permit_search_history ADD results',
      `ALTER TABLE permit_search_history ADD COLUMN IF NOT EXISTS results JSONB`);
    await runStatement(pool, 'permit_search_history ADD user_id',
      `ALTER TABLE permit_search_history ADD COLUMN IF NOT EXISTS user_id INTEGER`);
    await runStatement(pool, 'permit_search_history ADD search_date',
      `ALTER TABLE permit_search_history ADD COLUMN IF NOT EXISTS search_date TIMESTAMP NOT NULL DEFAULT NOW()`);

    // Add index for fast lookups by user_id
    await runStatement(pool, 'permit_search_history INDEX user_id', `
      CREATE INDEX IF NOT EXISTS idx_permit_search_history_user_id
      ON permit_search_history (user_id, search_date DESC)
    `);

    console.log('✅ [WALLET-MIGRATION] permit_search_history schema is up to date');

    console.log('🚀 [WALLET-MIGRATION] All migrations completed successfully!');
  } catch (error) {
    console.error('❌ [WALLET-MIGRATION] Migration failed:', error);
    // NO lanzar el error — el servidor debe arrancar aunque la migración falle parcialmente.
    // Los features de wallet simplemente no estarán disponibles hasta el próximo arranque.
  } finally {
    await pool.end();
  }
}
