/**
 * checkoutRecoveryScheduler.ts — Abandoned-checkout email sequence automation
 *
 * Targets users who:
 *   - Created an account (emailVerified = true)
 *   - Are still on trial (subscriptionStatus = 'trial')
 *   - Have no active Stripe subscription (stripeSubscriptionId IS NULL)
 *   - Account is between 1 hour and 14 days old
 *
 * Sequence:
 *   Email 1 (+1h)  — Soft reminder
 *   Email 2 (+48h) — Value reminder
 *   Email 3 (+7d)  — Final recovery
 *
 * Cron: every 30 minutes
 * Admin endpoint: POST /admin/trigger-checkout-recovery
 */

import cron from "node-cron";
import type { Express, Request, Response } from "express";
import { db } from "../db";
import { users, checkoutRecoveryEmailLogs } from "@shared/schema";
import { eq, and, isNull, lte, gte, isNotNull } from "drizzle-orm";
import { sendEmail } from "./sendEmail";
import {
  buildEmail1,
  buildEmail2,
  buildEmail3,
} from "./checkoutRecoveryTemplates";

// ─── Timing thresholds ────────────────────────────────────────────────────────

const EMAIL_1_DELAY_MS  = 1  * 60 * 60 * 1000;  //  1 hour
const EMAIL_2_DELAY_MS  = 48 * 60 * 60 * 1000;  // 48 hours
const EMAIL_3_DELAY_MS  = 7  * 24 * 60 * 60 * 1000; // 7 days
const MAX_WINDOW_MS     = 14 * 24 * 60 * 60 * 1000; // stop after 14 days

// Closing date shown in Email 3: account is closed 3 days after Email 3 is sent
const EMAIL_3_CLOSE_DAYS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function timestamp(): string {
  return new Date().toISOString();
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

async function getSentEmailNumbers(userId: string): Promise<Set<number>> {
  const rows = await db
    .select({ emailNumber: checkoutRecoveryEmailLogs.emailNumber })
    .from(checkoutRecoveryEmailLogs)
    .where(
      and(
        eq(checkoutRecoveryEmailLogs.userId, userId),
        eq(checkoutRecoveryEmailLogs.status, "success")
      )
    );
  return new Set(rows.map((r) => r.emailNumber));
}

async function logResult(
  userId: string,
  emailNumber: number,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(checkoutRecoveryEmailLogs).values({
      userId,
      emailNumber,
      status,
      errorMessage: errorMessage ?? null,
    });
  } catch (err) {
    console.error(`[CheckoutRecovery] Failed to log email ${emailNumber} for user ${userId}:`, err);
  }
}

// ─── Candidate user query ─────────────────────────────────────────────────────

interface CandidateUser {
  id: string;
  email: string;
  firstName: string | null;
  createdAt: Date;
}

async function getCandidateUsers(): Promise<CandidateUser[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - MAX_WINDOW_MS);
  const windowEnd   = new Date(now.getTime() - EMAIL_1_DELAY_MS);

  // Users who: registered, verified email, never converted to paid, within window
  const rows = await db
    .select({
      id:        users.id,
      email:     users.email,
      firstName: users.firstName,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.email),
        eq(users.emailVerified, true),
        eq(users.subscriptionStatus, "trial"),
        isNull(users.stripeSubscriptionId),
        gte(users.createdAt, windowStart),
        lte(users.createdAt, windowEnd)
      )
    );

  return rows.filter((r): r is CandidateUser =>
    r.email !== null && r.createdAt !== null
  ) as CandidateUser[];
}

// ─── Per-user processing ──────────────────────────────────────────────────────

interface ProcessResult {
  userId: string;
  email: string;
  status: "sent" | "skipped" | "error";
  emailNumber?: number;
  reason?: string;
}

async function processUser(user: CandidateUser): Promise<ProcessResult> {
  const now = new Date();
  const ageMs = now.getTime() - user.createdAt.getTime();
  const sentEmails = await getSentEmailNumbers(user.id);

  let emailNumber: number | null = null;

  if (ageMs >= EMAIL_1_DELAY_MS && !sentEmails.has(1)) {
    emailNumber = 1;
  } else if (ageMs >= EMAIL_2_DELAY_MS && sentEmails.has(1) && !sentEmails.has(2)) {
    emailNumber = 2;
  } else if (ageMs >= EMAIL_3_DELAY_MS && sentEmails.has(2) && !sentEmails.has(3)) {
    emailNumber = 3;
  }

  if (emailNumber === null) {
    return { userId: user.id, email: user.email, status: "skipped", reason: "No email due yet or already sent" };
  }

  let template;
  if (emailNumber === 1) {
    template = buildEmail1(user.firstName);
  } else if (emailNumber === 2) {
    template = buildEmail2(user.firstName);
  } else {
    const closingDate = addDays(now, EMAIL_3_CLOSE_DAYS);
    template = buildEmail3(user.firstName, closingDate);
  }

  const result = await sendEmail(user.email, template.subject, template.html, "CheckoutRecovery");

  if (result.success) {
    await logResult(user.id, emailNumber, "success");
    return { userId: user.id, email: user.email, status: "sent", emailNumber };
  } else {
    await logResult(user.id, emailNumber, "error", result.error);
    return { userId: user.id, email: user.email, status: "error", emailNumber, reason: result.error };
  }
}

// ─── Main job ─────────────────────────────────────────────────────────────────

async function runCheckoutRecoveryJob(specificUserId?: string): Promise<ProcessResult[]> {
  const startTime = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[CheckoutRecovery] ${timestamp()} — Starting job`);
  console.log(`${"=".repeat(60)}`);

  const results: ProcessResult[] = [];

  try {
    let candidates: CandidateUser[];

    if (specificUserId) {
      const [row] = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, specificUserId));
      candidates = row?.email && row?.createdAt
        ? [row as CandidateUser]
        : [];
    } else {
      candidates = await getCandidateUsers();
    }

    console.log(`[CheckoutRecovery] Found ${candidates.length} candidate user(s)`);

    for (let i = 0; i < candidates.length; i++) {
      const user = candidates[i];
      console.log(`[CheckoutRecovery] Processing ${i + 1}/${candidates.length}: ${user.email}`);

      try {
        const result = await processUser(user);
        results.push(result);

        if (result.status === "sent") {
          console.log(`[CheckoutRecovery] ✓ Sent email ${result.emailNumber} to ${user.email}`);
        } else if (result.status === "error") {
          console.log(`[CheckoutRecovery] ✗ Error sending email ${result.emailNumber} to ${user.email}: ${result.reason}`);
        } else {
          console.log(`[CheckoutRecovery] — Skipped ${user.email}: ${result.reason}`);
        }
      } catch (err: any) {
        console.error(`[CheckoutRecovery] ✗ Unexpected error for ${user.email}:`, err?.message || err);
        results.push({ userId: user.id, email: user.email, status: "error", reason: err?.message });
      }

      // Throttle SMTP: 1s between sends
      if (i < candidates.length - 1) {
        await sleep(1000);
      }
    }
  } catch (err: any) {
    console.error(`[CheckoutRecovery] Critical job error:`, err?.message || err);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const sent    = results.filter((r) => r.status === "sent").length;
  const errors  = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(`[CheckoutRecovery] Done in ${duration}s — ${sent} sent, ${errors} errors, ${skipped} skipped`);
  console.log(`${"=".repeat(60)}\n`);

  return results;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initCheckoutRecoveryScheduler(app: Express): void {
  // Cron: every 30 minutes
  cron.schedule(
    "*/30 * * * *",
    async () => {
      console.log(`[CheckoutRecovery] Cron triggered at ${timestamp()}`);
      await runCheckoutRecoveryJob();
    },
    { timezone: "Europe/Madrid" }
  );

  console.log(`[CheckoutRecovery] Cron job registered: every 30 minutes`);

  // Admin endpoint: POST /admin/trigger-checkout-recovery
  app.post("/admin/trigger-checkout-recovery", async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_API_KEY;
    const providedKey = req.headers["x-admin-key"];

    if (!adminKey) {
      return res.status(500).json({ success: false, message: "ADMIN_API_KEY not configured" });
    }

    if (!providedKey || providedKey !== adminKey) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const userId: string | undefined = req.body?.userId;

    try {
      const results = await runCheckoutRecoveryJob(userId);
      const summary = {
        total:   results.length,
        sent:    results.filter((r) => r.status === "sent").length,
        errors:  results.filter((r) => r.status === "error").length,
        skipped: results.filter((r) => r.status === "skipped").length,
      };
      return res.json({ success: true, summary, results });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message || "Unknown error" });
    }
  });

  console.log(`[CheckoutRecovery] Admin endpoint registered: POST /admin/trigger-checkout-recovery`);
}
