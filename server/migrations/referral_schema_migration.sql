-- ============================================================
-- REFERRAL SYSTEM MIGRATION — OWL FENC
-- Mervin AI / Owl Fenc App
-- 
-- PRINCIPIO: Solo cambios ADITIVOS. Ninguna tabla existente se modifica.
-- Ejecutar DESPUÉS de que wallet_migration.sql ya esté aplicado.
-- Idempotente: usa IF NOT EXISTS en todos los CREATE TABLE.
-- ============================================================

-- ============================================================
-- TABLE: referral_codes
-- Un código único por usuario referidor.
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_codes (
  id                      SERIAL PRIMARY KEY,
  referrer_firebase_uid   VARCHAR(255) NOT NULL,
  referrer_user_id        INTEGER NOT NULL,
  code                    VARCHAR(20) NOT NULL,
  is_active               BOOLEAN NOT NULL DEFAULT TRUE,
  deactivated_at          TIMESTAMP,
  deactivated_reason      TEXT,
  total_clicks            INTEGER NOT NULL DEFAULT 0,
  total_signups           INTEGER NOT NULL DEFAULT 0,
  total_rewards_earned    INTEGER NOT NULL DEFAULT 0,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ANTI-FRAUDE: Un usuario solo puede tener UN código
CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_referrer_uid_unique
  ON referral_codes (referrer_firebase_uid);

-- El código es globalmente único
CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_unique
  ON referral_codes (code);

-- Index para lookup por código (el más frecuente — cada visita al link)
CREATE INDEX IF NOT EXISTS referral_codes_code_idx
  ON referral_codes (code);

CREATE INDEX IF NOT EXISTS referral_codes_referrer_idx
  ON referral_codes (referrer_firebase_uid);

-- ============================================================
-- TABLE: referral_links
-- Cada registro de un usuario que se registró usando un código.
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_links (
  id                      SERIAL PRIMARY KEY,
  referral_code_id        INTEGER NOT NULL REFERENCES referral_codes(id),
  code                    VARCHAR(20) NOT NULL,
  referrer_firebase_uid   VARCHAR(255) NOT NULL,
  referred_firebase_uid   VARCHAR(255) NOT NULL,
  referred_user_id        INTEGER,
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- CHECK: el referido no puede ser el mismo que el referidor (anti-auto-referido)
  CONSTRAINT no_self_referral CHECK (referrer_firebase_uid != referred_firebase_uid),
  registered_at           TIMESTAMP NOT NULL DEFAULT NOW(),
  first_estimate_at       TIMESTAMP,
  first_payment_at        TIMESTAMP,
  registration_ip         VARCHAR(45),
  user_agent              TEXT,
  fraud_flags             JSONB,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ANTI-FRAUDE CRÍTICO: Un usuario solo puede ser referido UNA vez
CREATE UNIQUE INDEX IF NOT EXISTS referral_links_referred_uid_unique
  ON referral_links (referred_firebase_uid);

CREATE INDEX IF NOT EXISTS referral_links_referrer_idx
  ON referral_links (referrer_firebase_uid);

CREATE INDEX IF NOT EXISTS referral_links_code_idx
  ON referral_links (code);

CREATE INDEX IF NOT EXISTS referral_links_status_idx
  ON referral_links (status);

CREATE INDEX IF NOT EXISTS referral_links_code_id_idx
  ON referral_links (referral_code_id);

-- ============================================================
-- TABLE: referral_rewards
-- Ledger append-only de recompensas otorgadas.
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_rewards (
  id                      SERIAL PRIMARY KEY,
  referral_link_id        INTEGER NOT NULL REFERENCES referral_links(id),
  recipient_firebase_uid  VARCHAR(255) NOT NULL,
  recipient_role          VARCHAR(20) NOT NULL,  -- 'referrer' | 'referred'
  trigger_event           VARCHAR(50) NOT NULL,  -- 'first_estimate' | 'first_payment'
  credits_awarded         INTEGER NOT NULL,
  status                  VARCHAR(20) NOT NULL DEFAULT 'pending',
  wallet_transaction_id   INTEGER,               -- FK → wallet_transactions.id (nullable until credited)
  idempotency_key         VARCHAR(255) NOT NULL,
  trigger_metadata        JSONB,
  error_message           TEXT,
  created_at              TIMESTAMP NOT NULL DEFAULT NOW(),
  credited_at             TIMESTAMP
);

-- ANTI-FRAUDE CRÍTICO: Cada combinación link+role+evento solo puede tener UNA recompensa
CREATE UNIQUE INDEX IF NOT EXISTS referral_rewards_idempotency_unique
  ON referral_rewards (idempotency_key);

CREATE INDEX IF NOT EXISTS referral_rewards_recipient_idx
  ON referral_rewards (recipient_firebase_uid);

CREATE INDEX IF NOT EXISTS referral_rewards_link_idx
  ON referral_rewards (referral_link_id);

CREATE INDEX IF NOT EXISTS referral_rewards_status_idx
  ON referral_rewards (status);

CREATE INDEX IF NOT EXISTS referral_rewards_trigger_idx
  ON referral_rewards (trigger_event);

-- ============================================================
-- TABLE: referral_settings
-- Singleton de configuración. Permite cambiar recompensas sin deploy.
-- ============================================================
CREATE TABLE IF NOT EXISTS referral_settings (
  id                                    SERIAL PRIMARY KEY,
  referrer_credits_on_first_estimate    INTEGER NOT NULL DEFAULT 20,
  referred_credits_on_first_estimate    INTEGER NOT NULL DEFAULT 10,
  referrer_credits_on_first_payment     INTEGER NOT NULL DEFAULT 50,
  referred_credits_on_first_payment     INTEGER NOT NULL DEFAULT 25,
  expiration_days                       INTEGER NOT NULL DEFAULT 90,
  max_active_referrals                  INTEGER NOT NULL DEFAULT 50,
  is_enabled                            BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at                            TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_by                            VARCHAR(255)
);

-- Insertar configuración por defecto si no existe
INSERT INTO referral_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- COMMENTS (documentación en la DB)
-- ============================================================
COMMENT ON TABLE referral_codes IS 'Un código único por usuario referidor. Base de los links de referido.';
COMMENT ON TABLE referral_links IS 'Registro de cada usuario que se registró usando un código de referido. Unique constraint en referred_firebase_uid previene referidos múltiples.';
COMMENT ON TABLE referral_rewards IS 'Ledger append-only de recompensas. Idempotency key previene duplicados. Vinculado al wallet ledger via wallet_transaction_id.';
COMMENT ON TABLE referral_settings IS 'Configuración singleton de recompensas. Editable desde admin sin deploy.';

COMMENT ON CONSTRAINT no_self_referral ON referral_links IS 'ANTI-FRAUDE: Un usuario no puede referirse a sí mismo.';
COMMENT ON INDEX referral_links_referred_uid_unique IS 'ANTI-FRAUDE: Un usuario solo puede ser referido una vez en toda su vida.';
COMMENT ON INDEX referral_rewards_idempotency_unique IS 'ANTI-FRAUDE: Cada evento de recompensa (link+role+trigger) solo se procesa una vez.';
