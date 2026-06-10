import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";

async function safe(promise, fallback) {
  try {
    const res = await promise;
    return res?.data ?? fallback;
  } catch {
    return fallback;
  }
}

export const ADMIN_TABS = [
  "overview",
  "listings",
  "transaksi",
  "rating",
  "reports",
  "dicari",
  "kategori",
  "pengaturan",
  "blacklist",
];

export const DEFAULT_DATA = {
  listings: [],
  payments: [],
  blacklist: [],
  reports: [],
  ratings: [],
  categories: [],
  settings: DEFAULT_SETTINGS,
  wanted: [],
};

export async function getAdminStats() {
  const supa = getAdminClient();
  const [listings, payments, blacklist, reports, ratings, categories, settings, wanted] =
    await Promise.all([
      safe(
        supa.from("listings").select("*").order("created_at", { ascending: false }).limit(500),
        []
      ),
      safe(
        supa.from("payments").select("*").order("created_at", { ascending: false }).limit(500),
        []
      ),
      safe(supa.from("blacklist").select("*").order("created_at", { ascending: false }), []),
      safe(
        supa
          .from("reports")
          .select("*, listings(title, seller_wa)")
          .order("created_at", { ascending: false })
          .limit(200),
        []
      ),
      safe(
        supa
          .from("seller_ratings")
          .select("*, listings(title)")
          .order("created_at", { ascending: false })
          .limit(300),
        []
      ),
      safe(
        supa
          .from("categories")
          .select("*")
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
        []
      ),
      getSettings(),
      safe(
        supa.from("wanted_listings").select("*").order("created_at", { ascending: false }).limit(200),
        []
      ),
    ]);

  return { listings, payments, blacklist, reports, ratings, categories, settings, wanted };
}
