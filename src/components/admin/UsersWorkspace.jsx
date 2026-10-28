"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, LoaderCircle, RefreshCw, Search, ShieldAlert, ShieldCheck, Store, Users, X } from "lucide-react";

async function readJson(response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || "Permintaan gagal.");
  return body;
}

function ProfileChangeRequests({ canManage }) {
  const [status, setStatus] = useState("pending");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await readJson(await fetch(`/api/admin/profile-requests?status=${status}`, { cache: "no-store" }));
      setItems(data.items || []);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function review(item, action) {
    let note = "";
    if (action === "reject") {
      note = window.prompt("Alasan penolakan wajib diisi:", "") || "";
      if (!note.trim()) return;
    } else if (!window.confirm("Setujui perubahan profil ini? Perubahan nama juga akan diterapkan ke iklan aktif penjual.")) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await readJson(await fetch("/api/admin/profile-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, action, note }),
      }));
      setNotice(action === "approve" ? "Perubahan profil disetujui dan penjual diberi kabar." : "Permintaan ditolak dan penjual diberi alasan.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setBusyId(""); }
  }

  const tabs = [["pending", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"], ["all", "Semua"]];
  return <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-black">Perubahan profil</h2><p className="mt-1 text-xs text-slate-500">Tinjau perubahan nama atau bio penjual dalam cakupan akun.</p></div><div className="flex gap-1">{tabs.map(([key, label]) => <button key={key} onClick={() => setStatus(key)} aria-pressed={status === key} className={`min-h-8 rounded-full px-3 text-[11px] font-extrabold ${status === key ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600"}`}>{label}</button>)}</div></header>
    {notice ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</p> : null}
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800">{error}</p> : null}
    {loading ? <div className="grid min-h-40 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : items.length ? <div className="divide-y divide-slate-100">{items.map((item) => <article key={item.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-extrabold">Ubah {item.field === "name" ? "nama" : "bio"}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${item.status === "pending" ? "bg-amber-50 text-amber-800" : item.status === "approved" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{item.status}</span></div><p className="mt-1 text-[10px] font-semibold text-slate-400">{item.maskedPhone} · {item.campus || "Kampus tidak diisi"}{item.requestedVia ? ` · ${item.requestedVia}` : ""}{item.requestedAt ? ` · ${new Date(item.requestedAt).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p><p className="mt-3 text-xs text-slate-500">Sebelum: <span className="line-through">{item.currentValue || "(kosong)"}</span></p><p className="mt-1 break-words text-sm font-semibold text-slate-800">Setelah: {item.requestedValue}</p>{item.reviewNote ? <p className="mt-2 text-xs text-slate-500">Catatan: {item.reviewNote}</p> : null}</div>{item.status === "pending" && canManage ? <div className="flex shrink-0 gap-2 self-end sm:self-auto"><button disabled={busyId === item.id} onClick={() => review(item, "reject")} className="inline-flex min-h-9 items-center gap-1 rounded-full border border-rose-200 px-3 text-[11px] font-extrabold text-rose-700 disabled:opacity-50"><X className="h-3.5 w-3.5" />Tolak</button><button disabled={busyId === item.id} onClick={() => review(item, "approve")} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-emerald-800 px-3 text-[11px] font-extrabold text-white disabled:opacity-50">{busyId === item.id ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}Setujui</button></div> : null}</article>)}</div> : <div className="grid min-h-40 place-items-center text-center"><div><Users className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Tidak ada permintaan pada status ini</p></div></div>}
  </section>;
}

export default function UsersWorkspace({ canManage = false, initialView = "users" }) {
  const [view, setView] = useState(initialView);
  const [items, setItems] = useState([]);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState(null);
  const [total, setTotal] = useState(0);
  const [listingSummaryTruncated, setListingSummaryTruncated] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [restrictingId, setRestrictingId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (start = 0, append = false) => {
    setLoading(true);
    setError("");
    try {
      const data = await readJson(await fetch("/api/admin/users?offset=" + start, { cache: "no-store" }));
      setItems((current) => append ? [...current, ...(data.items || [])] : (data.items || []));
      setOffset(start);
      setNextOffset(data.nextOffset);
      setTotal(data.total || 0);
      setListingSummaryTruncated(!!data.listingSummaryTruncated);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (view === "users") load(0); }, [load, view]);

  const visible = useMemo(() => items.filter((item) => `${item.name} ${item.storeName} ${item.campus} ${item.faculty}`.toLowerCase().includes(query.trim().toLowerCase())), [items, query]);
  const restrictedCount = items.filter((item) => item.restricted).length;
  const activeListings = items.reduce((sum, item) => sum + item.listings.active, 0);

  async function changeRestriction(item, action) {
    if (action === "restrict" && !reason.trim()) { setError("Tuliskan alasan pembatasan akun terlebih dahulu."); return; }
    if (action === "restore" && !window.confirm("Hapus pembatasan untuk akun " + item.name + "?")) return;
    setBusyId(item.id);
    setError("");
    setNotice("");
    try {
      await readJson(await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userToken: item.id, action, reason }),
      }));
      setRestrictingId("");
      setReason("");
      setNotice(action === "restrict" ? "Akun dibatasi. Iklan aktif tidak diturunkan." : "Pembatasan akun dihapus.");
      await load(0);
    } catch (cause) { setError(cause.message); }
    finally { setBusyId(""); }
  }

  return <div className="space-y-5">
    <div className="flex gap-1 rounded-full bg-slate-100 p-1 sm:w-fit" role="tablist" aria-label="Bagian pengguna">
      {[["users", "Direktori pengguna"], ["profile-requests", "Perubahan profil"]].map(([key, label]) => <button key={key} role="tab" aria-selected={view === key} onClick={() => setView(key)} className={`min-h-9 rounded-full px-4 text-xs font-extrabold ${view === key ? "bg-white text-emerald-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>{label}</button>)}
    </div>
    {view === "profile-requests" ? <ProfileChangeRequests canManage={canManage} /> : <div className="space-y-5">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div><h2 className="text-2xl font-black tracking-tight">Pengguna</h2><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Akun penjual di kampus dalam cakupan Anda. Nomor kontak selalu disamarkan.</p></div>
      <button onClick={() => load(0)} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button>
    </header>
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Users className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold text-slate-500">Akun penjual</p><p className="text-xl font-black tabular-nums">{total.toLocaleString("id-ID")}</p></div></div>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-800"><ShieldAlert className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold text-slate-500">Dibatasi di halaman ini</p><p className="text-xl font-black tabular-nums">{restrictedCount}</p></div></div>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700"><Store className="h-5 w-5" /></span><div><p className="text-[11px] font-semibold text-slate-500">Iklan aktif di halaman ini</p><p className="text-xl font-black tabular-nums">{activeListings}</p></div></div>
    </div>
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
    {error ? <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><CircleAlert className="h-4 w-4 shrink-0" />{error}</div> : null}
    {listingSummaryTruncated ? <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">Ada lebih dari 2.000 iklan pada halaman hasil ini. Hitungan iklan per akun dibatasi pada sebagian data terbaru.</div> : null}
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h3 className="text-sm font-black">Direktori penjual</h3><p className="mt-1 text-[11px] text-slate-500">Menampilkan {items.length.toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")} akun</p></div><label className="relative block w-full sm:max-w-[270px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input aria-label="Cari pengguna" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari nama, toko, atau kampus" className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10" /></label></div>
      {loading && !items.length ? <div className="grid min-h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : visible.length ? <div className="divide-y divide-slate-100">{visible.map((item) => <article key={item.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#eaf4ef] text-sm font-black text-emerald-900">{item.name.slice(0, 1).toUpperCase()}</div>
        <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate text-sm font-extrabold">{item.name}</h4>{item.trustedSeller ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800"><ShieldCheck className="h-3 w-3" />Tepercaya</span> : null}{item.restricted ? <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">Dibatasi</span> : null}</div><p className="mt-1 truncate text-xs text-slate-500">{item.storeName || item.faculty || item.campus} <span className="px-1 text-slate-300">/</span> {item.campus} <span className="px-1 text-slate-300">/</span> {item.maskedPhone}</p><p className="mt-1 text-[10px] font-medium text-slate-400">{item.listings.total} iklan · {item.listings.active} aktif · Bergabung {item.createdAt ? new Date(item.createdAt).toLocaleDateString("id-ID") : "—"}{item.restrictionReason ? " · " + item.restrictionReason : ""}</p>{restrictingId === item.id ? <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300} placeholder="Alasan pembatasan" className="h-9 min-w-0 flex-1 rounded-lg border border-slate-200 px-3 text-xs outline-none focus:border-rose-400" /><button disabled={busyId === item.id} onClick={() => changeRestriction(item, "restrict")} className="min-h-9 rounded-full bg-rose-700 px-3 text-[11px] font-extrabold text-white disabled:opacity-50">Terapkan pembatasan</button><button onClick={() => { setRestrictingId(""); setReason(""); }} className="min-h-9 rounded-full border border-slate-200 px-3 text-[11px] font-bold text-slate-600">Batal</button></div> : null}</div>
        {canManage ? <div className="shrink-0">{item.restricted ? <button disabled={busyId === item.id} onClick={() => changeRestriction(item, "restore")} className="inline-flex min-h-9 items-center justify-center rounded-full border border-slate-200 px-3.5 text-[11px] font-extrabold text-slate-600 hover:border-emerald-300 hover:text-emerald-800 disabled:opacity-50">Hapus pembatasan</button> : <button onClick={() => { setRestrictingId(item.id); setReason(""); setError(""); }} className="inline-flex min-h-9 items-center justify-center rounded-full border border-rose-200 px-3.5 text-[11px] font-extrabold text-rose-700 hover:bg-rose-50">Batasi akun</button>}</div> : null}
      </article>)}</div> : <div className="grid min-h-44 place-items-center px-5 text-center"><div><Users className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-3 text-sm font-extrabold text-slate-600">Pengguna tidak ditemukan</p><p className="mt-1 text-xs text-slate-400">Coba kata kunci nama, toko, atau kampus lain.</p></div></div>}
      {nextOffset !== null ? <div className="border-t border-slate-100 p-3 text-center"><button onClick={() => load(nextOffset, true)} disabled={loading} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 disabled:opacity-50">{loading ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}Muat pengguna berikutnya</button></div> : null}
    </section>
    </div>}
  </div>;
}
