import { getOverviewStats } from "@/lib/adminOverviewData";
import { rupiah } from "@/lib/fees";
import { PageHeader } from "@/components/admin/ui";

function Kpi({ label, value, sub }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900">
      <p className="text-[13px] font-semibold text-gray-500 dark:text-neutral-400">{label}</p>
      <div className="mt-3">
        <p className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">{value}</p>
        {sub && <p className="mt-1.5 text-xs text-gray-400 dark:text-neutral-500">{sub}</p>}
      </div>
    </div>
  );
}

function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
      <div className="mb-6">
        <h3 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-sm text-gray-500 dark:text-neutral-400">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function localDay(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
}

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const stats = await getOverviewStats();
  
  const revByDay = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    revByDay.push({ key: localDay(d), total: 0 });
  }
  const idx = Object.fromEntries(revByDay.map((d, i) => [d.key, i]));
  stats.paidPayments.forEach((p) => {
    const k = localDay(p.created_at);
    if (k in idx) revByDay[idx[k]].total += p.amount || 0;
  });
  const maxRev = Math.max(1, ...revByDay.map((d) => d.total));
  const totalRev14 = revByDay.reduce((s, d) => s + d.total, 0);

  const PAYMENT_TYPES = [
    { key: "iklan", label: "Pasang Iklan" },
    { key: "bump", label: "Sundul Iklan" },
    { key: "featured", label: "Featured" },
    { key: "sold_fee", label: "Biaya Terjual" },
  ];

  return (
    <div className="space-y-8 max-w-7xl">
      <PageHeader
        title="Ringkasan"
        description="Statistik performa dan pendapatan marketplace USU & POLMED."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Iklan Aktif" value={stats.activeTotal} sub={`${stats.listingsTotal} total iklan`} />
        <Kpi label="Terjual" value={stats.soldTotal} sub={`${stats.pendingTotal} pending`} />
        <Kpi label="Total Revenue" value={rupiah(stats.revenue)} sub={`${stats.pendingPaymentCount} tertunda`} />
        <Kpi label="Instalasi PWA" value={stats.pwaInstallsTotal} sub="Pengguna" />
        <Kpi label="Rating Rata-rata" value={stats.avgRating} sub={`${stats.totalRatings} ulasan`} />
        <Kpi label="Laporan Terbuka" value={stats.openReportsTotal} sub="Butuh tindakan" />
      </div>

      {/* Graphs & Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue 14 Days */}
        <Card title="Pendapatan 14 Hari" subtitle={`Total: ${rupiah(totalRev14)}`}>
          <div className="flex h-48 items-end gap-2 pt-2">
            {revByDay.map((d) => {
              const heightPct = Math.max(4, (d.total / maxRev) * 100);
              return (
                <div key={d.key} className="group relative flex flex-1 flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t-md bg-neutral-900 transition-all hover:bg-neutral-700 dark:bg-white dark:hover:bg-neutral-200"
                    style={{ height: `${heightPct}%` }}
                    title={`${d.key}: ${rupiah(d.total)}`}
                  />
                  <span className="mt-3 text-[10px] font-medium text-gray-400 dark:text-neutral-500">
                    {d.key.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Listing per Category */}
        <Card title="Listing per Kategori" subtitle="Distribusi kategori produk">
          {Object.entries(stats.perCat).length === 0 ? (
            <p className="text-sm text-gray-400">Belum ada listing.</p>
          ) : (
            <div className="max-h-56 space-y-4 overflow-y-auto pr-2 scrollbar-thin">
              {Object.entries(stats.perCat)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => {
                  const max = Math.max(1, ...Object.values(stats.perCat));
                  return (
                    <div key={name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-neutral-800 dark:text-neutral-200">{name}</span>
                        <span className="text-gray-400 dark:text-neutral-500">{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-100 dark:bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-neutral-900 dark:bg-white transition-all duration-500"
                          style={{ width: `${(count / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        {/* Revenue by Type */}
        <Card title="Revenue per Tipe" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {PAYMENT_TYPES.map((t) => {
              const sum = stats.paidPayments
                .filter((p) => p.type === t.key)
                .reduce((s, p) => s + (p.amount || 0), 0);
              return (
                <div
                  key={t.key}
                  className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-all hover:bg-white hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-800/40"
                >
                  <p className="text-sm font-medium text-gray-500 dark:text-neutral-400">{t.label}</p>
                  <p className="mt-2 text-xl font-bold text-neutral-900 dark:text-white">
                    {rupiah(sum)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}


