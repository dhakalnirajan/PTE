/**
 * Admin Database Query Helpers
 * Real database queries for system admin operations
 */

import { getDb } from "../db";
import crypto from "node:crypto";
import {
  users,
  subscriptions,
  payments,
  practiceSessions,
  questions,
  systemConfig,
  userResponses,
  srsCards,
  srsReviewLogs,
  subscriptionPlans,
  systemBackups,
  systemAlerts,
  apiKeys,
} from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, or, ilike } from "drizzle-orm";

/**
 * Get total system statistics
 */
export async function getSystemStatistics() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Get total users
    const totalUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);
    const totalUsers = totalUsersResult[0]?.count || 0;

    // Get active subscriptions
    const activeSubsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));
    const activeSubscriptions = activeSubsResult[0]?.count || 0;

    // Get total revenue
    const revenueResult = await db
      .select({ total: sql<number>`sum(${payments.amount})` })
      .from(payments)
      .where(eq(payments.status, "completed"));
    const totalRevenue = revenueResult[0]?.total || 0;

    // Get total sessions
    const sessionsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(practiceSessions);
    const totalSessions = sessionsResult[0]?.count || 0;

    // Get failed payments
    const failedPaymentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(eq(payments.status, "failed"));
    const failedPayments = failedPaymentsResult[0]?.count || 0;

    // Active users: signed in within the last 30 days
    const activeUsersResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(gte(users.lastSignedIn, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
    const activeUsers = activeUsersResult[0]?.count || 0;

    // Payments still awaiting a gateway callback
    const pendingPaymentsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(eq(payments.status, "pending"));
    const pendingPayments = pendingPaymentsResult[0]?.count || 0;

    // Payment failures in the last 7 days
    const failedPayments7dResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments)
      .where(
        and(
          eq(payments.status, "failed"),
          gte(payments.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
        )
      );
    const failedPayments7d = failedPayments7dResult[0]?.count || 0;

    // Answers that have been scored
    const responsesScoredResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(userResponses);
    const responsesScored = responsesScoredResult[0]?.count || 0;

    return {
      totalUsers,
      activeUsers,
      totalSessions,
      totalRevenue,
      activeSubscriptions,
      failedPayments,
      failedPayments7d,
      pendingPayments,
      responsesScored,
    };
  } catch (error) {
    console.error("[Admin] Error fetching system statistics:", error);
    throw error;
  }
}

/**
 * Get all admin users
 */
export async function getAdminUsers() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const admins = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        status: sql<string>`'active'`,
        lastLogin: users.createdAt,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(desc(users.createdAt));

    return admins;
  } catch (error) {
    console.error("[Admin] Error fetching admin users:", error);
    throw error;
  }
}

/**
 * Get all platform users with pagination
 */
export async function getPlatformUsers(
  limit: number = 50,
  offset: number = 0,
  search?: string
) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const trimmedSearch = search?.trim();
    const where = trimmedSearch
      ? or(
          ilike(users.name, `%${trimmedSearch}%`),
          ilike(users.email, `%${trimmedSearch}%`)
        )
      : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(where);
    const total = countResult[0]?.count || 0;

    // Get users with pagination
    const platformUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isBanned: users.isBanned,
        bannedAt: users.bannedAt,
        banReason: users.banReason,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      users: platformUsers,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error("[Admin] Error fetching platform users:", error);
    throw error;
  }
}

/**
 * Promote or demote a user
 */
export async function setUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [updated] = await db
    .update(users)
    .set({ role, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning({ id: users.id, role: users.role });

  if (!updated) throw new Error("User not found");
  return updated;
}

/**
 * Ban or unban a user
 */
export async function setUserBan(
  userId: number,
  banned: boolean,
  reason?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [updated] = await db
    .update(users)
    .set({
      isBanned: banned,
      bannedAt: banned ? new Date() : null,
      banReason: banned ? reason ?? null : null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      id: users.id,
      isBanned: users.isBanned,
      bannedAt: users.bannedAt,
      banReason: users.banReason,
    });

  if (!updated) throw new Error("User not found");
  return updated;
}

/**
 * Question bank size per section
 */
export async function getQuestionCountsBySection() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const rows = await db
    .select({
      section: questions.section,
      count: sql<number>`count(*)::int`,
      taskTypes: sql<number>`count(DISTINCT ${questions.taskType})::int`,
    })
    .from(questions)
    .groupBy(questions.section);

  const totalResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(questions);

  return {
    sections: rows,
    total: totalResult[0]?.count ?? 0,
  };
}

/**
 * Read every persisted system configuration entry
 */
export async function getSystemConfigEntries() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return db.select().from(systemConfig).orderBy(systemConfig.key);
}

/**
 * Insert or update a single system configuration entry
 */
export async function upsertSystemConfig(
  key: string,
  value: unknown,
  updatedBy?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [entry] = await db
    .insert(systemConfig)
    .values({ key, value: value as never, updatedBy })
    .onConflictDoUpdate({
      target: systemConfig.key,
      set: { value: value as never, updatedBy, updatedAt: new Date() },
    })
    .returning();

  return entry;
}

/**
 * Get user subscription details
 */
export async function getUserSubscriptions(limit: number = 50, offset: number = 0) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions);
    const total = countResult[0]?.count || 0;

    // Get subscriptions with user info
    const subs = await db
      .select({
        id: subscriptions.id,
        userId: subscriptions.userId,
        userName: users.name,
        userEmail: users.email,
        status: subscriptions.status,
        startDate: subscriptions.startDate,
        endDate: subscriptions.endDate,
        renewalDate: subscriptions.renewalDate,
        autoRenew: subscriptions.autoRenew,
      })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .orderBy(desc(subscriptions.startDate))
      .limit(limit)
      .offset(offset);

    return {
      subscriptions: subs,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error("[Admin] Error fetching user subscriptions:", error);
    throw error;
  }
}

/**
 * Get payment transactions
 */
export async function getPaymentTransactions(limit: number = 50, offset: number = 0) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Get total count
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(payments);
    const total = countResult[0]?.count || 0;

    // Get payments with user info
    const txns = await db
      .select({
        id: payments.id,
        userId: payments.userId,
        userName: users.name,
        userEmail: users.email,
        amount: payments.amount,
        currency: payments.currency,
        gateway: payments.gateway,
        status: payments.status,
        transactionId: payments.transactionId,
        createdAt: payments.createdAt,
        completedAt: payments.completedAt,
      })
      .from(payments)
      .leftJoin(users, eq(payments.userId, users.id))
      .orderBy(desc(payments.createdAt))
      .limit(limit)
      .offset(offset);

    return {
      transactions: txns,
      total,
      hasMore: offset + limit < total,
    };
  } catch (error) {
    console.error("[Admin] Error fetching payment transactions:", error);
    throw error;
  }
}

/**
 * Get revenue statistics by gateway
 */
export async function getRevenueByGateway() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const revenue = await db
      .select({
        gateway: payments.gateway,
        total: sql<number>`sum(${payments.amount})`,
        count: sql<number>`count(*)`,
      })
      .from(payments)
      .where(eq(payments.status, "completed"))
      .groupBy(payments.gateway);

    return revenue;
  } catch (error) {
    console.error("[Admin] Error fetching revenue by gateway:", error);
    throw error;
  }
}

/**
 * Get user activity logs
 */
export async function getUserActivityLogs(limit: number = 50, offset: number = 0) {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    // Get recent practice sessions as activity
    const logs = await db
      .select({
        id: practiceSessions.id,
        userId: practiceSessions.userId,
        userName: users.name,
        action: sql<string>`'Practice Session'`,
         target: sql<string>`CONCAT(${practiceSessions.section}, ' - ', ${practiceSessions.status})`,
        timestamp: practiceSessions.startedAt,
        status: practiceSessions.status,
        details: sql<string>`'Practice session completed'`,
      })
      .from(practiceSessions)
      .leftJoin(users, eq(practiceSessions.userId, users.id))
      .orderBy(desc(practiceSessions.startedAt))
      .limit(limit)
      .offset(offset);

    return logs;
  } catch (error) {
    console.error("[Admin] Error fetching activity logs:", error);
    throw error;
  }
}

/**
 * Get user growth statistics (last 30 days)
 */
export async function getUserGrowthStats() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const growth = await db
      .select({
        date: sql<string>`DATE(${users.createdAt})`,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .groupBy(sql<string>`DATE(${users.createdAt})`)
      .orderBy(sql<string>`DATE(${users.createdAt})`);

    return growth;
  } catch (error) {
    console.error("[Admin] Error fetching user growth stats:", error);
    throw error;
  }
}

/**
 * Flip a user's ban state, persisting to the users table
 */
export async function toggleUserBan(userId: number, reason?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [current] = await db
    .select({ isBanned: users.isBanned })
    .from(users)
    .where(eq(users.id, userId));

  if (!current) throw new Error("User not found");

  const updated = await setUserBan(userId, !current.isBanned, reason);

  return {
    success: true,
    userId,
    isBanned: updated.isBanned,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Get subscription statistics
 */
export async function getSubscriptionStats() {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const stats = await db
      .select({
        status: subscriptions.status,
        count: sql<number>`count(*)`,
      })
      .from(subscriptions)
      .groupBy(subscriptions.status);

    return stats;
  } catch (error) {
    console.error("[Admin] Error fetching subscription stats:", error);
    throw error;
  }
}

/**
 * Count rows in every meaningful table. Used for the real database snapshot
 * stored on each backup record.
 */
export async function getTableRowCounts() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const countOf = async (table: any) => {
    const rows = await db.select({ count: sql<number>`count(*)` }).from(table);
    return Number(rows[0]?.count ?? 0);
  };

  const [
    userCount,
    questionCount,
    sessionCount,
    responseCount,
    srsCardCount,
    srsLogCount,
    planCount,
    subscriptionCount,
    paymentCount,
    configCount,
  ] = await Promise.all([
    countOf(users),
    countOf(questions),
    countOf(practiceSessions),
    countOf(userResponses),
    countOf(srsCards),
    countOf(srsReviewLogs),
    countOf(subscriptionPlans),
    countOf(subscriptions),
    countOf(payments),
    countOf(systemConfig),
  ]);

  return {
    users: userCount,
    questions: questionCount,
    practiceSessions: sessionCount,
    userResponses: responseCount,
    srsCards: srsCardCount,
    srsReviewLogs: srsLogCount,
    subscriptionPlans: planCount,
    subscriptions: subscriptionCount,
    payments: paymentCount,
    systemConfig: configCount,
  };
}

/**
 * Run a backup: capture a real row-count snapshot of the database and persist
 * it as a backup record. No simulated progress or fabricated size numbers.
 */
export async function createBackup(options: { userId?: number; notes?: string } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const startedAt = Date.now();
  const snapshot = await getTableRowCounts();

  const [backup] = await db
    .insert(systemBackups)
    .values({
      backupId: `backup_${startedAt}`,
      status: "completed",
      sizeBytes: Buffer.byteLength(JSON.stringify(snapshot), "utf8"),
      durationMs: Date.now() - startedAt,
      notes: options.notes ?? null,
      snapshot,
      triggeredBy: options.userId,
    })
    .returning();

  return backup;
}

/**
 * List backup history, newest first
 */
export async function getBackups(limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  return db
    .select()
    .from(systemBackups)
    .orderBy(desc(systemBackups.createdAt))
    .limit(limit);
}

/**
 * Delete a backup record
 */
export async function deleteBackup(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [deleted] = await db
    .delete(systemBackups)
    .where(eq(systemBackups.id, id))
    .returning();

  if (!deleted) throw new Error("Backup not found");
  return deleted;
}

/**
 * Derive alerts from real platform signals (failed payments, expiring
 * subscriptions, unconfigured integrations, database reachability).
 */
async function deriveAlerts() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const staleAfter = new Date(Date.now() - 60 * 60 * 1000);
  const expiringBefore = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const [failedPayments] = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(and(eq(payments.status, "failed"), gte(payments.createdAt, since24h)));

  const [stalePayments] = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(and(eq(payments.status, "pending"), lte(payments.createdAt, staleAfter)));

  const [bannedUsers] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.isBanned, true));

  const [expiringSubscriptions] = await db
    .select({ count: sql<number>`count(*)` })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        lte(subscriptions.endDate, expiringBefore),
        gte(subscriptions.endDate, new Date())
      )
    );

  const alerts: Array<{
    alertKey: string;
    severity: "info" | "warning" | "error";
    title: string;
    message: string;
    source: string;
  }> = [];

  if (Number(failedPayments?.count ?? 0) > 0) {
    alerts.push({
      alertKey: "payments.failed.24h",
      severity: "error",
      title: "Failed payments in the last 24 hours",
      message: `${Number(failedPayments?.count)} payment(s) failed in the last 24 hours.`,
      source: "payments",
    });
  }

  if (Number(stalePayments?.count ?? 0) > 0) {
    alerts.push({
      alertKey: "payments.stale_pending",
      severity: "warning",
      title: "Payments stuck pending",
      message: `${Number(stalePayments?.count)} payment(s) have been pending for over an hour.`,
      source: "payments",
    });
  }

  if (Number(expiringSubscriptions?.count ?? 0) > 0) {
    alerts.push({
      alertKey: "subscriptions.expiring_soon",
      severity: "info",
      title: "Subscriptions expiring soon",
      message: `${Number(expiringSubscriptions?.count)} active subscription(s) expire within 3 days.`,
      source: "subscriptions",
    });
  }

  if (Number(bannedUsers?.count ?? 0) > 0) {
    alerts.push({
      alertKey: "users.banned",
      severity: "info",
      title: "Banned accounts",
      message: `${Number(bannedUsers?.count)} account(s) are currently banned.`,
      source: "users",
    });
  }

  const unconfigured: string[] = [];
  if (!process.env.ESEWA_MERCHANT_CODE) unconfigured.push("eSewa");
  if (!(process.env.KHALTI_PUBLIC_KEY && process.env.KHALTI_SECRET_KEY)) unconfigured.push("Khalti");
  if (!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY)) unconfigured.push("LLM scoring");
  if (!process.env.RESEND_API_KEY) unconfigured.push("Email (Resend)");
  if (!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID)) unconfigured.push("Object storage");

  if (unconfigured.length > 0) {
    alerts.push({
      alertKey: "integrations.unconfigured",
      severity: "warning",
      title: "Integrations missing credentials",
      message: `Not configured: ${unconfigured.join(", ")}.`,
      source: "integrations",
    });
  }

  return alerts;
}

/**
 * Sync derived alerts into the alerts table, drop alerts whose condition has
 * cleared, and return the persisted rows. Acknowledgement state is preserved.
 */
export async function getSystemAlerts() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const derived = await deriveAlerts();
  const keys = derived.map((alert) => alert.alertKey);

  for (const alert of derived) {
    await db
      .insert(systemAlerts)
      .values(alert)
      .onConflictDoUpdate({
        target: systemAlerts.alertKey,
        set: {
          severity: alert.severity,
          title: alert.title,
          message: alert.message,
          source: alert.source,
          updatedAt: new Date(),
        },
      });
  }

  const existing = await db.select().from(systemAlerts);
  const stale = existing.filter((row) => !keys.includes(row.alertKey));
  for (const row of stale) {
    await db.delete(systemAlerts).where(eq(systemAlerts.id, row.id));
  }

  return db
    .select()
    .from(systemAlerts)
    .orderBy(desc(systemAlerts.severity), desc(systemAlerts.createdAt));
}

/**
 * Acknowledge an alert, persisting the acknowledgement
 */
export async function acknowledgeAlert(alertKey: string, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [row] = await db
    .update(systemAlerts)
    .set({ acknowledged: true, acknowledgedBy: userId, acknowledgedAt: new Date(), updatedAt: new Date() })
    .where(eq(systemAlerts.alertKey, alertKey))
    .returning();

  if (!row) throw new Error("Alert not found");
  return row;
}

/**
 * Clear an alert acknowledgement
 */
export async function reopenAlert(alertKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [row] = await db
    .update(systemAlerts)
    .set({ acknowledged: false, acknowledgedBy: null, acknowledgedAt: null, updatedAt: new Date() })
    .where(eq(systemAlerts.alertKey, alertKey))
    .returning();

  if (!row) throw new Error("Alert not found");
  return row;
}

const API_KEY_PREFIX = "pte";

function hashSecret(secret: string) {
  return crypto.createHash("sha256").update(secret).digest("hex");
}

function newSecret() {
  return `${API_KEY_PREFIX}_${crypto.randomBytes(24).toString("hex")}`;
}

function mask(prefix: string, last4: string) {
  return `${prefix}••••••••${last4}`;
}

/**
 * Create an API key. The plaintext secret is returned exactly once.
 */
export async function createApiKey(name: string, createdBy?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const secret = newSecret();

  const [row] = await db
    .insert(apiKeys)
    .values({
      name,
      keyPrefix: secret.slice(0, 12),
      keyLast4: secret.slice(-4),
      secretHash: hashSecret(secret),
      status: "active",
      createdBy,
    })
    .returning();

  return { ...row, secretHash: undefined, maskedKey: mask(row.keyPrefix, row.keyLast4), secret };
}

/**
 * List API keys without ever exposing the stored hash
 */
export async function listApiKeys() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const rows = await db.select().from(apiKeys).orderBy(desc(apiKeys.createdAt));

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    maskedKey: mask(row.keyPrefix, row.keyLast4),
    status: row.status,
    lastUsedAt: row.lastUsedAt,
    createdAt: row.createdAt,
    rotatedAt: row.rotatedAt,
    revokedAt: row.revokedAt,
  }));
}

/**
 * Rotate an API key: issue a new secret and invalidate the previous one
 */
export async function rotateApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const secret = newSecret();

  const [row] = await db
    .update(apiKeys)
    .set({
      keyPrefix: secret.slice(0, 12),
      keyLast4: secret.slice(-4),
      secretHash: hashSecret(secret),
      status: "active",
      rotatedAt: new Date(),
    })
    .where(eq(apiKeys.id, id))
    .returning();

  if (!row) throw new Error("API key not found");
  return { ...row, secretHash: undefined, maskedKey: mask(row.keyPrefix, row.keyLast4), secret };
}

/**
 * Revoke (disable) an API key without deleting the audit record
 */
export async function revokeApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [row] = await db
    .update(apiKeys)
    .set({ status: "revoked", revokedAt: new Date() })
    .where(eq(apiKeys.id, id))
    .returning();

  if (!row) throw new Error("API key not found");
  return { id: row.id, name: row.name, status: row.status, revokedAt: row.revokedAt };
}

/**
 * Permanently delete an API key record
 */
export async function deleteApiKey(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const [row] = await db.delete(apiKeys).where(eq(apiKeys.id, id)).returning();
  if (!row) throw new Error("API key not found");
  return { id: row.id, name: row.name };
}

/**
 * Real performance metrics: measured database latency plus counts derived from
 * live tables and the running Node process. Nothing here is a fixed constant.
 */
export async function getPerformanceMetrics() {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  const pingStart = Date.now();
  await db.execute(sql`select 1`);
  const databaseLatencyMs = Date.now() - pingStart;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totals] = await db.select({ count: sql<number>`count(*)` }).from(users);

  const [activeUsers] = await db
    .select({ count: sql<number>`count(distinct ${practiceSessions.userId})` })
    .from(practiceSessions)
    .where(gte(practiceSessions.startedAt, since24h));

  const [sessionsToday] = await db
    .select({ count: sql<number>`count(*)` })
    .from(practiceSessions)
    .where(gte(practiceSessions.startedAt, since24h));

  const [responsesToday] = await db
    .select({ count: sql<number>`count(*)` })
    .from(userResponses)
    .where(gte(userResponses.submittedAt, since24h));

  const [payments7d] = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(gte(payments.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));

  const [failed7d] = await db
    .select({ count: sql<number>`count(*)` })
    .from(payments)
    .where(
      and(
        eq(payments.status, "failed"),
        gte(payments.createdAt, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
      )
    );

  const totalPayments7d = Number(payments7d?.count ?? 0);
  const failedPayments7d = Number(failed7d?.count ?? 0);
  const memory = process.memoryUsage();

  return {
    databaseLatencyMs,
    totalUsers: Number(totals?.count ?? 0),
    activeUsersLast24h: Number(activeUsers?.count ?? 0),
    sessionsLast24h: Number(sessionsToday?.count ?? 0),
    responsesLast24h: Number(responsesToday?.count ?? 0),
    paymentsLast7d: totalPayments7d,
    failedPaymentsLast7d: failedPayments7d,
    paymentFailureRate7d:
      totalPayments7d === 0 ? 0 : Math.round((failedPayments7d / totalPayments7d) * 1000) / 10,
    memoryUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 10) / 10,
    processUptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    checkedAt: new Date().toISOString(),
  };
}

export default {
  getSystemStatistics,
  getAdminUsers,
  getPlatformUsers,
  setUserRole,
  setUserBan,
  getQuestionCountsBySection,
  getSystemConfigEntries,
  upsertSystemConfig,
  getUserSubscriptions,
  getPaymentTransactions,
  getRevenueByGateway,
  getUserActivityLogs,
  getUserGrowthStats,
  toggleUserBan,
  getSubscriptionStats,
  getTableRowCounts,
  createBackup,
  getBackups,
  deleteBackup,
  getSystemAlerts,
  acknowledgeAlert,
  reopenAlert,
  createApiKey,
  listApiKeys,
  rotateApiKey,
  revokeApiKey,
  deleteApiKey,
  getPerformanceMetrics,
};
