const fs = require('fs'); 
const envStr = fs.readFileSync('.env.local', 'utf8'); 
const env = {}; 
envStr.split('\n').forEach(line => { 
  const match = line.match(/^([^=]+)=(.*)$/); 
  if (match) { 
    let val = match[2].trim(); 
    if(val.startsWith('"') && val.endsWith('"')) val = val.slice(1,-1); 
    env[match[1].trim()] = val; 
  } 
}); 
fetch(env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/listings?title=eq.Tes', { 
  method: 'DELETE', 
  headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: 'Bearer ' + env.SUPABASE_SERVICE_ROLE_KEY } 
}).then(async r => console.log(r.status, await r.text())).catch(console.error);
