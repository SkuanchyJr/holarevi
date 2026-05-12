import { db } from "../db";
import { sql } from "drizzle-orm";

export async function addCheckoutRecoveryTable() {
  try {
    console.log("[Migration] Creating checkout_recovery_email_logs table...");

    // Create the checkout_recovery_email_logs table
    await db.execute(
      sql`CREATE TABLE IF NOT EXISTS checkout_recovery_email_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email_number INTEGER NOT NULL,
        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR NOT NULL,
        error_message TEXT
      )`
    );
    console.log("[Migration] Created checkout_recovery_email_logs table");

    // Create indexes
    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_checkout_recovery_user ON checkout_recovery_email_logs(user_id)`
    );
    console.log("[Migration] Created idx_checkout_recovery_user index");

    await db.execute(
      sql`CREATE INDEX IF NOT EXISTS idx_checkout_recovery_email_num ON checkout_recovery_email_logs(user_id, email_number)`
    );
    console.log("[Migration] Created idx_checkout_recovery_email_num index");

    console.log("[Migration] Checkout recovery table creation complete");
  } catch (error) {
    console.error("[Migration] Checkout recovery table creation failed:", error);
    throw error;
  }
}
