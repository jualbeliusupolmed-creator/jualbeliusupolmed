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
  "penjual",
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
  sellersList: [],
  revenue: 0,
  pendingCount: 0,
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

  // Compute Sellers List
  const sellerMap = new Map();
  listings.forEach((l) => {
    if (!l.seller_wa) return;
    if (!sellerMap.has(l.seller_wa)) {
      sellerMap.set(l.seller_wa, {
        seller_wa: l.seller_wa,
        seller_name: l.seller_name || "Tanpa Nama",
        total_iklan: 0,
        active_iklan: 0,
        sold_iklan: 0,
      });
    }
    const stat = sellerMap.get(l.seller_wa);
    stat.total_iklan++;
    if (l.status === "active") stat.active_iklan++;
    if (l.status === "sold") stat.sold_iklan++;
  });
  const sellersList = Array.from(sellerMap.values()).sort((a, b) => b.total_iklan - a.total_iklan);

  // Compute Revenue and Pending Count
  let revenue = 0;
  let pendingCount = 0;
  payments.forEach((p) => {
    if (p.status === "paid") revenue += Number(p.amount || 0);
    if (p.status === "pending") pendingCount++;
  });

  return { listings, payments, blacklist, reports, ratings, categories, settings, wanted, sellersList, revenue, pendingCount };
}
