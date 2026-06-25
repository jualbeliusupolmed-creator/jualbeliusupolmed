import { getOverviewStats } from "@/lib/adminOverviewData";
import { rupiah } from "@/lib/fees";

// Helper components that used to be inside AdminPanel
function Kpi({ label, value, sub }) {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/40">
      <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-slate-400">
        {label}
      </span>
      <span className="mt-2 text-2xl font-black tracking-tight text-gray-900 dark:text-white">
        {value}
      </span>
      {sub && <span className="mt-1 text-[11px] font-medium text-gray-400">{sub}</span>}
    </div>
  );
}

function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/40 ${className}`}>
      <h3 className="mb-4 text-sm font-bold tracking-wide text-gray-900 dark:text-white">{title}</h3>
      {children}
    </div>
  );
}

// tanggal lokal YYYY-MM-DD
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

  const PAYMENT_TYPES = ["iklan", "bump", "featured", "sold_fee"];

  return (
    <div className="animate-fade-in">
      <h1 className="mb-6 hidden text-2xl font-extrabold dark:text-white lg:block">Ringkasan</h1>
      
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
        <Kpi label="Iklan aktif" value={stats.activeTotal} sub={`${stats.listingsTotal} total`} />
        <Kpi label="Terjual" value={stats.soldTotal} sub={`${stats.pendingTotal} pending`} />
        <Kpi label="Revenue" value={rupiah(stats.revenue)} sub={`${stats.pendingPaymentCount} pending`} />
        <Kpi label="Install PWA" value={stats.pwaInstallsTotal} sub="Orang" />
        <Kpi label="Rating" value={stats.avgRating} sub={`${stats.totalRatings} ulasan`} />
        <Kpi label="Laporan" value={stats.openReportsTotal} sub="open" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Revenue 14 Hari (paid)">
          <div className="flex h-40 items-end gap-1">
            {revByDay.map((d) => (
              <div key={d.key} className="flex flex-1 flex-col items-center justify-end">
                <div
                  className="w-full rounded-t bg-gray-900 transition-all hover:bg-gray-700 dark:bg-slate-200 dark:hover:bg-white"
                  style={{ height: `${(d.total / maxRev) * 100}%` }}
                  title={`${d.key}: ${rupiah(d.total)}`}
                />
                <span className="mt-1 text-[9px] text-gray-400">{d.key.slice(8)}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Total 14 hari: <strong className="text-gray-700 dark:text-slate-200">{rupiah(revByDay.reduce((s, d) => s + d.total, 0))}</strong>
          </p>
        </Card>

        <Card title="Listing per Kategori">
          {Object.entries(stats.perCat).length === 0 && <p className="text-sm text-gray-400">Belum ada listing.</p>}
          <div className="max-h-64 overflow-y-auto pr-2">
            {Object.entries(stats.perCat).sort((a,b) => b[1]-a[1]).map(([name, count]) => {
              const max = Math.max(1, ...Object.values(stats.perCat));
              return (
                <div key={name} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-sm dark:text-slate-300">
                    <span>{name}</span>
                    <span className="text-gray-400">{count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                    <div className="h-2 rounded-full bg-gray-900 dark:bg-slate-200" style={{ width: `${(count / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Revenue per Tipe" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PAYMENT_TYPES.map((t) => {
              const sum = stats.paidPayments.filter((p) => p.type === t).reduce((s, p) => s + (p.amount || 0), 0);
              return (
                <div key={t} className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/50">
                  <p className="text-xs capitalize text-gray-400">{t}</p>
                  <p className="mt-1 font-bold dark:text-white">{rupiah(sum)}</p>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
