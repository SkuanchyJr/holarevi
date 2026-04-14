/**
 * weeklyEmailScheduler.ts — Weekly analytics email automation
 *
 * Orchestrates the full pipeline:
 *   1. Cron job: every Friday 9:00 AM Madrid time
 *   2. Admin endpoint: POST /admin/trigger-weekly-emails
 *   3. Per-user processing: metrics → generate → send → log
 *
 * Required env vars:
 *   - OPENAI_API_KEY   — for email content generation
 *   - SMTP_HOST        — SMTP server hostname
 *   - SMTP_PORT        — SMTP server port (default 587)
 *   - SMTP_USER        — SMTP auth user
 *   - SMTP_PASS        — SMTP auth password
 *   - SMTP_FROM        — sender address (e.g. "HolaRevi <info@holarevi.com>")
 *   - ADMIN_API_KEY    — protects the manual trigger endpoint
 *   - OPENAI_MODEL     — (optional) override model, defaults to "gpt-4o"
 */

import cron from "node-cron";
import type { Express, Request, Response } from "express";
import { db } from "../db";
import { users, restaurants, weeklyEmailLogs } from "@shared/schema";
import { eq, and, inArray, isNotNull, or } from "drizzle-orm";
import {
  computeWeeklyMetrics,
  getLastCompletedWeekRange,
} from "./emailMetrics";
import { generateWeeklyEmail, generateFallbackEmail } from "./emailGenerator";
import { sendWeeklyEmail } from "./emailSender";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp(): string {
  return new Date().toISOString();
}

// ─── Idempotency check ──────────────────────────────────────────────────────

async function wasAlreadySentThisWeek(
  userId: string,
  weekStart: Date
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(weeklyEmailLogs)
    .where(
      and(
        eq(weeklyEmailLogs.userId, userId),
        eq(weeklyEmailLogs.weekStart, weekStart),
        eq(weeklyEmailLogs.status, "success")
      )
    );
  return !!existing;
}

// ─── Log result ──────────────────────────────────────────────────────────────

async function logEmailResult(
  userId: string,
  weekStart: Date,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(weeklyEmailLogs).values({
      userId,
      weekStart,
      status,
      errorMessage: errorMessage || null,
    });
  } catch (err) {
    console.error(`[WeeklyEmail] Failed to log result for user ${userId}:`, err);
  }
}

// ─── Get active users ────────────────────────────────────────────────────────

interface ActiveUser {
  id: string;
  email: string | null;
}

async function getActiveUsers(specificUserId?: string): Promise<ActiveUser[]> {
  if (specificUserId) {
    const [user] = await db
      .select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.id, specificUserId));
    return user ? [user] : [];
  }

  // Get users who have at least one restaurant and an active/trial subscription
  const activeUsers = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        isNotNull(users.email),
        or(
          eq(users.subscriptionStatus, "active"),
          eq(users.subscriptionStatus, "trialing"),
          eq(users.subscriptionStatus, "trial")
        )
      )
    );

  // Filter to users who have at least one restaurant
  const result: ActiveUser[] = [];
  for (const user of activeUsers) {
    const [hasRestaurant] = await db
      .select({ id: restaurants.id })
      .from(restaurants)
      .where(eq(restaurants.userId, user.id))
      .limit(1);
    if (hasRestaurant) {
      result.push(user);
    }
  }

  return result;
}

// ─── Main processing function ────────────────────────────────────────────────

interface ProcessingResult {
  userId: string;
  email: string;
  status: "success" | "error" | "skipped";
  reason?: string;
}

async function processWeeklyEmails(
  specificUserId?: string
): Promise<ProcessingResult[]> {
  const startTime = Date.now();
  console.log(`\n${"=".repeat(60)}`);
  console.log(`[WeeklyEmail] ${timestamp()} — Starting weekly email job`);
  console.log(`${"=".repeat(60)}`);

  const results: ProcessingResult[] = [];

  try {
    // 1. Get date range (last completed week)
    const { weekStart, weekEnd } = getLastCompletedWeekRange();
    console.log(
      `[WeeklyEmail] Date range: ${weekStart.toISOString().split("T")[0]} to ${weekEnd.toISOString().split("T")[0]}`
    );

    // 2. Get active users
    const activeUsers = await getActiveUsers(specificUserId);
    console.log(`[WeeklyEmail] Found ${activeUsers.length} active user(s) to process`);

    if (activeUsers.length === 0) {
      console.log(`[WeeklyEmail] No active users found. Job complete.`);
      return results;
    }

    // 3. Process each user sequentially
    for (let i = 0; i < activeUsers.length; i++) {
      const user = activeUsers[i];
      const userEmail = user.email || "";
      const progress = `${i + 1}/${activeUsers.length}`;

      console.log(`\n[WeeklyEmail] Processing user ${progress}: ${userEmail} (${user.id})`);

      try {
        // Idempotency check
        const alreadySent = await wasAlreadySentThisWeek(user.id, weekStart);
        if (alreadySent) {
          console.log(`[WeeklyEmail] Already sent this week to ${userEmail}, skipping`);
          results.push({
            userId: user.id,
            email: userEmail,
            status: "skipped",
            reason: "Already sent this week",
          });
          continue;
        }

        // Compute metrics
        const metrics = await computeWeeklyMetrics(user.id, weekStart, weekEnd);
        if (!metrics) {
          console.log(`[WeeklyEmail] Could not compute metrics for ${userEmail}, skipping`);
          results.push({
            userId: user.id,
            email: userEmail,
            status: "skipped",
            reason: "No metrics available (no restaurants)",
          });
          continue;
        }

        if (!metrics.userEmail) {
          console.log(`[WeeklyEmail] No email address for user ${user.id}, skipping`);
          results.push({
            userId: user.id,
            email: userEmail,
            status: "skipped",
            reason: "No email address",
          });
          continue;
        }

        // Generate email (OpenAI or fallback)
        let email = await generateWeeklyEmail(metrics);

        if (!email) {
          // OpenAI failed even after retries — use fallback
          console.log(`[WeeklyEmail] OpenAI failed for ${userEmail}, using fallback template`);
          email = generateFallbackEmail(metrics);
        }

        // Replace dashboard placeholder with actual URL
        const dashboardUrl = process.env.APP_URL || "https://holarevi.com";
        email.html = email.html.replace(
          /\[ENLACE AL DASHBOARD\]/g,
          `${dashboardUrl}/es/dashboard`
        );

        // Send email
        const sendResult = await sendWeeklyEmail(
          metrics.userEmail,
          email.subject,
          email.html
        );

        if (sendResult.success) {
          await logEmailResult(user.id, weekStart, "success");
          results.push({
            userId: user.id,
            email: userEmail,
            status: "success",
          });
          console.log(`[WeeklyEmail] ✓ Successfully sent to ${userEmail}`);
        } else {
          await logEmailResult(user.id, weekStart, "error", sendResult.error);
          results.push({
            userId: user.id,
            email: userEmail,
            status: "error",
            reason: sendResult.error,
          });
          console.log(`[WeeklyEmail] ✗ Failed to send to ${userEmail}: ${sendResult.error}`);
        }
      } catch (userError: any) {
        const errorMsg = userError?.message || String(userError);
        console.error(`[WeeklyEmail] ✗ Error processing user ${userEmail}:`, errorMsg);
        await logEmailResult(user.id, weekStart, "error", errorMsg);
        results.push({
          userId: user.id,
          email: userEmail,
          status: "error",
          reason: errorMsg,
        });
      }

      // Rate limiting: 2s delay between users
      if (i < activeUsers.length - 1) {
        console.log(`[WeeklyEmail] Waiting 2s before next user...`);
        await sleep(2000);
      }
    }
  } catch (error: any) {
    console.error(`[WeeklyEmail] Critical error in weekly email job:`, error?.message || error);
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  const success = results.filter((r) => r.status === "success").length;
  const errors = results.filter((r) => r.status === "error").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  console.log(`\n${"=".repeat(60)}`);
  console.log(
    `[WeeklyEmail] Job complete in ${duration}s — ` +
      `${success} sent, ${errors} errors, ${skipped} skipped`
  );
  console.log(`${"=".repeat(60)}\n`);

  return results;
}

// ─── Init function ───────────────────────────────────────────────────────────

/**
 * Register the weekly email cron job and admin trigger endpoint.
 * Call from server startup (index.ts / server.ts).
 */
export function initWeeklyEmailScheduler(app: Express): void {
  // ── Cron job: every Friday at 9:00 AM, Europe/Madrid ──

  cron.schedule(
    "0 9 * * 5",
    async () => {
      console.log(`[WeeklyEmail] Cron triggered at ${timestamp()}`);
      await processWeeklyEmails();
    },
    {
      timezone: "Europe/Madrid",
    }
  );

  console.log(
    `[WeeklyEmail] Cron job registered: every Friday 9:00 AM Europe/Madrid`
  );

  // ── Admin endpoint: POST /admin/trigger-weekly-emails ──

  app.post("/admin/trigger-weekly-emails", async (req: Request, res: Response) => {
    const adminKey = process.env.ADMIN_API_KEY;
    const providedKey = req.headers["x-admin-key"];

    // Audit log
    const ip =
      req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
      req.socket.remoteAddress ||
      "unknown";
    console.log(
      `[WeeklyEmail] [AUDIT] Admin trigger attempt from IP: ${ip} at ${timestamp()}`
    );

    // Auth check
    if (!adminKey) {
      console.error("[WeeklyEmail] [AUDIT] ADMIN_API_KEY not configured");
      return res.status(500).json({
        success: false,
        message: "ADMIN_API_KEY not configured on server",
      });
    }

    if (!providedKey || providedKey !== adminKey) {
      console.warn(
        `[WeeklyEmail] [AUDIT] Unauthorized trigger attempt from IP: ${ip}`
      );
      return res.status(401).json({
        success: false,
        message: "Unauthorized: invalid or missing x-admin-key",
      });
    }

    // Content-type validation
    const contentType = req.headers["content-type"];
    if (contentType && !contentType.includes("application/json")) {
      return res.status(400).json({
        success: false,
        message: "Content-Type must be application/json",
      });
    }

    // Extract optional userId
    const userId: string | undefined = req.body?.userId || req.body?.business_id;

    console.log(
      `[WeeklyEmail] [AUDIT] Authorized trigger by admin from IP: ${ip}` +
        (userId ? ` (target user: ${userId})` : " (all users)")
    );

    try {
      const results = await processWeeklyEmails(userId);

      const summary = {
        total: results.length,
        success: results.filter((r) => r.status === "success").length,
        errors: results.filter((r) => r.status === "error").length,
        skipped: results.filter((r) => r.status === "skipped").length,
      };

      return res.json({
        success: true,
        summary,
        results,
      });
    } catch (error: any) {
      console.error("[WeeklyEmail] Admin trigger error:", error?.message || error);
      return res.status(500).json({
        success: false,
        message: "Error processing weekly emails",
        error: error?.message,
      });
    }
  });

  console.log(
    `[WeeklyEmail] Admin endpoint registered: POST /admin/trigger-weekly-emails`
  );
}
