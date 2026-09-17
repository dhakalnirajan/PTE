/**
 * Subscription Lifecycle Jobs
 *
 * Runs on a schedule (Vercel Cron via /api/cron/subscriptions, and every
 * 6 hours on the long-running Node server). Two responsibilities:
 *
 * 1. Renewal reminders — email users whose active subscription renews within
 *    the next 3 days. Idempotent per period via subscriptions.reminderSentAt.
 * 2. Auto-renewal / expiry — when a period ends:
 *      - autoRenew = true  → roll the period forward and record a renewal
 *        payment in the ledger (status "pending": eSewa/Khalti do not support
 *        off-session charging, so the ledger row is what an operator uses to
 *        reconcile a manual re-charge; the subscription itself stays active so
 *        the user keeps access while that happens).
 *      - autoRenew = false → mark the subscription "expired".
 */

import { getDb } from "../db";
import {
  users,
  subscriptions,
  subscriptionPlans,
  payments,
} from "../../drizzle/schema";
import { and, eq, gt, isNull, lte } from "drizzle-orm";
import { sendSubscriptionRenewalReminder } from "../email/emailService";

const REMINDER_WINDOW_DAYS = 3;

export type LifecycleResult = {
  remindersSent: number;
  remindersSkipped: number;
  renewed: number;
  expired: number;
  errors: string[];
};

/** Period length for a plan interval, rolled forward from `from`. */
function nextPeriodEnd(from: Date, interval: "monthly" | "yearly"): Date {
  const end = new Date(from);
  if (interval === "yearly") {
    end.setFullYear(end.getFullYear() + 1);
  } else {
    end.setMonth(end.getMonth() + 1);
  }
  return end;
}

/**
 * Send renewal reminders for active subscriptions ending within the reminder
 * window. reminderSentAt is reset whenever a new period starts (renewal),
 * so each period gets exactly one reminder.
 */
export async function sendRenewalReminders(now = new Date()): Promise<Pick<LifecycleResult, "remindersSent" | "remindersSkipped" | "errors">> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const due = await db
    .select({
      subscriptionId: subscriptions.id,
      endDate: subscriptions.endDate,
      reminderSentAt: subscriptions.reminderSentAt,
      userName: users.name,
      userEmail: users.email,
      planName: subscriptionPlans.name,
      planPrice: subscriptionPlans.price,
      planInterval: subscriptionPlans.interval,
    })
    .from(subscriptions)
    .innerJoin(users, eq(subscriptions.userId, users.id))
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(
      and(
        eq(subscriptions.status, "active"),
        gt(subscriptions.endDate, now),
        lte(subscriptions.endDate, windowEnd),
        isNull(subscriptions.reminderSentAt)
      )
    );

  const result = { remindersSent: 0, remindersSkipped: 0, errors: [] as string[] };

  for (const row of due) {
    // Claim the row first: set reminderSentAt before sending so concurrent job
    // runs (or a crash mid-send) cannot spam the user.
    const claimed = await db
      .update(subscriptions)
      .set({ reminderSentAt: now, updatedAt: now })
      .where(
        and(
          eq(subscriptions.id, row.subscriptionId),
          isNull(subscriptions.reminderSentAt)
        )
      )
      .returning({ id: subscriptions.id });

    if (claimed.length === 0) {
      result.remindersSkipped += 1;
      continue;
    }

    try {
      if (!row.userEmail || !row.endDate) {
        console.warn(
          `[Jobs] Missing email or end date for subscription ${row.subscriptionId}; reminder skipped`
        );
        continue;
      }

      const sent = await sendSubscriptionRenewalReminder({
        userName: row.userName || "there",
        userEmail: row.userEmail,
        planName: row.planName,
        amount: row.planPrice,
        currency: "NPR",
        renewalDate: row.endDate.toLocaleDateString("en-GB"),
        nextBillingDate: row.endDate.toLocaleDateString("en-GB"),
      });

      if (sent) {
        result.remindersSent += 1;
      } else {
        result.remindersSkipped += 1;
        console.warn(
          `[Jobs] Renewal reminder for subscription ${row.subscriptionId} was not delivered (email not configured or rejected)`
        );
      }
    } catch (error) {
      result.errors.push(`Reminder for subscription ${row.subscriptionId} failed`);
      console.error(`[Jobs] Reminder send failed for subscription ${row.subscriptionId}:`, error);
    }
  }

  return result;
}

/**
 * Handle ended periods: roll auto-renewing subscriptions forward and expire
 * the rest. Renewal payments are recorded as "pending" — Nepali gateways do
 * not support off-session charging, so actual collection still requires the
 * user to pay (the pending ledger row is the reconciliation hook).
 */
export async function processRenewalsAndExpiry(now = new Date()): Promise<Pick<LifecycleResult, "renewed" | "expired" | "errors">> {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const ended = await db
    .select({
      subscriptionId: subscriptions.id,
      userId: subscriptions.userId,
      autoRenew: subscriptions.autoRenew,
      planName: subscriptionPlans.name,
      planInterval: subscriptionPlans.interval,
      planPrice: subscriptionPlans.price,
    })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(
      and(
        eq(subscriptions.status, "active"),
        lte(subscriptions.endDate, now)
      )
    );

  const result = { renewed: 0, expired: 0, errors: [] as string[] };

  for (const row of ended) {
    try {
      if (!row.autoRenew) {
        await db
          .update(subscriptions)
          .set({ status: "expired", updatedAt: now })
          .where(eq(subscriptions.id, row.subscriptionId));
        result.expired += 1;
        continue;
      }

      const newEnd = nextPeriodEnd(now, row.planInterval as "monthly" | "yearly");

      await db
        .update(subscriptions)
        .set({
          // Clear the reminder flag for the new period
          reminderSentAt: null,
          startDate: now,
          endDate: newEnd,
          renewalDate: newEnd,
          updatedAt: now,
        })
        .where(eq(subscriptions.id, row.subscriptionId));

      // Ledger row for the renewal so operators can reconcile collection.
      await db.insert(payments).values({
        userId: row.userId,
        subscriptionId: row.subscriptionId,
        gateway: "esewa", // gateway is decided at collection time; eSewa is the default
        amount: row.planPrice,
        currency: "NPR",
        status: "pending",
        description: `Auto-renewal: ${row.planName} (${row.planInterval})`,
        referenceId: `RENEW${row.subscriptionId}${now.getTime()}`,
        metadata: {
          kind: "auto_renewal",
          planInterval: row.planInterval,
        } as never,
      });

      result.renewed += 1;
    } catch (error) {
      result.errors.push(`Renewal for subscription ${row.subscriptionId} failed`);
      console.error(`[Jobs] Renewal failed for subscription ${row.subscriptionId}:`, error);
    }
  }

  return result;
}

/**
 * Run the full lifecycle pass. Returns a summary for logging/monitoring.
 */
export async function runSubscriptionLifecycle(now = new Date()): Promise<LifecycleResult> {
  const reminders = await sendRenewalReminders(now);
  const renewals = await processRenewalsAndExpiry(now);

  const summary = {
    remindersSent: reminders.remindersSent,
    remindersSkipped: reminders.remindersSkipped,
    renewed: renewals.renewed,
    expired: renewals.expired,
    errors: [...reminders.errors, ...renewals.errors],
  };

  if (
    summary.remindersSent > 0 ||
    summary.renewed > 0 ||
    summary.expired > 0 ||
    summary.errors.length > 0
  ) {
    console.log("[Jobs] Subscription lifecycle:", JSON.stringify(summary));
  }

  return summary;
}
