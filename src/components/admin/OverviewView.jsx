"use client";

/*
 * Tampilan halaman Ringkasan (Overview) — Desain Modern & Minimalis.
 */
import Link from "next/link";
import { rupiah } from "@/lib/fees";
import { PageHeader } from "@/components/admin/ui";
import TransactionModeToggle from "./TransactionModeToggle";

function Kpi({ label, value, sub, href, icon, accent = "slate" }) {
  const CardContent = (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 h-full">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
        {icon && <span className="text-lg opacity-80">{icon}</span>}
      </div>
      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</p>
        {sub && <p className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">{sub}</p>}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-transform active:scale-98">
        {CardContent}
      </Link>
    );
  }

  return CardContent;
}

function Card({ title, subtitle, children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>}
        </div>
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

export default function OverviewView({ stats }) {
  const revByDay = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    revByDay.push({ key: localDay(d), total: 0 });
  }
  const idx = Object.fromEntries(revByDay.map((d, i) => [d.key, i]));
  (stats.paidPayments || []).forEach((p) => {
    const k = localDay(p.created_at);
    if (k in idx) revByDay[idx[k]].total += p.amount || 0;
  });
  const maxRev = Math.max(1, ...revByDay.map((d) => d.total));
  const totalRev14 = revByDay.reduce((s, d) => s + d.total, 0);

  const PAYMENT_TYPES = [
    { key: "iklan", label: "Pasang Iklan", icon: "BOX" },
    { key: "bump", label: "Sundul Iklan", icon: "UP" },
    { key: "featured", label: "Featured", icon: "Star" },
    { key: "sold_fee", label: "Biaya Terjual", icon: "PAY" },
  ];

  return (
    <div className="space-y-6 max-w-7xl font-sans">
      <PageHeader
        title="Ringkasan Eksekutif"
        description="Pantauan performa, transaksi, dan aktivitas marketplace USU & POLMED."
      />

      {/* Kontrol Utama Mode Transaksi (Mode 1: WA vs Mode 2: DM Web) */}
      <TransactionModeToggle variant="card" />

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 xl:grid-cols-6">
        <Kpi 
          label="Iklan Aktif" 
          value={stats.activeTotal || 0} 
          sub={`${stats.listingsTotal || 0} total listing`} 
          href="/admin/listings"
          icon="BOX"
        />
        <Kpi 
          label="Terjual" 
          value={stats.soldTotal || 0} 
          sub={`${stats.pendingTotal || 0} menunggu`} 
          href="/admin/listings"
          icon="PAY"
        />
        <Kpi 
          label="Total Pendapatan" 
          value={rupiah(stats.revenue || 0)} 
          sub={`${stats.pendingPaymentCount || 0} pending`} 
          href="/admin/transaksi"
          icon="CC"
        />
        <Kpi 
          label="Instalasi PWA" 
          value={stats.pwaInstallsTotal || 0} 
          sub="Aplikasi terpasang" 
          icon="HP"
        />
        <Kpi 
          label="Rating Kepuasan" 
          value={stats.avgRating || 0} 
          sub={`${stats.totalRatings || 0} ulasan`} 
          href="/admin/rating"
          icon="Star"
        />
        <Kpi 
          label="Laporan Terbuka" 
          value={stats.openReportsTotal || 0} 
          sub="Butuh tindakan" 
          href="/admin/reports"
          icon="AlertCircle"
        />
      </div>

      {/* Graphs & Details */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue 14 Days */}
        <Card title="Pendapatan 14 Hari Terakhir" subtitle={`Akumulasi: ${rupiah(totalRev14)}`}>
          <div className="flex h-48 items-end gap-1.5 pt-2">
            {revByDay.map((d) => {
              const heightPct = Math.max(6, (d.total / maxRev) * 100);
              return (
                <div key={d.key} className="group relative flex flex-1 flex-col items-center justify-end h-full">
                  <div
                    className="w-full rounded-t-lg bg-slate-900 transition-all group-hover:bg-primary dark:bg-slate-100 dark:group-hover:bg-emerald-400"
                    style={{ height: `${heightPct}%` }}
                    title={`${d.key}: ${rupiah(d.total)}`}
                  />
                  <span className="mt-2.5 text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {d.key.slice(8)}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Listing per Category */}
        <Card title="Sebaran Kategori Iklan" subtitle="Distribusi produk di marketplace">
          {!stats.perCat || Object.entries(stats.perCat).length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">Belum ada data kategori.</div>
          ) : (
            <div className="max-h-48 space-y-3.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {Object.entries(stats.perCat)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => {
                  const max = Math.max(1, ...Object.values(stats.perCat));
                  const pct = Math.round((count / max) * 100);
                  return (
                    <div key={name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{name}</span>
                        <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400">{count}</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-slate-900 dark:bg-white transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </Card>

        {/* Revenue by Type */}
        <Card title="Pendapatan per Sumber Transaksi" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
            {PAYMENT_TYPES.map((t) => {
              const sum = (stats.paidPayments || [])
                .filter((p) => p.type === t.key)
                .reduce((s, p) => s + (p.amount || 0), 0);
              return (
                <div
                  key={t.key}
                  className="rounded-2xl border border-slate-150 bg-slate-50/70 p-4 transition-all hover:bg-white hover:shadow-xs dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{t.label}</p>
                    <span className="text-base">{t.icon}</span>
                  </div>
                  <p className="mt-2 text-lg sm:text-xl font-black text-slate-900 dark:text-white">
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
