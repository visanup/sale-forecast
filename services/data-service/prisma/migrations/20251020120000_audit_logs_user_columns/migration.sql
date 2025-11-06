-- Add user-specific columns to audit_logs for richer actor context
ALTER TABLE "audit_logs"
  ADD COLUMN IF NOT EXISTS "user_id" TEXT,
  ADD COLUMN IF NOT EXISTS "user_email" TEXT,
  ADD COLUMN IF NOT EXISTS "user_username" TEXT,
  ADD COLUMN IF NOT EXISTS "client_id" TEXT;
