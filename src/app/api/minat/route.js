import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendWa } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";

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

    const { listing_id, buyer_wa, buyer_name } = await req.json();
    if (!listing_id)
      return NextResponse.json({ error: "listing_id wajib" }, { status: 400 });

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
      const buyerLink = buyer_wa.startsWith("0")
        ? `62${buyer_wa.slice(1)}`
        : buyer_wa;

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
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

