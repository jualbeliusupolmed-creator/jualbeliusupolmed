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

  if (actor?.role === "superadmin") {
    const { cookies } = await import("next/headers");
    const activeScope = cookies().get("kk_admin_active_scope")?.value || "all";
    if (!activeScope || activeScope === "all") return getOverviewStats();

    const { getSettings, getActiveCampuses, getCampusProvinceId } = await import("@/lib/settings");
    const allCampuses = getActiveCampuses(await getSettings());
    let scopedCampuses = [];
    let scopeLabel = "Cakupan tidak ditemukan";

    if (activeScope.startsWith("province:")) {
      const provinceId = activeScope.slice("province:".length).toLowerCase();
      scopedCampuses = allCampuses.filter((campus) => getCampusProvinceId(campus) === provinceId);
      scopeLabel = scopedCampuses.length
        ? `${scopedCampuses.map((campus) => campus.shortName).join(", ")} · ${provinceId.replaceAll("-", " ")}`
        : `${provinceId.replaceAll("-", " ")} · belum ada universitas aktif`;
    } else if (activeScope.startsWith("campus:") || activeScope.startsWith("university:")) {
      const wanted = activeScope.split(":").slice(1).join(":").toLowerCase();
      scopedCampuses = allCampuses.filter((campus) =>
        [campus.id, campus.shortName, campus.name].some((value) => String(value || "").toLowerCase() === wanted)
      );
      scopeLabel = scopedCampuses[0]?.name || "Universitas tidak ditemukan";
    }

    const campusNames = scopedCampuses.map((campus) => campus.shortName).filter(Boolean);
    const listingScope = buildListingScopeValues(campusNames, scopedCampuses);
    if (!campusNames.length) {
      return { listingsTotal: 0, activeTotal: 0, pendingTotal: 0, soldTotal: 0, campuses: [], scopeLabel };
    }

    const supa = getAdminClient();
    const [total, active, pending, sold] = await Promise.all([
      applyListingScope(supa.from("listings").select("id", { count: "exact", head: true }), listingScope),
      applyListingScope(supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"), listingScope),
      applyListingScope(supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"), listingScope),
      applyListingScope(supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"), listingScope),
    ]);
    if ([total, active, pending, sold].some((result) => result.error)) throw new Error("Scoped overview query failed.");
    return {
      listingsTotal: total.count || 0,
      activeTotal: active.count || 0,
      pendingTotal: pending.count || 0,
      soldTotal: sold.count || 0,
      campuses: campusNames,
      scopeLabel,
    };
  }

  const campuses = await getAdminCampusScope(actor);
  if (!campuses?.length) return { activeTotal: 0, pendingTotal: 0, soldTotal: 0, listingsTotal: 0, campuses: [], scopeLabel: "Belum ada cakupan" };

  const { getSettings, getActiveCampuses } = await import("@/lib/settings");
  const catalog = getActiveCampuses(await getSettings());
  const listingScope = buildListingScopeValues(campuses, catalog);
  const supa = getAdminClient();
  const [total, active, pending, sold] = await Promise.all([
    applyListingScope(supa.from("listings").select("id", { count: "exact", head: true }), listingScope),
    applyListingScope(supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"), listingScope),
    applyListingScope(supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "pending"), listingScope),
    applyListingScope(supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "sold"), listingScope),
  ]);
  if ([total, active, pending, sold].some((result) => result.error)) throw new Error("Scoped overview query failed.");
  return {
    listingsTotal: total.count || 0,
    activeTotal: active.count || 0,
    pendingTotal: pending.count || 0,
    soldTotal: sold.count || 0,
    campuses,
    scopeLabel: campuses.join(", "),
  };
}
