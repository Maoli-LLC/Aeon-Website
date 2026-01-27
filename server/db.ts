import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// IMPORTANT: This project uses ONLY Supabase for database.
// Never use Replit database (DATABASE_URL, PGHOST, etc.)
// Only SUPABASE_DATABASE_URL is valid.
const connectionString = process.env.SUPABASE_DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "SUPABASE_DATABASE_URL is required. This project uses Supabase only - never Replit database.",
  );
}

// Verify we're not accidentally using Replit database
if (connectionString.includes('replit') || connectionString.includes('neon')) {
  console.warn("WARNING: Connection string may be pointing to Replit/Neon database instead of Supabase!");
}

export const pool = new Pool({ 
  connectionString,
  ssl: { rejectUnauthorized: false }
});

export const db = drizzle(pool, { schema });
