import { NextResponse } from "next/server";
import { getOpenPoSession } from "@/lib/openPoSession";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";
import { sendWa } from "@/lib/fonnte";
import { rupiah } from "@/lib/fees";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const session = getOpenPoSession();
  if (!session.wa) return NextResponse.json({ error: session.error }, { status: session.status });
  const buyerWa = session.wa;
  const limit = rateLimit(`open-po-order:${buyerWa}`, { limit: 20, windowMs: 60 * 60 * 1000 });
  if (!limit.ok) return NextResponse.json({ error: "Batas reservasi tercapai. Coba lagi nanti." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const batchId = String(body.batchId || "").trim();
  const buyerName = String(body.buyerName || "").trim().slice(0, 80);
  const quantity = Number(body.quantity);
  if (!batchId || buyerName.length < 2 || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 1000) {
    return NextResponse.json({ error: "Nama, batch, dan jumlah pesanan wajib diisi dengan benar." }, { status: 400 });
  }
  if (body.contactConsent !== true) return NextResponse.json({ error: "Setujui pembagian nomor WhatsApp kepada penjual agar reservasi dapat diproses." }, { status: 400 });

  const supa = getAdminClient();
  const { data: reserved, error } = await supa.rpc("reserve_open_po_order", {
    p_batch_id: batchId,
    p_buyer_wa: buyerWa,
    p_buyer_name: buyerName,
    p_quantity: quantity,
    p_buyer_contact_consent: true,
  });
  if (error) {
    const reason = String(error.message || "");
    const message = reason.includes("Kuota") ? "Kuota tidak mencukupi. Perbarui jumlah atau pilih batch lain."
      : reason.includes("sendiri") ? "Anda tidak dapat memesan batch milik akun sendiri."
        : reason.includes("tidak menerima") ? "Batch sudah ditutup dan tidak menerima pesanan baru."
          : "Reservasi gagal diproses. Segarkan halaman dan coba lagi.";
    return NextResponse.json({ error: message }, { status: 409 });
  }

  const { data: batch } = await supa.from("open_po_batches")
    .select("id, title, price_idr, quota, reserved_count, closes_at, pickup_point, pickup_note, seller_wa, product:open_po_products(name, unit, image_url, campus, seller_contact_consent)")
    .eq("id", batchId)
    .maybeSingle();

  const productName = batch?.product?.name || batch?.title || "Open PO";
  const orderIdShort = String(reserved.id || "").split("-")[0] || reserved.id;
  const unit = batch?.product?.unit || "pcs";
  const totalRupiah = rupiah(reserved.total_idr);
  const cleanSellerWa = formatWa(batch?.seller_wa) || batch?.seller_wa;
  const cleanBuyerWa = formatWa(buyerWa) || buyerWa;

  // 1. Notifikasi seketika via WhatsApp ke Penjual
  if (cleanSellerWa) {
    const sellerMsg =
      `🔔 *Pesanan Open PO Baru Masuk!* 📦\n\n` +
      `Ada mahasiswa yang baru saja memesan di batch kamu:\n\n` +
      `🏷️ *${productName}*\n` +
      `👤 Pembeli: *${buyerName}*\n` +
      `🔢 Jumlah: *${quantity} ${unit}*\n` +
      `💰 Total: *${totalRupiah}*\n` +
      `📍 Titik Ambil: *${batch?.pickup_point || "-"}*\n` +
      `🔖 Kode Pesanan: *#${orderIdShort}*\n\n` +
      `👉 *Hubungi Pembeli di WhatsApp:*\n` +
      `wa.me/${cleanBuyerWa}?text=${encodeURIComponent(`Halo ${buyerName}, terkait pesanan Open PO ${productName} (#${orderIdShort}) kamu di KampusKita...`)}\n\n` +
      `_Kelola pesanan di: https://www.kampuskita.my.id/dashboard/open-po_`;

    sendWa(cleanSellerWa, sellerMsg).catch((err) =>
      console.warn("[open-po-wa] Gagal kirim WA ke penjual:", err?.message)
    );
  }

  // 2. Notifikasi konfirmasi via WhatsApp ke Pembeli
  if (cleanBuyerWa) {
    let buyerMsg =
      `✅ *Reservasi Open PO Berhasil!* 🎉\n\n` +
      `Pesananmu telah tercatat di sistem KampusKita:\n\n` +
      `🏷️ *${productName}*\n` +
      `🔢 Jumlah: *${quantity} ${unit}*\n` +
      `💰 Total: *${totalRupiah}*\n` +
      `📍 Titik Ambil: *${batch?.pickup_point || "-"}*\n` +
      `🔖 Kode Pesanan: *#${orderIdShort}*\n\n`;

    if (batch?.product?.seller_contact_consent && cleanSellerWa) {
      buyerMsg +=
        `👉 *Kontak Penjual via WA:*\n` +
        `wa.me/${cleanSellerWa}?text=${encodeURIComponent(`Halo kak, saya ${buyerName} yang pesan Open PO ${productName} (#${orderIdShort})`)}\n\n`;
    }

    buyerMsg += `_Simpan kode pesanan ini untuk ditunjukkan saat pengambilan barang._`;

    sendWa(cleanBuyerWa, buyerMsg).catch((err) =>
      console.warn("[open-po-wa] Gagal kirim WA ke pembeli:", err?.message)
    );
  }

  return NextResponse.json({
    ok: true,
    order: reserved,
    sellerContact: batch?.product?.seller_contact_consent ? batch.seller_wa : null,
    productName,
  }, { status: 201 });
}

export async function PATCH(req) {
  const session = getOpenPoSession();
  if (!session.wa) return NextResponse.json({ error: session.error }, { status: session.status });
  const actorWa = session.wa;
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.orderId || "").trim();
  const status = body.status;
  if (!orderId || !["confirmed", "cancelled", "fulfilled"].includes(status)) {
    return NextResponse.json({ error: "Perubahan status pesanan tidak valid." }, { status: 400 });
  }
  const supa = getAdminClient();
  const { data, error } = await supa.rpc("update_open_po_order_status", {
    p_order_id: orderId,
    p_actor_wa: actorWa,
    p_status: status,
  });
  if (error) return NextResponse.json({ error: "Status pesanan tidak dapat diperbarui. Pastikan pesanan masih dapat diubah." }, { status: 409 });

  // Notifikasi perubahan status pesanan ke pembeli via WhatsApp
  try {
    const { data: orderDetails } = await supa
      .from("open_po_orders")
      .select("id, buyer_wa, buyer_name, quantity, total_idr, batch:open_po_batches(title, pickup_point, product:open_po_products(name, unit))")
      .eq("id", orderId)
      .maybeSingle();

    if (orderDetails && orderDetails.buyer_wa) {
      const cleanBuyerWa = formatWa(orderDetails.buyer_wa) || orderDetails.buyer_wa;
      const orderIdShort = String(orderId).split("-")[0];
      const pName = orderDetails.batch?.product?.name || orderDetails.batch?.title || "Open PO";

      let statusMsg = "";
      if (status === "confirmed") {
        statusMsg =
          `🎉 *Pesanan Open PO Dikonfirmasi!*\n\n` +
          `Penjual telah mengonfirmasi pesanan *#${orderIdShort}* untuk *${pName}*.\n` +
          `📍 Titik Ambil: *${orderDetails.batch?.pickup_point || "-"}*\n\n` +
          `Siap-siap ya kak saat jadwal pengambilan tiba!`;
      } else if (status === "fulfilled") {
        statusMsg =
          `✨ *Pesanan Open PO Selesai!* 🎁\n\n` +
          `Pesanan *#${orderIdShort}* (*${pName}*) telah diselesaikan oleh penjual.\n\n` +
          `Terima kasih sudah bertransaksi pre-order via KampusKita! 🙏`;
      } else if (status === "cancelled") {
        statusMsg =
          `⚠️ *Pesanan Open PO Dibatalkan*\n\n` +
          `Pesanan *#${orderIdShort}* untuk *${pName}* telah dibatalkan oleh penjual.`;
      }

      if (statusMsg) {
        sendWa(cleanBuyerWa, statusMsg).catch(() => {});
      }
    }
  } catch (notifErr) {
    console.warn("[open-po-status-notif] error:", notifErr?.message);
  }

  return NextResponse.json({ ok: true, order: data });
}
