import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

function maskEmail(email: unknown) {
  if (typeof email !== "string") return email;
  return email.replace(/^(.{2}).*(@.*)$/, "$1***$2");
}

const result = await db.execute(sql`
  select id, email, email_verified, subscription_status, created_at
  from users
  order by created_at desc
  limit 10
`);

console.table(
  result.rows.map((row) => ({
    ...row,
    email: maskEmail(row.email),
  })),
);
