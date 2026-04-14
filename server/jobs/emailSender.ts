/**
 * emailSender.ts — Nodemailer SMTP email sender for weekly analytics
 *
 * Required env vars:
 *   - SMTP_HOST
 *   - SMTP_PORT
 *   - SMTP_USER
 *   - SMTP_PASS
 *   - SMTP_FROM (e.g. "HolaRevi <info@holarevi.com>")
 */

import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SendResult {
  success: boolean;
  error?: string;
}

// ─── Transporter (lazy singleton) ────────────────────────────────────────────

let transporter: Transporter | null = null;

export function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      throw new Error(
        "SMTP_HOST, SMTP_USER, and SMTP_PASS are required for email sending"
      );
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
    });
  }
  return transporter;
}

// ─── Send function ───────────────────────────────────────────────────────────

/**
 * Send a weekly analytics email via SMTP.
 * Includes 1 retry on failure.
 */
export async function sendWeeklyEmail(
  to: string,
  subject: string,
  html: string
): Promise<SendResult> {
  const from = process.env.SMTP_FROM || "HolaRevi <info@holarevi.com>";
  const maxRetries = 2; // 1 initial + 1 retry

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `[WeeklyEmail] Sending email to ${to} (attempt ${attempt}/${maxRetries})`
      );

      const smtp = getTransporter();

      // Generate a plain text fallback by stripping HTML tags
      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      await smtp.sendMail({
        from,
        to,
        subject,
        html,
        text,
      });

      console.log(`[WeeklyEmail] Email sent successfully to ${to}`);
      return { success: true };
    } catch (error: any) {
      console.error(
        `[WeeklyEmail] SMTP error sending to ${to} (attempt ${attempt}/${maxRetries}):`,
        error?.message || error
      );

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      return {
        success: false,
        error: error?.message || "Unknown SMTP error",
      };
    }
  }

  return { success: false, error: "Max retries exceeded" };
}
