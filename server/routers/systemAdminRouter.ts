/**
 * System Admin Router
 * Advanced system control procedures for senior administrators
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import * as adminDb from "../admin/adminDb";
import * as analyticsDb from "../admin/analyticsDb";
import { isEmailConfigured } from "../email/emailService";
/**
 * Admin-only procedure - checks for super admin role
 */
const adminOnlyProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user?.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only administrators can access this resource",
    });
  }
  return next({ ctx });
});

export const systemAdminRouter = router({
  /**
   * Get system health status
   */
  getSystemHealth: adminOnlyProcedure.query(async () => {
    // Real signal only: probe the database and report which integrations have
    // credentials configured. No fabricated metrics.
    let database: "connected" | "unavailable" = "connected";
    let totalUsers = 0;

    try {
      const stats = await adminDb.getSystemStatistics();
      totalUsers = stats.totalUsers;
    } catch (error) {
      console.error("[Admin] Database health check failed:", error);
      database = "unavailable";
    }

    const integrations: Array<{ name: string; configured: boolean; detail: string }> = [
      {
        name: "Payment Gateway (eSewa)",
        configured: !!process.env.ESEWA_MERCHANT_CODE,
        detail: "ESEWA_MERCHANT_CODE",
      },
      {
        name: "Payment Gateway (Khalti)",
        configured: !!(process.env.KHALTI_PUBLIC_KEY && process.env.KHALTI_SECRET_KEY),
        detail: "KHALTI_PUBLIC_KEY, KHALTI_SECRET_KEY",
      },
      {
        name: "LLM Scoring",
        configured: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
        detail: "OPENROUTER_API_KEY",
      },
      {
        name: "Voice Transcription",
        configured: !!(process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY),
        detail: "Whisper via LLM provider",
      },
      {
        name: "Object Storage",
        configured: !!(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID),
        detail: "S3_BUCKET, S3_ACCESS_KEY_ID",
      },
      {
        name: "Email (Resend)",
        configured: isEmailConfigured(),
        detail: "RESEND_API_KEY",
      },
    ];

    const services = [
      {
        name: "Database",
        status: database === "connected" ? "operational" : "unavailable",
        uptime: `${totalUsers} users`,
      },
      ...integrations.map((integration) => ({
        name: integration.name,
        status: integration.configured ? "configured" : "not configured",
        uptime: integration.detail,
      })),
    ];

    const unconfigured = integrations.filter((i) => !i.configured).length;

    return {
      status:
        database === "connected" && unconfigured === 0
          ? ("healthy" as const)
          : database === "connected"
            ? ("degraded" as const)
            : ("down" as const),
      database,
      totalUsers,
      configuredIntegrations: integrations.length - unconfigured,
      totalIntegrations: integrations.length,
      lastCheck: new Date().toISOString(),
      services,
    };
  }),

  /**
   * Question bank size per section, for the content management view
   */
  getContentStats: adminOnlyProcedure.query(async () => {
    try {
      return await adminDb.getQuestionCountsBySection();
    } catch (error) {
      console.error("[Admin] Error fetching content stats:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  /**
   * Get system statistics
   */
  getSystemStats: adminOnlyProcedure.query(async ({ ctx }) => {
    try {
      return await adminDb.getSystemStatistics();
    } catch (error) {
      console.error("[Admin] Error fetching system stats:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  /**
   * Get activity logs
   */
  getActivityLogs: adminOnlyProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        offset: z.number().default(0),
        filter: z.enum(["all", "user_actions", "system_events", "errors"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      try {
        return await adminDb.getUserActivityLogs(input.limit, input.offset);
      } catch (error) {
        console.error("[Admin] Error fetching activity logs:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Ban or unban a user
   */
  toggleUserBan: adminOnlyProcedure
    .input(
      z.object({
        userId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const result = await adminDb.toggleUserBan(input.userId, input.reason);

        console.log(
          `[Admin] ${ctx.user?.name} toggled ban for user ${input.userId} -> ${result.isBanned}`
        );

        return {
          success: true,
          message: result.isBanned ? "User banned" : "User unbanned",
          userId: result.userId,
          isBanned: result.isBanned,
          timestamp: result.timestamp,
        };
      } catch (error) {
        console.error("[Admin] Error toggling user ban:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update the user's ban status",
        });
      }
    }),

  /**
   * List platform users with search + pagination
   */
  getUsers: adminOnlyProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        return await adminDb.getPlatformUsers(input.limit, input.offset, input.search);
      } catch (error) {
        console.error("[Admin] Error fetching platform users:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Promote a user to admin or demote an admin back to a regular user
   */
  setUserRole: adminOnlyProcedure
    .input(
      z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user?.id && input.role !== "admin") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot remove your own admin access",
        });
      }

      try {
        const updated = await adminDb.setUserRole(input.userId, input.role);
        console.log(`[Admin] ${ctx.user?.name} set role of user ${input.userId} to ${input.role}`);
        return { success: true, userId: updated.id, role: updated.role };
      } catch (error) {
        console.error("[Admin] Error setting user role:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update the user's role",
        });
      }
    }),

  /**
   * Set a user's ban state explicitly (ban or unban)
   */
  setUserBan: adminOnlyProcedure
    .input(
      z.object({
        userId: z.number(),
        banned: z.boolean(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user?.id && input.banned) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot ban your own account",
        });
      }

      try {
        const updated = await adminDb.setUserBan(input.userId, input.banned, input.reason);
        console.log(
          `[Admin] ${ctx.user?.name} ${input.banned ? "banned" : "unbanned"} user ${input.userId}`
        );
        return {
          success: true,
          userId: updated.id,
          isBanned: updated.isBanned,
        };
      } catch (error) {
        console.error("[Admin] Error setting user ban:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update the user's ban status",
        });
      }
    }),

  /**
   * Recent payment transactions for the admin billing view
   */
  getRecentPayments: adminOnlyProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      try {
        return await adminDb.getPaymentTransactions(input.limit, input.offset);
      } catch (error) {
        console.error("[Admin] Error fetching payments:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Read persisted system configuration
   */
  getSystemConfig: adminOnlyProcedure.query(async () => {
    try {
      return await adminDb.getSystemConfigEntries();
    } catch (error) {
      console.error("[Admin] Error fetching system config:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  /**
   * Update system configuration
   */
  updateSystemConfig: adminOnlyProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const entry = await adminDb.upsertSystemConfig(
          input.key,
          input.value,
          ctx.user?.id
        );

        console.log(`[Admin] ${ctx.user?.name} updated config: ${input.key}`);

        return {
          success: true,
          message: "Configuration updated",
          key: entry.key,
          value: entry.value,
          timestamp: entry.updatedAt.toISOString(),
        };
      } catch (error) {
        console.error("[Admin] Error updating system config:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to save the configuration",
        });
      }
    }),

  /**
   * Run a backup and persist the real database snapshot
   */
  triggerBackup: adminOnlyProcedure
    .input(z.object({ notes: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      try {
        const backup = await adminDb.createBackup({
          userId: ctx.user?.id,
          notes: input?.notes,
        });

        console.log(
          `[Admin] ${ctx.user?.name} completed backup ${backup.backupId} (${backup.sizeBytes} bytes, ${backup.durationMs}ms)`
        );

        return {
          success: true,
          backupId: backup.backupId,
          id: backup.id,
          status: backup.status,
          sizeBytes: backup.sizeBytes,
          durationMs: backup.durationMs,
          snapshot: backup.snapshot,
          timestamp: backup.createdAt.toISOString(),
        };
      } catch (error) {
        console.error("[Admin] Error running backup:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to run the backup",
        });
      }
    }),

  /**
   * Get backup history
   */
  getBackupHistory: adminOnlyProcedure.query(async () => {
    try {
      return await adminDb.getBackups();
    } catch (error) {
      console.error("[Admin] Error fetching backup history:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  /**
   * Delete a backup record
   */
  deleteBackup: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const deleted = await adminDb.deleteBackup(input.id);
        console.log(`[Admin] ${ctx.user?.name} deleted backup ${deleted.backupId}`);
        return { success: true, id: deleted.id, backupId: deleted.backupId };
      } catch (error) {
        console.error("[Admin] Error deleting backup:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete the backup",
        });
      }
    }),

  /**
   * List API keys (masked; the stored hash is never returned)
   */
  getApiKeys: adminOnlyProcedure.query(async () => {
    try {
      return await adminDb.listApiKeys();
    } catch (error) {
      console.error("[Admin] Error fetching API keys:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  /**
   * Create an API key. The plaintext secret is returned once, at creation.
   */
  createApiKey: adminOnlyProcedure
    .input(z.object({ name: z.string().min(1).max(128) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const created = await adminDb.createApiKey(input.name, ctx.user?.id);
        console.log(`[Admin] ${ctx.user?.name} created API key ${created.name}`);
        return {
          success: true,
          id: created.id,
          name: created.name,
          maskedKey: created.maskedKey,
          secret: created.secret,
        };
      } catch (error) {
        console.error("[Admin] Error creating API key:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create the API key",
        });
      }
    }),

  /**
   * Rotate an API key, issuing a new secret and invalidating the old one
   */
  rotateApiKey: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const rotated = await adminDb.rotateApiKey(input.id);
        console.log(`[Admin] ${ctx.user?.name} rotated API key ${rotated.name}`);
        return {
          success: true,
          message: "API key rotated successfully",
          id: rotated.id,
          name: rotated.name,
          maskedKey: rotated.maskedKey,
          secret: rotated.secret,
          rotatedAt: rotated.rotatedAt?.toISOString() ?? null,
        };
      } catch (error) {
        console.error("[Admin] Error rotating API key:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to rotate the API key",
        });
      }
    }),

  /**
   * Revoke an API key without deleting its audit record
   */
  revokeApiKey: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const revoked = await adminDb.revokeApiKey(input.id);
        console.log(`[Admin] ${ctx.user?.name} revoked API key ${revoked.name}`);
        return { success: true, ...revoked };
      } catch (error) {
        console.error("[Admin] Error revoking API key:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to revoke the API key",
        });
      }
    }),

  /**
   * Permanently delete an API key record
   */
  deleteApiKey: adminOnlyProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const deleted = await adminDb.deleteApiKey(input.id);
        console.log(`[Admin] ${ctx.user?.name} deleted API key ${deleted.name}`);
        return { success: true, ...deleted };
      } catch (error) {
        console.error("[Admin] Error deleting API key:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete the API key",
        });
      }
    }),

  /**
   * Get user engagement metrics
   */
  getUserEngagement: adminOnlyProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      try {
        return await analyticsDb.getUserEngagementMetrics(input.days);
      } catch (error) {
        console.error("[Admin] Error fetching user engagement:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Get learning performance metrics
   */
  getLearningPerformance: adminOnlyProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      try {
        return await analyticsDb.getLearningPerformanceMetrics(input.days);
      } catch (error) {
        console.error("[Admin] Error fetching learning performance:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Get payment and revenue metrics
   */
  getPaymentRevenue: adminOnlyProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      try {
        return await analyticsDb.getPaymentRevenueMetrics(input.days);
      } catch (error) {
        console.error("[Admin] Error fetching payment revenue:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Get customer lifetime value
   */
  getCustomerLTV: adminOnlyProcedure.query(async () => {
    try {
      return await analyticsDb.getCustomerLifetimeValue();
    } catch (error) {
      console.error("[Admin] Error fetching CLV:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  /**
   * Get churn and retention metrics
   */
  getChurnRetention: adminOnlyProcedure
    .input(z.object({ days: z.number().default(30) }))
    .query(async ({ input }) => {
      try {
        return await analyticsDb.getChurnRetentionMetrics(input.days);
      } catch (error) {
        console.error("[Admin] Error fetching churn retention:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  /**
   * Get system alerts
   */
  getSystemAlerts: adminOnlyProcedure.query(async () => {
    try {
      return await adminDb.getSystemAlerts();
    } catch (error) {
      console.error("[Admin] Error fetching system alerts:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),

  /**
   * Acknowledge an alert, persisting the acknowledgement
   */
  acknowledgeAlert: adminOnlyProcedure
    .input(z.object({ alertKey: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const alert = await adminDb.acknowledgeAlert(input.alertKey, ctx.user?.id);
        console.log(`[Admin] ${ctx.user?.name} acknowledged alert ${input.alertKey}`);

        return {
          success: true,
          message: "Alert acknowledged",
          alertKey: alert.alertKey,
          acknowledgedAt: alert.acknowledgedAt?.toISOString() ?? null,
        };
      } catch (error) {
        console.error("[Admin] Error acknowledging alert:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to acknowledge the alert",
        });
      }
    }),

  /**
   * Clear an alert acknowledgement so it shows as active again
   */
  reopenAlert: adminOnlyProcedure
    .input(z.object({ alertKey: z.string().min(1) }))
    .mutation(async ({ input, ctx }) => {
      try {
        const alert = await adminDb.reopenAlert(input.alertKey);
        console.log(`[Admin] ${ctx.user?.name} reopened alert ${input.alertKey}`);
        return { success: true, alertKey: alert.alertKey, acknowledged: alert.acknowledged };
      } catch (error) {
        console.error("[Admin] Error reopening alert:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reopen the alert",
        });
      }
    }),

  /**
   * Get system performance metrics (measured, not hardcoded)
   */
  getPerformanceMetrics: adminOnlyProcedure.query(async () => {
    try {
      return await adminDb.getPerformanceMetrics();
    } catch (error) {
      console.error("[Admin] Error fetching performance metrics:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),
});

export default systemAdminRouter;
