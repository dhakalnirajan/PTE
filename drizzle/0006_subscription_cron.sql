-- Subscription lifecycle job support (PostgreSQL / Supabase)
--
-- Adds the column behind the auto-renewal / renewal-reminder cron job:
-- subscriptions.reminderSentAt records when a reminder email was already sent
-- for the current billing period, so the job is idempotent.
--
-- Apply with either:
--   * pnpm db:push         (drizzle-kit push, compares drizzle/schema.ts to the DB)
--   * or paste this file into the Supabase SQL editor

ALTER TABLE "subscriptions"
  ADD COLUMN IF NOT EXISTS "reminderSentAt" timestamptz;
