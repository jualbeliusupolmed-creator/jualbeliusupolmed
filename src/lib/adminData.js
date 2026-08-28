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

// Daftar toko penjual, DENGAN query tersendiri — sengaja tidak ditumpangkan ke
// select seller_profiles yang dipakai tab Penjual. Kolom storefront datang dari
// migration_storefront.sql yang harus dijalankan manual di Supabase; selama itu
// belum dilakukan, query yang menyebut kolomnya akan gagal. Kalau digabung,
// kegagalan itu ikut mengosongkan daftar penjual — satu migrasi yang tertinggal
// mematikan tab yang tidak ada hubungannya dengan toko.
//
// Bedanya dengan safe(): di sini `error` dipakai, bukan dibuang. "Belum ada toko"
// dan "kolomnya belum ada" sama-sama menghasilkan daftar kosong, dan hanya satu
// dari keduanya yang bisa diperbaiki admin.
async function muatToko(supa) {
  const DASAR = "wa, name, slug, store_name, tagline, store_area, store_open, store_announcement, store_updated_at";
  // Kolom persetujuan lahir di migrasi BAGIAN 26. Kalau belum ada, SELECT-nya
  // gagal SELURUHNYA — dan tab Toko akan memajang "kolom toko belum ada",
  // padahal yang belum ada cuma kolom yang baru. Jadi dicoba dua kali:
  // dengan status dulu, lalu tanpa. Yang hilang cuma lencana statusnya.
  const coba = async (kolom) =>
    supa.from("seller_profiles").select(kolom)
      .not("slug", "is", null)
      .order("store_updated_at", { ascending: false, nullsFirst: false })
      .limit(500);
  try {
    let { data, error } = await coba(`${DASAR}, store_status, store_requested_at, store_reject_note`);
    if (error) ({ data, error } = await coba(DASAR));
    if (error) return { stores: [], storesMigrationMissing: true, storesError: error.message };
    // Yang menunggu persetujuan naik ke atas: daftar yang mengubur permohonan
    // di bawah dua ratus toko lama sama saja dengan tidak punya daftar.
    const urut = { menunggu: 0, ditolak: 1, aktif: 2, draf: 3 };
    const stores = (data || []).sort(
      (a, b) => (urut[a.store_status] ?? 2) - (urut[b.store_status] ?? 2)
    );
    return { stores, storesMigrationMissing: false, storesError: null };
  } catch (e) {
    return { stores: [], storesMigrationMissing: true, storesError: e.message };
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
  // Kontak Pembeli. Menunya sudah dipajang di nav.js, panelnya sudah ada
  // (BuyerContactsPanel), API-nya sudah ada (/api/admin/buyer-contacts), dan
  // AdminPanel sudah siap merendernya — yang hilang cuma baris ini, sehingga
  // /admin/[tab] memanggil notFound() dan menunya berakhir 404 saat diklik.
  // Persis kasus "blacklist" yang diceritakan di bawah, dengan arah terbalik.
  "kontak_pembeli",
  "reports",
  "dicari",
  "kategori",
  "pengaturan",
  // "blacklist" DIHAPUS dari sini: isinya sudah lama pindah ke dalam tab
  // "penjual", dan tidak ada satu pun tautan yang menuju ke sana. Yang tersisa
  // cuma alamat sah yang diam-diam menampilkan Ringkasan — orang yang mengetiknya
  // mengira blacklist-nya kosong, padahal ia sedang melihat halaman lain.
  "penjual",
  // Toko penjual (/toko/[slug]). Storefront-nya sudah tayang untuk pembeli sejak
  // 678667f, tapi admin tidak punya satu pun tempat untuk melihatnya: tidak tahu
  // siapa yang sudah punya toko, tidak tahu ada slug yang menyerempet nama orang
  // lain, tidak bisa menutup toko yang bermasalah. Halaman publik tanpa jendela
  // pengawasan itu cuma soal waktu sampai jadi masalah.
  "toko",
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
  penulisBadge: [],
  settings: DEFAULT_SETTINGS,
  wanted: [],
  sellersList: [],
  stores: [],
  storesMigrationMissing: false,
  storesError: null,
  profileRequests: [],
  revenue: 0,
  pendingCount: 0,
  listingsTotal: 0,
  paymentsTotal: 0,
  pwaInstallsTotal: 0,
  outboxPending: 0,
  currentPage: 1,
  pageSize: 100,
};

// PERFORMANCE: Records per page for paginated queries (was 500 flat)
const PAGE_SIZE = 100;

export async function getAdminStats(page = 1, tab = null) {
  const supa = getAdminClient();

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Hanya memuat tabel yang diperlukan oleh tab yang sedang aktif
  const fetchListings = ["listings", "transaksi", "rating"].includes(tab) || !tab;
  const fetchPayments = ["transaksi", "tawaran"].includes(tab) || !tab;
  const fetchCategories = ["kategori", "listings"].includes(tab) || !tab;
  const fetchSettings = ["pengaturan", "ai"].includes(tab) || !tab;
  const fetchWanted = ["dicari"].includes(tab) || !tab;
  const fetchBlogs = ["blogs"].includes(tab) || !tab;
  
  const fetchStores = ["toko"].includes(tab) || !tab;
  const fetchReports = ["reports"].includes(tab) || !tab;
  const fetchRatings = ["rating"].includes(tab) || !tab;
  const fetchSellers = ["penjual", "broadcast"].includes(tab) || !tab;
  const fetchProfileReqs = ["profil_request"].includes(tab) || !tab;

  const [listingsRes, paymentsRes, blacklist, categories, settings, wanted, blogs, penulisBadge, pwaInstallsRes, outboxRes] = await Promise.all([
    fetchListings ? safePaginated(
      fetchListingsWithProfiles(
        supa.from("listings").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to)
      ), []
    ) : Promise.resolve({ data: [], count: 0 }),
    
    fetchPayments ? safePaginated(
      supa.from("payments").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to), []
    ) : Promise.resolve({ data: [], count: 0 }),
    
    Promise.resolve([]), // blacklist sudah tidak dipakai
    
    fetchCategories ? safe(
      supa.from("categories").select("*").order("sort_order", { ascending: true }).order("name", { ascending: true }), []
    ) : Promise.resolve([]),
    
    fetchSettings ? getSettings() : Promise.resolve(DEFAULT_SETTINGS),
    
    fetchWanted ? safe(
      supa.from("wanted_listings").select("*").order("created_at", { ascending: false }).limit(200), []
    ) : Promise.resolve([]),
    
    fetchBlogs ? safe(
      supa.from("blogs").select("*").order("created_at", { ascending: false }).limit(100), []
    ) : Promise.resolve([]),

    // Penulis berbadge. Daftarnya kecil (hanya yang diberi izin terbit-langsung)
    // dan dibaca terpisah, BUKAN lewat embed foreign key: kalau nama relasinya
    // meleset, embed membuat seluruh query blogs gagal dan tab Artikel berubah
    // jadi kosong tanpa satu pun galat yang terlihat. Dua query kecil yang
    // gagal sendiri-sendiri lebih jujur daripada satu query yang diam.
    fetchBlogs ? safe(
      supa.from("seller_profiles").select("wa, name, blog_badge_at").eq("blog_badge", true), []
    ) : Promise.resolve([]),

    Promise.resolve({ data: [], count: 0 }), // pwa_installs pindah ke overview mandiri
    Promise.resolve({ data: [], count: 0 })  // wa_outbox pindah ke overview mandiri
  ]);

  const listings = listingsRes.data || [];
  const listingsTotal = listingsRes.count;
  const payments = paymentsRes.data || [];
  const paymentsTotal = paymentsRes.count;
  const pwaInstallsTotal = pwaInstallsRes.count;
  const outboxPending = outboxRes.count || 0;

  const [toko, reports, ratings, sellersFromProfiles, allListingStats, profileRequests] = await Promise.all([
    fetchStores ? muatToko(supa) : Promise.resolve({ stores: [], storesMigrationMissing: false, storesError: null }),
    
    fetchReports ? safe(
      supa.from("reports").select("*, listings(title, seller_wa)").order("created_at", { ascending: false }).limit(200), []
    ) : Promise.resolve([]),
    
    fetchRatings ? safe(
      supa.from("seller_ratings").select("*, listings(title)").order("created_at", { ascending: false }).limit(300), []
    ) : Promise.resolve([]),
    
    fetchSellers ? safe(
      supa.from("seller_profiles").select("wa, name, bio, trusted_seller, subscription_tier, subscription_expires_at, created_at").order("created_at", { ascending: false }).limit(1000), []
    ) : Promise.resolve([]),
    
    fetchSellers ? safe(
      supa.from("listings").select("seller_wa, status, seller_name").not("seller_wa", "is", null).limit(10000), []
    ) : Promise.resolve([]),
    
    fetchProfileReqs ? safe(
      supa.from("profile_change_requests").select("*").order("requested_at", { ascending: false }).limit(200), []
    ) : Promise.resolve([]),
  ]);

  const statMap = new Map();
  if (fetchSellers) {
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
  }

  const sellersList = fetchSellers ? sellersFromProfiles.map((sp) => {
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
  }).sort((a, b) => b.total_iklan - a.total_iklan) : [];

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
    penulisBadge,
    sellersList,
    stores: toko.stores,
    storesMigrationMissing: toko.storesMigrationMissing,
    storesError: toko.storesError,
    profileRequests,
    revenue,
    pendingCount,
    listingsTotal,
    paymentsTotal,
    pwaInstallsTotal,
    outboxPending,
    currentPage: page,
    pageSize: PAGE_SIZE,
  };
}
