const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

client.connect()
  .then(() => client.query("select has_table_privilege('anon','public.seller_profiles','select') as rls_check;"))
  .then(res => {
    console.log("RLS Check (is select allowed for anon?):", res.rows[0].rls_check);
    return client.end();
  })
  .catch(err => {
    console.error("Error:", err.message);
    client.end();
  });
