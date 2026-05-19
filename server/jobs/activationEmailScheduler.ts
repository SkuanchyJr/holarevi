/**
 * activationEmailScheduler.ts — Nudges verified users who haven't connected
 * a Google Business profile yet.
 *
 * Email 1 (+48h):  "Falta un paso para que HolaRevi trabaje por ti"
 * Email 2 (+5d):   "¿Tuviste algún problema para conectar?"
 * Email 3 (+10d):  "Tu panel HolaRevi lleva 10 días esperando"
 *
 * Cron: every 3 hours
 * Admin endpoint: POST /admin/trigger-activation-emails
 */

import cron from "node-cron";
import type { Express, Request, Response } from "express";
import { db } from "../db";
import { users, restaurants } from "@shared/schema";
import { and, eq, gte, isNotNull, lte, ne } from "drizzle-orm";
import { sendEmail } from "./sendEmail";
import {
  getSentEmailNumbers,
  logSequenceEmail,
} from "./emailSequenceLogger";
import {
  buildActivationEmail1,
  buildActivationEmail2,
  buildActivationEmail3,
} from "./activationEmailTemplates";

// ─── Timing ──────────────────────────────────────────────────────────────────

const EMAIL_1_DELAY_MS = 48 * 60 * 60 * 1000;    //  2 days
const EMAIL_2_DELAY_MS =  5 * 24 * 60 * 60 * 1000; //  5 days
const EMAIL_3_DELAY_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
const MAX_WINDOW_MS    = 21 * 24 * 60 * 60 * 1000; // stop after 21 days

const SEQUENCE = "activation" as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function timestamp() {
  return new Date().toISOString();
}

// ─── Candidate query ──────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  email: string;
  firstName: string | null;
  createdAt: Date;
}

async function getCandidates(): Promise<Candidate[]> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - MAX_WINDOW_MS);
  const windowEnd   = new Date(now.getTime() - EMAIL_1_DELAY_MS);

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
        // Not already an active paying subscriber (no need to nag them about setup separately)
        ne(users.subscriptionStatus, "canceled"),
        gte(users.createdAt, windowStart),
        lte(users.createdAt, windowEnd)
      )
    );

  const candidates: Candidate[] = [];

  for (const row of rows) {
    if (!row.email || !row.createdAt) continue;

    // Only target users without any connected restaurant
    const [connected] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(
        and(
          eq(restaurants.userId, row.id),
          eq(restaurants.isConnected, true)
        )
      )
      .limit(1);

    if (!connected) {
      candidates.push(row as Candidate);
    }
  }

  return candidates;
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
  const now = new Date();
  const ageMs = now.getTime() - user.createdAt.getTime();
  const sent = await getSentEmailNumbers(user.id, SEQUENCE);

  let emailNumber: number | null = null;

  if (ageMs >= EMAIL_1_DELAY_MS && !sent.has(1)) {
    emailNumber = 1;
  } else if (ageMs >= EMAIL_2_DELAY_MS && sent.has(1) && !sent.has(2)) {
    emailNumber = 2;
  } else if (ageMs >= EMAIL_3_DELAY_MS && sent.has(2) && !sent.has(3)) {
    emailNumber = 3;
  }

  if (emailNumber === null) {
    return { userId: user.id, email: user.email, status: "skipped", reason: "No email due" };
  }

  const template =
    emailNumber === 1 ? buildActivationEmail1(user.firstName)
    : emailNumber === 2 ? buildActivationEmail2(user.firstName)
    : buildActivationEmail3(user.firstName);

  const result = await sendEmail(user.email, template.subject, template.html, "Activation");

  if (result.success) {
    await logSequenceEmail(user.id, SEQUENCE, emailNumber, "success");
    return { userId: user.id, email: user.email, status: "sent", emailNumber };
  } else {
    await logSequenceEmail(user.id, SEQUENCE, emailNumber, "error", result.error);
    return { userId: user.id, email: user.email, status: "error", emailNumber, reason: result.error };
  }
}

// ─── Main job ─────────────────────────────────────────────────────────────────

async function runActivationJob(specificUserId?: string): Promise<ProcessResult[]> {
  console.log(`\n[Activation] ${timestamp()} — Starting job`);
  const results: ProcessResult[] = [];

  try {
    let candidates: Candidate[];

    if (specificUserId) {
      const [row] = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName, createdAt: users.createdAt })
        .from(users)
        .where(eq(users.id, specificUserId));
      candidates = row?.email && row?.createdAt ? [row as Candidate] : [];
    } else {
      candidates = await getCandidates();
    }

    console.log(`[Activation] ${candidates.length} candidate(s)`);

    for (let i = 0; i < candidates.length; i++) {
      const user = candidates[i];
      try {
        const result = await processUser(user);
        results.push(result);
        if (result.status === "sent") {
          console.log(`[Activation] ✓ Email ${result.emailNumber} → ${user.email}`);
        } else if (result.status === "error") {
          console.log(`[Activation] ✗ Email ${result.emailNumber} → ${user.email}: ${result.reason}`);
        }
      } catch (err: any) {
        console.error(`[Activation] ✗ Error for ${user.email}:`, err?.message);
        results.push({ userId: user.id, email: user.email, status: "error", reason: err?.message });
      }
      if (i < candidates.length - 1) await sleep(1000);
    }
  } catch (err: any) {
    console.error(`[Activation] Critical error:`, err?.message);
  }

  const sent    = results.filter((r) => r.status === "sent").length;
  const errors  = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`[Activation] Done — ${sent} sent, ${errors} errors, ${skipped} skipped\n`);

  return results;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initActivationEmailScheduler(app: Express): void {
  // Every 3 hours
  cron.schedule(
    "0 */3 * * *",
    async () => {
      console.log(`[Activation] Cron triggered at ${timestamp()}`);
      await runActivationJob();
    },
    { timezone: "Europe/Madrid" }
  );

  console.log(`[Activation] Cron registered: every 3 hours`);

  app.post("/admin/trigger-activation-emails", async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return res.status(500).json({ success: false, message: "ADMIN_API_KEY not configured" });
    if (req.headers["x-admin-key"] !== adminKey) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
      const results = await runActivationJob(req.body?.userId);
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

  console.log(`[Activation] Admin endpoint registered: POST /admin/trigger-activation-emails`);
}
