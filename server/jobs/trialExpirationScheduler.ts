/**
 * trialExpirationScheduler.ts — Sends urgency emails as the trial approaches expiration.
 *
 * Email 1 (trialEndsAt in 6–8 days):  "Tu prueba termina en 7 días"
 * Email 2 (trialEndsAt in 2–4 days):  "Quedan 3 días — no pierdas el acceso"
 * Email 3 (trialEndsAt in 0–2 days):  "Mañana termina tu prueba"
 *
 * Cron: daily at 10:00 AM Europe/Madrid
 * Admin endpoint: POST /admin/trigger-trial-expiration-emails
 */

import cron from "node-cron";
import type { Express, Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { and, eq, gt, isNotNull, lte, or } from "drizzle-orm";
import { sendEmail } from "./sendEmail";
import {
  getSentEmailNumbers,
  logSequenceEmail,
} from "./emailSequenceLogger";
import {
  buildTrialEmail1,
  buildTrialEmail2,
  buildTrialEmail3,
} from "./trialExpirationTemplates";

const SEQUENCE = "trial_expiration" as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function timestamp() {
  return new Date().toISOString();
}

function daysUntil(date: Date): number {
  return (date.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
}

// ─── Candidate query ──────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  email: string;
  firstName: string | null;
  trialEndsAt: Date;
}

async function getCandidates(): Promise<Candidate[]> {
  const now = new Date();
  const upperBound = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      id:          users.id,
      email:       users.email,
      firstName:   users.firstName,
      trialEndsAt: users.trialEndsAt,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.email),
        isNotNull(users.trialEndsAt),
        or(
          eq(users.subscriptionStatus, "trial"),
          eq(users.subscriptionStatus, "trialing")
        ),
        gt(users.trialEndsAt, now),
        lte(users.trialEndsAt, upperBound)
      )
    );

  return rows.filter(
    (r): r is Candidate => r.email !== null && r.trialEndsAt !== null
  ) as Candidate[];
}

// ─── Per-user processing ──────────────────────────────────────────────────────

interface ProcessResult {
  userId: string;
  email: string;
  status: "sent" | "skipped" | "error";
  emailNumber?: number;
  reason?: string;
}

async function processUser(user: Candidate): Promise<ProcessResult> {
  const days = daysUntil(user.trialEndsAt);
  const sent = await getSentEmailNumbers(user.id, SEQUENCE);

  let emailNumber: number | null = null;

  // Windows: send email when within the bucket and not already sent
  if (days >= 6 && days <= 8 && !sent.has(1)) {
    emailNumber = 1;
  } else if (days >= 2 && days <= 4 && sent.has(1) && !sent.has(2)) {
    emailNumber = 2;
  } else if (days >= 0 && days <= 2 && sent.has(2) && !sent.has(3)) {
    emailNumber = 3;
  } else if (days >= 0 && days <= 2 && !sent.has(1) && !sent.has(3)) {
    // Edge case: never received email 1 or 2 but trial ends very soon
    emailNumber = 3;
  }

  if (emailNumber === null) {
    return { userId: user.id, email: user.email, status: "skipped", reason: "No email due" };
  }

  const template =
    emailNumber === 1 ? buildTrialEmail1(user.firstName, user.trialEndsAt)
    : emailNumber === 2 ? buildTrialEmail2(user.firstName, user.trialEndsAt)
    : buildTrialEmail3(user.firstName, user.trialEndsAt);

  const result = await sendEmail(user.email, template.subject, template.html, "TrialExpiration");

  if (result.success) {
    await logSequenceEmail(user.id, SEQUENCE, emailNumber, "success");
    return { userId: user.id, email: user.email, status: "sent", emailNumber };
  } else {
    await logSequenceEmail(user.id, SEQUENCE, emailNumber, "error", result.error);
    return { userId: user.id, email: user.email, status: "error", emailNumber, reason: result.error };
  }
}

// ─── Main job ─────────────────────────────────────────────────────────────────

async function runTrialExpirationJob(specificUserId?: string): Promise<ProcessResult[]> {
  console.log(`\n[TrialExpiration] ${timestamp()} — Starting job`);
  const results: ProcessResult[] = [];

  try {
    let candidates: Candidate[];

    if (specificUserId) {
      const [row] = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName, trialEndsAt: users.trialEndsAt })
        .from(users)
        .where(eq(users.id, specificUserId));
      candidates = row?.email && row?.trialEndsAt ? [row as Candidate] : [];
    } else {
      candidates = await getCandidates();
    }

    console.log(`[TrialExpiration] ${candidates.length} candidate(s)`);

    for (let i = 0; i < candidates.length; i++) {
      const user = candidates[i];
      try {
        const result = await processUser(user);
        results.push(result);
        if (result.status === "sent") {
          console.log(`[TrialExpiration] ✓ Email ${result.emailNumber} → ${user.email}`);
        }
      } catch (err: any) {
        console.error(`[TrialExpiration] ✗ Error for ${user.email}:`, err?.message);
        results.push({ userId: user.id, email: user.email, status: "error", reason: err?.message });
      }
      if (i < candidates.length - 1) await sleep(1000);
    }
  } catch (err: any) {
    console.error(`[TrialExpiration] Critical error:`, err?.message);
  }

  const sent    = results.filter((r) => r.status === "sent").length;
  const errors  = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`[TrialExpiration] Done — ${sent} sent, ${errors} errors, ${skipped} skipped\n`);

  return results;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initTrialExpirationScheduler(app: Express): void {
  // Daily at 10:00 AM Madrid
  cron.schedule(
    "0 10 * * *",
    async () => {
      console.log(`[TrialExpiration] Cron triggered at ${timestamp()}`);
      await runTrialExpirationJob();
    },
    { timezone: "Europe/Madrid" }
  );

  console.log(`[TrialExpiration] Cron registered: daily 10:00 AM Europe/Madrid`);

  app.post("/admin/trigger-trial-expiration-emails", async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return res.status(500).json({ success: false, message: "ADMIN_API_KEY not configured" });
    if (req.headers["x-admin-key"] !== adminKey) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
      const results = await runTrialExpirationJob(req.body?.userId);
      return res.json({
        success: true,
        summary: {
          total:   results.length,
          sent:    results.filter((r) => r.status === "sent").length,
          errors:  results.filter((r) => r.status === "error").length,
          skipped: results.filter((r) => r.status === "skipped").length,
        },
        results,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err?.message });
    }
  });

  console.log(`[TrialExpiration] Admin endpoint registered: POST /admin/trigger-trial-expiration-emails`);
}
