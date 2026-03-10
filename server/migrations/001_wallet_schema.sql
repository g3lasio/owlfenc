-- ============================================================
-- MIGRACIÓN 001: WALLET SCHEMA — PAY AS YOU GROW
-- Mervin AI / Owl Fenc App
-- Fecha: 2026-03-08
-- Principio: SOLO cambios ADITIVOS — ninguna tabla existente se modifica destructivamente
-- ============================================================

-- ============================================================
-- 1. AGREGAR COLUMNA monthly_credits_grant A subscription_plans
-- ============================================================
ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS monthly_credits_grant INTEGER NOT NULL DEFAULT 0;

-- Actualizar los valores de créditos por plan
UPDATE subscription_plans SET monthly_credits_grant = 20   WHERE id = 5; -- Primo Chambeador (Free)
UPDATE subscription_plans SET monthly_credits_grant = 600  WHERE id = 9; -- Mero Patrón
UPDATE subscription_plans SET monthly_credits_grant = 1500 WHERE id = 6; -- Master Contractor

-- ============================================================
-- 2. CREAR TABLA wallet_accounts
-- Una wallet por usuario. Balance en enteros para evitar errores de punto flotante.
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_accounts (
  id                        SERIAL PRIMARY KEY,
  user_id                   INTEGER NOT NULL,
  firebase_uid              VARCHAR(255) NOT NULL,
  
  -- Balance principal — NUNCA negativo (constraint a nivel DB)
  balance_credits           INTEGER NOT NULL DEFAULT 0 CHECK (balance_credits >= 0),
  
  -- Stats para analytics
  total_credits_earned      INTEGER NOT NULL DEFAULT 0,
  total_credits_spent       INTEGER NOT NULL DEFAULT 0,
  total_top_up_amount_cents INTEGER NOT NULL DEFAULT 0,
  
  -- Reusar el mismo Stripe Customer ID de user_subscriptions
  stripe_customer_id        VARCHAR(255),
  
  -- Fraud prevention
  is_locked                 BOOLEAN NOT NULL DEFAULT false,
  locked_reason             TEXT,
  
  created_at                TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at                TIMESTAMP DEFAULT NOW() NOT NULL,
  
  -- Constraints de unicidad
  CONSTRAINT wallet_accounts_firebase_uid_unique UNIQUE (firebase_uid),
  CONSTRAINT wallet_accounts_user_id_unique UNIQUE (user_id)
);

-- Índices para wallet_accounts
CREATE INDEX IF NOT EXISTS wallet_accounts_firebase_uid_idx ON wallet_accounts (firebase_uid);

-- ============================================================
-- 3. CREAR TABLA wallet_transactions
-- Ledger append-only. Cada crédito agregado o deducido es una fila inmutable.
-- ============================================================
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id                          SERIAL PRIMARY KEY,
  wallet_id                   INTEGER NOT NULL REFERENCES wallet_accounts(id),
  user_id                     INTEGER NOT NULL,
  firebase_uid                VARCHAR(255) NOT NULL,
  
  -- Tipo: 'topup' | 'subscription_grant' | 'feature_use' | 'refund' | 'bonus' | 'expiry' | 'admin_adjustment'
  type                        VARCHAR(50) NOT NULL,
  
  -- Dirección: 'credit' | 'debit'
  direction                   VARCHAR(10) NOT NULL,
  
  -- Monto — siempre positivo, direction determina el signo
  amount_credits              INTEGER NOT NULL,
  
  -- Snapshot del balance tras la transacción — para auditoría
  balance_after               INTEGER NOT NULL,
  
  -- Feature que consumió los créditos
  -- 'aiEstimate' | 'contract' | 'invoice' | 'permitReport' | 'propertyVerification'
  -- | 'deepSearch' | 'signatureProtocol' | 'paymentLink'
  feature_name                VARCHAR(100),
  
  -- ID del recurso generado (estimate ID, contract ID, etc.)
  resource_id                 VARCHAR(255),
  
  -- Para tipo subscription_grant
  subscription_plan_id        INTEGER,
  
  -- Para top-ups
  stripe_payment_intent_id    VARCHAR(255),
  stripe_checkout_session_id  VARCHAR(255),
  top_up_amount_cents         INTEGER,
  
  -- CRÍTICO: Previene doble deducción / doble grant
  idempotency_key             VARCHAR(255) UNIQUE,
  
  -- Descripción legible para el usuario
  description                 TEXT,
  
  -- Datos adicionales para analytics
  metadata                    JSONB,
  
  -- Para subscription_grant credits — expiran 60 días tras fin del período
  -- Para top-up credits — NUNCA expiran (NULL)
  expires_at                  TIMESTAMP,
  
  created_at                  TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Índices para wallet_transactions
CREATE INDEX IF NOT EXISTS wallet_transactions_wallet_id_idx    ON wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS wallet_transactions_firebase_uid_idx ON wallet_transactions (firebase_uid);
CREATE INDEX IF NOT EXISTS wallet_transactions_type_idx         ON wallet_transactions (type);
CREATE INDEX IF NOT EXISTS wallet_transactions_created_at_idx   ON wallet_transactions (created_at);

-- ============================================================
-- 4. CREAR TABLA credit_packages
-- Los 3 paquetes de top-up disponibles para compra
-- ============================================================
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
);

-- ============================================================
-- 5. POBLAR credit_packages CON LOS 3 PAQUETES
-- (Se actualizarán los stripe_price_id después de crearlos en Stripe)
-- ============================================================
INSERT INTO credit_packages (name, credits, bonus_credits, price_usd_cents, sort_order)
VALUES
  ('Starter Pack', 50,  0,   1000, 1),
  ('Pro Pack',     200, 25,  3000, 2),
  ('Power Pack',   600, 100, 7500, 3)
ON CONFLICT DO NOTHING;

-- ============================================================
-- FIN DE MIGRACIÓN 001
-- ============================================================
