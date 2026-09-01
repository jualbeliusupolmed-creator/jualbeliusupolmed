import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/analytics/seller?wa=...
export async function GET(req) {
  const rl = rateLimit(getClientIp(req), { limit: 60, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Silakan tunggu sebentar." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  const wa = formatWa(req.nextUrl.searchParams.get("wa") || "");
  if (!wa) return NextResponse.json({ error: "Nomor WhatsApp wajib diisi" }, { status: 400 });

  const supa = getAdminClient();

  // Fetch data paralel: listings, offers, dan seller_ratings
  const [listingsRes, offersRes, ratingsRes] = await Promise.all([
    supa
      .from("listings")
      .select("id, title, price, status, views, category, condition, image_url, bumped_at, created_at, expires_at, slug, type")
      .eq("seller_wa", wa)
      .order("views", { ascending: false }),
    supa
      .from("price_offers")
      .select("id, status, offer_price, created_at, listing_id, buyer_name, listings(title, price, image_url)")
      .eq("listings.seller_wa", wa)
      .order("created_at", { ascending: false }),
    supa
      .from("seller_ratings")
      .select("id, rating, comment, buyer_name, created_at, listing_id")
      .eq("seller_wa", wa)
      .order("created_at", { ascending: false }),
  ]);

  const listings = listingsRes.data || [];
  const offers = offersRes.data || [];
  const ratings = ratingsRes.data || [];

  // Summary Metrics
  const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
  const activeListings = listings.filter((l) => l.status === "active");
  const soldListings = listings.filter((l) => l.status === "sold");
  const pendingListings = listings.filter((l) => l.status === "pending");
  const expiredListings = listings.filter((l) => l.status === "expired" || l.status === "suspended");

  const totalActive = activeListings.length;
  const totalSold = soldListings.length;
  const totalPending = pendingListings.length;
  const totalExpired = expiredListings.length;

  // Financial Metrics
  const totalSoldRevenue = soldListings.reduce((sum, l) => sum + (Number(l.price) || 0), 0);
  const totalActiveAssetValue = activeListings.reduce((sum, l) => sum + (Number(l.price) || 0), 0);

  // Offers Metrics
  const totalOffers = offers.length;
  const acceptedOffers = offers.filter((o) => o.status === "accepted").length;
  const pendingOffers = offers.filter((o) => o.status === "pending").length;
  const rejectedOffers = offers.filter((o) => o.status === "rejected").length;

  // Ratings Metrics
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + (r.rating || 0), 0) / ratings.length).toFixed(1)
    : null;
  const totalRatings = ratings.length;

  // Conversion rate (sold / total views * 100)
  const conversionRate = totalViews > 0
    ? ((totalSold / Math.max(totalViews, 1)) * 100).toFixed(1)
    : "0.0";

  // Category Breakdown
  const catMap = {};
  listings.forEach((l) => {
    const cat = l.category || "Lainnya";
    if (!catMap[cat]) catMap[cat] = { name: cat, count: 0, views: 0, sold: 0 };
    catMap[cat].count += 1;
    catMap[cat].views += (l.views || 0);
    if (l.status === "sold") catMap[cat].sold += 1;
  });
  const categoryBreakdown = Object.values(catMap).sort((a, b) => b.views - a.views);

  // Smart Insights Generation
  const insights = [];
  
  if (totalActive > 0 && totalViews === 0) {
    insights.push({
      type: "tip",
      title: "Promosikan Iklanmu",
      message: "Iklanmu belum mendapatkan tayangan. Bagikan link tokomu ke grup WA atau media sosial agar cepat dilirik!",
      icon: "campaign",
    });
  } else if (Number(conversionRate) > 5) {
    insights.push({
      type: "success",
      title: "Konversi Penjualan Tinggi! ",
      message: `Konversi tokomu mencapai ${conversionRate}%. Harga dan deskripsi barangmu sangat menarik bagi mahasiswa.`,
      icon: "hot",
    });
  }

  // Check listings needing bump (active for > 3 days without bump)
  const now = Date.now();
  const staleListings = activeListings.filter((l) => {
    const lastBump = l.bumped_at ? new Date(l.bumped_at).getTime() : new Date(l.created_at).getTime();
    return (now - lastBump) > 3 * 24 * 60 * 60 * 1000;
  });

  if (staleListings.length > 0) {
    insights.push({
      type: "warning",
      title: `${staleListings.length} Iklan Butuh Disundul`,
      message: `Ada ${staleListings.length} barang yang posisinya mulai turun. Gunakan fitur Sundul (Bump) agar naik kembali ke urutan teratas.`,
      icon: "boost",
    });
  }

  if (pendingOffers > 0) {
    insights.push({
      type: "action",
      title: `${pendingOffers} Tawaran Menunggu Konfirmasi`,
      message: "Ada calon pembeli yang mengajukan penawaran harga. Segera respon di tab Tawaran untuk mengunci penjualan!",
      icon: "sales",
    });
  }

  if (categoryBreakdown.length > 0) {
    const topCat = categoryBreakdown[0];
    if (topCat.views > 10) {
      insights.push({
        type: "info",
        title: `Kategori Terpopuler: ${topCat.name}`,
        message: `${topCat.name} menyumbang tayangan terbanyak (${topCat.views} views). Menambah barang di kategori ini berpotensi laku lebih cepat.`,
        icon: "stats",
      });
    }
  }

  // Listing list mapping with engagement rates
  const allListings = listings.map((l) => {
    const listingOffers = offers.filter((o) => o.listing_id === l.id);
    const daysActive = Math.max(1, Math.ceil((now - new Date(l.created_at).getTime()) / (24 * 60 * 60 * 1000)));
    const avgViewsPerDay = ((l.views || 0) / daysActive).toFixed(1);

    return {
      id: l.id,
      title: l.title,
      price: l.price,
      status: l.status,
      views: l.views || 0,
      category: l.category,
      condition: l.condition,
      image_url: l.image_url,
      slug: l.slug,
      created_at: l.created_at,
      bumped_at: l.bumped_at,
      offers_count: listingOffers.length,
      days_active: daysActive,
      views_per_day: avgViewsPerDay,
    };
  });

  return NextResponse.json({
    summary: {
      totalViews,
      totalActive,
      totalSold,
      totalPending,
      totalExpired,
      totalSoldRevenue,
      totalActiveAssetValue,
      totalOffers,
      acceptedOffers,
      pendingOffers,
      rejectedOffers,
      avgRating,
      totalRatings,
      conversionRate,
      totalListings: listings.length,
    },
    categoryBreakdown,
    insights,
    allListings,
    topListings: allListings.slice(0, 5),
    recentOffers: offers.slice(0, 10),
    recentRatings: ratings.slice(0, 10),
  });
}
