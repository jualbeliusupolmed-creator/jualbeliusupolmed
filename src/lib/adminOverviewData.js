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
    totalRatings: ratings.length,
    scopeLabel: "Seluruh platform",
  };
}

export async function getWorkspaceOverview(actor) {
  const [{ getAdminClient }, { getAdminCampusScope }, { applyListingScope, buildListingScopeValues }] = await Promise.all([
    import("@/lib/supabaseAdmin"),
    import("@/lib/admin-access"),
    import("@/lib/adminListingScope"),
  ]);

  const { getAdminScopeFilter } = await import("@/lib/admin-access");
  const scopeFilter = await getAdminScopeFilter(actor);

  if (scopeFilter.isAll) {
    return getOverviewStats();
  }

  const supa = getAdminClient();

  function buildScopedQuery(status) {
    let q = supa.from("listings").select("id", { count: "exact", head: true });
    if (scopeFilter.scopeType === "province" && scopeFilter.provinceId) {
      if (scopeFilter.campusCodes.length > 0) {
        q = q.or(`seller_province_id.eq.${scopeFilter.provinceId},campus.in.(${scopeFilter.campusCodes.join(",")})`);
      } else {
        q = q.eq("seller_province_id", scopeFilter.provinceId);
      }
    } else if (scopeFilter.campusCodes.length > 0) {
      const lower = scopeFilter.campusCodes.map((c) => c.toLowerCase());
      q = q.or(`campus.in.(${scopeFilter.campusCodes.join(",")}),university_id.in.(${lower.join(",")})`);
    } else {
      q = q.eq("id", "00000000-0000-0000-0000-000000000000");
    }
    if (status) q = q.eq("status", status);
    return q;
  }

  const [total, active, pending, sold, reports] = await Promise.all([
    buildScopedQuery(null),
    buildScopedQuery("active"),
    buildScopedQuery("pending"),
    buildScopedQuery("sold"),
    supa.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);

  if ([total, active, pending, sold].some((result) => result.error)) {
    throw new Error("Scoped overview query failed.");
  }

  return {
    listingsTotal: total.count || 0,
    activeTotal: active.count || 0,
    pendingTotal: pending.count || 0,
    soldTotal: sold.count || 0,
    openReportsTotal: reports.count || 0,
    campuses: scopeFilter.campusCodes,
    scopeLabel: scopeFilter.label,
  };
}
