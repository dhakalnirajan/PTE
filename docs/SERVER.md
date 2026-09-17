# Server Internals

All paths relative to repo root. Server TS lives in `server/`, plus the
Vercel entry `api/index.ts`. 47 TS files total.

## Entry Points

### `server/_core/index.ts` — Node entry
- `isPortAvailable(port)` — net server probe.
- `findAvailablePort(startPort=3000)` — scans 3000–3019.
- `startServer()` — `createServer(app)`; `NODE_ENV=development` →
  `setupVite(app, server)`, else `serveStatic(app)`; listens on `PORT`
  (default 3000). SPA fallback to `index.html`.

### `api/index.ts` — Vercel serverless entry
- Loads `dotenv/config`, `createApp()` wrapped by `serverless-http` →
  default export `vercelHandler(req, res)`.

## Core Infrastructure (`server/_core/`)

### `trpc.ts`
- `router` = `initTRPC.context<TrpcContext>().create({ transformer: superjson })`.
- `publicProcedure`, `protectedProcedure` (requires `ctx.user`, throws
  `UNAUTHORIZED` / `UNAUTHED_ERR_MSG` "Please login (10001)"),
  `adminProcedure` (role !== admin → `FORBIDDEN` /
  `NOT_ADMIN_ERR_MSG` "You do not have required permission (10002)").

### `context.ts`
- `TrpcContext = { req, res, user: User | null }`.
- `createContext(opts)` → `sdk.authenticateRequest(req)`; auth failure →
  `user = null` (public routes still work).

### `env.ts`
Single `ENV` object (see ENV.md for full table). Reads headers
`VITE_APP_ID` (default `pte-practice`), `JWT_SECRET`, `DATABASE_URL`,
`OWNER_OPEN_ID`, `SUPABASE_*`, `OPENAI_*`, `GOOGLE_MAPS_API_KEY`, and the
queue `NODE_ENV`.

### `sdk.ts` — SessionService (JWT cookie auth)
- `SessionPayload = { openId, appId, name }`.
- `createSessionToken(openId, { expiresInMs = ONE_YEAR_MS, name })` — jose
  `SignJWT` HS256 with `JWT_SECRET`.
- `verifySession(cookieValue)` — `jwtVerify` HS256, requires non-empty
  openId/appId/name.
- `authenticateRequest(req)` — parse `cookie` header
  (`COOKIE_NAME = "app_session_id"`), verify, `getUserByOpenId` /
  `upsertUser` (load-or-create), refresh `lastSignedIn`. Throws
  `ForbiddenError("Invalid session cookie")` on bad token.

### `cookies.ts`
- `getSessionCookieOptions(req)` → `{ httpOnly: true, path: "/",
  sameSite: "lax", secure }`. `secure` when `req.protocol === "https"` or
  `x-forwarded-proto` contains https.

### `authRoutes.ts`
- `POST /api/auth/session` — body `{ access_token }` →
  `verifySupabaseAccessToken` → `mapSupabaseUserToProfile` →
  `db.upsertUser` → `sdk.createSessionToken` → set cookie
  `app_session_id` (maxAge `ONE_YEAR_MS`).
- `GET /api/oauth/callback` — legacy redirect → `/login` (302).

### `supabase.ts`
- `getSupabaseAdmin()` — lazy singleton, needs `SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`, `persistSession: false`.
- `verifySupabaseAccessToken(accessToken)` — `supabase.auth.getUser`.
- `mapSupabaseUserToProfile(user)` →
  `{ openId: user.id, email, name (full_name → name → email prefix),
  loginMethod (app_metadata.provider → identities[0].provider → "email") }`.

### `app.ts` — `createApp(): Express`
- `express.json({ limit: "10mb" })`, `urlencoded({ limit: "10mb" })`,
  `disable("x-powered-by")`.
- Registers auth routes.
- `POST /api/upload-audio` — `express.raw({ type: "audio/*", limit: "10mb" })`,
  requires valid session (401 otherwise),
  `storagePut("audio/user-{userId}/{nanoid()}.webm", buffer, "audio/webm")` →
  `{ url, key }`.
- Mounts tRPC (`createExpressMiddleware({ router: appRouter, createContext })`)
  at `/api/trpc`.

### `llm.ts` — OpenAI chat-completions wrapper
- Types for roles/content parts/tools/response formats
  (`text`, `json_object`, `json_schema`).
- `invokeLLM(params)` — `POST {ENV.openaiApiUrl}` Bearer `OPENAI_API_KEY`,
  model `ENV.openaiModel` (`gpt-4o-mini`), `max_tokens: 4096`. Throws on
  non-OK.

### `voiceTranscription.ts` — Whisper wrapper
- `transcribeAudio({ audioUrl, language?, prompt? })` — fetch audio (16 MB
  cap) → FormData → `https://api.openai.com/v1/audio/transcriptions`, model
  `whisper-1`, `response_format = verbose_json`. Returns
  `TranscriptionResponse` (verbose_json shape) or `TranscriptionError`
  (codes: `FILE_TOO_LARGE`, `INVALID_FORMAT`, `TRANSCRIPTION_FAILED`,
  `UPLOAD_FAILED`, `SERVICE_ERROR`).
- Helpers: `getFileExtension(mime)`, `getLanguageName(code)`.

### `vite.ts`
- `setupVite(app, server)` — Vite middleware mode, transforms
  `client/index.html`, cache-busts `src/main.tsx` with `nanoid()`.
- `serveStatic(app)` — serves `dist/public`, SPA fallback.

### `systemRouter.ts` (tRPC)
- `system.health` — public query, `{ timestamp ≥ 0 }` → `{ ok: true }`.
- `system.notifyOwner` — admin mutation, `{ title, content }` →
  `{ success: delivered }` (via `notification.ts` webhook).

### Unused `_core` files
- `imageGeneration.ts` — DALL-E 3 (`generateImage` → b64 → storage `generated/`).
- `map.ts` — Google Maps REST client (types for directions/distance/geocoding/
  places/elevation/timezone/roads).
- `dataApi.ts` — `callDataApi` stub that always throws "not configured".

## Root Router (`server/routers.ts`)

```ts
appRouter = router({
  system, auth, questions, sessions, responses, analytics, profile,
  aiCoach, srs, aiScoring, payment, systemAdmin,
})
```

- `auth.me` — public query → `ctx.user` (null if logged out).
- `auth.logout` — public mutation → `res.clearCookie(COOKIE_NAME,
  { ...opts, maxAge: -1 })` → `{ success: true }`.

## Routers detail

### questions (all public)
- `questions.list` — `{ section? 4-enum, taskType?, difficulty? 3-enum,
  limit 1..200 }` → `getQuestions`.
- `questions.getById` — `{ id }` → 404 if missing.
- `questions.count` → `getQuestionsCount`.

### sessions (protected)
- `sessions.create` — `{ sessionType 5-enum, section?, mode 4-enum default
  "exam", totalQuestions }` → `{ id }`.
- `sessions.getById` — ownership-checked.
- `sessions.complete` — recompute averages (speaking/writing/overall from
  `normalizedScore`, enabling skills via `normalizeToPTE`), update session,
  `generateDiagnosticFeedback` (target 65), write weakSkills/strongSkills/
  actionPlan, create milestone if overall ≥65.
- `sessions.getReport` — rebuild enabling skills incl. reading/listening,
  returns responses joined with question.
- `sessions.myHistory` — `{ limit = 20 }` → completed sessions.
- `sessions.getResponses` — `{ sessionId }`.

### responses (protected)
- `responses.submit` — `{ sessionId, questionId, responseText?, audioUrl?,
  selectedOptions?, timeTaken? }`:
  - writing → `scoreWritingTask` (legacy) → persist content/form/language/
    total/normalized/feedback/strengths/improvements/grammarErrors/
    vocabularyFeedback.
  - speaking → `transcribeAudio` (fallback `responseText`) →
    `scoreSpeakingTask` (legacy).
  - reading/listening → `scoreObjectiveTask`.
  - returns `{ responseId, ...scoreData, transcription }`.
- `responses.transcribeAudio` — `{ audioUrl }` → `{ transcription }`.

### analytics (protected)
- `analytics.myStats` → `getUserAnalytics` (last 50 completed, avg score).
- `analytics.todayTarget` → `getTodayTarget`.
- `analytics.milestones` → `getUserMilestones`.
- `analytics.generateTarget` — `{ targetMinutes = 30, focusSkills? }` →
  `upsertPracticeTarget` (recommendedTasks hardcoded to 3).

### profile (protected)
- `profile.update` — `{ targetScore 10..90?, currentLevel 3-enum?,
  dailyGoalMinutes 5..240?, notificationsEnabled? }` → `updateUserProfile`.

### aiCoach (protected) — from `server/aiCoach.ts`
- `aiCoach.getTaskFeedback` — `{ responseId }` → `generateTaskFeedback`.
- `aiCoach.getCoachingPlan` — `{ targetScore 10..90 default 65 }` from last 20
  sessions.
- `aiCoach.getMicroFeedback` — `{ taskType, errorType, studentExample,
  correctExample? }`.
- `aiCoach.getModelAnswer` — `{ questionId, taskType }` → LLM model answer at
  band 90 with annotations.

### srs (protected, SM-2)
- `srs.getDueCards` — `{ limit = 20 }` (+ interval previews).
- `srs.getUpcomingCards` — `{ limit = 10 }`.
- `srs.getStats` → due today / reviewed today / total / retention / byState /
  14-day review logs.
- `srs.recordReview` — `{ cardId, rating 1..5, responseText?, normalizedScore? }`
  → `computeSm2` → update + log → `{ nextInterval, nextDueDate, ratingLabel,
  newState }`.
- `srs.addCard` — `{ questionId, sourceResponseId?, lastScore? }`.
- `srs.autoCreateFromSession` — `{ sessionId }`.
- `srs.resetCard` — `{ cardId }` → state "new", EF 2.5, interval 1.

### `server/routers/aiScoringRouter.ts` (protected, new engines)
- `aiScoring.scoreSpeak` — `{ responseId, audioUrl?, transcription? }` →
  auto-transcribe if needed → `scoreSpeakingTask` (ai) → persist
  normalizedScore, totalScore, pronunciation/fluencyScore (±traits/5),
  feedback, strengths, improvements, pronunciationFeedback, fluencyFeedback →
  `SpeakingScoreResult`.
- `aiScoring.scoreWrite` — `{ responseId, responseText? }` → persist.
- `aiScoring.scoreRead` — `{ responseId, selectedOptions?, orderedItems?,
  filledBlanks? }` (builds blanks) → persist.
- `aiScoring.scoreListen` — `{ responseId, responseText?, selectedOptions?,
  filledBlanks? }` → persist.
- `aiScoring.getScore` — `{ responseId }` → read-only breakdown.

### `server/routers/paymentRouter.ts` (protected + public)
- `payment.getPlans` — public → `getSubscriptionPlans`.
- `payment.initiateESewaPayment` — `{ planId, productName,
  productDescription }`; refId `PTE{userId}{ts}`; amount = the plan's own
  `price`; productCode `PLAN{planId}`; the plan id + product code are stored in
  the payment row's `metadata`; returns `{ paymentId, paymentUrl, referenceId }`
  where `paymentId` is the real `payments` row id.
- `payment.verifyESewaPayment` — `{ transactionCode (q), referenceId? }`;
  verifies with eSewa, finds the ledger row by `referenceId` →
  `verification.transactionUuid` → `transactionCode` (ownership-checked),
  marks it completed and calls `fulfilPayment` (subscription + receipt email).
- `payment.initiateKhaltiPayment` — `{ planId, productName,
  productDescription, amount, customerEmail, customerPhone }`; refId
  `KHL{userId}{ts}`; amount = plan price; paisa conversion; the returned `pidx`
  is persisted on the payment row (`setPaymentPidx`) so the redirect and webhook
  can find it; returns `{ paymentId, pidx, paymentUrl, referenceId }`.
- `payment.verifyKhaltiPayment` — `{ pidx, transactionId?, amount }`; looks the
  payment up by `pidx` (falling back to `referenceId`), marks it completed and
  fulfils it.
- `payment.getPaymentHistory` — `getUserPayments(uid, 20)`.
- `payment.getActiveSubscription` — `getSubscriptionWithPlan(...)`.
- `payment.getSubscriptionHistory` — every subscription for the user, each
  joined with its plan.
- `payment.setAutoRenew` — `{ subscriptionId, autoRenew }` (ownership-checked,
  active subscriptions only).
- `payment.changePlan` — `{ subscriptionId, planId }`; rejects the current plan,
  starts a fresh monthly/yearly period, clears `canceledAt`.
- `payment.reactivateSubscription` — `{ subscriptionId }`; sets `status active`,
  clears `canceledAt`, rolls the period forward.
- `payment.cancelSubscription` — `{ subscriptionId }` (ownership check →
  403) and emails the cancellation confirmation.

### `server/routers/systemAdminRouter.ts` (admin-only)

Health/stats/content/logs/users/config/backup/api-keys/alerts/performance plus
engagement/learning/revenue/LTV/churn-retention. Every procedure reads or writes
the database through `server/admin/adminDb.ts` + `analyticsDb.ts`; none return
canned data.

- `getSystemHealth` — probes the DB and reports which integrations have
  credentials (`isEmailConfigured()` for Resend, env checks for the gateways,
  LLM, storage).
- `getSystemStats` — `totalUsers`, `activeUsers` (signed in ≤30d),
  `totalSessions`, `totalRevenue`, `activeSubscriptions`, `failedPayments`,
  `failedPayments7d`, `pendingPayments`, `responsesScored`.
- `getUsers` / `setUserRole` / `setUserBan` / `toggleUserBan` — real user CRUD
  with self-ban and self-demotion guards.
- `getSystemConfig` / `updateSystemConfig` — real `system_config` upserts.
- `triggerBackup` / `getBackupHistory` / `deleteBackup` — a backup captures a
  real row-count snapshot and persists size + duration.
- `getApiKeys` / `createApiKey` / `rotateApiKey` / `revokeApiKey` /
  `deleteApiKey` — sha256-hashed secrets; plaintext returned once at
  create/rotate, otherwise masked (`pte_xxxx••••••••abcd`).
- `getSystemAlerts` / `acknowledgeAlert` / `reopenAlert` — alerts derived from
  live signals (failed or stale-pending payments, subscriptions expiring in 3
days, banned accounts, unconfigured integrations), synced into `system_alerts`
  with acknowledgement state preserved.
- `getPerformanceMetrics` — measured DB latency (`select 1`), 24h active
  users/sessions/responses, 7-day payment-failure rate, heap used, process
  uptime, Node version.

## Storage (life build)
- `storagePut(relKey, data, contentType)` — Supabase storage upload bucket
  `SUPABASE_STORAGE_BUCKET` (default "audio"), `upsert: true`, returns
  `{ key, url }` from `getPublicUrl`.
- `storageGet(relKey)` → public URL.
- `normalizeKey` strips leading `/`.

## AI Section Engines (`server/ai/`)

Shared pattern: deterministic pre-scoring → LLM (`invokeLLM`, strict
`json_schema`) computes traits/feedback → merge fixed scores. All return
`overallScore` 10–90 + `cefrLevel` A1–C2.

### `speakingAI.ts`
- Deterministic: `normalizeText`, `tokenize`, `computeWordEditDistance`
  (Levenshtein → substitutions/deletions/insertions/`wer`),
  `computeRecallPercent`, `estimateWPM`, `detectRepetitions`.
- Result: `{ overallScore, traits { pronunciation 0-5, oralFluency 0-5,
  content, vocabulary 0-1 }, cefrLevel, overallFeedback, strengths,
  improvements, modelAnswer?, wordLevelFeedback?, errorAnalysis { wer ... } }`.
- Exports: `scoreReadAloud`, `scoreRepeatSentence`, `scoreDescribeImage`,
  `scoreRetellLecture`, `scoreAnswerShortQuestion`, `scoreRespondToSituation`,
  `scoreSummarizeGroupDiscussion`, `scoreSpeakingTask` (dispatcher, default
  read_aloud).

### `writingAI.ts`
- Deterministic: `countWords`, `countSentences`, `countParagraphs`,
  `isAllCaps`, `countSpellingErrors`, `detectTransitionWords`,
  `detectComplexSentences`.
- Gatekeeper: SWT — multi-sentence or word<5/>75 or ALLCAPS → Form=0 →
  **all scores forced 0**. Essay — word-range gatekeepers similar.
- Result: `{ overallScore, rawScore, maxRawScore, traits { content, form,
  grammar, vocabulary, spelling?, development?, linguisticRange? }, wordCount,
  cefrLevel, feedback..., grammarErrors?, vocabularyFeedback?, modelAnswer? }`.
- Exports: `scoreSummarizeWrittenText({ sourceText, response })`,
  `scoreWriteEssay({ prompt, response })`, `scoreWritingTask` (dispatcher).

### `readingAI.ts`
- Deterministic: `normalizeAnswer`, `answersMatch`, `computePTEScore`
  (`10 + raw/max*80`, clamp 10–90), `computeCEFR`,
  `computeAdjacentPairScore`.
- Result: `{ overallScore, rawScore, maxRawScore, correctAnswers,
  userAnswers, explanation?, cefrLevel, overallFeedback, strengths,
  improvements, strategyTips, blankAnalysis? }`.
- Exports: `scoreReadingFillBlanks`, `scoreMultipleChoiceSingle`,
  `scoreMultipleChoiceMultiple` (+1/−1 overlaps), `scoreReorderParagraphs`
  (adjacent pairs), `scoreReadingTask` (dispatcher).

### `listeningAI.ts`
- Deterministic: `normalizeWord`, `countWords`, `countSpellingErrors`,
  `computeWFDScore` (word match), `levenshteinDistance`.
- Exports: `scoreSummarizeSpokenText` (form gate: 40–100 words, punctuation,
  ALLCAPS/bullets → form 0), `scoreWriteFromDictation` (exact word match),
  `scoreHighlightCorrectSummary`, `scoreListeningFillBlanks`,
  `scoreListeningTask` (dispatcher: SST/WFD/HCS/FIB,
  `multiple_choice_single_listening`/`select_missing_word` binary 90/10,
  `multiple_choice_multiple_listening` +1/−1 min 0).

## Legacy Scoring (`server/scoring.ts`)

- `ScoringResult` — content/form/language 0–1, pronunciation/fluencyScore?,
  totalScore 0–100, normalizedScore 10–90, feedback, strengths,
  improvements, grammarErrors, vocabularyFeedback, grammarScore,
  vocabularyScore, spellingScore, writtenDiscourseScore, reasoning?,
  confidence?, bandDescriptor?.
- `PTE_BAND_DESCRIPTORS` — bands at 90 / 79–89 / 65–78 / 50–64 / 36–49 / 10–35.
- `normalizeToPTE(raw)` — `10 + clamp(raw,0,100)/100*80` (linear).
- `scoreWritingTask` — LLM few-shot (band 90/65/42) + chain-of-thought,
  `json_schema essay_score_v2` / `swt_score_v2`; form penalties (essay
  <150/>380 cap 30; 151–199/301–380 ×0.85; SWT multi-sentence cap 40, words
  <5/>75 cap 35). Errors → `getDefaultScore()`.
- `scoreSpeakingTask` — WPM estimate, few-shots, `speaking_score_v2`.
- `generateDiagnosticFeedback` — `diagnostic_feedback_v2` →
  `{ weakSkills, strongSkills, actionPlan }`.
- `scoreObjectiveTask` — deterministic partial credit: WFD word match,
  reorder adjacent pairs, highlight_incorrect_words TP−FP min 0,
  MC multiple hits−misses, else exact 100/0.
- `getDefaultScore()` fallback (50s, "temporarily unavailable").

## SM-2 Spaced Repetition (`server/sm2.ts`)

- `SrsRating = 1|2|3|4|5` (Again..Perfect), `CardState = new|learning|review|
  relearning`. Constants `MIN_EASE_FACTOR = 1.3`,
  `INITIAL_EASE_FACTOR = 2.5`.
- `computeSm2(input)`:
  - rating <3 (fail): lapse+1, repetitions=0, interval=1, EF −0.2 (min 1.3),
    state → learning/relearning.
  - pass: repetitions+1; `EF += 0.1 − (5−q)(0.08 + (5−q)0.02)`;
    interval: rep1=1, rep2=6, else `round(interval × EF)`; clamp 1..365;
    state learning if reps ≤2 else review.
- Helpers: `scoreToRating` (≥80→5, ≥65→4, ≥50→3, ≥35→2, else 1),
  `shouldCreateCard` (score <65), `calculateRetentionRate`,
  `getRatingLabel/Color`, `getIntervalPreviews`, `formatInterval`,
  `isCardDue`, `getUrgencyScore` (overdueDays + lapses×2).

## AI Coaching (`server/aiCoach.ts`)

- `generateTaskFeedback` — `json_schema task_feedback_v2`, 18 task-type
  coaching prompts in `TASK_COACHING_PROMPTS` (rubric + common errors).
- `generateCoachingPlan` — `coaching_plan_v2`, 4-week plan,
  estimatedWeeksToTarget = `max(4, ceil(gap/3))`.
- `generateMicroFeedback` — `micro_feedback_v2`.
- Fallbacks: `getDefaultFeedback`, `getDefaultCoachingPlan`.

## Payments (`server/payment/`)

- `esewa.ts` — `createESewaPaymentRequest` MD5-signs
  `amount+merchantCode+productCode+referenceId` with hardcoded test secret
  `"8gBm/:&EnhH.1/q"`; base `https://esewa.com.np/epay/main` (prod) /
  `https://uat.esewa.com.np/epay/main` (test). Params `amt, psc, pdc, txAmt,
  tAmt, pid, scd, su, fu, sign`. `verifyESewaPayment` → POST `/api/validate`,
  success when `data.status === "0"`.
- `khalti.ts` — initiate `/api/v2/epayment/initiate/` (test host
  `a.khalti.com`), header `Key {publicKey}`, merchant_username "PTEMaster";
  verify `/api/v2/epayment/lookup/`, header `Key {secretKey}`, success when
  `status === "Completed"`. Paisa helpers `nprToKhalti ×100`,
  `khaltiToNpr ÷100`.
- `db.ts` — payment table CRUD: `createPayment` (currency NPR, pending),
  `updatePaymentStatus` (sets completedAt on completed), plan CRUD,
  subscription create/cancel/lookup, `createSubscription` sets endDate +1mo/
  +1yr by plan interval, analytics (revenue, by gateway, active subs, by plan).

## Payment Fulfilment (`server/payment/fulfilment.ts`)

Single code path for "the payment succeeded", shared by the tRPC verification
procedures and the gateway webhooks so both behave identically:

- `resolvePlanId(payment, productCode?)` — reads `metadata.planId`, falling back
  to `PLAN{id}` in the product code.
- `readPidx(payment)` — the stored Khalti `pidx`.
- `fulfilPayment(payment, { productCode? })` — looks up the plan, creates the
  subscription, links the payment to it (`attachPaymentToSubscription`), and
  sends the receipt + welcome email. Idempotent: a payment already linked to a
  subscription is skipped, so repeated webhook deliveries are safe.

## Webhooks (`server/webhooks/paymentWebhook.ts`) — mounted

Mounted at `/api/webhooks/payment` from `server/_core/app.ts`, so both the
Vercel handler (`api/index.ts`) and the Node server (`server/_core/index.ts`)
serve it.

- `POST /esewa` — verifies with eSewa, resolves the payment by `pid` →
  `transactionUuid` → `refId`, marks it completed, fulfils it.
- `POST /khalti` — optional HMAC check (`khalti-signature`, sha256,
  `KHALTI_SECRET_KEY`), requires `status === "Completed"`, resolves by `pidx`,
  marks completed, fulfils.
- `POST /khalti/verify` — same, for the frontend redirect path.

## Email (`server/email/emailService.ts`)

- `sendEmail` POSTs to the Resend HTTP API (`https://api.resend.com/emails`)
  with `Authorization: Bearer {RESEND_API_KEY}` over `fetch`. With no API key it
  logs the skip and returns `{ success: false, error: "email_not_configured" }` —
  it never fabricates a message id.
- `isEmailConfigured()` is the same signal the admin health panel reports.
- `sendPaymentReceipt` (called from `fulfilPayment`), `sendWelcomeEmail` (same),
  `sendCancellationConfirmation` (called by `payment.cancelSubscription`), and
  `sendSubscriptionRenewalReminder` (called by the subscription lifecycle job) —
  branded HTML, sender `SENDER_NAME <SENDER_EMAIL>`.

## Subscription Lifecycle Jobs (`server/jobs/subscriptionJobs.ts`)

`runSubscriptionLifecycle()` performs one pass of:

- **Renewal reminders** — `sendRenewalReminders()` finds active subscriptions
  whose `endDate` falls within the next 3 days with `reminderSentAt` null. It
  claims each row first (null-guarded update of `reminderSentAt`), so concurrent
  runs or a crash mid-send cannot double-send, then emails via
  `sendSubscriptionRenewalReminder`. The flag is cleared whenever a new period
  starts.
- **Auto-renewal / expiry** — `processRenewalsAndExpiry()` handles active
  subscriptions whose `endDate` has passed:
  - `autoRenew: true` → `startDate = now`, `endDate`/`renewalDate` rolled forward
    one monthly/yearly period, `reminderSentAt` cleared, and a `pending`
    renewal payment (`referenceId: RENEW{subId}{ts}`, `metadata.kind:
    "auto_renewal"`) inserted for reconciliation. eSewa/Khalti cannot charge
    off-session, so the subscription stays active while the pending row marks
    what still needs collecting.
  - `autoRenew: false` → `status = "expired"`.

Trigger points:
- `POST /api/cron/subscriptions` (`server/_core/cronRoutes.ts`) — Vercel Cron
  header (`x-vercel-cron`) or `Authorization: Bearer {CRON_SECRET}`; scheduled
  every 6 hours via `vercel.json` `crons`.
- The long-running Node server (`server/_core/index.ts`) also runs the job on an
  unref'd 6-hour `setInterval`.

## Admin (`server/admin/`)

## Admin (`server/admin/`)

- `adminAuth.ts` — dead code (`isUserAdmin`, `getAdminUser`, promote/demote).
- `adminDb.ts` — `getSystemStatistics`, `getAdminUsers`, `getPlatformUsers(page
  + search)`, `setUserRole`, `setUserBan`, `toggleUserBan`,
  `getQuestionCountsBySection`, `getSystemConfigEntries`, `upsertSystemConfig`,
  `getUserSubscriptions`, `getPaymentTransactions`, `getRevenueByGateway`,
  `getUserActivityLogs`, `getUserGrowthStats`, `getSubscriptionStats`, plus the
  system-ops helpers: `getTableRowCounts`, `createBackup`, `getBackups`,
  `deleteBackup`, `getSystemAlerts`, `acknowledgeAlert`, `reopenAlert`,
  `createApiKey`, `listApiKeys`, `rotateApiKey`, `revokeApiKey`, `deleteApiKey`,
  `getPerformanceMetrics`.
- `analyticsDb.ts` — `getUserEngagementMetrics` (DAU, login frequency),
  `getLearningPerformanceMetrics` (avg scores, distribution, weak areas,
  improvement trends), `getPaymentRevenueMetrics` (MRR, by method, failed,
  daily), `getCustomerLifetimeValue` (top 100 + AVG),
  `getChurnRetentionMetrics`. (`getSystemHealthMetrics`, which returned
  hardcoded uptime/CPU figures, was removed — health lives in
  `getSystemHealth` and `getPerformanceMetrics`.)

## Notifications (`server/_core/notification.ts`)

- `notifyOwner({ title, content })` — validates lengths, POSTs to
  `OWNER_NOTIFICATION_WEBHOOK`; no-op if unset.