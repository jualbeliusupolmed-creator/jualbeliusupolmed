const fs = require('fs');
const envStr = fs.readFileSync('.env.local', 'utf8');
const env = {};
envStr.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match){
    let v = match[2].trim();
    if(v.startsWith('"')) v = v.slice(1,-1);
    env[match[1].trim()]=v;
  }
});
process.env = {...process.env, ...env};

// Because src/lib/ipaymu.js might be using ES modules, we should import dynamically
import('./src/lib/ipaymu.js').then(module => {
  module.createPaymentLink({
    orderId: 'test-123',
    amount: 10000,
    itemName: 'Test'
  }).then(console.log).catch(console.error);
}).catch(console.error);
