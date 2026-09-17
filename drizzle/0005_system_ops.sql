-- System operations tables (PostgreSQL / Supabase)
--
-- Backs the admin system-operations procedures that previously returned
-- hardcoded data: getBackupHistory/triggerBackup, getSystemAlerts/
-- acknowledgeAlert, and getApiKeys/rotateApiKey.
--
-- Apply with either:
--   * pnpm db:push         (drizzle-kit push, compares drizzle/schema.ts to the DB)
--   * or paste this file into the Supabase SQL editor

-- ── system_backups: one row per backup run, with a real row-count snapshot ────
CREATE TABLE IF NOT EXISTS "system_backups" (
  "id" serial PRIMARY KEY,
  "backupId" varchar(64) NOT NULL UNIQUE,
  "status" varchar(32) NOT NULL DEFAULT 'completed',
  "sizeBytes" integer NOT NULL DEFAULT 0,
  "durationMs" integer NOT NULL DEFAULT 0,
  "notes" text,
  "snapshot" json,
  "triggeredBy" integer REFERENCES "users"("id"),
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- ── system_alerts: alerts derived from real signals, with ack state ──────────
CREATE TABLE IF NOT EXISTS "system_alerts" (
  "id" serial PRIMARY KEY,
  "alertKey" varchar(128) NOT NULL UNIQUE,
  "severity" varchar(16) NOT NULL DEFAULT 'info',
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "source" varchar(64) NOT NULL DEFAULT 'system',
  "acknowledged" boolean NOT NULL DEFAULT false,
  "acknowledgedBy" integer REFERENCES "users"("id"),
  "acknowledgedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- ── api_keys: hashed secret store for outbound service keys ──────────────────
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" serial PRIMARY KEY,
  "name" varchar(128) NOT NULL,
  "keyPrefix" varchar(24) NOT NULL,
  "keyLast4" varchar(8) NOT NULL,
  "secretHash" varchar(128) NOT NULL,
  "status" varchar(16) NOT NULL DEFAULT 'active',
  "createdBy" integer REFERENCES "users"("id"),
  "lastUsedAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "rotatedAt" timestamptz,
  "revokedAt" timestamptz
);
