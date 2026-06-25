export async function getOverviewStats() {
  const supa = (await import("@/lib/supabaseAdmin")).getAdminClient();

  const [
    listingsCountRes,
    paymentsCountRes,
    pwaInstallsCountRes,
    activeCountRes,
    soldCountRes,
    pendingCountRes,
    allPaymentsRes,
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
    supa.from("payments").select("amount, type, status, created_at"),
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

  const allPayments = allPaymentsRes.data || [];
  const paidPayments = allPayments.filter(p => p.status === "paid");
  const pendingPayments = allPayments.filter(p => p.status === "pending");

  let revenue = 0;
  let pendingPaymentCount = pendingPayments.length;
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
