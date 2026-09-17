/**
 * Payment Router - eSewa and Khalti Integration
 */

import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  createPayment,
  updatePaymentStatus,
  getPaymentByReferenceId,
  getUserPayments,
  getSubscriptionPlans,
  getSubscriptionPlanById,
  getUserActiveSubscription,
  getUserSubscriptions,
  cancelSubscription,
  updateSubscription,
  getSubscriptionWithPlan,
  setPaymentPidx,
  getPaymentByPidx,
} from "../payment/db";
import { fulfilPayment, type StoredPayment } from "../payment/fulfilment";
import {
  createESewaPaymentRequest,
  verifyESewaPayment,
  generateReferenceId as generateESewaReferenceId,
} from "../payment/esewa";
import {
  createKhaltiPaymentRequest,
  verifyKhaltiPayment,
  generateReferenceId as generateKhaltiReferenceId,
  nprToKhalti,
} from "../payment/khalti";
import { sendCancellationConfirmation } from "../email/emailService";

const ESEWA_CONFIG = {
  merchantCode: process.env.ESEWA_MERCHANT_CODE || "TESTMERCHANT",
  successUrl: `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/payment/esewa/success`,
  failureUrl: `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/payment/esewa/failure`,
  isProduction: process.env.NODE_ENV === "production",
};

const KHALTI_CONFIG = {
  publicKey: process.env.KHALTI_PUBLIC_KEY || "test_public_key",
  secretKey: process.env.KHALTI_SECRET_KEY || "test_secret_key",
  isProduction: process.env.NODE_ENV === "production",
};

export const paymentRouter = router({
  // Get all subscription plans
  getPlans: publicProcedure.query(async () => {
    return getSubscriptionPlans();
  }),

  // Initiate eSewa payment
  initiateESewaPayment: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        productName: z.string(),
        productDescription: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const plan = await getSubscriptionPlanById(input.planId);
        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
        }

        const referenceId = generateESewaReferenceId(ctx.user.id, Date.now());

        // Create the payment record first: the webhook looks it up by
        // referenceId, so an unrecorded payment could never be fulfilled.
        const productCode = `PLAN${plan.id}`;
        const payment = await createPayment({
          userId: ctx.user.id,
          gateway: "esewa",
          amount: plan.price,
          description: input.productDescription,
          referenceId,
          metadata: { planId: plan.id, productCode, productName: input.productName },
        });

        // Generate eSewa payment request
        const esewaRequest = createESewaPaymentRequest(ESEWA_CONFIG, {
          amount: plan.price,
          productCode,
          productName: input.productName,
          productDescription: input.productDescription,
          referenceId,
          userId: ctx.user.id,
        });

        return {
          paymentId: payment.id,
          paymentUrl: esewaRequest.paymentUrl,
          referenceId,
        };
      } catch (error) {
        console.error("eSewa payment initiation error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initiate eSewa payment",
        });
      }
    }),

  // Verify eSewa payment.
  // `referenceId` is our own payment reference (eSewa's pid/oid) sent back on
  // the success redirect; it is the reliable way to find the ledger row.
  verifyESewaPayment: protectedProcedure
    .input(
      z.object({
        transactionCode: z.string(),
        referenceId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const verification = await verifyESewaPayment(
          ESEWA_CONFIG,
          input.transactionCode
        );

        if (!verification.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment verification failed",
          });
        }

        const payment =
          (await getPaymentByReferenceId(input.referenceId || "")) ??
          (await getPaymentByReferenceId(verification.transactionUuid || "")) ??
          (await getPaymentByReferenceId(verification.transactionCode || ""));

        if (!payment || payment.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No matching payment was found for this transaction",
          });
        }

        await updatePaymentStatus(
          payment.id,
          "completed",
          verification.transactionCode,
          { esewaVerification: verification }
        );

        const fulfilment = await fulfilPayment(payment as StoredPayment, {
          productCode: verification.productCode,
        });

        return { success: true, verification, fulfilment };
      } catch (error) {
        console.error("eSewa verification error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment verification failed",
        });
      }
    }),

  // Initiate Khalti payment
  initiateKhaltiPayment: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        productName: z.string(),
        productDescription: z.string(),
        amount: z.number().optional(),
        customerEmail: z.string().email(),
        customerPhone: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const plan = await getSubscriptionPlanById(input.planId);
        if (!plan) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
        }

        const referenceId = generateKhaltiReferenceId(ctx.user.id, Date.now());

        // Create the payment record first: the webhook looks it up by
        // referenceId, so an unrecorded payment could never be fulfilled.
        const payment = await createPayment({
          userId: ctx.user.id,
          gateway: "khalti",
          amount: plan.price,
          description: input.productDescription,
          referenceId,
          metadata: { planId: plan.id, productName: input.productName },
        });

        // Generate Khalti payment request
        const khaltiRequest = await createKhaltiPaymentRequest(KHALTI_CONFIG, {
          amount: nprToKhalti(plan.price),
          productName: input.productName,
          productDescription: input.productDescription,
          referenceId,
          userId: ctx.user.id,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
        });

        // Khalti identifies the payment by pidx, not our referenceId, so record
        // it: both the return redirect and the webhook look the row up by pidx.
        if (khaltiRequest.pidx) {
          await setPaymentPidx(payment.id, khaltiRequest.pidx);
        }

        return {
          paymentId: payment.id,
          pidx: khaltiRequest.pidx,
          paymentUrl: khaltiRequest.paymentUrl,
          referenceId,
        };
      } catch (error) {
        console.error("Khalti payment initiation error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to initiate Khalti payment",
        });
      }
    }),

  // Verify Khalti payment. The payment row is found by the gateway pidx that
  // we stored at checkout (older rows fall back to the referenceId).
  verifyKhaltiPayment: protectedProcedure
    .input(
      z.object({
        pidx: z.string(),
        transactionId: z.string().optional(),
        amount: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const verification = await verifyKhaltiPayment(KHALTI_CONFIG, {
          pidx: input.pidx,
          transactionId: input.transactionId ?? input.pidx,
          amount: input.amount,
        });

        if (!verification.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Payment verification failed",
          });
        }

        const payment =
          (await getPaymentByPidx(input.pidx)) ??
          (await getPaymentByReferenceId(input.pidx));

        if (!payment || payment.userId !== ctx.user.id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No matching payment was found for this transaction",
          });
        }

        await updatePaymentStatus(
          payment.id,
          "completed",
          verification.transactionId ?? input.transactionId,
          { khaltiVerification: verification, pidx: input.pidx }
        );

        const fulfilment = await fulfilPayment(payment as StoredPayment);

        return { success: true, verification, fulfilment };
      } catch (error) {
        console.error("Khalti verification error:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Payment verification failed",
        });
      }
    }),

  // Get user's payment history
  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    return getUserPayments(ctx.user.id, 20);
  }),

  // Get user's active subscription
  getActiveSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getUserActiveSubscription(ctx.user.id);
    if (!subscription) return null;

    return getSubscriptionWithPlan(subscription.id);
  }),

  // Get the user's full subscription history (active and past), newest first
  getSubscriptionHistory: protectedProcedure.query(async ({ ctx }) => {
    return getUserSubscriptions(ctx.user.id);
  }),

  // Turn auto-renewal on or off for an active subscription
  setAutoRenew: protectedProcedure
    .input(z.object({ subscriptionId: z.number(), autoRenew: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await getSubscriptionWithPlan(input.subscriptionId);
      if (!subscription || subscription.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (subscription.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Auto-renewal can only be changed on an active subscription",
        });
      }

      const updated = await updateSubscription(input.subscriptionId, {
        autoRenew: input.autoRenew,
      });

      return { success: true, autoRenew: updated?.autoRenew ?? input.autoRenew };
    }),

  // Switch an active subscription to a different plan (upgrade or downgrade).
  // The new plan starts a fresh billing period from today.
  changePlan: protectedProcedure
    .input(z.object({ subscriptionId: z.number(), planId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await getSubscriptionWithPlan(input.subscriptionId);
      if (!subscription || subscription.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (subscription.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only an active subscription can change plans",
        });
      }

      if (subscription.planId === input.planId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already subscribed to this plan",
        });
      }

      const plan = await getSubscriptionPlanById(input.planId);
      if (!plan) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Plan not found" });
      }

      const renewalDate = new Date();
      if (plan.interval === "monthly") {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
      } else {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      }

      const updated = await updateSubscription(input.subscriptionId, {
        planId: input.planId,
        endDate: renewalDate,
        renewalDate,
        canceledAt: null,
      });

      return { success: true, subscription: { ...updated, plan } };
    }),

  // Reactivate a subscription the user previously canceled
  reactivateSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await getSubscriptionWithPlan(input.subscriptionId);
      if (!subscription || subscription.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (subscription.status === "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This subscription is already active",
        });
      }

      const periodEnd = new Date();
      if (subscription.plan?.interval === "yearly") {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const updated = await updateSubscription(input.subscriptionId, {
        status: "active",
        canceledAt: null,
        endDate: periodEnd,
        renewalDate: periodEnd,
      });

      return { success: true, subscription: updated };
    }),

  // Cancel subscription
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const subscription = await getSubscriptionWithPlan(input.subscriptionId);
      if (!subscription || subscription.userId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await cancelSubscription(input.subscriptionId);

      try {
        if (ctx.user.email) {
          await sendCancellationConfirmation(
            ctx.user.name || "there",
            ctx.user.email,
            subscription.plan?.name ?? "PTEMaster"
          );
        }
      } catch (error) {
        // A cancelled subscription must not depend on an email being delivered.
        console.error("Failed to send cancellation email:", error);
      }

      return { success: true };
    }),
});
