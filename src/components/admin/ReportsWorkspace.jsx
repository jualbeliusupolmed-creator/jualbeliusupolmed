"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, CircleAlert, Clock3, LoaderCircle, RefreshCw, Search } from "lucide-react";
import { useAdmin } from "./AdminProvider";

const FILTERS = [["open", "Terbuka"], ["resolved", "Selesai"], ["all", "Semua"]];
const REASONS = { penipuan: "Dugaan penipuan", barang_terlarang: "Barang terlarang", spam: "Spam", salah_kategori: "Salah kategori", lainnya: "Lainnya" };

export default function ReportsWorkspace({ canManage = false }) {
  const { confirmThen } = useAdmin();
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("open");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/reports?status=${status}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Laporan gagal dimuat.");
      setItems(data.items || []);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const visible = items.filter((item) => `${item.listing?.title || ""} ${item.detail || ""} ${item.reason || ""}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function resolve(item) {
    confirmThen({ title: "Selesaikan laporan?", message: `Tandai laporan untuk “${item.listing?.title || "iklan"}” sebagai selesai?`, confirmLabel: "Tandai selesai" }, async () => {
      setBusyId(item.id);
      setError("");
      setNotice("");
      try {
        const response = await fetch("/api/admin/reports", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, action: "resolve" }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Laporan gagal diperbarui.");
        setNotice("Laporan ditandai selesai.");
        await load();
      } catch (cause) { setError(cause.message); }
      finally { setBusyId(""); }
    });
  }

  return <div className="space-y-5">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Tindak lanjut komunitas</p><h2 className="mt-1 text-2xl font-black tracking-tight">Laporan pengguna</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">Laporan hanya menampilkan iklan dari kampus yang masuk dalam cakupan akun.</p></div><button onClick={load} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-emerald-200 hover:text-emerald-800"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button></header>
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div className="flex gap-1">{FILTERS.map(([key, label]) => <button key={key} onClick={() => setStatus(key)} className={`min-h-9 rounded-full px-3 text-[11px] font-extrabold ${status === key ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}</div><label className="relative block w-full sm:max-w-[260px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari judul atau isi laporan" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-600" /></label></div>
      {loading ? <div className="grid min-h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : visible.length ? <div className="divide-y divide-slate-100">{visible.map((item) => <article key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:px-5"><div className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${item.status === "open" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>{item.status === "open" ? <Clock3 className="h-4 w-4" /> : <Check className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold">{item.listing?.title || "Iklan tidak tersedia"}</h3><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{REASONS[item.reason] || item.reason || "Lainnya"}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{item.status}</span></div><p className="mt-2 text-xs leading-relaxed text-slate-600">{item.detail || "Tidak ada penjelasan tambahan."}</p><p className="mt-2 text-[10px] font-semibold text-slate-400">{item.listing?.campus || "Kampus tidak diketahui"} · {new Date(item.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}{item.listing?.status === "hidden" ? " · Iklan disembunyikan" : ""}</p></div>{canManage && item.status === "open" ? <button disabled={busyId === item.id} onClick={() => resolve(item)} className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 self-end rounded-full bg-emerald-800 px-3.5 text-[11px] font-extrabold text-white hover:bg-emerald-900 disabled:opacity-50 sm:self-start">{busyId === item.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Tandai selesai</button> : null}</article>)}</div> : <div className="grid min-h-48 place-items-center px-5 text-center"><div><Check className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-extrabold text-slate-600">Tidak ada laporan pada filter ini</p><p className="mt-1 text-xs text-slate-400">Laporan baru akan muncul di sini.</p></div></div>}
    </section>
  </div>;
}
