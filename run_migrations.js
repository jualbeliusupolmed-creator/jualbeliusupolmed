const { Client } = require('pg');
const fs = require('fs');

async function runMigrations() {
  const connectionString = "postgresql://postgres.autgrnrqeqdpqwkbolyh:Bismillah_24@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true";
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log("Connecting to Supabase...");
    await client.connect();
    console.log("Connected!");

    console.log("Running migration_autobump.sql...");
    const autobumpSql = fs.readFileSync('supabase/migration_autobump.sql', 'utf8');
    await client.query(autobumpSql);
    console.log("Success autobump!");

    console.log("Running migration_otp.sql...");
    const otpSql = fs.readFileSync('supabase/migration_otp.sql', 'utf8');
    await client.query(otpSql);
    console.log("Success OTP!");

  } catch (err) {
    console.error("Error running migrations:", err);
  } finally {
    await client.end();
  }
}

runMigrations();
