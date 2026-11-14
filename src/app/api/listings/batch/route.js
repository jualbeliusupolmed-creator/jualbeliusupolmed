import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSessionAsync } from "@/lib/auth";
import { applyMarketplaceProvinceScope, loadSessionMarketplaceScope } from "@/lib/marketplaceRegion";

export const dynamic = "force-dynamic";

// GET /api/listings/batch?ids=id1,id2,id3
// Kembalikan status terkini (id, status, price, title, stock) untuk list ID
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("ids") || "";
  const ids = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 50);

  if (ids.length === 0) return NextResponse.json([]);

  const supa = getAdminClient();
  let query = supa
    .from("listings")
    .select("id, status, price, title, stock, image_url, category, seller_name, campus, type, condition, rental_period, created_at, featured, sponsored_until, seller_profiles(name, verified, avatar_url, subscription_tier, trusted_seller)")
    .in("id", ids);

  const sessionIdentity = await getSellerSessionAsync();
  if (sessionIdentity) {
    try {
      const { scope } = await loadSessionMarketplaceScope(supa, sessionIdentity);
      if (!scope) return NextResponse.json([]);
      query = applyMarketplaceProvinceScope(query, scope);
      if (!query) return NextResponse.json([]);
    } catch {
      return NextResponse.json([], { status: 503 });
    }
  }

  const { data, error } = await query;

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(data || []);
}
