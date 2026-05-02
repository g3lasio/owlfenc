-- ============================================================
-- MIGRATION 004: Add missing performance indexes
-- Owl Fenc / Mervin AI
-- 
-- Context: Several high-frequency query paths (auth, subscription
-- checks, usage enforcement) perform full table scans because
-- critical columns lack indexes.
--
-- All indexes use CONCURRENTLY to avoid locking production tables.
-- Idempotent: uses IF NOT EXISTS.
-- ============================================================

-- 1. user_subscriptions.user_id
--    Every auth request calls getUserSubscription(userId) which does
--    WHERE user_id = $1. Without this index it's a full table scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_user_id
  ON user_subscriptions (user_id);

-- 2. user_subscriptions.status
--    Subscription status checks filter by status = 'active'
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_subscriptions_status
  ON user_subscriptions (status);

-- 3. user_usage_limits.user_id
--    Usage enforcement queries filter by user_id on every API call
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_usage_limits_user_id
  ON user_usage_limits (user_id);

-- 4. user_usage_limits.firebase_uid
--    Firebase-based auth path also queries by firebase_uid
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_usage_limits_firebase_uid
  ON user_usage_limits (firebase_uid);

-- 5. clients.user_id (if column exists)
--    Client listing queries filter by user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_clients_user_id
  ON clients (user_id);

-- 6. digital_contracts.user_id (if column exists)
--    Contract listing queries filter by user_id
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_digital_contracts_user_id
  ON digital_contracts (user_id);
