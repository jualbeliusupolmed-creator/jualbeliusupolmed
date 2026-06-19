import midtransClient from "midtrans-client";

export async function createQrisTransaction({
  orderId,
  amount,
  customerName,
  customerWa,
  itemName,
}) {
  // BYPASS MIDTRANS (SEMENTARA)
  // Langsung kembalikan URL QRIS statis dari folder public (/qris.png)
  // Ini akan menyelesaikan masalah "stuck di sedang memuat qris"
  // dan membuat semua fitur pembayaran langsung dialihkan ke AI Validator.
  
  return {
    token: orderId,
    redirect_url: "/qris.png", // Akan dimuat oleh QRISModal
    order_id: orderId,
    qr_string: "QRIS_STATIS" 
  };
}
