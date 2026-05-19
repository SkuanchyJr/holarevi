/**
 * winbackScheduler.ts — Re-engagement sequence for canceled/past_due users.
 *
 * Email 1 (immediately on first run): "¿Qué pasó?"
 * Email 2 (>= 11d after email 1):    "Lo nuevo en HolaRevi"
 * Email 3 (>= 16d after email 2):    "Última vez — vuelve con descuento"
 *
 * Promo code used in email 3: env var WINBACK_PROMO_CODE (default "BIENVENIDO")
 *
 * Cron: daily at 9:00 AM Europe/Madrid
 * Admin endpoint: POST /admin/trigger-winback-emails
 */

import cron from "node-cron";
import type { Express, Request, Response } from "express";
import { db } from "../db";
import { users } from "@shared/schema";
import { and, eq, isNotNull, or } from "drizzle-orm";
import { sendEmail } from "./sendEmail";
import {
  getSentEmailNumbers,
  getLastSentAt,
  logSequenceEmail,
} from "./emailSequenceLogger";
import {
  buildWinbackEmail1,
  buildWinbackEmail2,
  buildWinbackEmail3,
} from "./winbackTemplates";

const SEQUENCE = "winback" as const;

const EMAIL_2_DELAY_AFTER_EMAIL1_MS = 11 * 24 * 60 * 60 * 1000; // 11 days
const EMAIL_3_DELAY_AFTER_EMAIL2_MS = 16 * 24 * 60 * 60 * 1000; // 16 days after email 2

function getPromoCode(): string {
  return process.env.WINBACK_PROMO_CODE || "BIENVENIDO";
}

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
}

async function getCandidates(): Promise<Candidate[]> {
  const rows = await db
    .select({
      id:        users.id,
      email:     users.email,
      firstName: users.firstName,
    })
    .from(users)
    .where(
      and(
        isNotNull(users.email),
        eq(users.emailVerified, true),
        or(
          eq(users.subscriptionStatus, "canceled"),
          eq(users.subscriptionStatus, "past_due")
        )
      )
    );

  return rows.filter((r): r is Candidate => r.email !== null) as Candidate[];
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
  const now = Date.now();
  const sent = await getSentEmailNumbers(user.id, SEQUENCE);

  let emailNumber: number | null = null;

  if (!sent.has(1)) {
    emailNumber = 1;
  } else if (!sent.has(2)) {
    const email1SentAt = await getLastSentAt(user.id, SEQUENCE, 1);
    if (
      email1SentAt &&
      now - email1SentAt.getTime() >= EMAIL_2_DELAY_AFTER_EMAIL1_MS
    ) {
      emailNumber = 2;
    }
  } else if (!sent.has(3)) {
    const email2SentAt = await getLastSentAt(user.id, SEQUENCE, 2);
    if (
      email2SentAt &&
      now - email2SentAt.getTime() >= EMAIL_3_DELAY_AFTER_EMAIL2_MS
    ) {
      emailNumber = 3;
    }
  }

  if (emailNumber === null) {
    return { userId: user.id, email: user.email, status: "skipped", reason: "No email due or sequence complete" };
  }

  const template =
    emailNumber === 1 ? buildWinbackEmail1(user.firstName)
    : emailNumber === 2 ? buildWinbackEmail2(user.firstName)
    : buildWinbackEmail3(user.firstName, getPromoCode());

  const result = await sendEmail(user.email, template.subject, template.html, "Winback");

  if (result.success) {
    await logSequenceEmail(user.id, SEQUENCE, emailNumber, "success");
    return { userId: user.id, email: user.email, status: "sent", emailNumber };
  } else {
    await logSequenceEmail(user.id, SEQUENCE, emailNumber, "error", result.error);
    return { userId: user.id, email: user.email, status: "error", emailNumber, reason: result.error };
  }
}

// ─── Main job ─────────────────────────────────────────────────────────────────

async function runWinbackJob(specificUserId?: string): Promise<ProcessResult[]> {
  console.log(`\n[Winback] ${timestamp()} — Starting job`);
  const results: ProcessResult[] = [];

  try {
    let candidates: Candidate[];

    if (specificUserId) {
      const [row] = await db
        .select({ id: users.id, email: users.email, firstName: users.firstName })
        .from(users)
        .where(eq(users.id, specificUserId));
      candidates = row?.email ? [row as Candidate] : [];
    } else {
      candidates = await getCandidates();
    }

    console.log(`[Winback] ${candidates.length} candidate(s)`);

    for (let i = 0; i < candidates.length; i++) {
      const user = candidates[i];
      try {
        const result = await processUser(user);
        results.push(result);
        if (result.status === "sent") {
          console.log(`[Winback] ✓ Email ${result.emailNumber} → ${user.email}`);
        }
      } catch (err: any) {
        console.error(`[Winback] ✗ Error for ${user.email}:`, err?.message);
        results.push({ userId: user.id, email: user.email, status: "error", reason: err?.message });
      }
      if (i < candidates.length - 1) await sleep(1000);
    }
  } catch (err: any) {
    console.error(`[Winback] Critical error:`, err?.message);
  }

  const sent    = results.filter((r) => r.status === "sent").length;
  const errors  = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`[Winback] Done — ${sent} sent, ${errors} errors, ${skipped} skipped\n`);

  return results;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initWinbackScheduler(app: Express): void {
  // Daily at 9:00 AM Madrid
  cron.schedule(
    "0 9 * * *",
    async () => {
      console.log(`[Winback] Cron triggered at ${timestamp()}`);
      await runWinbackJob();
    },
    { timezone: "Europe/Madrid" }
  );

  console.log(`[Winback] Cron registered: daily 9:00 AM Europe/Madrid`);

  app.post("/admin/trigger-winback-emails", async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return res.status(500).json({ success: false, message: "ADMIN_API_KEY not configured" });
    if (req.headers["x-admin-key"] !== adminKey) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
      const results = await runWinbackJob(req.body?.userId);
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

  console.log(`[Winback] Admin endpoint registered: POST /admin/trigger-winback-emails`);
}
