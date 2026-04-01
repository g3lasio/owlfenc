-- Migration: Add LeadPrime Network columns to users table
-- These columns persist the LeadPrime Network connection state across server restarts.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS leadprime_token TEXT,
  ADD COLUMN IF NOT EXISTS leadprime_handle TEXT,
  ADD COLUMN IF NOT EXISTS leadprime_connected_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS leadprime_synced_docs INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leadprime_last_sync TIMESTAMP;
