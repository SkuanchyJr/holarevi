/**
 * nfcUpsellScheduler.ts — Promotes the NFC Stand to active subscribers
 * who haven't purchased one yet.
 *
 * Email 1 (subscription age >= 14d):  "¿Cuántas reseñas más podrías tener?"
 * Email 2 (>= 7d after email 1):      "25€ que se notan en Google"
 *
 * Cron: daily at 11:00 AM Europe/Madrid
 * Admin endpoint: POST /admin/trigger-nfc-upsell-emails
 */

import cron from "node-cron";
import type { Express, Request, Response } from "express";
import { db } from "../db";
import { users, nfcOrders } from "@shared/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { sendEmail } from "./sendEmail";
import {
  getSentEmailNumbers,
  getLastSentAt,
  logSequenceEmail,
} from "./emailSequenceLogger";
import {
  buildNfcEmail1,
  buildNfcEmail2,
} from "./nfcUpsellTemplates";

const SEQUENCE = "nfc_upsell" as const;

const EMAIL_1_MIN_SUBSCRIPTION_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const EMAIL_2_DELAY_AFTER_EMAIL1_MS   =  7 * 24 * 60 * 60 * 1000; //  7 days after email 1

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
  const subscriptionAgeThreshold = new Date(
    Date.now() - EMAIL_1_MIN_SUBSCRIPTION_AGE_MS
  );

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
        eq(users.subscriptionStatus, "active"),
        lte(users.createdAt, subscriptionAgeThreshold)
      )
    );

  const candidates: Candidate[] = [];

  for (const row of rows) {
    if (!row.email || !row.createdAt) continue;

    // Check if they have a non-cancelled NFC order
    const [nfcOrder] = await db
      .select({ id: nfcOrders.id })
      .from(nfcOrders)
      .where(
        and(
          eq(nfcOrders.email, row.email),
          // Exclude cancelled/refunded orders
          isNotNull(nfcOrders.id)
        )
      )
      .limit(1);

    // If they already have an NFC order with a non-cancelled status, skip
    if (nfcOrder) {
      const [activeOrder] = await db
        .select({ id: nfcOrders.id })
        .from(nfcOrders)
        .where(
          and(
            eq(nfcOrders.email, row.email),
            isNotNull(nfcOrders.stripePaymentIntentId)
          )
        )
        .limit(1);

      if (activeOrder) continue;
    }

    candidates.push(row as Candidate);
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
  }

  if (emailNumber === null) {
    return { userId: user.id, email: user.email, status: "skipped", reason: "No email due or sequence complete" };
  }

  const template =
    emailNumber === 1
      ? buildNfcEmail1(user.firstName)
      : buildNfcEmail2(user.firstName);

  const result = await sendEmail(user.email, template.subject, template.html, "NfcUpsell");

  if (result.success) {
    await logSequenceEmail(user.id, SEQUENCE, emailNumber, "success");
    return { userId: user.id, email: user.email, status: "sent", emailNumber };
  } else {
    await logSequenceEmail(user.id, SEQUENCE, emailNumber, "error", result.error);
    return { userId: user.id, email: user.email, status: "error", emailNumber, reason: result.error };
  }
}

// ─── Main job ─────────────────────────────────────────────────────────────────

async function runNfcUpsellJob(specificUserId?: string): Promise<ProcessResult[]> {
  console.log(`\n[NfcUpsell] ${timestamp()} — Starting job`);
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

    console.log(`[NfcUpsell] ${candidates.length} candidate(s)`);

    for (let i = 0; i < candidates.length; i++) {
      const user = candidates[i];
      try {
        const result = await processUser(user);
        results.push(result);
        if (result.status === "sent") {
          console.log(`[NfcUpsell] ✓ Email ${result.emailNumber} → ${user.email}`);
        }
      } catch (err: any) {
        console.error(`[NfcUpsell] ✗ Error for ${user.email}:`, err?.message);
        results.push({ userId: user.id, email: user.email, status: "error", reason: err?.message });
      }
      if (i < candidates.length - 1) await sleep(1000);
    }
  } catch (err: any) {
    console.error(`[NfcUpsell] Critical error:`, err?.message);
  }

  const sent    = results.filter((r) => r.status === "sent").length;
  const errors  = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  console.log(`[NfcUpsell] Done — ${sent} sent, ${errors} errors, ${skipped} skipped\n`);

  return results;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initNfcUpsellScheduler(app: Express): void {
  // Daily at 11:00 AM Madrid
  cron.schedule(
    "0 11 * * *",
    async () => {
      console.log(`[NfcUpsell] Cron triggered at ${timestamp()}`);
      await runNfcUpsellJob();
    },
    { timezone: "Europe/Madrid" }
  );

  console.log(`[NfcUpsell] Cron registered: daily 11:00 AM Europe/Madrid`);

  app.post("/admin/trigger-nfc-upsell-emails", async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_API_KEY;
    if (!adminKey) return res.status(500).json({ success: false, message: "ADMIN_API_KEY not configured" });
    if (req.headers["x-admin-key"] !== adminKey) return res.status(401).json({ success: false, message: "Unauthorized" });

    try {
      const results = await runNfcUpsellJob(req.body?.userId);
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

  console.log(`[NfcUpsell] Admin endpoint registered: POST /admin/trigger-nfc-upsell-emails`);
}
