import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { tolakCron } from "@/lib/cronAuth";
import { sendWa } from "@/lib/fonnte";
import { rupiah } from "@/lib/fees";

export const dynamic = "force-dynamic";
// Loop kirim WA berjeda (anti-ban) mudah melewati batas default 10-15 detik —
// fungsi yang dibunuh di tengah loop meninggalkan sebagian penerima tanpa pesan.
export const maxDuration = 300;

export async function GET(req) {
  try {
    const tolak = tolakCron(req);
    if (tolak) return tolak;

    const supa = getAdminClient();
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Ambil semua seller yang punya iklan aktif
    const { data: activeListings, error: listErr } = await supa
      .from("listings")
      .select("id, title, price, views, seller_wa, seller_name, status, created_at, expires_at")
      .eq("status", "active");

    if (listErr) throw listErr;

    if (!activeListings || activeListings.length === 0) {
      return NextResponse.json({ ok: true, message: "Tidak ada iklan aktif saat ini." });
    }

    // Kelompokkan per seller_wa
    const sellersMap = new Map();
    for (const item of activeListings) {
      if (!item.seller_wa) continue;
      if (!sellersMap.has(item.seller_wa)) {
        sellersMap.set(item.seller_wa, {
          seller_name: item.seller_name || "Kak",
          listings: [],
        });
      }
      sellersMap.get(item.seller_wa).listings.push(item);
    }

    let sentCount = 0;
    let failCount = 0;

    for (const [wa, data] of sellersMap.entries()) {
      try {
        const { seller_name, listings } = data;
        const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
        
        // Urutkan listing terpopuler berdasarkan views
        const sortedListings = [...listings].sort((a, b) => (b.views || 0) - (a.views || 0));
        const topListings = sortedListings.slice(0, 3);

        // Ambil tawaran masuk 7 hari terakhir untuk listing-listing ini
        const listingIds = listings.map(l => l.id);
        const { count: offerCount } = await supa
          .from("price_offers")
          .select("id", { count: "exact", head: true })
          .in("listing_id", listingIds)
          .gte("created_at", sevenDaysAgo);

        // Ambil ulasan/rating terbaru
        const { data: recentRatings } = await supa
          .from("seller_ratings")
          .select("rating")
          .eq("seller_wa", wa)
          .gte("created_at", sevenDaysAgo);

        const newRatingCount = recentRatings?.length || 0;
        const avgRatingNew = newRatingCount > 0
          ? (recentRatings.reduce((s, r) => s + (r.rating || 0), 0) / newRatingCount).toFixed(1)
          : null;

        // Cek iklan yang segera kedaluwarsa (< 3 hari lagi)
        const expiringSoon = listings.filter(l => {
          if (!l.expires_at) return false;
          const diffDays = (new Date(l.expires_at).getTime() - now.getTime()) / (1000 * 3600 * 24);
          return diffDays > 0 && diffDays <= 3;
        });

        // Susun pesan laporan mingguan
        let msg = `📊 *Laporan Mingguan Iklanmu*\n`;
        msg += `Halo, *${seller_name}*! Berikut performa tokomu pekan ini:\n\n`;
        msg += `📦 *Total Iklan Aktif:* ${listings.length}\n`;
        msg += `👁️ *Total Dilihat Calon Pembeli:* ${totalViews.toLocaleString("id-ID")} kali\n`;
        if ((offerCount || 0) > 0) {
          msg += `💬 *Tawaran Masuk Minggu Ini:* ${offerCount} tawaran\n`;
        }
        if (newRatingCount > 0) {
          msg += `⭐ *Ulasan Baru:* ${newRatingCount} ulasan (Rata-rata: ${avgRatingNew}/5)\n`;
        }
        msg += `\n🔥 *Iklan Terpopuler Kamu:*\n`;
        topListings.forEach((tl, idx) => {
          msg += `${idx + 1}. ${tl.title} — ${rupiah(tl.price)} (${tl.views || 0} views)\n`;
        });

        if (expiringSoon.length > 0) {
          msg += `\n⏰ *Perhatian! Iklan Segera Kedaluwarsa:*\n`;
          expiringSoon.forEach(el => {
            msg += `• "${el.title}" (Ketik *.PERPANJANG* untuk lanjut tayang)\n`;
          });
        }

        // Tanpa angka karangan: klaim "3x lebih banyak pembeli" sudah pernah
        // dicabut dari /lomba dan /daftar-harga (22 Agu) karena tidak ada
        // datanya — jangan hidupkan lagi lewat pintu belakang pesan WA.
        msg += `\n💡 *Tips Jual Cepat:* Iklan yang disundul (*BUMP*) naik lagi ke urutan atas, dan *FEATURED* tampil menonjol di beranda.\n`;
        msg += `Ketik *.UPGRADE* atau *.SAYA* untuk kelola tokomu.`;

        await sendWa(wa, msg);
        sentCount++;

        // Beri jeda 2.5 detik antar pengiriman
        await new Promise(r => setTimeout(r, 2500));
      } catch (err) {
        console.error(`[weekly-report] failed for seller ${wa}:`, err?.message);
        failCount++;
      }
    }

    return NextResponse.json({
      ok: true,
      totalSellers: sellersMap.size,
      sentCount,
      failCount,
    });
  } catch (e) {
    console.error("Weekly-Report Cron Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
