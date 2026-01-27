import pg from "pg";
import fs from "fs";
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

async function clearTable(tableName: string) {
  try {
    await supabasePool.query(`DELETE FROM ${tableName}`);
    console.log(`Cleared ${tableName}`);
  } catch (err: any) {
    console.log(`Could not clear ${tableName}: ${err.message}`);
  }
}

async function importCSV(tableName: string, csvPath: string, columns: string[]) {
  if (!fs.existsSync(csvPath)) {
    console.log(`No data file for ${tableName}, skipping...`);
    return 0;
  }

  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  });

  if (records.length === 0) {
    console.log(`No records in ${tableName}, skipping...`);
    return 0;
  }

  console.log(`Importing ${records.length} records into ${tableName}...`);

  let imported = 0;
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
      imported++;
    } catch (err: any) {
      if (!err.message.includes('duplicate key')) {
        console.error(`Error inserting into ${tableName}:`, err.message);
      }
    }
  }

  console.log(`Imported ${imported} records into ${tableName}`);
  return imported;
}

async function resetSequence(tableName: string) {
  try {
    await supabasePool.query(`
      SELECT setval(pg_get_serial_sequence('${tableName}', 'id'), 
        COALESCE((SELECT MAX(id) FROM ${tableName}), 0) + 1, false)
    `);
  } catch (err: any) {
    // Ignore errors for tables without serial id
  }
}

async function migrate() {
  try {
    console.log("Starting PRODUCTION data migration to Supabase...\n");

    // Clear existing data (from previous dev migration)
    await clearTable("analytics_events");
    await clearTable("blog_comments");
    await clearTable("scheduled_emails");
    await clearTable("webapp_requests");
    await clearTable("music_requests");
    await clearTable("dream_requests");
    await clearTable("email_subscribers");
    await clearTable("blog_posts");
    await clearTable("sessions");
    await clearTable("users");

    console.log("\nImporting production data...\n");

    await importCSV("users", "/tmp/prod_users.csv", [
      "id", "email", "first_name", "last_name", "profile_image_url", "created_at", "updated_at"
    ]);

    await importCSV("blog_posts", "/tmp/prod_blog_posts.csv", [
      "id", "title", "excerpt", "content", "image_url", "category", "published", "created_at", "updated_at"
    ]);

    await importCSV("email_subscribers", "/tmp/prod_email_subscribers.csv", [
      "id", "email", "name", "unsubscribe_token", "marketing_opt_out", "subscribed_at"
    ]);

    await importCSV("dream_requests", "/tmp/prod_dream_requests.csv", [
      "id", "email", "name", "dream_description", "status", "notes", "created_at", "updated_at"
    ]);

    await importCSV("music_requests", "/tmp/prod_music_requests.csv", [
      "id", "email", "name", "description", "mood", "purpose", "status", "notes", "created_at", "updated_at"
    ]);

    await importCSV("blog_comments", "/tmp/prod_blog_comments.csv", [
      "id", "post_id", "user_id", "user_name", "user_image", "content", "status", "created_at"
    ]);

    await importCSV("scheduled_emails", "/tmp/prod_scheduled_emails.csv", [
      "id", "type", "post_id", "title", "description", "image_url", "link_destination", "linked_post_id", "scheduled_for", "status", "created_at"
    ]);

    await importCSV("webapp_requests", "/tmp/prod_webapp_requests.csv", [
      "id", "email", "name", "project_type", "description", "functionality", "color_preferences", "example_sites", "status", "quote_response", "stripe_payment_link", "agreement_pdf_url", "initial_response", "quote_amount", "email_history", "notes", "created_at", "updated_at"
    ]);

    await importCSV("analytics_events", "/tmp/prod_analytics_events.csv", [
      "id", "session_id", "visitor_id", "event_type", "page_url", "page_title", "referrer", "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "device_type", "browser", "country", "conversion_type", "created_at"
    ]);

    // Reset sequences
    console.log("\nResetting sequences...");
    await resetSequence("blog_posts");
    await resetSequence("email_subscribers");
    await resetSequence("dream_requests");
    await resetSequence("music_requests");
    await resetSequence("blog_comments");
    await resetSequence("scheduled_emails");
    await resetSequence("webapp_requests");
    await resetSequence("analytics_events");

    // Verify counts
    console.log("\nVerifying migration...");
    const blogCount = await supabasePool.query("SELECT COUNT(*) as count FROM blog_posts");
    const dreamCount = await supabasePool.query("SELECT COUNT(*) as count FROM dream_requests");
    const webappCount = await supabasePool.query("SELECT COUNT(*) as count FROM webapp_requests");
    
    console.log(`Blog posts: ${blogCount.rows[0].count}`);
    console.log(`Dream requests: ${dreamCount.rows[0].count}`);
    console.log(`Webapp requests: ${webappCount.rows[0].count}`);

    console.log("\n✅ PRODUCTION migration completed successfully!");

  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await supabasePool.end();
  }
}

migrate();
