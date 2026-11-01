import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { sendWa } from "@/lib/fonnte";
import { buildSlug } from "@/lib/slug";
import { formatWaForBaileys, MARKETPLACE_WA } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

// POST /api/minat { listing_id, buyer_wa?, buyer_name?, offer_price?, notes? }
// -> log kontak pembeli + notif WA interaktif ke penjual
export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const rl = rateLimit(`minat:${ip}`, { limit: 20, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu sering. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { listing_id } = body;
    if (!listing_id) {
      return NextResponse.json({ error: "listing_id wajib" }, { status: 400 });
    }

    const buyer_wa = formatWaForBaileys(body.buyer_wa) || null;
    const buyer_name = String(body.buyer_name || "")
      .replace(/[\r\n*_~`]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || null;

    const offer_price =
      typeof body.offer_price === "number" &&
      Number.isSafeInteger(body.offer_price) &&
      body.offer_price > 0
        ? body.offer_price
        : null;

    const notes = String(body.notes || "")
      .replace(/[\r\n*_~`]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 200) || null;

    const supa = getAdminClient();
    const { data: listing } = await supa
      .from("listings")
      .select("id, title, listing_code, seller_wa, seller_name, price")
      .eq("id", listing_id)
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing tidak ada" }, { status: 404 });
    }

    // Catat ke log buyer_contacts
    let shortId = "";
    try {
      const { data: contactRow } = await supa
        .from("buyer_contacts")
        .insert({
          listing_id: listing.id,
          listing_code: listing.listing_code,
          listing_title: listing.title,
          seller_wa: listing.seller_wa,
          seller_name: listing.seller_name,
          buyer_wa: buyer_wa || null,
          buyer_name: buyer_name || null,
          deal_status: "pending",
        })
        .select("id")
        .single();

      if (contactRow?.id) {
        shortId = contactRow.id.split("-")[0];
      }
    } catch (insertErr) {
      console.warn("[api/minat] Gagal insert buyer_contacts:", insertErr.message);
    }

    // Anti-spam WA per listing & IP (maksimal 1 notifikasi WA per 30 detik untuk barang yang sama)
    const rlPerListing = rateLimit(`minat_notify:${listing_id}:${ip}`, {
      limit: 1,
      windowMs: 30_000,
    });

    if (rlPerListing.ok && listing.seller_wa) {
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL || "https://www.kampuskita.my.id";
      const slug = buildSlug(listing.title, listing.id);

      let msg = "";
      if (offer_price) {
        msg =
          `🔔 *Ada Tawaran Harga Masuk!*\n\n` +
          `Halo ${listing.seller_name || "Penjual"},\n` +
          `Seseorang mengajukan penawaran harga *${rupiah(offer_price)}*` +
          (listing.price ? ` (harga pasang: ${rupiah(listing.price)})` : "") +
          ` untuk:\n\n` +
          `📦 *${listing.title}*\n` +
          (notes ? `💬 Catatan: "${notes}"\n\n` : `\n`) +
          (buyer_wa
            ? `📱 Hubungi pembeli: wa.me/${buyer_wa}\n\n`
            : `📱 Calon pembeli akan segera menghubungi via WhatsApp.\n\n`) +
          (shortId
            ? `💡 Jika transaksi selesai/deal, konfirmasi ke bot:\n` +
              `👉 DEAL: wa.me/${MARKETPLACE_WA}?text=DEAL%20${shortId}\n` +
              `👉 GAGAL: wa.me/${MARKETPLACE_WA}?text=GAGAL%20${shortId}\n\n`
            : "") +
          `🔗 Cek barang: ${baseUrl}/produk/${slug}`;
      } else {
        msg =
          `🔔 *Ada yang Tertarik dengan Iklanmu!*\n\n` +
          `Halo ${listing.seller_name || "Penjual"},\n` +
          `*${buyer_name || "Seseorang"}* baru saja mengklik tombol hubungi di iklanmu:\n\n` +
          `📦 *${listing.title}*\n` +
          (notes ? `💬 Pesan: "${notes}"\n\n` : `\n`) +
          (buyer_wa
            ? `📱 Hubungi pembeli: wa.me/${buyer_wa}\n\n`
            : `📱 Calon pembeli akan segera menghubungi via WhatsApp.\n\n`) +
          (shortId
            ? `💡 Jika transaksi selesai/deal, konfirmasi ke bot:\n` +
              `👉 DEAL: wa.me/${MARKETPLACE_WA}?text=DEAL%20${shortId}\n` +
              `👉 GAGAL: wa.me/${MARKETPLACE_WA}?text=GAGAL%20${shortId}\n\n`
            : "") +
          `🔗 Cek barang: ${baseUrl}/produk/${slug}`;
      }

      sendWa(listing.seller_wa, msg, null, 14400, {
        jenis: "buyer_contact",
        listingId: listing.id,
      }).catch((err) => {
        console.warn("[api/minat] Gagal kirim WA lead:", err.message);
      });
    }

    return NextResponse.json({ ok: true, shortId: shortId || null });
  } catch (e) {
    return jawabGalat(e);
  }
}
