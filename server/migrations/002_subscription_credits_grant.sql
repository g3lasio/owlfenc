-- ============================================================
-- MIGRATION 002: Update monthly_credits_grant in subscription_plans
-- PAY AS YOU GROW — Mervin AI / Owl Fenc App
-- 
-- PLAN IDs (confirmed from stripePriceRegistry.ts):
--   4 = Free Trial        → 20 credits/month (same as free)
--   5 = Primo Chambeador  → 20 credits/month
--   9 = Mero Patrón       → 600 credits/month ($49.99/mes)
--   6 = Master Contractor → 1500 credits/month ($99.99/mes)
--
-- Safe to run multiple times (idempotent via WHERE clause).
-- ============================================================

-- Primo Chambeador (Free) — 20 créditos/mes
UPDATE subscription_plans 
SET monthly_credits_grant = 20 
WHERE id = 5 AND monthly_credits_grant = 0;

-- Free Trial — 20 créditos/mes (igual que free, para no bloquear durante trial)
UPDATE subscription_plans 
SET monthly_credits_grant = 20 
WHERE id = 4 AND monthly_credits_grant = 0;

-- Mero Patrón ($49.99/mes) — 600 créditos/mes
UPDATE subscription_plans 
SET monthly_credits_grant = 600 
WHERE id = 9 AND monthly_credits_grant = 0;

-- Master Contractor ($99.99/mes) — 1500 créditos/mes
UPDATE subscription_plans 
SET monthly_credits_grant = 1500 
WHERE id = 6 AND monthly_credits_grant = 0;

-- Verificación: mostrar el resultado
SELECT id, name, monthly_credits_grant 
FROM subscription_plans 
WHERE id IN (4, 5, 6, 9)
ORDER BY id;
