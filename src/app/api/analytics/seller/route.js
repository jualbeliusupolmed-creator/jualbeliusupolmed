import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

// GET /api/analytics/seller?wa=...
export async function GET(req) {
  const rl = rateLimit(getClientIp(req), { limit: 30, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(rl.retryAfter) } });

  const wa = formatWa(req.nextUrl.searchParams.get("wa") || "");
  if (!wa) return NextResponse.json({ error: "wa required" }, { status: 400 });

  const supa = getAdminClient();

  const [listingsRes, offersRes] = await Promise.all([
    supa
      .from("listings")
      .select("id, title, price, status, views, category, condition, image_url, bumped_at, created_at, expires_at")
      .eq("seller_wa", wa)
      .order("views", { ascending: false }),
    supa
      .from("price_offers")
      .select("id, status, offer_price, created_at, listings(title)")
      .eq("listings.seller_wa", wa)
      .order("created_at", { ascending: false }),
  ]);

  const listings = listingsRes.data || [];
  const offers = offersRes.data || [];

  const totalViews = listings.reduce((sum, l) => sum + (l.views || 0), 0);
  const totalActive = listings.filter(l => l.status === "active").length;
  const totalSold = listings.filter(l => l.status === "sold").length;
  const totalPending = listings.filter(l => l.status === "pending").length;

  const totalOffers = offers.length;
  const acceptedOffers = offers.filter(o => o.status === "accepted").length;

  const conversionRate = totalViews > 0
    ? ((totalSold / Math.max(totalViews, 1)) * 100).toFixed(1)
    : "0.0";

  const allListings = listings
    .filter(l => l.status === "active" || l.status === "sold")
    .map(l => ({
      id: l.id,
      title: l.title,
      price: l.price,
      status: l.status,
      views: l.views || 0,
      category: l.category,
      image_url: l.image_url,
    }));

  return NextResponse.json({
    summary: {
      totalViews,
      totalActive,
      totalSold,
      totalPending,
      totalOffers,
      acceptedOffers,
      conversionRate,
      totalListings: listings.length,
    },
    allListings,
    topListings: allListings.slice(0, 5), // backward compat
    recentOffers: offers.slice(0, 5),
  });
}
