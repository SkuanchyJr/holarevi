import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addEmailSequenceLogsTable() {
  try {
    console.log("[Migration] Creating email_sequence_logs table...");

    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS email_sequence_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        sequence VARCHAR NOT NULL,
        email_number INTEGER NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR NOT NULL,
        error_message TEXT
      )`
    );

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_email_seq_logs_user_seq ON email_sequence_logs(user_id, sequence)`
    );

    console.log("[Migration] email_sequence_logs table ready");
  } catch (error) {
    console.error("[Migration] email_sequence_logs creation failed:", error);
    throw error;
  }
}
