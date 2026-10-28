export async function getOverviewStats() {
  const supa = (await import("@/lib/supabaseAdmin")).getAdminClient();

  const [
    listingsCountRes,
    paymentsCountRes,
    pwaInstallsCountRes,
    activeCountRes,
    soldCountRes,
    pendingCountRes,
    paidPaymentsRes,
    pendingPaymentsCountRes,
    allListingsForCatRes,
    reportsCountRes,
    ratingsRes
  ] = await Promise.all([
    supa.from("listings").select("id", { count: "exact", head: true }),
    supa.from("payments").select("id", { count: "exact", head: true }),
    supa.from("pwa_installs").select("id", { count: "exact", head: true }),
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"),
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("payments").select("amount, type, created_at").eq("status", "paid"),
    supa.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supa.from("listings").select("category"),
    supa.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supa.from("seller_ratings").select("rating")
  ]);

  const listingsTotal = listingsCountRes.count || 0;
  const paymentsTotal = paymentsCountRes.count || 0;
  const pwaInstallsTotal = pwaInstallsCountRes.count || 0;
  const activeTotal = activeCountRes.count || 0;
  const soldTotal = soldCountRes.count || 0;
  const pendingTotal = pendingCountRes.count || 0;
  const openReportsTotal = reportsCountRes.count || 0;

  const paidPayments = paidPaymentsRes.data || [];

  let revenue = 0;
  const pendingPaymentCount = pendingPaymentsCountRes.count || 0;
  paidPayments.forEach(p => revenue += Number(p.amount || 0));

  const perCat = {};
  if (allListingsForCatRes.data) {
    allListingsForCatRes.data.forEach(l => {
      perCat[l.category] = (perCat[l.category] || 0) + 1;
    });
  }

  const ratings = ratingsRes.data || [];
  const avgRating = ratings.length > 0 
    ? (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1) 
    : "–";

  return {
    listingsTotal,
    paymentsTotal,
    pwaInstallsTotal,
    activeTotal,
    soldTotal,
    pendingTotal,
    openReportsTotal,
    revenue,
    pendingPaymentCount,
    paidPayments,
    perCat,
    avgRating,
    totalRatings: ratings.length
  };
}

export async function getWorkspaceOverview(actor) {
  if (actor?.role === "superadmin") return getOverviewStats();
  const [{ getAdminClient }, { getAdminCampusScope }] = await Promise.all([
    import("@/lib/supabaseAdmin"),
    import("@/lib/admin-access"),
  ]);
  const campuses = await getAdminCampusScope(actor);
  if (!campuses?.length) return { activeTotal: 0, pendingTotal: 0, soldTotal: 0, listingsTotal: 0, campuses: [] };

  const supa = getAdminClient();
  const [total, active, pending, sold] = await Promise.all([
    supa.from("listings").select("id", { count: "exact", head: true }).in("campus", campuses),
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "active").in("campus", campuses),
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending").in("campus", campuses),
    supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold").in("campus", campuses),
  ]);
  return {
    listingsTotal: total.count || 0,
    activeTotal: active.count || 0,
    pendingTotal: pending.count || 0,
    soldTotal: sold.count || 0,
    campuses,
  };
}
