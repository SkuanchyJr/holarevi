import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "../server/db";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

const url = new URL(databaseUrl);

const result = await db.execute(sql`
  select 'users' as table_name, count(*)::int as count, max(created_at)::text as latest from users
  union all select 'restaurants', count(*)::int, max(created_at)::text from restaurants
  union all select 'reviews', count(*)::int, max(created_at)::text from reviews
  union all select 'page_views', count(*)::int, max(created_at)::text from page_views
  union all select 'nfc_orders', count(*)::int, max(created_at)::text from nfc_orders
  union all select 'affiliate_leads', count(*)::int, max(created_at)::text from affiliate_leads
`);

console.log(`DATABASE_URL host=${url.hostname} db=${url.pathname.slice(1)} user=${decodeURIComponent(url.username)}`);
console.table(result.rows);
