const { Client } = require('pg');

async function runMigration() {
  const connectionString = "postgresql://postgres.autgrnrqeqdpqwkbolyh:Bismillah_24@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres";
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected, adding PIN column...");
    await client.query(`ALTER TABLE seller_profiles ADD COLUMN IF NOT EXISTS pin text;`);
    console.log("Success!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}
runMigration();
