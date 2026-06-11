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

// Same as safe() but also returns the count for pagination
async function safePaginated(promise, fallback) {
  try {
    const res = await promise;
    return { data: res?.data ?? fallback, count: res?.count ?? 0 };
  } catch {
    return { data: fallback, count: 0 };
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
  "blogs",
];

export const DEFAULT_DATA = {
  listings: [],
  payments: [],
  blacklist: [],
  reports: [],
  ratings: [],
  categories: [],
  blogs: [],
  settings: DEFAULT_SETTINGS,
  wanted: [],
  sellersList: [],
  revenue: 0,
  pendingCount: 0,
  listingsTotal: 0,
  paymentsTotal: 0,
  currentPage: 1,
  pageSize: 100,
};

// PERFORMANCE: Records per page for paginated queries (was 500 flat)
const PAGE_SIZE = 100;

export async function getAdminStats(page = 1) {
  const supa = getAdminClient();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // PAGINATED: listings and payments now use range() instead of loading all at once
  const [listingsRes, paymentsRes, blacklist, categories, settings, wanted, blogs] = await Promise.all([
    safePaginated(
      supa
        .from("listings")
        .select("*, seller_profiles!fk_ignore(trusted_seller, subscription_tier)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to),
      []
    ).catch(() => safePaginated(
      // Fallback if foreign key doesn't exist
      supa
        .from("listings")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to),
      []
    )),
    safePaginated(
      supa
        .from("payments")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to),
      []
    ),
    safe(supa.from("blacklist").select("*").order("created_at", { ascending: false }), []),
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
      supa
        .from("wanted_listings")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
      []
    ),
    safe(
      supa
        .from("blogs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100),
      []
    ),
  ]);

  const listings = listingsRes.data || [];
  const listingsTotal = listingsRes.count;
  const payments = paymentsRes.data || [];
  const paymentsTotal = paymentsRes.count;

  // FIX: Manual join for seller_profiles if it failed earlier
  if (listings.length > 0 && listings[0] && listings[0].seller_profiles === undefined) {
    const sellerWas = [...new Set(listings.map((l) => l.seller_wa).filter(Boolean))];
    if (sellerWas.length > 0) {
      const { data: profiles } = await supa
        .from("seller_profiles")
        .select("wa, trusted_seller, subscription_tier")
        .in("wa", sellerWas);
      const profileMap = new Map((profiles || []).map((p) => [p.wa, p]));
      listings.forEach((l) => {
        l.seller_profiles = profileMap.get(l.seller_wa) || null;
      });
    }
  }

  // Reports and ratings stay reasonable with explicit limits
  const [reports, ratings] = await Promise.all([
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
  ]);

  // Compute Sellers List from currently loaded listings page
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
        trusted_seller: l.seller_profiles?.trusted_seller || false,
        subscription_tier: l.seller_profiles?.subscription_tier || "free",
      });
    }
    const stat = sellerMap.get(l.seller_wa);
    stat.total_iklan++;
    if (l.status === "active") stat.active_iklan++;
    if (l.status === "sold") stat.sold_iklan++;
  });
  const sellersList = Array.from(sellerMap.values()).sort((a, b) => b.total_iklan - a.total_iklan);

  // Compute Revenue and Pending Count from current payments page
  let revenue = 0;
  let pendingCount = 0;
  payments.forEach((p) => {
    if (p.status === "paid") revenue += Number(p.amount || 0);
    if (p.status === "pending") pendingCount++;
  });

  return {
    listings,
    payments,
    blacklist,
    reports,
    ratings,
    categories,
    settings,
    wanted,
    blogs,
    sellersList,
    revenue,
    pendingCount,
    listingsTotal,
    paymentsTotal,
    currentPage: page,
    pageSize: PAGE_SIZE,
  };
}
