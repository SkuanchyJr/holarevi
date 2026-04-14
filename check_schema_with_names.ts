import "dotenv/config";
import { db } from "./server/db";
import { sql } from "drizzle-orm";

async function checkSchema() {
  try {
    const result = await db.execute(sql`
      SELECT table_schema, column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users'
    `);
    console.log("Users table columns with schema:");
    console.table(result.rows);
    process.exit(0);
  } catch (error) {
    console.error("Error checking schema:", error);
    process.exit(1);
  }
}

checkSchema();
