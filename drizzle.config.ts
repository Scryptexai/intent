import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit config — targets PostgreSQL on Neon.
 * Provide DATABASE_URL in .env (see .env.example) to generate/push migrations.
 */
export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://user:pass@localhost:5432/cif",
  },
  verbose: true,
  strict: true,
});
