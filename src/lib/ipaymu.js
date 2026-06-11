import crypto from "crypto";

export function getIpaymuConfig() {
  return {
    va: process.env.IPAYMU_VA || "",
    apiKey: process.env.IPAYMU_API_KEY || "",
    isProduction: process.env.NEXT_PUBLIC_IPAYMU_IS_PRODUCTION === "true" || process.env.IPAYMU_IS_PRODUCTION === "true",
  };
}

export function generateIpaymuSignature(body, method = "POST") {
  const { va, apiKey } = getIpaymuConfig();
  if (!va || !apiKey) {
    console.warn("Peringatan: IPAYMU_VA atau IPAYMU_API_KEY belum diatur di .env");
  }
  
  const bodyString = JSON.stringify(body);
  const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex').toLowerCase();
  const stringToSign = `${method}:${va}:${bodyHash}:${apiKey}`;
  const signature = crypto.createHmac('sha256', apiKey).update(stringToSign).digest('hex').toLowerCase();
  
  return signature;
}

// Buat Payment Link (Redirect Payment)
export async function createPaymentLink({
  orderId,
  amount,
  customerName,
  customerWa,
  customerEmail,
  itemName,
  returnUrl,
  cancelUrl,
  notifyUrl,
}) {
  const { va, isProduction } = getIpaymuConfig();
  const baseUrl = isProduction ? "https://my.ipaymu.com" : "https://sandbox.ipaymu.com";

  const body = {
    product: [(itemName || "Pembayaran").slice(0, 50)],
    qty: ["1"],
    price: [Math.round(amount).toString()],
    returnUrl: returnUrl || process.env.NEXT_PUBLIC_BASE_URL,
    cancelUrl: cancelUrl || process.env.NEXT_PUBLIC_BASE_URL,
    notifyUrl: notifyUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/api/ipaymu/webhook`,
    referenceId: orderId,
    buyerName: customerName || "Pengguna",
    buyerPhone: customerWa || "",
    buyerEmail: customerEmail || "admin@jualbeliusupolmed.web.id",
  };

  const signature = generateIpaymuSignature(body, "POST");
  const timestamp = new Date().toISOString().replace(/T/, '').replace(/\..+/, '').replace(/-/g, '').replace(/:/g, '');

  const response = await fetch(`${baseUrl}/api/v2/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "signature": signature,
      "va": va,
      "timestamp": timestamp,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  
  if (data.Status !== 200) {
    console.error("iPaymu Error:", data);
    throw new Error(data.Message || "Gagal membuat link pembayaran iPaymu");
  }

  return {
    sessionId: data.Data.SessionID,
    url: data.Data.Url,
    orderId,
  };
}
