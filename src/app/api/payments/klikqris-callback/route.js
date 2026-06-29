import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { sendWa, notifyAdminNewListing, postToGroup, postWantedToGroup } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";

export const dynamic = "force-dynamic";

// POST /api/payments/klikqris-callback
// Dipanggil otomatis oleh KlikQris saat status transaksi berubah menjadi PAID/SUCCESS atau EXPIRED
export async function POST(req) {
  try {
    const settings = await getSettings();
    if ((settings.payment?.mode ?? "auto") !== "auto") {
      console.log("[klikqris-callback] mode manual, callback diabaikan");
      return NextResponse.json({ ok: false, message: "payment mode is manual" }, { status: 200 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ ok: false, message: "invalid payload" }, { status: 200 });

    console.log("[klikqris-callback] payload:", JSON.stringify(body));

    const { order_id, status, signature } = body;

    // Hanya proses status PAID atau SUCCESS
    const isPaid = status === "PAID" || status === "SUCCESS";
    if (!isPaid) {
      console.log("[klikqris-callback] status bukan paid:", status);
      return NextResponse.json({ ok: true, message: "status diabaikan" }, { status: 200 });
    }

    if (!order_id) {
      console.warn("[klikqris-callback] order_id tidak ada");
      return NextResponse.json({ ok: false, message: "order_id missing" }, { status: 200 });
    }

    const supa = getAdminClient();

    // Cari payment berdasarkan order_id
    const { data: payment } = await supa
      .from("payments")
      .select("*, listings(id, title, price, category, condition, seller_name, seller_wa, listing_code, image_url, expires_at)")
      .eq("midtrans_order_id", order_id)
      .maybeSingle();

    if (!payment) {
      console.warn("[klikqris-callback] payment tidak ditemukan:", order_id);
      return NextResponse.json({ ok: false, message: "payment not found" }, { status: 200 });
    }

    // Idempotency: abaikan jika sudah paid
    if (payment.status === "paid") {
      console.log("[klikqris-callback] sudah paid, abaikan:", order_id);
      return NextResponse.json({ ok: true, message: "already paid" }, { status: 200 });
    }

    // Verifikasi signature — tolak jika stored ada tapi incoming tidak cocok/absen
    const storedSignature = payment.meta?.klikqris_signature;
    if (storedSignature && storedSignature !== signature) {
      console.warn("[klikqris-callback] signature tidak cocok:", order_id);
      return NextResponse.json({ ok: false, message: "signature mismatch" }, { status: 200 });
    }

    // Jalankan fulfillment DULU — baru tandai paid setelah berhasil.
    // Urutan ini memastikan: kalau fulfillment gagal, gateway bisa retry (status masih pending).
    await fulfillPayment(supa, payment);

    await supa
      .from("payments")
      .update({ status: "paid" })
      .eq("id", payment.id);

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[klikqris-callback] error:", e);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}

async function fulfillPayment(supa, payment) {
  const ls = payment.listings;

  if (payment.type === "subscribe") {
    const until = new Date(Date.now() + 30 * 864e5).toISOString();
    await supa
      .from("seller_profiles")
      .update({ subscription_tier: "pro", subscription_expires_at: until })
      .eq("wa", payment.meta?.wa);

  } else if (payment.meta?.unlock_wanted_id) {
    await supa.from("wanted_unlocks").insert({
      wanted_id: payment.meta.unlock_wanted_id,
      unlocked_by_wa: payment.meta.requester_wa || null,
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
      const until = new Date(Date.now() + 30 * 864e5).toISOString();
      await supa
        .from("listings")
        .update({ status: "active", expired_at: until, bumped_at: new Date().toISOString() })
        .eq("id", payment.listing_id);
    } else if (payment.type === "autobump") {
      const until = new Date(Date.now() + 7 * 864e5).toISOString();
      await supa
        .from("listings")
        .update({ auto_bump_until: until, bumped_at: new Date().toISOString() })
        .eq("id", payment.listing_id);
    } else if (payment.type === "sold_fee") {
      await supa
        .from("listings")
        .update({ status: "sold", stock: 0 })
        .eq("id", payment.listing_id);
    } else if (payment.type === "sponsored") {
      const days = payment.meta?.days || 1;
      const until = new Date(Date.now() + days * 864e5).toISOString();
      await supa
        .from("listings")
        .update({ sponsored: true, sponsored_until: until, bumped_at: new Date().toISOString() })
        .eq("id", payment.listing_id);
    }
  }

  // Notifikasi WA ke penjual
  if (ls?.seller_wa) {
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
      sponsored:`📢 *Sponsored Aktif!*\n\n📦 *${ls.title}* sekarang tampil sebagai Sponsored.`,
    };
    const message = typeMessages[payment.type]
      || `✅ *Pembayaran Sukses*\n\nLayanan untuk *"${ls.title}"* sudah diaktifkan! 🚀`;

    sendWa(ls.seller_wa, message).catch(console.error);
  }
}
