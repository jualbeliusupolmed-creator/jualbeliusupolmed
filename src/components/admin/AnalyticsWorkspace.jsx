"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, CircleAlert, LoaderCircle, RefreshCw, Search, ShoppingBag } from "lucide-react";

const COUNT_LABELS = [["active", "Aktif"], ["pending", "Menunggu review"], ["sold", "Terjual"], ["suspended", "Ditangguhkan"], ["rejected", "Ditolak"]];

export default function AnalyticsWorkspace({ superadmin = false }) {
  const [data, setData] = useState({ counts: {}, activity: [], categories: [], topSearches: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/analytics", { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Analitik gagal dimuat.");
      setData(body);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const maxActivity = Math.max(1, ...data.activity.map((item) => item.total));
  const maxCategory = Math.max(1, ...data.categories.map((item) => item.total));
  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black tracking-tight">Analitik</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Ringkasan iklan dan aktivitas pencarian dalam batas akses akun.</p></div><button onClick={load} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button></header>
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{COUNT_LABELS.map(([key, label], index) => <div key={key} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5"><span className={`grid h-10 w-10 place-items-center rounded-xl ${index === 0 ? "bg-emerald-50 text-emerald-800" : index === 1 ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-700"}`}><ShoppingBag className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold text-slate-500">Iklan {label.toLowerCase()}</p><p className="text-xl font-black tabular-nums">{loading ? "—" : (data.counts[key] || 0).toLocaleString("id-ID")}</p></div></div>)}</section>
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-sm font-black">Iklan baru dalam 30 hari</h3><p className="mt-1 text-[11px] text-slate-500">Sampel sampai 1.000 iklan terbaru</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><BarChart3 className="h-4 w-4" /></span></div>
        {loading ? <div className="grid h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : data.activity.length ? <><div className="mt-6 flex h-40 items-end gap-1.5 border-b border-slate-100 px-1">{data.activity.map((item) => <div key={item.date} className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"><span className="pointer-events-none absolute -top-7 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-bold text-white opacity-0 transition group-hover:opacity-100">{item.total} iklan</span><div role="img" aria-label={item.date + ": " + item.total + " iklan"} className="w-full max-w-6 rounded-t-md bg-emerald-700/80 hover:bg-emerald-800" style={{ height: `${Math.max(5, item.total / maxActivity * 132)}px` }} /></div>)}</div><div className="mt-2 flex justify-between text-[10px] font-medium text-slate-400"><span>{new Date(data.activity[0].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span><span>{new Date(data.activity[data.activity.length - 1].date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span></div></> : <div className="grid h-48 place-items-center text-center"><div><p className="text-sm font-bold text-slate-600">Belum ada aktivitas iklan</p><p className="mt-1 text-xs text-slate-400">Aktivitas baru akan muncul setelah ada iklan dibuat.</p></div></div>}
      </section>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5"><div><h3 className="text-sm font-black">Kategori paling aktif</h3><p className="mt-1 text-[11px] text-slate-500">Sampel sampai 1.000 iklan terbaru</p></div>{loading ? <div className="grid h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : data.categories.length ? <div className="mt-5 space-y-4">{data.categories.map((item) => <div key={item.name}><div className="mb-1.5 flex items-center justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-700">{item.name}</span><span className="shrink-0 font-extrabold tabular-nums text-slate-500">{item.total}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#047857]" style={{ width: `${Math.max(4, item.total / maxCategory * 100)}%` }} /></div></div>)}</div> : <div className="grid h-48 place-items-center text-xs font-semibold text-slate-400">Belum ada data kategori.</div>}</section>
    </div>
    {superadmin ? <section className="rounded-2xl border border-slate-200/80 bg-white"><div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5"><span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-50 text-amber-800"><Search className="h-4 w-4" /></span><div><h3 className="text-sm font-black">Pencarian terbanyak</h3><p className="mt-1 text-[11px] text-slate-500">Teks pencarian 2.000 terbaru hanya terlihat oleh superadmin.</p></div></div><div className="grid gap-x-8 divide-y divide-slate-100 px-4 sm:grid-cols-2 sm:divide-y-0 sm:px-5">{data.topSearches.map((item, index) => <div key={item.query} className="flex min-h-12 items-center gap-3 border-b border-slate-100 text-xs last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0"><span className="w-5 text-right font-black tabular-nums text-emerald-800">{index + 1}</span><span className="min-w-0 flex-1 truncate font-semibold text-slate-700">{item.query}</span><span className="shrink-0 text-[10px] font-bold text-slate-400">{item.count} kali · {item.noResult} tanpa hasil</span></div>)}</div></section> : null}
  </div>;
}
