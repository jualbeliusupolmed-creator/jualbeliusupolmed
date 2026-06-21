import crypto from "crypto";



function generateSignature(clientId, requestId, requestTimestamp, requestTarget, digest, secret) {
  const component =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${requestTimestamp}\n` +
    `Request-Target:${requestTarget}\n` +
    `Digest:${digest}`;

  return crypto.createHmac("sha256", secret).update(component).digest("base64");
}

export async function createDokuTransaction({
  orderId,
  amount,
  customerName,
  customerWa,
  itemName,
}) {
  const CLIENT_ID = process.env.DOKU_CLIENT_ID;
  const SECRET_KEY = process.env.DOKU_SECRET_KEY;
  const isProduction = process.env.DOKU_IS_PRODUCTION === "true";
  const BASE_URL = isProduction
    ? "https://api.doku.com"
    : "https://api-sandbox.doku.com";
  const requestTarget = "/checkout/v1/payment";
  const url = `${BASE_URL}${requestTarget}`;
  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString().substring(0, 19) + "Z";

  // DOKU Jokul Checkout JSON body
  const requestBody = {
    order: {
      invoice_number: orderId,
      amount: Math.round(amount),
    },
    payment: {
      payment_due_date: 60, // 60 minutes
    },
    customer: {
      id: customerWa || "000",
      name: (customerName || "Pengguna").slice(0, 50),
      email: "info@jualbelimedan.web.id", // Optional default
      phone: customerWa || "",
    },
  };

  const stringifiedBody = JSON.stringify(requestBody);
  const digest = crypto.createHash("sha256").update(stringifiedBody).digest("base64");

  const signature = generateSignature(
    CLIENT_ID,
    requestId,
    requestTimestamp,
    requestTarget,
    digest,
    SECRET_KEY
  );

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Client-Id": CLIENT_ID,
      "Request-Id": requestId,
      "Request-Timestamp": requestTimestamp,
      "Signature": `HMACSHA256=${signature}`,
      "Content-Type": "application/json",
    },
    body: stringifiedBody,
  });

  const responseData = await response.json();

  if (!response.ok) {
    throw new Error(responseData.error?.message || responseData.message || "Gagal membuat transaksi DOKU");
  }

  // DOKU checkout response usually has response.payment.url
  return {
    token: responseData.response?.payment?.token_id || "",
    redirect_url: responseData.response?.payment?.url,
    order_id: orderId,
  };
}
