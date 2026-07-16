import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { verifyReceiptImage } from "@/lib/gemini";
import { sendWa, notifyAdminNewListing, postToGroup, postWantedToGroup } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const rl = rateLimit(getClientIp(req), { limit: 5, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: "Terlalu banyak permintaan. Coba lagi sebentar." }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

    const formData = await req.formData();
    const receiptFile = formData.get("receipt");
    const transactionId = formData.get("transactionId"); // = midtrans_order_id
    // CATATAN: nominal tagihan TIDAK diambil dari client — selalu dari DB (server).

    if (!receiptFile) {
      return NextResponse.json({ success: false, error: "Gambar struk tidak ditemukan." }, { status: 400 });
    }
    if (!transactionId) {
      return NextResponse.json({ success: false, error: "Transaksi tidak valid." }, { status: 400 });
    }

    const supa = getAdminClient();

    // Ambil tagihan dari SERVER. Idempoten: kalau sudah paid, jangan proses ulang.
    const { data: payment0 } = await supa
      .from("payments")
      .select("id, amount, status, meta")
      .eq("midtrans_order_id", transactionId)
      .single();
    if (!payment0) {
      return NextResponse.json({ success: false, error: "Transaksi tidak ditemukan." }, { status: 404 });
    }
    if (payment0.status === "paid") {
      return NextResponse.json({ success: true, alreadyPaid: true });
    }
    const serverAmount = Number(payment0.meta?.final_amount || payment0.amount) || 0;

    // Baca struk via AI Vision
    const buffer = Buffer.from(await receiptFile.arrayBuffer());
    const extractedData = await verifyReceiptImage(buffer, receiptFile.type);

    if (!extractedData.is_struk_valid) {
      return NextResponse.json({ success: false, error: "Gambar ditolak — ini bukan struk transfer yang sah." }, { status: 400 });
    }

    // Nominal WAJIB angka valid & >= tagihan server. Number.isFinite mencegah bug
    // lama: kalau nominal tak terbaca (NaN), dulu "NaN < tagihan" = false → lolos.
    const nominal = Number(extractedData.nominal);
    if (!Number.isFinite(nominal) || nominal < serverAmount) {
      return NextResponse.json({
        success: false,
        error: `Nominal struk (Rp ${Number.isFinite(nominal) ? nominal.toLocaleString("id-ID") : "?"}) kurang dari tagihan (Rp ${serverAmount.toLocaleString("id-ID")}) atau tidak terbaca. Kirim ulang struk yang jelas ya.`
      }, { status: 400 });
    }

    // Anti daur-ulang: tolak struk yang nomor referensinya sudah pernah dipakai.
    const refId = String(extractedData.ref_id || "").trim();
    if (refId) {
      const { data: dup } = await supa
        .from("payments")
        .select("id")
        .eq("status", "paid")
        .eq("meta->>receipt_ref", refId)
        .limit(1);
      if (dup && dup.length > 0) {
        return NextResponse.json({ success: false, error: "Struk ini sudah pernah dipakai untuk transaksi lain." }, { status: 400 });
      }
    }

    // Aktivasi ATOMIK — hanya kalau masih pending (cegah double-fulfill saat retry).
    const { data: payment } = await supa
      .from("payments")
      .update({ status: "paid", meta: { ...(payment0.meta || {}), receipt_ref: refId || null, receipt_nominal: nominal, paid_at: new Date().toISOString() } })
      .eq("midtrans_order_id", transactionId)
      .eq("status", "pending")
      .select("*, listings(id, title, price, category, condition, seller_name, seller_wa, listing_code, image_url, expires_at)")
      .single();

    if (!payment) {
      // Sudah diproses paralel — anggap sukses (idempoten).
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    // === Fulfillment (logika sama seperti webhook pembayaran) ===
    if (payment.type === "subscribe") {
      const until = new Date(Date.now() + 30 * 864e5).toISOString(); // 30 Hari
      await supa
        .from("seller_profiles")
        .update({ subscription_tier: "pro", subscription_expires_at: until })
        .eq("wa", payment.meta?.wa);
    } else if (payment.meta?.unlock_wanted_id) {
      await supa.from("wanted_unlocks").insert({
        wanted_id: payment.meta.unlock_wanted_id,
        unlocked_by_wa: payment.meta.requester_wa || null
      });
    } else if (payment.meta?.wanted_id) {
      const { data: wanted } = await supa
        .from("wanted_listings")
        .update({ status: "active" })
        .eq("id", payment.meta.wanted_id)
        .select()
        .single();
      if (wanted) postWantedToGroup(wanted).catch(console.error);
    } else if (payment.listing_id) {
      if (payment.type === "iklan" || payment.type === "bump") {
        const { data: listing } = await supa
          .from("listings")
          .update({ status: "active", bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id)
          .select()
          .single();
        if (listing && payment.type === "iklan") {
          Promise.allSettled([
            notifyAdminNewListing(listing),
            postToGroup(listing),
          ]).catch(console.error);
        }
      } else if (payment.type === "featured") {
        const days = payment.meta?.days || 1;
        const until = new Date(Date.now() + days * 864e5).toISOString();
        await supa
          .from("listings")
          .update({ featured: true, featured_until: until, bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id);
      } else if (payment.type === "renewal") {
        const until = new Date(Date.now() + 30 * 864e5).toISOString(); // 30 Hari
        await supa
          .from("listings")
          .update({ status: "active", expires_at: until, bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id);
      } else if (payment.type === "autobump") {
        const until = new Date(Date.now() + 7 * 864e5).toISOString(); // 7 Hari
        await supa
          .from("listings")
          .update({ auto_bump_until: until, bumped_at: new Date().toISOString() })
          .eq("id", payment.listing_id);
      } else if (payment.type === "sold_fee") {
        await supa
          .from("listings")
          .update({ status: "sold", stock: 0 })
          .eq("id", payment.listing_id);
      }

      // Notifikasi sukses ke penjual
      if (payment.listings?.seller_wa) {
        const ls = payment.listings;
        const productUrl = ls.id && ls.title
          ? `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/produk/${buildSlug(ls.title, ls.id)}`
          : null;
        const expDate = ls.expires_at
          ? new Date(ls.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
          : null;

        const typeMessages = {
          iklan:    `✅ *Iklan Kamu Sudah Tayang!* 🎉\n\n📦 *${ls.title}*\n${expDate ? `📅 Aktif hingga: *${expDate}*\n` : ""}🔑 Kode: *${ls.listing_code || "-"}*\n\nIklan sudah disebarkan ke grup WA marketplace!\n\n${productUrl ? `👉 ${productUrl}` : ""}`,
          bump:     `🔼 *Iklan Berhasil Disundul!*\n\n📦 *${ls.title}* sudah naik ke atas.\n\n${productUrl ? `👉 ${productUrl}` : ""}`,
          renewal:  `🔄 *Iklan Diperpanjang!*\n\n📦 *${ls.title}*\n${expDate ? `📅 Aktif hingga: *${expDate}*` : ""}`,
          featured: `⭐ *Featured Aktif!*\n\n📦 *${ls.title}* sekarang tampil sebagai Featured.\n\n${productUrl ? `👉 ${productUrl}` : ""}`,
          autobump: `🔄 *AutoBump Aktif!*\n\n📦 *${ls.title}* akan otomatis disundul setiap hari.`,
        };
        const message = typeMessages[payment.type]
          || `✅ *Pembayaran Sukses*\n\nLayanan untuk *"${ls.title}"* sudah diaktifkan! 🚀`;

        sendWa(ls.seller_wa, message).catch(console.error);
      }
    }

    return NextResponse.json({ success: true, data: extractedData });

  } catch (e) {
    console.error("verify-receipt error:", e);
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
