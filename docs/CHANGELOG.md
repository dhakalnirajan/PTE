# Changelog

Changes recorded while making every create/read/update/delete path in the
codebase real and working. Nothing here removes or alters a working feature —
each entry either replaces a placeholder with a real implementation or deletes a
duplicate that had no callers.

## 2026-09-16 — Functional CRUD completion

### Payments: the lifecycle now actually completes

Before: payments were recorded, but nothing ever granted the subscription the
user paid for. The webhook router existed but was never mounted, the gateway
redirect targets (`/payment/esewa/success`, `/payment/khalti/callback`) were not
routes, the client never called the verification procedures, the Khalti plan was
hardcoded to plan 2, and the eSewa amount was hardcoded to 1000 NPR.

- `server/payment/fulfilment.ts` (new) — one code path for "the payment
  succeeded": resolve the plan, create the subscription, link the payment to it,
  email the receipt. Idempotent, so duplicate webhook deliveries cannot create
  two subscriptions.
- `server/_core/app.ts` — mounts the gateway webhook router at
  `/api/webhooks/payment` (both entry points use `createApp()`, so the Vercel
  function and the Node server now serve them).
- `server/webhooks/paymentWebhook.ts` — rewritten to use the shared fulfilment
  module; resolves the eSewa payment by `pid` → `transaction_uuid` → `refId`
  instead of by a transaction code that never matched our reference id; resolves
  Khalti payments by the stored `pidx`; the hardcoded `planId: 2` is gone.
- `server/routers/paymentRouter.ts` — the initiate procedures store `planId` (and
  product code) in payment metadata and return the real `payments.id`; the Khalti
  `pidx` is persisted on the row (`setPaymentPidx`); both verify procedures find
  the ledger row by ownership-checked reference, mark it completed, and fulfil it
  (so a payment that comes back only through the browser redirect still grants
  access); `cancelSubscription` sends the cancellation email.
- `server/payment/esewa.ts` — verification result now carries
  `transactionUuid` (the `pid` we sent), which is what identifies the payment.
- `server/payment/db.ts` — `setPaymentPidx`, `getPaymentByPidx`,
  `attachPaymentToSubscription`, and `metadata` support on `createPayment`.
- `client/src/pages/PaymentReturn.tsx` (new) + routes
  `/payment/esewa/success`, `/payment/esewa/failure`, `/payment/khalti/callback`
  — verifies the returned transaction, refreshes payment/subscription queries,
  and reports success or failure with a link back to the subscription page.

### Subscription management for users

- `client/src/pages/PaymentHistory.tsx` (`/payments`) rebuilt as a real
  subscription-management + billing page: current plan and billing period, usage
  this period, upgrade/downgrade, cancel, reactivate, auto-renew toggle,
  subscription history, payment history with receipt download.
- New `payment` procedures backing it: `getSubscriptionHistory`,
  `setAutoRenew`, `changePlan`, `reactivateSubscription` (all ownership-checked;
  `changePlan` rejects a no-op switch and starts a fresh period).
- Fixed the eSewa checkout amount to come from the selected plan instead of a
  hardcoded 1000.

### Transactional email is no longer a stub

- `server/email/emailService.ts` — `sendEmail` posts to the Resend HTTP API
  (`https://api.resend.com/emails`) with `RESEND_API_KEY` over `fetch`, and
  returns the real `id`. With no key configured it logs the skip and returns
  `{ success: false, error: "email_not_configured" }` rather than a fabricated
  message id. Added `isEmailConfigured()` and a `SENDER_NAME` override.
- Wired the templates that previously had no callers: payment receipt + welcome
  mail on fulfilment, cancellation mail on cancel. Renewal reminders still have
  no scheduler (see Open items).

### Admin panel: real CRUD everywhere

- `drizzle/schema.ts` + `drizzle/0004_admin_crud.sql` — `users.isBanned`,
  `bannedAt`, `banReason`; `system_config` table.
- `drizzle/schema.ts` + `drizzle/0005_system_ops.sql` — `system_backups`,
  `system_alerts`, `api_keys`.
- `server/admin/adminDb.ts` — real `setUserRole`, `setUserBan`/`toggleUserBan`
  (persisting ban state), `getPlatformUsers(page + search)`,
  `getQuestionCountsBySection`, `getSystemConfigEntries`, `upsertSystemConfig`,
  plus system ops: `getTableRowCounts`, `createBackup` (captures a real row-count
  snapshot), `getBackups`, `deleteBackup`, `getSystemAlerts` (derived from live
  signals, reconciled into the table), `acknowledgeAlert`, `reopenAlert`,
  `createApiKey`/`listApiKeys`/`rotateApiKey`/`revokeApiKey`/`deleteApiKey`
  (sha256-hashed secrets, plaintext returned once), and `getPerformanceMetrics`
  (measured DB latency, 24 h activity, payment-failure rate, heap, uptime).
- `server/routers/systemAdminRouter.ts` — the mock procedures are replaced:
  `triggerBackup`/`getBackupHistory`/`deleteBackup`,
  `getApiKeys`/`createApiKey`/`rotateApiKey`/`revokeApiKey`/`deleteApiKey`,
  `getSystemAlerts`/`acknowledgeAlert`/`reopenAlert`, `getPerformanceMetrics`.
  `getSystemHealth` reports real credential checks; `getSystemStats` returns
  `activeUsers` (signed in ≤30 days), `pendingPayments`, `failedPayments7d` and
  `responsesScored` instead of fabricated zeros.
- Removed `analyticsDb.getSystemHealthMetrics` — it returned hardcoded
  uptime/error-rate/CPU figures from a monitoring service that does not exist,
  and `getSystemHealth` + `getPerformanceMetrics` cover it.
- `client/src/pages/SystemAdminPanel.tsx` — Users tab uses the real `getUsers`
  query (the search box and refresh button do something now), Alerts tab renders
  derived alerts with acknowledge/reopen, Health tab shows a live-metrics card.
- `client/src/components/AdminUserManagement.tsx` — rewritten against
  `getUsers`, `setUserBan`, `setUserRole` (the buttons call the API).
- `client/src/pages/AdminUsersPage.tsx`, `AdminPaymentsPage.tsx` — were reading
  `getActivityLogs` and rendering fields that did not exist; now use `getUsers`
  and `getRecentPayments`.
- `client/src/pages/AdminDashboard.tsx` — rebuilt on real stats, revenue by
  gateway, subscription breakdown and recent payments.
- `client/src/pages/AdminDashboardPage.tsx` — dropped the always-zero
  `systemErrors`/`apiCalls` tiles for real failed/pending payment and
  answers-scored figures.

### Duplicates, dead links and mocks removed

- Deleted the mock `client/src/components/AdminAnalytics.tsx` and promoted
  `AdminAnalyticsReal.tsx` → `AdminAnalytics.tsx`; `AdminDashboard` imports the
  live component. One analytics component remains.
- Deleted the duplicate `client/src/pages/AdminDashboardPage.tsx`: `/admin` and
  `/admin/dashboard` now render the same `AdminDashboard`, whose Overview tab
  gained a live System Health card so nothing the old page showed was lost.
- Fixed dead admin navigation: `/admin/analytics` now renders the new
  `AdminAnalyticsPage`, and the settings item points at the real `/system-admin`
  page (both menu items used to 404).

### Documentation

- Updated `API.md`, `SERVER.md`, `DATABASE.md`, `CLIENT.md`, `FEATURES.md`,
  `ENV.md`, `README.md` and `todo.md` to match the code above.

## 2026-09-16 (later) — Subscription lifecycle scheduler + fulfilment tests

### Scheduled job for auto-renewal and renewal reminders (closes the no-scheduler gap)

- `server/jobs/subscriptionJobs.ts` (new):
  - **Renewal reminders** — emails users whose active subscription ends within
    3 days, using the existing `sendSubscriptionRenewalReminder` template.
    Idempotent per period: `subscriptions.reminderSentAt` is claimed
    (null-guarded update) *before* sending, so concurrent runs or a crash
    mid-send cannot spam a user; the flag is cleared when a new period starts.
  - **Auto-renewal / expiry** — when a period ends, `autoRenew: true`
    subscriptions roll forward (`startDate`/`endDate`/`renewalDate` updated,
    reminder flag reset) and a `pending` renewal payment is written to the
    ledger for reconciliation; `autoRenew: false` subscriptions become
    `expired`. Note: eSewa/Khalti do not support off-session charging, so the
    pending ledger row marks what still needs collecting — the subscription
    stays active meanwhile.
- `server/_core/cronRoutes.ts` (new) — `POST /api/cron/subscriptions`, secured
  by either the Vercel Cron header (`x-vercel-cron`) or
  `Authorization: Bearer {CRON_SECRET}`. Mounted from `server/_core/app.ts`, so
  both entry points serve it.
- `vercel.json` — `crons` entry runs the job every 6 hours
  (`0 */6 * * *`). On the long-running Node server (`server/_core/index.ts`) an
  unref'd 6-hour interval runs the same job.
- `drizzle/schema.ts` + `drizzle/0006_subscription_cron.sql` — new
  `subscriptions.reminderSentAt` timestamptz column.
- New env var: `CRON_SECRET` (bearer token for manual/local cron invocation).

### Fulfilment unit tests (18 new)

- `server/payment/fulfilment.test.ts` — covers:
  - **Plan resolution**: metadata-first, product-code fallback (argument and
    `metadata.productCode`), case-insensitive matching, null metadata, and
    null/non-positive/unparseable ids.
  - **Idempotency**: a payment already linked to a subscription gets no second
    subscription and no payment re-linking; repeat deliveries cannot create
    subscription churn.
  - **No-plan failure path**: returns `null` and creates nothing when no plan
    resolves or the plan id doesn't exist — no subscription, no link, no emails.
  - **Resilience**: failed/missing email never blocks access being granted.

Test totals: **102 tests** (was 84), 5 files, 0 TypeScript errors.

## 2026-09-16 (latest) — First-time walkthrough tour

### Interactive onboarding tour for the Dashboard

- `client/src/components/WalkthroughTour.tsx` (new) — a reusable, target-anchored
  guided tour engine:
  - Steps target DOM elements via `data-tour="..."` attributes. The backdrop is
    a dimming layer with a clip-path spotlight cutout around the active target,
    plus a highlight ring. Pointer events pass through the spotlight so the user
    can still interact with the highlighted element.
  - Context-aware positioning: each step declares a preferred side; placement
    falls back through top/bottom/right/left based on viewport space and clamps
    to the viewport with an arrow that tracks the target. If a target is not
    mounted (behind conditional rendering), a centered fallback card is shown.
  - Before measuring, the target is scrolled into view (smooth, unless
    `prefers-reduced-motion`, which also disables the entrance animations).
  - Interactive steps: a step may declare `advanceOn: "<selector>"`; clicking
    that element performs its real action and then auto-advances the tour
    (used for the "set a daily target" step).
  - Accessibility: `role="dialog"` with labelled/described-by ids, Escape
    dismisses, ArrowRight/ArrowLeft navigate, Tab is trapped inside the
    popover, focus moves to the primary button on step change, visible
    `:focus-visible` rings throughout, and a Skip control plus backdrop click
    exit are available on every step. No dead ends.
  - Progress: "Step N of M" label plus dot indicators; controls are Back,
    Next, and a primary Finish ("Start Practicing") on the last step.
  - Persistence: completion stored in localStorage
    (`pte.tour.dashboard.completed`), so the tour auto-starts once per user.
  - Dashboard: six steps wired to real elements (target banner, practice nav
    item, study stats, today's target with the interactive CTA, quick
    practice, study tools) and mounted inside the authenticated Dashboard.
  - Profile: "Replay Dashboard Tour" button resets the stored flag and returns
    to `/dashboard` for manual relaunch.

## Open items (deliberately not changed here)

- **Live gateway verification.** eSewa/Khalti flows are wired correctly, but
  confirming them needs sandbox/live credentials (`ESEWA_MERCHANT_CODE`,
  `KHALTI_PUBLIC_KEY`, `KHALTI_SECRET_KEY`) and a public URL for callbacks.
- **Automatic collection of renewal payments.** The scheduler rolls periods and
  records pending renewal payments, but eSewa/Khalti cannot charge off-session;
  collecting those requires the user to pay again (or a gateway mandate
  feature). The ledger rows are the reconciliation hook.
- **`RESEND_API_KEY` + a verified sending domain** are required before receipts
  and reminders actually leave the system.
- Admin plan-management UI and admin-panel integration tests remain.
- User-data isolation audit (per-user `WHERE` clauses, SRS/session isolation,
  audio upload namespacing) is still outstanding.
