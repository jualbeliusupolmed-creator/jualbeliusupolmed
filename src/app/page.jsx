import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { getCategories } from "@/lib/categories";
import HomeBrowser from "./HomeBrowser";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

async function getInitialData() {
  try {
    const supa = getAdminClient();
    const { data, count } = await supa
      .from("listings")
      .select("*", { count: "exact" })
      .eq("status", "active")
      .order("featured", { ascending: false })
      .order("bumped_at", { ascending: false })
      .range(0, PAGE_SIZE - 1);
    return { listings: data || [], total: count || 0 };
  } catch (e) {
    console.error("getInitialData:", e?.message);
    return { listings: [], total: 0 };
  }
}

async function getFeatured() {
  try {
    const supa = getAdminClient();
    const { data } = await supa
      .from("listings")
      .select("id,title,price,image_url")
      .eq("status", "active")
      .eq("featured", true)
      .order("bumped_at", { ascending: false })
      .limit(6);
    return data || [];
  } catch {
    return [];
  }
}

async function getTrending() {
  try {
    const supa = getAdminClient();
    const { data } = await supa
      .from("listings")
      .select("id,title,price,image_url,views")
      .eq("status", "active")
      .gt("views", 0)
      .order("views", { ascending: false })
      .limit(8);
    return data || [];
  } catch {
    // kolom views mungkin belum ada (migration belum dijalankan) — abaikan.
    return [];
  }
}

export default async function HomePage() {
  const [{ listings, total }, featured, trending, settings, categories] =
    await Promise.all([
      getInitialData(),
      getFeatured(),
      getTrending(),
      getSettings(),
      getCategories(),
    ]);
  return (
    <HomeBrowser
      initialListings={listings}
      initialTotal={total}
      featured={featured}
      trending={trending}
      categories={categories}
      heroTitle={settings.site?.heroTitle}
      heroSubtitle={settings.site?.heroSubtitle}
    />
  );
}
