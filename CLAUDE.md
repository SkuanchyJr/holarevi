# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (Express + Vite middleware) on port 5000, host `0.0.0.0`. Set via `cross-env NODE_ENV=development tsx server/index.ts`.
- `npm run build` — Production build via `script/build.ts`: Vite builds the client to `dist/public`, then esbuild bundles the server to `dist/index.cjs`. Only an allowlist of deps gets bundled into the server (see `script/build.ts`); everything else stays external.
- `npm run start` — Run the production bundle (`node dist/index.cjs`, `NODE_ENV=production`).
- `npm run check` — Type-check only (`tsc`, `noEmit: true`). There is no test runner configured.
- `npm run db:push` — Push the Drizzle schema in `shared/schema.ts` to the database defined by `DATABASE_URL`. No SQL migration files are generated; this is the canonical way to apply schema changes.

There is no lint script. There is no test script. Do not invent commands for them.

## High-level architecture

### Monorepo layout
- `client/` — React 18 + TypeScript SPA, Vite root (`vite.config.ts` sets `root: client/`).
- `server/` — Express + TypeScript (ESM, `tsx` in dev). Single process serves both the API and the client (Vite middleware in dev, static files from `dist/public` in production).
- `shared/` — Code imported by both sides. `shared/schema.ts` is the **single source of truth for the database** (Drizzle table defs + Zod insert schemas + exported types) and `shared/plans.ts` holds the plan/pricing matrix (including hardcoded Stripe price IDs).
- Path aliases (kept in sync between `tsconfig.json` and `vite.config.ts`): `@/*` → `client/src/*`, `@shared/*` → `shared/*`, `@assets/*` → `attached_assets/*`.

### Server boot order (`server/index.ts`)
The startup sequence has load-bearing ordering that is easy to break:
1. `helmet` middleware (CSP is **disabled in dev**, enabled in production with explicit allowances for Stripe JS and Google Fonts).
2. **Stripe webhook route `/api/stripe/webhook/:uuid` is registered BEFORE `express.json()`** — it needs the raw `Buffer` for signature verification. Do not move JSON parsing above it.
3. `express.json()` (with a `verify` hook that stashes `req.rawBody`), `urlencoded`, `cookieParser`.
4. Inline ad-hoc migrations run before routes: `fixOnboardingData()`, `addCheckoutRecoveryTable()` (see `server/migrations/`). These are idempotent JS scripts, not drizzle migrations — drizzle schema changes go through `db:push`.
5. `initStripe()` — runs `stripe-replit-sync` migrations, registers a managed webhook based on `REPLIT_DOMAINS`, and kicks off a backfill in the background.
6. `registerRoutes(app)` mounts everything.
7. In dev: dynamic-import `./vite` and attach Vite middleware **after** all API routes so its catch-all doesn't shadow them. In prod: `serveStatic(app)`.
8. Background cron jobs start last: `initReviewSyncJob`, `initWeeklyEmailScheduler`, `initCheckoutRecoveryScheduler` (all in `server/jobs/`).

### Routing & auth model

**Server.** `server/routes.ts` (~4400 lines) is a single large registry that owns most endpoints. Auxiliary sub-routers are mounted under it: `/api/onboarding` (`server/onboarding.ts`), `/api/alerts` (`server/alerts.ts`), and NFC shop routes via `registerNfcShopRoutes`. Three middlewares gate access:
- `isAuthenticated` (from `server/auth.ts`) — session-based, backed by `connect-pg-simple` against the `sessions` table.
- `isAdminAuthenticated` (defined inline in `routes.ts`) — separate admin session.
- Affiliate auth — separate flow, see `affiliateSessions` table and `server/affiliateDemo.ts` for the demo environment.

Auth supports both local email/password (bcrypt, 5 logins/min rate-limited) and Replit OpenID Connect / Google OAuth (`server/googleAuth.ts`). `server/auth.ts` also handles email verification tokens.

**Client.** Routing is **two-layered** in `client/src/App.tsx`:
1. All routes must be language-prefixed `/en/*` or `/es/*`. A top-level effect rewrites naked paths via `setLocation(..., { replace: true })`.
2. `LocalizedRouter` checks `subscriptionStatus` in this order: `pending` → forced redirect to `/select-plan`; expired trial or `canceled`/`past_due` → forced redirect to `/paywall`. Public routes are an explicit allowlist (`/`, `/auth`, `/blog/*`, `/contact`, `/select-plan`, `/pricing`, `/nfc*`, `/prelaunch`).
3. Prelaunch mode (`usePrelaunchGuard`) reads `/api/prelaunch-status` and redirects everything except admin routes and a short allowlist (`/prelaunch`, `/contact`, `/privacy`, `/terms`, `/google-permissions`, `/nfc`) to `/prelaunch`.

When adding new pages, register them in `App.tsx`, decide whether they belong in the public/auth/admin branch, and add them to the prelaunch allowlist if they should remain reachable when prelaunch is on.

### Database
- PostgreSQL accessed via Drizzle ORM with the **Neon serverless driver over WebSockets** (`server/db.ts` sets `neonConfig.webSocketConstructor = ws`). The deployed DB is Replit Helium, but the driver is Neon's.
- `shared/schema.ts` defines ~19 tables (users, restaurants, reviews, sessions, team_members, tone_presets, affiliates/leads/sales, promo_codes, review_summaries, blogs, review_qrs+events, restaurant_access, alerts, weekly_email_logs, app_config, page_views). All inserts go through Zod schemas generated by `drizzle-zod` and re-exported from the same file.
- Data-access layer is `server/storage.ts` (~1600 lines, implements the `IStorage` interface). Route handlers should call `storage.*` rather than building queries with Drizzle directly, except where a route already drops down to `db` for joins/aggregations.

### Stripe & plans
- `shared/plans.ts` is the canonical plan matrix (`local` / `pro` / `business` / `enterprise`), including **hardcoded `stripePriceIds` (monthly + yearly) per plan**. Changing prices means updating both Stripe and this file.
- Plan limits (locations, replies/month, team members, tone presets) are enforced server-side in `server/planHelpers.ts` (`canAddLocation`, `canSendReply`, etc.) and surfaced to the client via `/api/auth/user` and `/api/subscription`.
- Webhook handling lives in `server/webhookHandlers.ts`; the route is registered separately in `server/index.ts` (pre-JSON, see boot order). `stripe-replit-sync` keeps a mirror of Stripe objects in Postgres on startup.

### AI integration
- `server/openai.ts` uses **OpenAI GPT-5** (see the comment at the top — do not change the model unless the user explicitly asks). It exposes `generateReviewReply` and `analyzeReviewSummary` and lazy-loads the client so the app can boot without `OPENAI_API_KEY`.
- Custom tone presets (`tone_presets` table) are injected into prompts with high priority — e.g. a user-defined instruction like "always mention Instagram" overrides default tone behavior.

### i18n
- `react-i18next` with locale JSON in `client/src/locales/{en,es}.json`. The path detector in `client/src/lib/i18n.tsx` reads the language from the first URL segment, which is why the router enforces `/en` or `/es` prefixes.
- User-facing emails are also bilingual; the user's preferred email language is stored on `users.emailLanguage`.

### Background jobs (`server/jobs/`)
All cron schedules use `node-cron` with `Europe/Madrid` timezone:
- `reviewSync.ts` — periodic Google Business reviews pull for restaurants with `autoSyncReviews` enabled.
- `weeklyEmailScheduler.ts` — Friday 9:00 AM Europe/Madrid; AI-generated weekly analytics emails via `emailGenerator.ts` + `emailSender.ts` (SMTP via Gmail, `info@holarevi.com`). Admin trigger: `POST /admin/trigger-weekly-emails` with `x-admin-key` header.
- `checkoutRecoveryScheduler.ts` — abandoned-checkout follow-up emails (templates in `checkoutRecoveryTemplates.ts`).
- `nfcOrderEmail.ts`, `verificationEmail.ts`, `replyNotificationEmail.ts` — transactional senders.

### Replit-specific bits
- `.replit` defines the runtime (`npm run dev`), `autoscale` deployment target, and exposes only port 5000 externally (mapped to port 80).
- `vite.config.ts` enables `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-dev-banner` **only when `REPL_ID` is set** and `NODE_ENV !== "production"`. They are no-ops locally on Windows.
- Contact form submissions use `@replit/database` (key-value), with an in-memory mock fallback when `REPLIT_DB_URL` is unset (`server/routes.ts` top).

## Conventions worth following

- **Don't bypass `storage.ts` for simple CRUD.** Add a method there and call it from the route. Drop down to raw `db` queries only for joins, aggregations, or admin analytics where doing so is already the norm (`server/services/adminAnalytics.ts`).
- **Server-enforced plan limits are required**, even when the UI already gates the feature. Use the helpers in `server/planHelpers.ts` and return the documented error codes from `PLAN_ERROR_CODES`.
- **When adding a Stripe-affecting field**, update both `shared/plans.ts` (if it's plan-shaped) and `webhookHandlers.ts` (if a webhook needs to propagate it).
- **When adding a new public page**, add it to:
  1. The `App.tsx` `LocalizedRouter` public-route allowlist if it should be reachable without auth.
  2. The prelaunch allowlist in `usePrelaunchGuard` if it must work while prelaunch mode is on.
  3. The dynamic `/sitemap.xml` handler in `server/routes.ts` (around line 256) and `robots.txt` if it should be indexed.
- **Translations:** every user-facing string goes through `t(...)` and into both `en.json` and `es.json`. Add the key to both files in the same commit.
- **Design system:** follow `design_guidelines.md` for typography (Inter, specific text-size scale), spacing primitives (Tailwind units of 2/4/6/8), and component styling (Shadcn "New York", rounded-lg cards with `shadow-sm hover:shadow-md`). No marketing hero imagery inside the app shell.

## Reference docs in the repo
- `replit.md` — the authoritative product/architecture overview (features, security posture, external dependencies).
- `design_guidelines.md` — detailed UI/UX rules. Consult before adding screens.
