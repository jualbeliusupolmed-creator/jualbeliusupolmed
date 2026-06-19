import midtransClient from "midtrans-client";

export async function createQrisTransaction({
  orderId,
  amount,
  customerName,
  customerWa,
  itemName,
}) {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === "true";
  
  let coreApi = new midtransClient.CoreApi({
    isProduction: isProduction,
    serverKey: process.env.MIDTRANS_SERVER_KEY || "",
    clientKey: process.env.MIDTRANS_CLIENT_KEY || ""
  });

  let parameter = {
    "payment_type": "qris",
    "transaction_details": {
      "gross_amount": Math.round(amount),
      "order_id": orderId,
    },
    "customer_details": {
      "first_name": customerName ? customerName.slice(0, 50) : "Pengguna",
      "phone": customerWa || ""
    },
    "item_details": [
      {
        "id": "ITEM1",
        "price": Math.round(amount),
        "quantity": 1,
        "name": itemName ? itemName.slice(0, 50) : "Pembayaran JualBeli USU"
      }
    ]
  };

  const response = await coreApi.charge(parameter);
  
  let qrisUrl = "";
  if (response.actions && response.actions.length > 0) {
    qrisUrl = response.actions[0].url;
  }

  return {
    token: response.transaction_id || "",
    redirect_url: qrisUrl, // Ini URL gambar QRIS dari Midtrans
    order_id: orderId,
    qr_string: response.qr_string || "" // Ini raw string QRIS
  };
}
