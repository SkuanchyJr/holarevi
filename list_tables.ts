import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function run() {
  try {
    const res = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
    console.log("Tables in public schema:");
    console.log(res.rows.map(r => r.table_name));
    process.exit(0);
  } catch (error) {
    console.error("Error listing tables:", error);
    process.exit(1);
  }
}

run();
