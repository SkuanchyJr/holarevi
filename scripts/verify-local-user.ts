import "dotenv/config";
import { eq } from "drizzle-orm";
import { db } from "../server/db";
import { users } from "../shared/schema";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npx tsx scripts/verify-local-user.ts user@example.com");
  process.exit(1);
}

const [user] = await db
  .update(users)
  .set({
    emailVerified: true,
    emailVerificationToken: null,
    emailVerificationExpiresAt: null,
    updatedAt: new Date(),
  })
  .where(eq(users.email, email))
  .returning({
    id: users.id,
    email: users.email,
    emailVerified: users.emailVerified,
  });

if (!user) {
  console.error(`No user found for ${email}`);
  process.exit(1);
}

console.log(`Verified ${user.email} (${user.id})`);
