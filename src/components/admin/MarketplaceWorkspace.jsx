"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Clock3, LoaderCircle, PackageSearch, RefreshCw, Search, X, SearchCheck, Trash2 } from "lucide-react";
import { rupiah } from "@/lib/fees";

const FILTERS = [
  ["pending", "Menunggu review"], ["active", "Aktif"], ["sold", "Terjual"], ["suspended", "Ditangguhkan"], ["rejected", "Ditolak"], ["all", "Semua status"],
];
const WANTED_FILTERS = [["active", "Aktif"], ["pending", "Menunggu"], ["resolved", "Selesai"], ["all", "Semua status"]];

function ActionButton({ busy, onClick, label, icon: Icon, tone = "neutral" }) {
  const colors = {
    neutral: "border border-slate-200 text-slate-600 hover:bg-slate-50",
    danger: "border border-rose-200 text-rose-700 hover:bg-rose-50",
    primary: "bg-emerald-800 text-white hover:bg-emerald-900",
  };
  return <button disabled={busy} onClick={onClick} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold disabled:opacity-50 ${colors[tone]}`}>{busy ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}{label}</button>;
}

export default function MarketplaceWorkspace({ canReview = false, canManage = false, superadmin = false }) {
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState("listings");
  const [status, setStatus] = useState("pending");
  const [nextOffset, setNextOffset] = useState(null);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (offset = 0, append = false) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ status, mode: mode === "wanted" ? "wanted" : "listings", offset: String(offset) });
    if (query.trim()) params.set("q", query.trim());
    try {
      const response = await fetch(`/api/admin/marketplace?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Data marketplace gagal dimuat.");
      setItems((current) => append ? [...current, ...(data.items || [])] : (data.items || []));
      setNextOffset(data.nextOffset ?? null);
      setTotal(data.total || 0);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, [status, query, mode]);
  useEffect(() => { load(); }, [load]);

  const pendingCount = useMemo(() => items.filter((item) => mode === "wanted" ? item.status === "active" || item.status === "pending" : item.status === "pending").length, [items, mode]);

  async function review(item, action) {
    const needsReason = action === "reject" || action === "suspend";
    const reason = needsReason ? window.prompt(action === "suspend" ? "Alasan penangguhan (opsional):" : "Alasan penolakan (opsional):", "") : "";
    if (needsReason && reason === null) return;
    setBusyId(String(item.id));
    setNotice("");
    try {
      const response = await fetch("/api/admin/marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action, reason }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Iklan gagal diproses.");
      const messages = { approve: "Iklan disetujui.", reject: "Iklan ditolak.", suspend: "Iklan ditangguhkan.", restore: "Iklan dipulihkan." };
      setNotice(messages[action]);
      await load(0);
    } catch (cause) { setError(cause.message); }
    finally { setBusyId(""); }
  }

  async function handleWanted(item, action) {
    if (action === "remove" && !window.confirm("Hapus kebutuhan “" + item.title + "” secara permanen?")) return;
    setBusyId(String(item.id));
    setNotice("");
    try {
      const response = await fetch("/api/admin/marketplace", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ entityType: "wanted", id: item.id, action }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Kebutuhan gagal diproses.");
      setNotice(action === "resolve" ? "Kebutuhan ditandai selesai." : "Kebutuhan dihapus.");
      await load(0);
    } catch (cause) { setError(cause.message); }
    finally { setBusyId(""); }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-2xl font-black tracking-tight">Marketplace</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Tinjau iklan dan kebutuhan jual-beli di kampus dalam cakupan akun.</p></div><div className="flex items-center gap-2 self-start sm:self-auto"><div className="inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-50 px-3 text-xs font-extrabold text-amber-900"><Clock3 className="h-4 w-4" />{pendingCount} {mode === "wanted" ? "belum selesai pada daftar" : "menunggu pada daftar"}</div><button onClick={() => load(0)} aria-label="Segarkan daftar" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-800"><RefreshCw className="h-4 w-4" /></button></div></header>
      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
      {error ? <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><span>{error}</span><button onClick={() => load(0)} className="shrink-0 underline">Coba lagi</button></div> : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-col gap-3"><div className="flex gap-1">{[["listings", "Iklan jual"], ["wanted", "Dicari"]].map(([key, label]) => <button key={key} onClick={() => { setMode(key); setStatus(key === "wanted" ? "active" : "pending"); }} aria-pressed={mode === key} className={`min-h-9 rounded-full px-3 text-[11px] font-extrabold ${mode === key ? "bg-emerald-50 text-emerald-900" : "text-slate-500 hover:bg-slate-100"}`}>{label}</button>)}</div><div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">{(mode === "wanted" ? WANTED_FILTERS : FILTERS).map(([key, label]) => <button key={key} onClick={() => setStatus(key)} aria-pressed={status === key} className={`min-h-9 shrink-0 rounded-full px-3 text-[11px] font-extrabold transition ${status === key ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}</div></div>
          <label className="relative block w-full sm:max-w-[250px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Cari iklan atau kebutuhan" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setQuery(searchInput.trim()); } }} placeholder="Cari judul iklan · Enter" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-600" /></label>
        </div>
        {loading ? <div className="grid min-h-56 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : items.length ? <div className="divide-y divide-slate-100">{items.map((item) => {
          const busy = busyId === String(item.id);
          const buttons = mode === "wanted"
            ? <>{canManage && ["active", "pending"].includes(item.status) ? <ActionButton busy={busy} onClick={() => handleWanted(item, "resolve")} label="Tandai selesai" icon={Check} tone="primary" /> : null}{superadmin ? <ActionButton busy={busy} onClick={() => handleWanted(item, "remove")} label="Hapus" icon={Trash2} tone="danger" /> : null}</>
            : item.status === "pending" && canReview
            ? <><ActionButton busy={busy} onClick={() => review(item, "reject")} label="Tolak" icon={X} tone="danger" /><ActionButton busy={busy} onClick={() => review(item, "approve")} label="Setujui" icon={Check} tone="primary" /></>
            : canManage && item.status === "active"
              ? <ActionButton busy={busy} onClick={() => review(item, "suspend")} label="Tangguhkan" icon={X} tone="danger" />
              : canManage && ["suspended", "hidden", "rejected"].includes(item.status)
                ? <ActionButton busy={busy} onClick={() => review(item, "restore")} label="Pulihkan" icon={Check} tone="primary" />
                : null;
          return <article key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5"><div className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-emerald-800">{mode === "wanted" ? <SearchCheck className="h-6 w-6" /> : item.image_url ? <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover" /> : <PackageSearch className="h-6 w-6 text-slate-300" />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-extrabold">{item.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${item.status === "pending" ? "bg-amber-50 text-amber-800" : item.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>{item.status}</span></div><p className="mt-1 text-xs font-bold text-slate-700">{mode === "wanted" ? "Anggaran " + rupiah(item.budget || 0) : rupiah(item.price || 0)} <span className="font-medium text-slate-400">· {item.category || "Tanpa kategori"}</span></p><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">{item.description || "Tidak ada deskripsi."}</p><div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400"><span>{item.campus || "Kampus tidak diisi"}</span>{item.area ? <span>{item.area}</span> : null}{mode === "wanted" && item.buyer_name ? <span>{item.buyer_name}</span> : null}<span>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span></div></div>{buttons ? <div className="flex shrink-0 gap-2 self-end sm:self-auto">{buttons}</div> : null}</article>;
        })}</div> : <div className="grid min-h-56 place-items-center px-5 text-center"><div><PackageSearch className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Tidak ada iklan pada filter ini</p><p className="mt-1 text-xs text-slate-400">Coba ubah status atau kata pencarian.</p></div></div>}
        {nextOffset !== null ? <div className="flex flex-col items-center gap-2 border-t border-slate-100 p-3"><p className="text-[10px] text-slate-400">Menampilkan {items.length.toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")}</p><button onClick={() => load(nextOffset, true)} disabled={loading} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">{loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}Muat berikutnya</button></div> : null}
      </section>
    </div>
  );
}
