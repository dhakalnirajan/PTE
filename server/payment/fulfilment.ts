/**
 * Payment Fulfilment
 *
 * Single source of truth for what happens after a payment is verified: create
 * the subscription the payment bought, link the two records, and email the
 * receipt. Shared by the tRPC verification procedures and the gateway webhooks
 * so both paths behave identically and are safe to run twice.
 */

import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import {
  createSubscription,
  attachPaymentToSubscription,
  getSubscriptionPlanById,
} from "./db";
import { sendPaymentReceipt, sendWelcomeEmail } from "../email/emailService";

export type StoredPayment = {
  id: number;
  userId: number;
  subscriptionId: number | null;
  amount: number;
  currency: string;
  gateway: "esewa" | "khalti";
  referenceId: string | null;
  transactionId: string | null;
  metadata: unknown;
};

/**
 * Resolve which plan a payment is for. The plan is written into the payment
 * metadata at checkout; older records fall back to the gateway product code
 * (format: PLAN{planId}).
 */
export function resolvePlanId(payment: StoredPayment, productCode?: string): number | null {
  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;

  const fromMetadata = Number(metadata.planId);
  if (Number.isFinite(fromMetadata) && fromMetadata > 0) return fromMetadata;

  const code =
    typeof metadata.productCode === "string" ? metadata.productCode : productCode;
  const match = code?.match(/PLAN(\d+)/i);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  return null;
}

export function readPidx(payment: StoredPayment): string | null {
  const metadata = (payment.metadata ?? {}) as Record<string, unknown>;
  const pidx = metadata.pidx;
  return typeof pidx === "string" && pidx.length > 0 ? pidx : null;
}

/**
 * Email the buyer their receipt and onboarding message. Never throws: a failed
 * email must not fail the payment.
 */
async function sendFulfilmentEmails(
  payment: StoredPayment,
  plan: { name: string; interval: string } | null
) {
  if (!plan) return;

  try {
    const db = await getDb();
    if (!db) return;

    const [user] = await db
      .select({ name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, payment.userId))
      .limit(1);

    if (!user?.email) {
      console.warn(`[Payment] No email on file for user ${payment.userId}; receipt not sent`);
      return;
    }

    const now = new Date();
    const userName = user.name || "there";

    const receiptSent = await sendPaymentReceipt({
      userName,
      userEmail: user.email,
      amount: Number(payment.amount ?? 0),
      currency: payment.currency ?? "NPR",
      paymentMethod: payment.gateway === "khalti" ? "Khalti" : "eSewa",
      transactionId: payment.transactionId || payment.referenceId || String(payment.id),
      planName: plan.name,
      planDuration: plan.interval === "yearly" ? "Yearly" : "Monthly",
      date: now.toLocaleString("en-GB"),
    });

    if (!receiptSent) {
      console.warn(`[Payment] Receipt for payment ${payment.id} was not delivered`);
    }

    await sendWelcomeEmail({
      userName,
      userEmail: user.email,
      planName: plan.name,
      activationDate: now.toLocaleDateString("en-GB"),
    });
  } catch (error) {
    console.error("[Payment] Failed to send purchase emails:", error);
  }
}

/**
 * Fulfil a verified payment: create the subscription it paid for, link the two
 * records together, and send the receipt. Safe to run twice — a payment already
 * linked to a subscription is not given a second one.
 */
export async function fulfilPayment(
  payment: StoredPayment,
  options: { productCode?: string } = {}
): Promise<{ subscriptionId: number | null; planId: number; planName: string } | null> {
  const planId = resolvePlanId(payment, options.productCode);
  const plan = planId ? await getSubscriptionPlanById(planId) : undefined;

  if (!plan) {
    console.error(
      `[Payment] Payment ${payment.id} could not be matched to a subscription plan; no subscription created`
    );
    return null;
  }

  let subscriptionId = payment.subscriptionId;

  if (payment.subscriptionId === null) {
    const subscription = await createSubscription({
      userId: payment.userId,
      planId: plan.id,
      autoRenew: true,
    });

    if (subscription) {
      subscriptionId = subscription.id;
      await attachPaymentToSubscription(payment.id, subscription.id);
      payment.subscriptionId = subscription.id;
    }
  }

  await sendFulfilmentEmails(payment, { name: plan.name, interval: plan.interval });

  return { subscriptionId, planId: plan.id, planName: plan.name };
}
