"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, FileClock, LoaderCircle, RefreshCw, Search } from "lucide-react";

export default function AuditWorkspace() {
  const [items, setItems] = useState([]);
  const [nextOffset, setNextOffset] = useState(null);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (start = 0, append = false, action = filter) => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/audit?offset=" + start + "&action=" + encodeURIComponent(action), { cache: "no-store" });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Log audit gagal dimuat.");
      setItems((current) => append ? [...current, ...(body.items || [])] : (body.items || []));
      setNextOffset(body.nextOffset);
      setTotal(body.total || 0);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, [filter]);
  useEffect(() => { load(0); }, [load]);

  const visible = items.filter((item) => `${item.action} ${item.actor} ${item.target} ${JSON.stringify(item.metadata)}`.toLowerCase().includes(query.trim().toLowerCase()));
  function applyFilter(event) { event.preventDefault(); setFilter(query.trim()); }

  return <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black tracking-tight">Jejak perubahan</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Catatan akses owner, moderasi, Open PO, dan pengaturan platform.</p></div><button onClick={() => load(0)} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button></header>
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white"><form onSubmit={applyFilter} className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h3 className="text-sm font-black">Riwayat admin</h3><p className="mt-1 text-[11px] text-slate-500">{total.toLocaleString("id-ID")} perubahan tercatat</p></div><label className="relative flex w-full sm:max-w-[300px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Filter jenis perubahan" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter jenis perubahan" className="h-10 w-full rounded-l-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-600" /><button className="rounded-r-xl bg-emerald-800 px-4 text-xs font-extrabold text-white">Cari</button></label></form>
      {loading && !items.length ? <div className="grid min-h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : visible.length ? <div className="divide-y divide-slate-100">{visible.map((item) => <article key={item.id} className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:px-5"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><FileClock className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-xs font-extrabold text-slate-800">{item.action}</h4><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">Admin {item.actor}</span></div><p className="mt-1 break-all text-[10px] text-slate-500">Target {item.target}{item.metadata.campus ? " · " + item.metadata.campus : ""}{Array.isArray(item.metadata.keys) ? " · " + item.metadata.keys.join(", ") : ""}</p></div><time className="shrink-0 text-[10px] font-medium text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "—"}</time></article>)}</div> : <div className="grid min-h-48 place-items-center px-5 text-center"><div><FileClock className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-extrabold text-slate-600">Belum ada perubahan</p><p className="mt-1 text-xs text-slate-400">Aktivitas baru akan tercatat di sini.</p></div></div>}
      {nextOffset !== null ? <div className="border-t border-slate-100 p-3 text-center"><button onClick={() => load(nextOffset, true)} disabled={loading} className="min-h-9 rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">Muat catatan berikutnya</button></div> : null}
    </section>
  </div>;
}
