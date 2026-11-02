import { getAdminClient } from "@/lib/supabaseAdmin";
import { getAdminCampusScope } from "@/lib/admin-access";

/**
 * Mengambil analitik nasional atau regional berdasarkan cakupan peran admin.
 */
export async function getNationalAnalyticsData(actor) {
  const supa = getAdminClient();
  if (!supa) throw new Error("Database client not available");

  const isSuperadmin = actor?.role === "superadmin";
  const campusScopes = isSuperadmin ? ["all"] : await getAdminCampusScope(actor);

  // 1. Ambil data provinsi dan universitas
  const [provincesRes, universitiesRes, socialAccountsRes, rolloutRes] = await Promise.all([
    supa.from("provinces").select("id, name, status").order("name"),
    supa.from("universities").select("id, code, name, province_id, status").order("name"),
    supa
      .from("organization_social_accounts")
      .select("id, provider, handle, scope_type, scope_id, status, last_checked_at, provinces(name), universities(code, name)")
      .order("created_at", { ascending: false }),
    supa
      .from("provincial_rollout_checklists")
      .select("*, provinces(id, name)")
      .order("stage_number", { ascending: true }),
  ]);

  const provinces = provincesRes.data || [];
  const universities = universitiesRes.data || [];
  const socialAccounts = socialAccountsRes.data || [];
  const rolloutChecklists = rolloutRes.data || [];

  // 2. Ambil data listing
  let listingQuery = supa
    .from("listings")
    .select("id, title, price, status, campus, university_id, category, created_at")
    .order("created_at", { ascending: false })
    .limit(3000);

  if (!isSuperadmin && campusScopes.length > 0 && !campusScopes.includes("all")) {
    listingQuery = listingQuery.in("campus", campusScopes);
  }

  const { data: rawListings } = await listingQuery;
  const listings = rawListings || [];

  // 3. Ambil data distribusi omnichannel untuk metrik konversi per kanal
  const { data: distributions } = await supa
    .from("omnichannel_distributions")
    .select("id, channel_type, status, created_at, published_at")
    .limit(3000);

  // 4. Hitung metrik agregat nasional & regional
  const activeProvincesCount = provinces.filter((p) => p.status === "active").length;
  const activeUniversitiesCount = universities.filter((u) => u.status === "active").length;
  const activeListings = listings.filter((l) => l.status === "active");
  const soldListings = listings.filter((l) => l.status === "sold");

  // Estimasi GMV transaksi
  const totalGmv = soldListings.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const totalTransactions = soldListings.length;

  // Analisis breakdown per provinsi
  const provinceStatsMap = new Map();
  for (const prov of provinces) {
    provinceStatsMap.set(prov.id, {
      id: prov.id,
      name: prov.name,
      status: prov.status,
      universitiesCount: 0,
      totalListings: 0,
      activeListings: 0,
      soldListings: 0,
      gmv: 0,
      categories: new Map(),
    });
  }

  // Petakan universitas ke provinsi
  const univToProvMap = new Map();
  for (const u of universities) {
    univToProvMap.set(u.id.toLowerCase(), u.province_id);
    univToProvMap.set(u.code.toLowerCase(), u.province_id);
    const pStat = provinceStatsMap.get(u.province_id);
    if (pStat) pStat.universitiesCount += 1;
  }

  // Breakdown universitas
  const univStatsMap = new Map();
  for (const u of universities) {
    univStatsMap.set(u.code.toUpperCase(), {
      id: u.id,
      code: u.code,
      name: u.name,
      provinceId: u.province_id,
      provinceName: provinceStatsMap.get(u.province_id)?.name || "-",
      totalListings: 0,
      activeListings: 0,
      topProducts: [],
      categories: new Map(),
    });
  }

  // Agregasi listing ke provinsi dan universitas
  for (const l of listings) {
    const campusKey = (l.campus || "").toUpperCase();
    const univId = (l.university_id || "").toLowerCase();
    const provId = univToProvMap.get(univId) || univToProvMap.get(campusKey.toLowerCase()) || "sumatera-utara";

    const pStat = provinceStatsMap.get(provId);
    if (pStat) {
      pStat.totalListings += 1;
      if (l.status === "active") pStat.activeListings += 1;
      if (l.status === "sold") {
        pStat.soldListings += 1;
        pStat.gmv += Number(l.price || 0);
      }
      const cat = l.category || "Umum";
      pStat.categories.set(cat, (pStat.categories.get(cat) || 0) + 1);
    }

    const uStat = univStatsMap.get(campusKey);
    if (uStat) {
      uStat.totalListings += 1;
      if (l.status === "active") uStat.activeListings += 1;
      const cat = l.category || "Umum";
      uStat.categories.set(cat, (uStat.categories.get(cat) || 0) + 1);
      if (uStat.topProducts.length < 5 && l.status === "active") {
        uStat.topProducts.push({ id: l.id, title: l.title, price: l.price, category: l.category });
      }
    }
  }

  // Format array provinsi breakdown
  const provincesBreakdown = [...provinceStatsMap.values()].map((p) => {
    let topCategory = "-";
    let maxCatCount = 0;
    for (const [cat, count] of p.categories.entries()) {
      if (count > maxCatCount) {
        topCategory = cat;
        maxCatCount = count;
      }
    }
    return {
      id: p.id,
      name: p.name,
      status: p.status,
      universitiesCount: p.universitiesCount,
      totalListings: p.totalListings,
      activeListings: p.activeListings,
      soldListings: p.soldListings,
      gmv: p.gmv,
      topCategory,
    };
  }).sort((a, b) => b.totalListings - a.totalListings);

  // Format array universitas breakdown
  const universitiesBreakdown = [...univStatsMap.values()].map((u) => {
    let topCategory = "-";
    let maxCatCount = 0;
    for (const [cat, count] of u.categories.entries()) {
      if (count > maxCatCount) {
        topCategory = cat;
        maxCatCount = count;
      }
    }
    return {
      code: u.code,
      name: u.name,
      provinceName: u.provinceName,
      totalListings: u.totalListings,
      activeListings: u.activeListings,
      topCategory,
      topProducts: u.topProducts,
    };
  }).sort((a, b) => b.totalListings - a.totalListings);

  // 5. Performa Konversi Omnichannel per Kanal
  const channelMetricsMap = new Map([
    ["website", { label: "Website Resmi", total: 0, published: 0, failed: 0, scheduled: 0 }],
    ["instagram_university", { label: "Instagram Kampus", total: 0, published: 0, failed: 0, scheduled: 0 }],
    ["instagram_province", { label: "Instagram Provinsi", total: 0, published: 0, failed: 0, scheduled: 0 }],
    ["whatsapp_channel_university", { label: "WhatsApp Channel Kampus", total: 0, published: 0, failed: 0, scheduled: 0 }],
    ["whatsapp_channel_province", { label: "WhatsApp Channel Provinsi", total: 0, published: 0, failed: 0, scheduled: 0 }],
    ["whatsapp_group_community", { label: "WhatsApp Group Komunitas", total: 0, published: 0, failed: 0, scheduled: 0 }],
  ]);

  for (const d of distributions || []) {
    const metric = channelMetricsMap.get(d.channel_type);
    if (metric) {
      metric.total += 1;
      if (d.status === "published") metric.published += 1;
      else if (d.status === "failed") metric.failed += 1;
      else if (d.status === "scheduled") metric.scheduled += 1;
    }
  }

  const channelPerformance = [...channelMetricsMap.entries()].map(([type, data]) => ({
    channelType: type,
    label: data.label,
    total: data.total,
    published: data.published,
    failed: data.failed,
    scheduled: data.scheduled,
    successRate: data.total > 0 ? Math.round((data.published / data.total) * 100) : 100,
  }));

  // 6. Health Check Integrasi Sosial Media Wilayah
  const socialHealth = socialAccounts.map((acc) => ({
    id: acc.id,
    provider: acc.provider,
    handle: acc.handle,
    scopeType: acc.scope_type,
    regionName: acc.scope_type === "province" ? acc.provinces?.name : acc.universities?.name || acc.universities?.code,
    status: acc.status,
    lastCheckedAt: acc.last_checked_at,
    isHealthy: acc.status === "connected",
  }));

  return {
    isSuperadmin,
    campusScopes,
    summary: {
      totalProvinces: activeProvincesCount,
      totalUniversities: activeUniversitiesCount,
      totalListings: listings.length,
      activeListings: activeListings.length,
      soldListings: soldListings.length,
      totalGmv,
      totalTransactions,
      socialAccountsCount: socialAccounts.length,
      healthyAccountsCount: socialHealth.filter((s) => s.isHealthy).length,
    },
    provincesBreakdown,
    universitiesBreakdown,
    channelPerformance,
    socialHealth,
    rolloutRoadmap: rolloutChecklists,
  };
}

