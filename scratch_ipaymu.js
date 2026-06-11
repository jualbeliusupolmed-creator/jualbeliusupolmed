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

async function test() {
  const { createPaymentLink } = await import('./src/lib/ipaymu.js');
  try {
    const res = await createPaymentLink({
      orderId: 'test-12345',
      amount: 10000,
      itemName: 'Test'
    });
    console.log("Success:", res);
  } catch (e) {
    console.error("Error:", e);
  }
}
test();
