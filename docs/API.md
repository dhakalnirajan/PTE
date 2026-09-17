# API Reference

Transport: tRPC v11 over `POST /api/trpc` (superjson). Auth: `app_session_id`
cookie. Three procedure tiers: **public**, **protected** (valid session),
**admin** (role === "admin").

## Root Router Shape

```ts
appRouter = {
  system, auth, questions, sessions, responses, analytics, profile,
  aiCoach, srs, aiScoring, payment, systemAdmin,
}
```

## tRPC Routes

### system
| Procedure | Tier | Input → Output |
|---|---|---|
| `system.health` | public | `{ timestamp: number ≥ 0 }` → `{ ok: true }` |
| `system.notifyOwner` | admin | `{ title, content }` → `{ success: boolean }` |

### auth
| Procedure | Tier | Output |
|---|---|---|
| `auth.me` | public | `User \| null` |
| `auth.logout` | public | clears cookie → `{ success: true }` |

### questions
| Procedure | Tier | Input → Output |
|---|---|---|
| `questions.list` | public | `{ section?, taskType?, difficulty?, limit 1..200 }` → `Question[]` |
| `questions.getById` | public | `{ id }` → `Question` (404 if missing) |
| `questions.count` | public | → `number` |

### sessions
| Procedure | Tier | Input → Output |
|---|---|---|
| `sessions.create` | protected | `{ sessionType, section?, mode?, totalQuestions }` → `{ id }` |
| `sessions.getById` | protected | `{ id }` → `PracticeSession` (ownership-checked) |
| `sessions.complete` | protected | `{ id }` → recomputed session + diagnostic feedback + optional milestone |
| `sessions.getReport` | protected | `{ id }` → session + responses joined with questions + enabling skills |
| `sessions.myHistory` | protected | `{ limit = 20 }` → completed sessions |
| `sessions.getResponses` | protected | `{ sessionId }` → responses |

### responses
| Procedure | Tier | Input → Output |
|---|---|---|
| `responses.submit` | protected | `{ sessionId, questionId, responseText?, audioUrl?, selectedOptions?, timeTaken? }` → `{ responseId, ...score, transcription? }` (legacy scoring) |
| `responses.transcribeAudio` | protected | `{ audioUrl }` → `{ transcription }` |

### analytics
| Procedure | Tier | Input → Output |
|---|---|---|
| `analytics.myStats` | protected | → aggregate stats + enabling skills |
| `analytics.todayTarget` | protected | → today's practice target |
| `analytics.milestones` | protected | → milestones |
| `analytics.generateTarget` | protected | `{ targetMinutes = 30, focusSkills? }` → upserted target |

### profile
| Procedure | Tier | Input |
|---|---|---|
| `profile.update` | protected | `{ targetScore 10..90?, currentLevel?, dailyGoalMinutes 5..240?, notificationsEnabled? }` |

### aiCoach
| Procedure | Tier | Input → Output |
|---|---|---|
| `aiCoach.getTaskFeedback` | protected | `{ responseId }` → `TaskFeedback` |
| `aiCoach.getCoachingPlan` | protected | `{ targetScore = 65 }` → `PersonalizedCoachingPlan` |
| `aiCoach.getMicroFeedback` | protected | `{ taskType, errorType, studentExample, correctExample? }` |
| `aiCoach.getModelAnswer` | protected | `{ questionId, taskType }` → model answer (band 90) |

### srs
| Procedure | Tier | Input → Output |
|---|---|---|
| `srs.getDueCards` | protected | `{ limit = 20 }` → due cards + interval previews |
| `srs.getUpcomingCards` | protected | `{ limit = 10 }` |
| `srs.getStats` | protected | → totals/due/retention/byState/14d logs |
| `srs.recordReview` | protected | `{ cardId, rating 1..5, responseText?, normalizedScore? }` → `{ nextInterval, nextDueDate, ratingLabel, newState }` |
| `srs.addCard` | protected | `{ questionId, sourceResponseId?, lastScore? }` |
| `srs.autoCreateFromSession` | protected | `{ sessionId }` → auto-created cards (score < 65) |
| `srs.resetCard` | protected | `{ cardId }` → reset to new/2.5/1 |

### aiScoring (section engines)
| Procedure | Tier | Input |
|---|---|---|
| `aiScoring.scoreSpeak` | protected | `{ responseId, audioUrl?, transcription? }` → `SpeakingScoreResult` (persisted) |
| `aiScoring.scoreWrite` | protected | `{ responseId, responseText? }` → `WritingScoreResult` (persisted) |
| `aiScoring.scoreRead` | protected | `{ responseId, selectedOptions?, orderedItems?, filledBlanks? }` → `ReadingScoreResult` (persisted) |
| `aiScoring.scoreListen` | protected | `{ responseId, responseText?, selectedOptions?, filledBlanks? }` → `ListeningScoreResult` (persisted) |
| `aiScoring.getScore` | protected | `{ responseId }` → read-only breakdown |

### payment
| Procedure | Tier | Input → Output |
|---|---|---|
| `payment.getPlans` | public | → `SubscriptionPlan[]` |
| `payment.initiateESewaPayment` | protected | `{ planId, productName, productDescription }` → `{ paymentUrl, referenceId, paymentId }` (real payments row; `planId` + product code stored in metadata) |
| `payment.verifyESewaPayment` | protected | `{ transactionCode }` |
| `payment.initiateKhaltiPayment` | protected | `{ planId, productName, productDescription, amount, customerEmail, customerPhone }` → `{ pidx, paymentUrl, referenceId, paymentId }` |
| `payment.verifyKhaltiPayment` | protected | `{ pidx, transactionId, amount }` |
| `payment.getPaymentHistory` | protected | → user payments (20) |
| `payment.getActiveSubscription` | protected | → subscription + plan |
| `payment.getSubscriptionHistory` | protected | → every subscription for the user (active + past), each with its plan |
| `payment.setAutoRenew` | protected | `{ subscriptionId, autoRenew }` (ownership-checked, active only) |
| `payment.changePlan` | protected | `{ subscriptionId, planId }` → switches plan, starts a fresh monthly/yearly period |
| `payment.reactivateSubscription` | protected | `{ subscriptionId }` → clears `canceledAt`, sets a new period end |
| `payment.cancelSubscription` | protected | `{ subscriptionId }` (ownership-checked; emails the confirmation) |

### systemAdmin (admin only)

Every procedure below reads or writes the real database — none return canned
placeholder data.

| Procedure | Input → Output |
|---|---|
| `systemAdmin.getSystemHealth` | live database probe + integration credential check → `{ status, database, services[], configuredIntegrations }` |
| `systemAdmin.getSystemStats` | `{ totalUsers, activeUsers (signed in ≤30d), totalSessions, totalRevenue, activeSubscriptions, failedPayments, failedPayments7d, pendingPayments, responsesScored }` |
| `systemAdmin.getContentStats` | question bank size per section (`{ total, sections[] }`) |
| `systemAdmin.getActivityLogs` | `{ limit = 50, offset = 0, filter? }` → real session/response activity |
| `systemAdmin.getUsers` | `{ limit 1..200, offset, search? }` → `{ users[], total, hasMore }` (search on name/email) |
| `systemAdmin.toggleUserBan` | `{ userId, reason? }` → persists `isBanned`/`bannedAt`/`banReason` |
| `systemAdmin.setUserBan` | `{ userId, banned, reason? }` → explicit ban/unban (refuses self-ban) |
| `systemAdmin.setUserRole` | `{ userId, role: "user" \| "admin" }` → persists role (refuses self-demotion) |
| `systemAdmin.getRecentPayments` | `{ limit = 10, offset }` → payments joined with user |
| `systemAdmin.getSystemConfig` | → persisted `system_config` rows |
| `systemAdmin.updateSystemConfig` | `{ key, value }` → upsert into `system_config` |
| `systemAdmin.triggerBackup` | `{ notes? }` → captures a row-count snapshot, inserts a `system_backups` row, returns its size/duration |
| `systemAdmin.getBackupHistory` | → `system_backups` rows, newest first |
| `systemAdmin.deleteBackup` | `{ id }` → deletes the backup record |
| `systemAdmin.getApiKeys` | → `api_keys` rows, secrets masked (hash never returned) |
| `systemAdmin.createApiKey` | `{ name }` → new key; plaintext `secret` returned once |
| `systemAdmin.rotateApiKey` | `{ id }` → new secret, previous one invalidated (plaintext returned once) |
| `systemAdmin.revokeApiKey` | `{ id }` → `status = "revoked"`, keeps the audit row |
| `systemAdmin.deleteApiKey` | `{ id }` → permanently removes the key record |
| `systemAdmin.getUserEngagement` | `{ days = 30 }` |
| `systemAdmin.getLearningPerformance` | metrics |
| `systemAdmin.getPaymentRevenue` | metrics |
| `systemAdmin.getCustomerLTV` | LTV + top customers |
| `systemAdmin.getChurnRetention` | `{ days = 30 }` |
| `systemAdmin.getSystemAlerts` | alerts derived from real signals (failed/stale payments, expiring subscriptions, banned accounts, unconfigured integrations), synced into `system_alerts` |
| `systemAdmin.acknowledgeAlert` | `{ alertKey }` → persists acknowledgement |
| `systemAdmin.reopenAlert` | `{ alertKey }` → clears the acknowledgement |
| `systemAdmin.getPerformanceMetrics` | measured database latency, 24h active users/sessions/responses, 7d payment-failure rate, heap used, process uptime |

## REST Routes (non-tRPC)

| Route | Method | Auth | Behavior |
|---|---|---|---|
| `/api/auth/session` | POST | — | body `{ access_token }` → verifies Supabase token, upserts user, sets `app_session_id` cookie |
| `/api/oauth/callback` | GET | — | legacy 302 → `/login` |
| `/api/upload-audio` | POST | session required (401) | raw audio body (`audio/*`, ≤10 MB) → Supabase Storage `audio/user-{userId}/{nanoid()}.webm` → `{ url, key }` |
| `/api/webhooks/payment/esewa` | POST | gateway | eSewa callback → verifies, marks the payment completed, fulfils it (subscription + receipt). Mounted from `server/_core/app.ts`. |
| `/api/webhooks/payment/khalti` | POST | gateway (optional HMAC) | Khalti callback → same fulfilment path |
| `/api/webhooks/payment/khalti/verify` | POST | gateway | Khalti redirect verification → same fulfilment path |
| `/api/cron/subscriptions` | POST | `x-vercel-cron` header (Vercel Cron) or `Authorization: Bearer {CRON_SECRET}` (401 otherwise) | runs the subscription lifecycle job: renewal reminders (3-day window, idempotent per period) + auto-renewal/expiry → `{ success, summary: { remindersSent, remindersSkipped, renewed, expired, errors[] } }` |
| `/api/trpc` | POST | per-procedure | tRPC middleware |

## External API Calls (server-initiated)

- **OpenAI chat completions** — `POST {OPENAI_API_URL}` Bearer
  `OPENAI_API_KEY`, model `OPENAI_MODEL` (gpt-4o-mini), `max_tokens: 4096`.
- **OpenAI audio transcriptions** — `POST https://api.openai.com/v1/audio/transcriptions`,
  model `whisper-1`, `verbose_json`.
- **Supabase Auth** — `auth.getUser(accessToken)` (admin client).
- **Supabase Storage** — `storage.from(bucket).upload(key, data, { upsert: true })`
  + `getPublicUrl`.
- **eSewa** — `https://esewa.com.np/epay/main` (initiate, MD5 signature) /
  prod or `https://uat.esewa.com.np/epay/main` (test).
- **Khalti** — `POST /api/v2/epayment/initiate/` + `/api/v2/epayment/lookup/`
  (test host `a.khalti.com`, headers `Key {public/secretKey}`).
- **Owner webhook** — `POST {OWNER_NOTIFICATION_WEBHOOK}` (notification.ts).
- **Resend email** — `POST https://api.resend.com/emails` with `Authorization: Bearer {RESEND_API_KEY}`,
  `from` = `SENDER_NAME <SENDER_EMAIL>`. Used for payment receipts,
  subscription welcome mail, and cancellation confirmations. When
  `RESEND_API_KEY` is unset, `sendEmail` logs the skip and returns
  `{ success: false, error: "email_not_configured" }` instead of pretending to send.

## Error Convention

- tRPC: `UNAUTHED_ERR_MSG` = "Please login (10001)",
  `NOT_ADMIN_ERR_MSG` = "You do not have required permission (10002)".
- Client (main.tsx) hard-redirects to `/login` on `UNAUTHED_ERR_MSG`.
- HTTP helpers in `shared/_core/errors.ts`: `BadRequestError(400)`,
  `UnauthorizedError(401)`, `ForbiddenError(403)`, `NotFoundError(404)`.