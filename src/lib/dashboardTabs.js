export const DASHBOARD_TABS = [
  "jual",
  "dicari",
  "tawaran",
  "statistik",
  "pro",
  "referral",
  "profil",
  "blog",
  "ukm",
  "open-po",
];

export function resolveDashboardTab(tabParam, { isUkmAccount = false, loaded = false } = {}) {
  const requestedTab = DASHBOARD_TABS.includes(tabParam) ? tabParam : null;
  const defaultTab = loaded && isUkmAccount ? "ukm" : "jual";
  const nextTab = requestedTab || defaultTab;

  return nextTab === "ukm" && loaded && !isUkmAccount ? "jual" : nextTab;
}
