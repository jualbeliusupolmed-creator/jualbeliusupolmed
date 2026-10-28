"use client";

import { useEffect, useMemo, useState } from "react";
import { Boxes, CalendarClock, CheckCircle2, Clock3, LoaderCircle, MapPin, Pause, Play, RefreshCw, Search, ShoppingBag } from "lucide-react";
import { rupiah } from "@/lib/fees";

const FILTERS = [["all", "Semua"], ["open", "Menerima pesanan"], ["closed", "Ditutup"], ["draft", "Draft"], ["cancelled", "Dibatalkan"]];
const dateLabel = (value) => value ? new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";

export default function AdminPoWorkspace() {
  const [batches, setBatches] = useState([]);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/po", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Data PO gagal dimuat.");
      setBatches(data.batches || []);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => batches.filter((batch) => (filter === "all" || batch.status === filter) && `${batch.title} ${batch.product?.name} ${batch.product?.campus}`.toLowerCase().includes(query.toLowerCase())), [batches, filter, query]);
  const totals = useMemo(() => ({
    open: batches.filter((batch) => batch.status === "open").length,
    pending: batches.reduce((sum, batch) => sum + Number(batch.orders?.pending || 0), 0),
    slots: batches.reduce((sum, batch) => sum + Number(batch.reserved_count || 0), 0),
  }), [batches]);

  async function updateStatus(batch) {
    const status = batch.status === "open" ? "closed" : "open";
    if (status === "closed" && !window.confirm(`Tutup batch “${batch.title}” agar tidak menerima reservasi baru?`)) return;
    setBusyId(batch.id);
    setError("");
    try {
      const response = await fetch("/api/admin/po", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: batch.id, status }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Status batch gagal diubah.");
      setNotice(status === "closed" ? "Batch ditutup." : "Batch dibuka kembali.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setBusyId(""); }
  }

  return <div className="space-y-5 sm:space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Data Open PO baru</p><h2 className="mt-1 text-2xl font-black tracking-tight">Batch & reservasi</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Pantau ketersediaan batch dan antrean pesanan sesuai kampus yang diberikan kepada akun Anda.</p></div><button onClick={load} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-emerald-200 hover:text-emerald-800"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button></header>
    {error ? <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">{error}</div> : null}{notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
    <section className="grid gap-3 sm:grid-cols-3"><Summary icon={Boxes} label="Batch terbuka" value={totals.open} tone="emerald" /><Summary icon={Clock3} label="Pesanan menunggu" value={totals.pending} tone="amber" /><Summary icon={ShoppingBag} label="Slot terisi" value={totals.slots} tone="blue" /></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">{FILTERS.map(([key, label]) => <button key={key} onClick={() => setFilter(key)} className={`min-h-9 shrink-0 rounded-full px-3 text-[11px] font-extrabold ${filter === key ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}</div><label className="relative block w-full sm:max-w-[230px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari batch atau kampus" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-600" /></label></div>
      {loading ? <div className="grid min-h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : visible.length ? <div className="divide-y divide-slate-100">{visible.map((batch) => { const orders = batch.orders || {}; const product = batch.product || {}; const canClose = batch.status === "open"; return <article key={batch.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Boxes className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-extrabold">{batch.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${batch.status === "open" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{batch.status}</span></div><p className="mt-1 text-xs font-bold text-slate-700">{rupiah(batch.price_idr)} · {product.name} · {product.category}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400"><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{product.campus} · {batch.pickup_point}</span><span className="inline-flex items-center gap-1"><CalendarClock className="h-3 w-3" />Tutup {dateLabel(batch.closes_at)}</span></div><div className="mt-2 flex flex-wrap gap-2 text-[10px] font-bold text-slate-500"><span className="rounded-full bg-slate-100 px-2.5 py-1">Slot {batch.reserved_count}/{batch.quota}</span><span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{orders.pending || 0} menunggu</span><span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">{orders.confirmed || 0} dikonfirmasi</span><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">{orders.fulfilled || 0} selesai</span></div></div>{batch.status === "open" || batch.status === "closed" ? <button disabled={busyId === batch.id} onClick={() => updateStatus(batch)} className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 self-end rounded-full px-3 text-[11px] font-extrabold disabled:opacity-50 sm:self-auto ${canClose ? "border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-700" : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"}`}>{busyId === batch.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : canClose ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{canClose ? "Tutup batch" : "Buka batch"}</button> : null}</article>; })}</div> : <div className="grid min-h-52 place-items-center px-5 text-center"><div><CheckCircle2 className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-extrabold text-slate-600">Belum ada batch pada filter ini</p><p className="mt-1 text-xs text-slate-400">Batch PO baru akan muncul di sini setelah diterbitkan.</p></div></div>}</section>
  </div>;
}

function Summary({ icon: Icon, label, value, tone }) {
  const colors = { emerald: "bg-emerald-50 text-emerald-800", amber: "bg-amber-50 text-amber-800", blue: "bg-sky-50 text-sky-800" };
  return <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-500">{label}</p><span className={`grid h-9 w-9 place-items-center rounded-xl ${colors[tone]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-4 text-2xl font-black tracking-tight">{value}</p></div>;
}
