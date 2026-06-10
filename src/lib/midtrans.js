import midtransClient from "midtrans-client";

const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";

export function getSnap() {
  return new midtransClient.Snap({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
  });
}

export function getCoreApi() {
  return new midtransClient.CoreApi({
    isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY,
    clientKey: process.env.MIDTRANS_CLIENT_KEY,
  });
}

// Buat Snap transaction token. Mengembalikan { token, redirect_url, order_id }
export async function createSnapTransaction({
  orderId,
  amount,
  customerName,
  customerWa,
  itemName,
}) {
  const snap = getSnap();
  const parameter = {
    transaction_details: {
      order_id: orderId,
      gross_amount: Math.round(amount),
    },
    item_details: [
      {
        id: orderId,
        price: Math.round(amount),
        quantity: 1,
        name: (itemName || "Pembayaran").slice(0, 50),
      },
    ],
    customer_details: {
      first_name: customerName || "Pengguna",
      phone: customerWa || "",
    },
    credit_card: { secure: true },
  };
  const tx = await snap.createTransaction(parameter);
  return { token: tx.token, redirect_url: tx.redirect_url, order_id: orderId };
}
