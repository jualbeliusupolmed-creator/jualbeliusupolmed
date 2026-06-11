require('dotenv').config({ path: '.env.vercel.prod' });
const crypto = require('crypto');

const va = process.env.IPAYMU_VA;
const apiKey = process.env.IPAYMU_API_KEY;

const body = {
    product: ["Iklan: Sepatu Baru"],
    qty: ["1"],
    price: ["10000"],
    returnUrl: "https://www.jualbeliusupolmed.web.id",
    cancelUrl: "https://www.jualbeliusupolmed.web.id",
    notifyUrl: "https://www.jualbeliusupolmed.web.id/api/ipaymu/webhook",
    referenceId: "IKLAN-12345678-1234567890",
    buyerName: "Pengguna",
    buyerPhone: "08123456789",
    buyerEmail: "admin@jualbeliusupolmed.web.id",
};

const bodyString = JSON.stringify(body);
const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
const stringToSign = `POST:${va}:${bodyHash}:${apiKey}`;
const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex').toLowerCase();

const timestamp = new Date().toISOString().replace(/T/, '').replace(/\..+/, '').replace(/-/g, '').replace(/:/g, '');

fetch("https://sandbox.ipaymu.com/api/v2/payment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "signature": signature,
      "va": va,
      "timestamp": timestamp,
    },
    body: JSON.stringify(body),
}).then(r => r.json()).then(d => console.log(d)).catch(e => console.error(e));
