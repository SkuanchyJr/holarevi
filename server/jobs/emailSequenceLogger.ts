/**
 * emailSequenceLogger.ts — Shared DB helpers for the email_sequence_logs table.
 * Used by activation, trial_expiration, nfc_upsell, and winback schedulers.
 */

import { db } from "../db";
import { emailSequenceLogs } from "@shared/schema";
import { and, eq } from "drizzle-orm";

export type SequenceName = "activation" | "trial_expiration" | "nfc_upsell" | "winback";

export async function getSentEmailNumbers(
  userId: string,
  sequence: SequenceName
): Promise<Set<number>> {
  const rows = await db
    .select({ emailNumber: emailSequenceLogs.emailNumber })
    .from(emailSequenceLogs)
    .where(
      and(
        eq(emailSequenceLogs.userId, userId),
        eq(emailSequenceLogs.sequence, sequence),
        eq(emailSequenceLogs.status, "success")
      )
    );
  return new Set(rows.map((r) => r.emailNumber));
}

export async function getLastSentAt(
  userId: string,
  sequence: SequenceName,
  emailNumber: number
): Promise<Date | null> {
  const [row] = await db
    .select({ sentAt: emailSequenceLogs.sentAt })
    .from(emailSequenceLogs)
    .where(
      and(
        eq(emailSequenceLogs.userId, userId),
        eq(emailSequenceLogs.sequence, sequence),
        eq(emailSequenceLogs.emailNumber, emailNumber),
        eq(emailSequenceLogs.status, "success")
      )
    )
    .limit(1);
  return row?.sentAt ?? null;
}

export async function logSequenceEmail(
  userId: string,
  sequence: SequenceName,
  emailNumber: number,
  status: "success" | "error",
  errorMessage?: string
): Promise<void> {
  try {
    await db.insert(emailSequenceLogs).values({
      userId,
      sequence,
      emailNumber,
      status,
      errorMessage: errorMessage ?? null,
    });
  } catch (err) {
    console.error(
      `[EmailSeqLogger] Failed to log ${sequence}#${emailNumber} for user ${userId}:`,
      err
    );
  }
}
