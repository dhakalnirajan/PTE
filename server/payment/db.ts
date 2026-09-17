/**
 * Payment Database Helpers
 */

import { getDb } from "../db";
import {
  payments,
  subscriptions,
  subscriptionPlans,
} from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function createPayment(data: {
  userId: number;
  subscriptionId?: number;
  gateway: "esewa" | "khalti";
  amount: number;
  description: string;
  referenceId: string;
  metadata?: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [payment] = await db
    .insert(payments)
    .values({
      userId: data.userId,
      subscriptionId: data.subscriptionId,
      gateway: data.gateway,
      amount: data.amount,
      currency: "NPR",
      status: "pending",
      description: data.description,
      referenceId: data.referenceId,
      metadata: (data.metadata ?? null) as never,
    })
    .returning();

  return payment;
}

/**
 * Link a completed payment to the subscription it paid for
 */
export async function attachPaymentToSubscription(paymentId: number, subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [payment] = await db
    .update(payments)
    .set({ subscriptionId, updatedAt: new Date() })
    .where(eq(payments.id, paymentId))
    .returning();

  return payment;
}

export async function updatePaymentStatus(
  paymentId: number,
  status: "pending" | "completed" | "failed" | "refunded",
  transactionId?: string,
  metadata?: Record<string, unknown>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (transactionId) updateData.transactionId = transactionId;
  if (metadata) updateData.metadata = metadata;
  if (status === "completed") updateData.completedAt = new Date();

  await db.update(payments).set(updateData).where(eq(payments.id, paymentId));
}

/**
 * Store the gateway's own payment id (Khalti pidx) on the payment record so
 * the return redirect and webhook can find it again.
 */
export async function setPaymentPidx(paymentId: number, pidx: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [payment] = await db
    .update(payments)
    .set({
      metadata: sql`coalesce(${payments.metadata}, '{}'::json) || ${JSON.stringify({ pidx })}::json`,
      updatedAt: new Date(),
    })
    .where(eq(payments.id, paymentId))
    .returning();

  return payment;
}

/**
 * Look up a payment by the gateway's own payment id (Khalti pidx)
 */
export async function getPaymentByPidx(pidx: string) {
  if (!pidx) return undefined;

  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [payment] = await db
    .select()
    .from(payments)
    .where(sql`${payments.metadata}->>'pidx' = ${pidx}`)
    .limit(1);

  return payment;
}

export async function getPaymentByReferenceId(referenceId: string) {
  if (!referenceId) return undefined;

  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.referenceId, referenceId))
    .limit(1);

  return payment;
}

export async function getUserPayments(userId: number, limit = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  return db
    .select()
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt))
    .limit(limit);
}

export async function createSubscriptionPlan(data: {
  name: string;
  price: number;
  interval: "monthly" | "yearly";
  features: string[];
  maxSessions?: number;
  storageGB?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [plan] = await db
    .insert(subscriptionPlans)
    .values({
      name: data.name,
      price: data.price,
      interval: data.interval,
      features: data.features,
      maxSessions: data.maxSessions,
      storageGB: data.storageGB,
    })
    .returning();

  return plan;
}

export async function getSubscriptionPlans() {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  return db.select().from(subscriptionPlans);
}

export async function getSubscriptionPlanById(planId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [plan] = await db
    .select()
    .from(subscriptionPlans)
    .where(eq(subscriptionPlans.id, planId))
    .limit(1);

  return plan;
}

export async function createSubscription(data: {
  userId: number;
  planId: number;
  autoRenew?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const plan = await getSubscriptionPlanById(data.planId);
  if (!plan) throw new Error("Plan not found");

  // A new purchase replaces the user's current plan: supersede any active
  // subscription so a user never ends up with several active rows at once.
  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(subscriptions.userId, data.userId),
        eq(subscriptions.status, "active")
      )
    );

  const startDate = new Date();
  const endDate = new Date();

  if (plan.interval === "monthly") {
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate.setFullYear(endDate.getFullYear() + 1);
  }

  const [subscription] = await db
    .insert(subscriptions)
    .values({
      userId: data.userId,
      planId: data.planId,
      status: "active",
      startDate,
      endDate,
      renewalDate: endDate,
      autoRenew: data.autoRenew ?? true,
    })
    .returning();

  return subscription;
}

export async function getUserActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), eq(subscriptions.status, "active")))
    .limit(1);

  return subscription;
}

export async function cancelSubscription(subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  await db
    .update(subscriptions)
    .set({
      status: "canceled",
      canceledAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));
}

/**
 * Update a subscription's mutable fields
 */
export async function updateSubscription(
  subscriptionId: number,
  data: {
    planId?: number;
    status?: "active" | "inactive" | "canceled" | "expired";
    autoRenew?: boolean;
    endDate?: Date;
    renewalDate?: Date;
    canceledAt?: Date | null;
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const [subscription] = await db
    .update(subscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId))
    .returning();

  return subscription;
}

/**
 * Get every subscription belonging to a user (active and past), newest first,
 * each joined with its plan so the UI can render name/price/features.
 */
export async function getUserSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt));

  if (rows.length === 0) return [];

  const plans = await db.select().from(subscriptionPlans);
  const planById = new Map(plans.map((plan) => [plan.id, plan]));

  return rows.map((subscription) => ({
    ...subscription,
    plan: planById.get(subscription.planId) ?? null,
  }));
}

export async function getSubscriptionWithPlan(subscriptionId: number) {
  const db = await getDb();
  if (!db) return null;

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1);

  if (!subscription) return null;

  const plan = await getSubscriptionPlanById(subscription.planId);
  return { ...subscription, plan };
}

export async function getTotalRevenue() {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db
      .select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)::int` })
      .from(payments)
      .where(eq(payments.status, "completed"));
    return result[0]?.total ?? 0;
  } catch {
    return 0;
  }
}

export async function getRevenueByGateway() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      gateway: payments.gateway,
      total: sql<number>`sum(${payments.amount})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(payments)
    .where(eq(payments.status, "completed"))
    .groupBy(payments.gateway);
}

export async function getActiveSubscriptionsCount() {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));
    return result[0]?.count ?? 0;
  } catch {
    return 0;
  }
}

export async function getSubscriptionsByPlan() {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      name: subscriptionPlans.name,
      count: sql<number>`count(*)::int`,
    })
    .from(subscriptions)
    .innerJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(eq(subscriptions.status, "active"))
    .groupBy(subscriptionPlans.name);
}
