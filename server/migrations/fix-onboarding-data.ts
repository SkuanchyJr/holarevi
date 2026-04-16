import { db } from "../db";
import { sql } from "drizzle-orm";

export async function fixOnboardingData() {
  try {
    console.log("[Migration] Fixing corrupted onboarding data...");

    await db.execute(
      sql`UPDATE users SET subscription_status = TRIM(subscription_status) WHERE subscription_status != TRIM(subscription_status)`
    );
    console.log("[Migration] Trimmed whitespace from subscription_status");

    await db.execute(
      sql`UPDATE users SET onboarding_step = 'add_location' WHERE onboarding_step = 'connect_google' AND onboarding_completed = false AND id NOT IN (SELECT DISTINCT user_id FROM restaurants)`
    );
    console.log("[Migration] Reset onboarding_step for users without restaurants");

    await db.execute(
      sql`ALTER TABLE users ALTER COLUMN onboarding_step SET DEFAULT 'add_location'`
    );
    console.log("[Migration] Updated column default to add_location");

    await db.execute(
      sql`DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'users' AND column_name = 'email_language'
        ) THEN
          ALTER TABLE users ADD COLUMN email_language VARCHAR DEFAULT 'es';
        END IF;
      END $$`
    );
    console.log("[Migration] Ensured email_language column exists");

    console.log("[Migration] Onboarding data fix complete");
  } catch (error) {
    console.error("[Migration] Onboarding data fix failed:", error);
    throw error;
  }
}
