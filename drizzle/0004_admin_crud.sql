-- Admin CRUD completion (PostgreSQL / Supabase)
--
-- Adds the columns and table behind the admin user-management and system
-- configuration procedures. Apply with either:
--   * pnpm db:push         (drizzle-kit push, compares drizzle/schema.ts to the DB)
--   * or paste this file into the Supabase SQL editor
--
-- Note: the earlier 0000-0003_*.sql files are stale MySQL-dialect output and were
-- never applied to this Postgres database; drizzle/schema.ts is the source of truth.

-- ── users: ban state ──────────────────────────────────────────────────────────
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "isBanned" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "bannedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "banReason" text;

-- ── system_config: key/value settings edited from the admin panel ─────────────
CREATE TABLE IF NOT EXISTS "system_config" (
  "id" serial PRIMARY KEY,
  "key" varchar(128) NOT NULL UNIQUE,
  "value" json NOT NULL,
  "updatedBy" integer REFERENCES "users"("id"),
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);
