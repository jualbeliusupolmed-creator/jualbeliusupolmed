import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";
import { formatWa } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  const buyerWa = formatWa(getSellerSession() || "");
  if (!buyerWa) return NextResponse.json({ error: "Masuk dengan akun JB untuk memesan." }, { status: 401 });
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
    .select("seller_wa,product:open_po_products(name,seller_contact_consent)")
    .eq("id", batchId)
    .maybeSingle();
  return NextResponse.json({
    ok: true,
    order: reserved,
    sellerContact: batch?.product?.seller_contact_consent ? batch.seller_wa : null,
    productName: batch?.product?.name || "Open PO",
  }, { status: 201 });
}

export async function PATCH(req) {
  const actorWa = formatWa(getSellerSession() || "");
  if (!actorWa) return NextResponse.json({ error: "Sesi JB berakhir." }, { status: 401 });
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
  return NextResponse.json({ ok: true, order: data });
}
