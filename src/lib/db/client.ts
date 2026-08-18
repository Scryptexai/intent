import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/lib/db/schema";

/**
 * Drizzle ORM client for PostgreSQL on Neon.
 * Activated when DATABASE_URL is present; otherwise the app runs on the
 * seeded in-memory demo store (see src/lib/store.ts) with the same shapes.
 */
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  if (!_db) {
    const client = postgres(url, { max: 5, ssl: "require" });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export const isDbConfigured = () => !!process.env.DATABASE_URL;
