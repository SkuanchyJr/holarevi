import "dotenv/config";
import { db } from "./server/db";
import { users } from "./shared/schema";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`SELECT * FROM users LIMIT 1`);
    console.log("Latest user directly from SQL:");
    console.log(res.rows[0]);
    process.exit(0);
  } catch (error) {
    console.error("Error fetching latest user:", error);
    process.exit(1);
  }
}

run();
