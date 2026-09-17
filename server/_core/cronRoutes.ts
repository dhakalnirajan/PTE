/**
 * Cron Routes
 *
 * Scheduled jobs exposed as authenticated HTTP endpoints so Vercel Cron can
 * trigger them. Auth: either the Vercel Cron header (`x-vercel-cron`, only sent
 * by Vercel's own scheduler) or a shared bearer token (`Authorization: Bearer
 * {CRON_SECRET}`) set in the environment.
 *
 * Routes:
 *   POST /api/cron/subscriptions — renewal reminders + auto-renewal/expiry
 */

import { Router, Request, Response } from "express";
import { runSubscriptionLifecycle } from "../jobs/subscriptionJobs";

const router = Router();

function authorize(req: Request): boolean {
  // Vercel Cron always sends this header on scheduled invocations.
  if (req.headers["x-vercel-cron"]) return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.authorization ?? "";
  return header === `Bearer ${secret}`;
}

router.post("/subscriptions", async (req: Request, res: Response) => {
  if (!authorize(req)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  try {
    const summary = await runSubscriptionLifecycle();
    return res.json({ success: true, summary, ranAt: new Date().toISOString() });
  } catch (error) {
    console.error("[Cron] Subscription lifecycle failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Subscription lifecycle job failed" });
  }
});

export default router;
