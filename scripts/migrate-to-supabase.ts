import pg from "pg";
import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";

const { Pool } = pg;

const SUPABASE_URL = process.env.SUPABASE_DATABASE_URL;

if (!SUPABASE_URL) {
  console.error("SUPABASE_DATABASE_URL not set");
  process.exit(1);
}

const supabasePool = new Pool({ 
  connectionString: SUPABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createSchema() {
  console.log("Creating schema in Supabase...");
  
  const schemaSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR UNIQUE,
      first_name VARCHAR,
      last_name VARCHAR,
      profile_image_url VARCHAR,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid VARCHAR PRIMARY KEY,
      sess JSONB NOT NULL,
      expire TIMESTAMP NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

    CREATE TABLE IF NOT EXISTS blog_posts (
      id SERIAL PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      excerpt TEXT NOT NULL,
      content TEXT,
      image_url VARCHAR(500),
      category VARCHAR(50) NOT NULL,
      published BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS email_subscribers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      unsubscribe_token VARCHAR(64),
      marketing_opt_out BOOLEAN DEFAULT FALSE,
      subscribed_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS dream_requests (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      dream_description TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS music_requests (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      mood VARCHAR(255),
      purpose VARCHAR(255),
      status VARCHAR(50) DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS blog_comments (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
      user_id VARCHAR REFERENCES users(id),
      user_name VARCHAR(255) NOT NULL,
      user_image VARCHAR(500),
      content TEXT NOT NULL,
      status VARCHAR(50) DEFAULT 'published',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS scheduled_emails (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      post_id INTEGER,
      title VARCHAR(255),
      description TEXT,
      image_url VARCHAR(500),
      link_destination VARCHAR(50),
      linked_post_id INTEGER,
      scheduled_for TIMESTAMP NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS webapp_requests (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      project_type VARCHAR(50) NOT NULL,
      description TEXT NOT NULL,
      functionality TEXT NOT NULL,
      color_preferences VARCHAR(500),
      example_sites TEXT,
      status VARCHAR(50) DEFAULT 'pending',
      quote_response TEXT,
      stripe_payment_link VARCHAR(500),
      agreement_pdf_url VARCHAR(500),
      initial_response TEXT,
      quote_amount VARCHAR(100),
      email_history TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(64) NOT NULL,
      visitor_id VARCHAR(64) NOT NULL,
      event_type VARCHAR(50) NOT NULL,
      page_url VARCHAR(500),
      page_title VARCHAR(255),
      referrer VARCHAR(500),
      utm_source VARCHAR(255),
      utm_medium VARCHAR(255),
      utm_campaign VARCHAR(255),
      utm_term VARCHAR(255),
      utm_content VARCHAR(255),
      device_type VARCHAR(50),
      browser VARCHAR(100),
      country VARCHAR(100),
      conversion_type VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS analytics_daily_metrics (
      id SERIAL PRIMARY KEY,
      date TIMESTAMP NOT NULL,
      page_views INTEGER DEFAULT 0,
      unique_visitors INTEGER DEFAULT 0,
      sessions INTEGER DEFAULT 0,
      dream_conversions INTEGER DEFAULT 0,
      music_conversions INTEGER DEFAULT 0,
      webapp_conversions INTEGER DEFAULT 0,
      newsletter_signups INTEGER DEFAULT 0,
      avg_session_duration INTEGER DEFAULT 0
    );
  `;

  await supabasePool.query(schemaSQL);
  console.log("Schema created successfully!");
}

async function importCSV(tableName: string, csvPath: string, columns: string[]) {
  if (!fs.existsSync(csvPath)) {
    console.log(`No data file for ${tableName}, skipping...`);
    return;
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  });

  if (records.length === 0) {
    console.log(`No records in ${tableName}, skipping...`);
    return;
  }

  console.log(`Importing ${records.length} records into ${tableName}...`);

  for (const record of records) {
    const values = columns.map((col) => {
      const val = record[col];
      if (val === "" || val === undefined) return null;
      return val;
    });

    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    const columnNames = columns.join(", ");

    try {
      await supabasePool.query(
        `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
        values
      );
    } catch (err: any) {
      console.error(`Error inserting into ${tableName}:`, err.message);
    }
  }

  console.log(`Imported ${tableName} successfully!`);
}

async function resetSequences() {
  console.log("Resetting sequences...");
  const tables = [
    "blog_posts",
    "email_subscribers",
    "dream_requests",
    "music_requests",
    "blog_comments",
    "scheduled_emails",
    "webapp_requests",
    "analytics_events",
    "analytics_daily_metrics",
  ];

  for (const table of tables) {
    try {
      await supabasePool.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), 
          COALESCE((SELECT MAX(id) FROM ${table}), 0) + 1, false)
      `);
    } catch (err: any) {
      console.log(`Sequence reset for ${table}: ${err.message}`);
    }
  }
  console.log("Sequences reset!");
}

async function migrate() {
  try {
    console.log("Starting migration to Supabase...\n");

    await createSchema();

    await importCSV("users", "/tmp/users.csv", [
      "id", "email", "first_name", "last_name", "profile_image_url", "created_at", "updated_at"
    ]);

    await importCSV("blog_posts", "/tmp/blog_posts.csv", [
      "id", "title", "excerpt", "content", "image_url", "category", "published", "created_at", "updated_at"
    ]);

    await importCSV("email_subscribers", "/tmp/email_subscribers.csv", [
      "id", "email", "name", "unsubscribe_token", "marketing_opt_out", "subscribed_at"
    ]);

    await importCSV("dream_requests", "/tmp/dream_requests.csv", [
      "id", "email", "name", "dream_description", "status", "notes", "created_at", "updated_at"
    ]);

    await importCSV("music_requests", "/tmp/music_requests.csv", [
      "id", "email", "name", "description", "mood", "purpose", "status", "notes", "created_at", "updated_at"
    ]);

    await importCSV("blog_comments", "/tmp/blog_comments.csv", [
      "id", "post_id", "user_id", "user_name", "user_image", "content", "status", "created_at"
    ]);

    await importCSV("scheduled_emails", "/tmp/scheduled_emails.csv", [
      "id", "type", "post_id", "title", "description", "image_url", "link_destination", "linked_post_id", "scheduled_for", "status", "created_at"
    ]);

    await importCSV("webapp_requests", "/tmp/webapp_requests.csv", [
      "id", "email", "name", "project_type", "description", "functionality", "color_preferences", "example_sites", "status", "quote_response", "stripe_payment_link", "agreement_pdf_url", "initial_response", "quote_amount", "email_history", "notes", "created_at", "updated_at"
    ]);

    await importCSV("analytics_events", "/tmp/analytics_events.csv", [
      "id", "session_id", "visitor_id", "event_type", "page_url", "page_title", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "device_type", "browser", "country", "conversion_type", "created_at"
    ]);

    await resetSequences();

    console.log("\n✅ Migration completed successfully!");
    console.log("Your data has been transferred to Supabase.");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await supabasePool.end();
  }
}

migrate();
