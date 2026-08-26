import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendWa } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";
import { formatWaForBaileys } from "@/lib/constants";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// POST /api/minat { listing_id, buyer_wa?, buyer_name? }
// -> log kontak pembeli + notif WA ke penjual
export async function POST(req) {
  try {
    const rl = rateLimit(`minat:${getClientIp(req)}`, { limit: 15, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu sering. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { listing_id } = body;
    if (!listing_id)
      return NextResponse.json({ error: "listing_id wajib" }, { status: 400 });

    // Endpoint ini meneruskan nomor & nama KIRIMAN KLIEN ke WA penjual — tanpa
    // pagar, ia jadi relay gratis untuk mengarahkan penjual ke nomor siapa pun
    // atas nama siapa pun. Nomor yang tidak lolos format Indonesia dianggap
    // tidak ada (kontak tetap dicatat, penjual tidak dikirimi tautan), dan nama
    // dipangkas dari baris baru / markup supaya tidak bisa menyusun pesan palsu
    // di dalam notifikasi.
    const buyer_wa = formatWaForBaileys(body.buyer_wa) || null;
    const buyer_name = String(body.buyer_name || "")
      .replace(/[\r\n*_~`]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || null;

    const supa = getAdminClient();
    const { data: listing } = await supa
      .from("listings")
      .select("id, title, listing_code, seller_wa, seller_name")
      .eq("id", listing_id)
      .single();
    if (!listing)
      return NextResponse.json({ error: "Listing tidak ada" }, { status: 404 });

    // Log kontak ke buyer_contacts (fire-and-forget, jangan blok)
    supa.from("buyer_contacts").insert({
      listing_id: listing.id,
      listing_code: listing.listing_code,
      listing_title: listing.title,
      seller_wa: listing.seller_wa,
      seller_name: listing.seller_name,
      buyer_wa: buyer_wa || null,
      buyer_name: buyer_name || null,
      deal_status: "pending",
    }).then(() => {}, () => {});

    // Kirim notif ke penjual jika ada buyer_wa (berarti user sudah isi data)
    if (buyer_wa && listing.seller_wa) {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
      const slug = buildSlug(listing.title, listing.id);
      const buyerLink = buyer_wa; // sudah tervalidasi 628xx oleh formatWaForBaileys

      const msg =
        `👀 *Ada yang Tertarik dengan Iklanmu!*\n\n` +
        `Hei ${listing.seller_name || "Penjual"},\n` +
        `*${buyer_name || "Seseorang"}* baru saja mengklik tombol hubungi di iklanmu:\n\n` +
        `📦 *${listing.title}*\n\n` +
        `📞 Hubungi mereka sekarang:\n` +
        `wa.me/${buyerLink}\n\n` +
        `👉 Lihat iklan: ${baseUrl}/produk/${slug}`;

      sendWa(listing.seller_wa, msg, null, null, {
        jenis: "buyer_contact",
        listingId: listing.id,
      }).catch(() => {});
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jawabGalat(e);
  }
}

