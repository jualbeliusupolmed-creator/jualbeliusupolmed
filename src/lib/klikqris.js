// KlikQris API client — pengganti sistem QRIS manual (QiosPay + makeDynamicQris)
const BASE = "https://klikqris.com/api";

function headers() {
  return {
    "Content-Type": "application/json",
    "x-api-key": process.env.KLIKQRIS_API_KEY,
    "id_merchant": process.env.KLIKQRIS_MERCHANT_ID,
  };
}

/**
 * Buat transaksi QRIS dinamis baru.
 * @returns {{ qrisUrl, signature, totalAmount, expiredAt, orderId }}
 */
export async function createKlikQrisTransaction(orderId, amount, keterangan = "") {
  const callbackUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/api/payments/klikqris-callback`;

  const res = await fetch(`${BASE}/qris/create`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      order_id: orderId,
      id_merchant: process.env.KLIKQRIS_MERCHANT_ID,
      amount,
      keterangan,
      callback_url: callbackUrl,
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.status) {
    throw new Error(json.message || `KlikQris API error ${res.status}`);
  }

  const d = json.data;
  return {
    qrisUrl: d.qris_url,
    signature: d.signature,
    totalAmount: Math.round(parseFloat(d.total_amount)),
    expiredAt: d.expired_at,
    orderId: d.order_id,
  };
}

/**
 * Cek status transaksi KlikQris.
 * @returns {{ status: "PENDING"|"SUCCESS"|"EXPIRED", ... } | null}
 */
export async function checkKlikQrisStatus(orderId) {
  const res = await fetch(`${BASE}/qris/status/${encodeURIComponent(orderId)}`, {
    headers: {
      "x-api-key": process.env.KLIKQRIS_API_KEY,
      "id_merchant": process.env.KLIKQRIS_MERCHANT_ID,
    },
  });
  if (!res.ok) return null;
  const json = await res.json().catch(() => null);
  return json?.status ? json.data : null;
}
