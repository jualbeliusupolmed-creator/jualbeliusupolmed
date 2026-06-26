import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, DEFAULT_SETTINGS } from "@/lib/settings";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";

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
  "profil_request",
  "blogs",
  "wabot",
  "ai",
  "broadcast",
  "referral",
  "tawaran",
  "grouppost",
  "notifikasi",
  "distributor",
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
  profileRequests: [],
  revenue: 0,
  pendingCount: 0,
  listingsTotal: 0,
  paymentsTotal: 0,
  pwaInstallsTotal: 0,
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
  const [listingsRes, paymentsRes, blacklist, categories, settings, wanted, blogs, pwaInstallsRes] = await Promise.all([
    safePaginated(
      fetchListingsWithProfiles(
        supa
          .from("listings")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(from, to)
      ),
      []
    ),
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
    safePaginated(
      supa
        .from("pwa_installs")
        .select("id", { count: "exact", head: true }),
      []
    ),
  ]);

  const listings = listingsRes.data || [];
  const listingsTotal = listingsRes.count;
  const payments = paymentsRes.data || [];
  const paymentsTotal = paymentsRes.count;
  const pwaInstallsTotal = pwaInstallsRes.count;

  // Reports, ratings, seller profiles, dan profile requests — berjalan paralel
  const [reports, ratings, sellersFromProfiles, allListingStats, profileRequests] = await Promise.all([
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
    // Semua penjual terdaftar (bukan hanya halaman listing saat ini)
    safe(
      supa
        .from("seller_profiles")
        .select("wa, name, bio, trusted_seller, subscription_tier, subscription_expires_at, created_at")
        .order("created_at", { ascending: false })
        .limit(1000),
      []
    ),
    // Statistik listing ringan — hanya seller_wa + status (tanpa pagination)
    safe(
      supa
        .from("listings")
        .select("seller_wa, status, seller_name")
        .not("seller_wa", "is", null)
        .limit(10000),
      []
    ),
    // Permintaan ubah profil — tampilkan semua, pending duluan
    safe(
      supa
        .from("profile_change_requests")
        .select("*")
        .order("requested_at", { ascending: false })
        .limit(200),
      []
    ),
  ]);

  // Build comprehensive sellers list dari seller_profiles + allListingStats
  const statMap = new Map();
  for (const l of allListingStats) {
    if (!l.seller_wa) continue;
    if (!statMap.has(l.seller_wa)) {
      statMap.set(l.seller_wa, { total_iklan: 0, active_iklan: 0, sold_iklan: 0, seller_name: l.seller_name || "Tanpa Nama" });
    }
    const s = statMap.get(l.seller_wa);
    s.total_iklan++;
    if (l.status === "active") s.active_iklan++;
    if (l.status === "sold") s.sold_iklan++;
    if (l.seller_name && s.seller_name === "Tanpa Nama") s.seller_name = l.seller_name;
  }

  const sellersList = sellersFromProfiles.map((sp) => {
    const stats = statMap.get(sp.wa) || { total_iklan: 0, active_iklan: 0, sold_iklan: 0, seller_name: sp.name || "Tanpa Nama" };
    return {
      seller_wa: sp.wa,
      seller_name: sp.name || stats.seller_name,
      total_iklan: stats.total_iklan,
      active_iklan: stats.active_iklan,
      sold_iklan: stats.sold_iklan,
      trusted_seller: sp.trusted_seller || false,
      subscription_tier: sp.subscription_tier || "free",
    };
  }).sort((a, b) => b.total_iklan - a.total_iklan);

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
    profileRequests,
    revenue,
    pendingCount,
    listingsTotal,
    paymentsTotal,
    pwaInstallsTotal,
    currentPage: page,
    pageSize: PAGE_SIZE,
  };
}
