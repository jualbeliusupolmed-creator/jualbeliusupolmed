const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').reduce((acc, line) => {
  const parts = line.split('=');
  if (parts.length > 1) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
    acc[key] = val;
  }
  return acc;
}, {});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
async function run() {
  const { data, error } = await supabase
    .from('wa_outbox')
    .update({ status: 'tertunda', galat_terakhir: 'dikembalikan dari fonnte ke antrean' })
    .eq('galat_terakhir', 'terkirim lewat jalur cadangan (Fonnte)');
  console.log('Update result:', data, error);
}
run();
