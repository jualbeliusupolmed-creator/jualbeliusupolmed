import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";
import HomeBrowser from "./HomeBrowser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_SIZE = 20;

async function getInitialData() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("*, seller_wa", { count: "exact" })
      .eq("status", "active")
      .order("featured", { ascending: false, nullsFirst: false })
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .range(0, PAGE_SIZE - 1);
      
    const { data, count } = await fetchListingsWithProfiles(query);
    return { listings: data || [], total: count || 0 };
  } catch (e) {
    console.error("getInitialData:", e?.message);
    return { listings: [], total: 0 };
  }
}

async function getFeatured() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("id,title,price,image_url,seller_wa")
      .eq("status", "active")
      .eq("featured", true)
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .limit(6);
      
    const { data } = await fetchListingsWithProfiles(query);
    return data || [];
  } catch {
    return [];
  }
}

async function getTrending() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("id,title,price,image_url,views,seller_wa")
      .eq("status", "active")
      .gt("views", 0)
      .order("views", { ascending: false, nullsFirst: false })
      .limit(8);
      
    const { data } = await fetchListingsWithProfiles(query);
    return data || [];
  } catch {
    // kolom views mungkin belum ada (migration belum dijalankan) — abaikan.
    return [];
  }
}

async function getStats() {
  try {
    const supa = getAdminClient();
    const [wantedRes, soldRes, sellersRes] = await Promise.all([
      supa
        .from("wanted_listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      supa
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "sold"),
      supa.from("listings").select("seller_wa").limit(1000),
    ]);
    const sellerCount = new Set(
      (sellersRes.data || []).map((r) => r.seller_wa).filter(Boolean)
    ).size;
    return {
      wanted: wantedRes.count || 0,
      sold: soldRes.count || 0,
      sellers: sellerCount,
    };
  } catch {
    return { wanted: 0, sold: 0, sellers: 0 };
  }
}

export default async function HomePage() {
  const [{ listings, total }, featured, trending, settings, categories, stats] =
    await Promise.all([
      getInitialData(),
      getFeatured(),
      getTrending(),
      getSettings(),
      getCategories(),
      getStats(),
    ]);
  return (
    <HomeBrowser
      initialListings={listings}
      initialTotal={total}
      featured={featured}
      trending={trending}
      categories={categories}
      stats={stats}
      heroTitle={settings.site?.heroTitle}
      heroSubtitle={settings.site?.heroSubtitle}
      layoutOrder={settings.site?.layoutOrder}
    />
  );
}
