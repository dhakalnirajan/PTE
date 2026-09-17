/**
 * Payment Webhook Handlers
 * Handles eSewa and Khalti payment confirmations
 *
 * Mounted at /api/webhooks/payment (see server/_core/app.ts).
 */

import { Router, Request, Response } from "express";
import {
  updatePaymentStatus,
  getPaymentByReferenceId,
  getPaymentByPidx,
} from "../payment/db";
import { verifyESewaPayment } from "../payment/esewa";
import { verifyKhaltiPayment } from "../payment/khalti";
import { fulfilPayment, type StoredPayment } from "../payment/fulfilment";
import crypto from "crypto";

const router = Router();

const KHALTI_SECRET = process.env.KHALTI_SECRET_KEY || "test_secret_key";

/**
 * eSewa Payment Webhook
 * Called after user completes payment on eSewa
 */
router.post("/esewa", async (req: Request, res: Response) => {
  try {
    const { oid, amt, refId, pid, scd } = req.query;

    if (!oid || !amt || !refId) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Verify payment with eSewa
    const verification = await verifyESewaPayment(
      {
        merchantCode: scd as string,
        successUrl: "",
        failureUrl: "",
        isProduction: process.env.NODE_ENV === "production",
      },
      oid as string
    );

    if (!verification.success) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    // Our referenceId travels as eSewa's `pid`; fall back to the transaction uuid.
    const referenceId =
      (pid as string) || verification.transactionUuid || verification.transactionCode || "";
    const payment =
      (await getPaymentByReferenceId(referenceId)) ??
      (await getPaymentByReferenceId((refId as string) ?? ""));

    if (payment) {
      await updatePaymentStatus(payment.id, "completed", verification.transactionCode, {
        esewaVerification: verification,
      });

      await fulfilPayment(payment as StoredPayment, { productCode: pid as string });
    } else {
      console.error(`[Webhook] eSewa payment ${referenceId} not found in the ledger`);
    }

    return res.json({ success: true, message: "Payment confirmed" });
  } catch (error) {
    console.error("eSewa webhook error:", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

/**
 * Khalti Payment Webhook
 * Called after user completes payment on Khalti
 */
router.post("/khalti", async (req: Request, res: Response) => {
  try {
    const { pidx, transaction_id, status, amount } = req.body;

    if (!pidx || !transaction_id) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    // Verify webhook signature
    const signature = req.headers["khalti-signature"] as string;
    if (signature) {
      const expectedSignature = crypto
        .createHmac("sha256", KHALTI_SECRET)
        .update(JSON.stringify(req.body))
        .digest("hex");

      if (signature !== expectedSignature) {
        return res.status(401).json({ success: false, message: "Invalid signature" });
      }
    }

    if (status !== "Completed") {
      return res.json({ success: true, message: "Payment not completed" });
    }

    const payment = await getPaymentByPidx(pidx);

    if (payment) {
      await updatePaymentStatus(payment.id, "completed", transaction_id, {
        khaltiWebhook: req.body,
        pidx,
      });

      await fulfilPayment(payment as StoredPayment);
    } else {
      console.error(`[Webhook] Khalti payment ${pidx} not found in the ledger`);
    }

    return res.json({ success: true, message: "Payment confirmed" });
  } catch (error) {
    console.error("Khalti webhook error:", error);
    return res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
});

/**
 * Khalti Verification Endpoint
 * Called by frontend to verify payment after redirect
 */
router.post("/khalti/verify", async (req: Request, res: Response) => {
  try {
    const { pidx, transactionId, amount } = req.body;

    const verification = await verifyKhaltiPayment(
      {
        publicKey: process.env.KHALTI_PUBLIC_KEY || "test_public_key",
        secretKey: KHALTI_SECRET,
        isProduction: process.env.NODE_ENV === "production",
      },
      { pidx, transactionId: transactionId ?? pidx, amount }
    );

    if (!verification.success) {
      return res.status(400).json({ success: false, message: "Payment verification failed" });
    }

    const payment = await getPaymentByPidx(pidx);

    if (payment) {
      await updatePaymentStatus(
        payment.id,
        "completed",
        verification.transactionId ?? transactionId,
        { khaltiVerification: verification, pidx }
      );

      await fulfilPayment(payment as StoredPayment);
    } else {
      console.error(`[Webhook] Khalti payment ${pidx} not found in the ledger`);
    }

    return res.json({ success: true, verification });
  } catch (error) {
    console.error("Khalti verification error:", error);
    return res.status(500).json({ success: false, message: "Verification failed" });
  }
});

export default router;
