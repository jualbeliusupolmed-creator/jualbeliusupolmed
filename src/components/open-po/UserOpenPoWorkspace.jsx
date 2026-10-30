"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, Check, CirclePlus, LoaderCircle, MapPin, Package, Pause, Play, RefreshCw, ShoppingBag } from "lucide-react";
import { rupiah } from "@/lib/fees";

const CATEGORIES = ["Makanan", "Minuman", "Merchandise", "Jastip", "Lainnya"];
const EMPTY_FORM = { name: "", title: "", description: "", category: "Makanan", unit: "pcs", campus: "", price: "", quota: "", closesAt: "", pickupPoint: "", pickupNote: "", imageUrl: "", shareContact: false };

function localDateTime(daysAhead = 1) {
  const date = new Date(Date.now() + daysAhead * 864e5);
  date.setHours(18, 0, 0, 0);
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function safeDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function statusStyle(status) {
  return status === "pending" ? "bg-amber-50 text-amber-800" : status === "confirmed" ? "bg-sky-50 text-sky-800" : status === "fulfilled" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500";
}

function OrderRow({ order, kind, onStatus, busy }) {
  const batch = order.batch || {};
  const product = batch.product || {};
  const isSeller = kind === "incoming";
  const contact = isSeller ? order.buyer_wa : order.seller_wa;
  const title = batch.title || product.name || "Open PO";
  return <article className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-extrabold">{title}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusStyle(order.status)}`}>{order.status}</span></div><p className="mt-1 text-xs text-slate-600">{isSeller ? `Pembeli: ${order.buyer_name}` : `Jumlah: ${order.quantity} ${product.unit || "unit"}`} · {order.quantity} × {rupiah(order.unit_price_idr)} · <b>{rupiah(order.total_idr)}</b></p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><MapPin className="h-3 w-3" />{batch.pickup_point || "Titik pengambilan mengikuti detail batch"} · {safeDate(order.created_at)}</p>{contact ? <a className="mt-2 inline-flex text-xs font-extrabold text-emerald-800 underline" href={`https://wa.me/${contact}`} target="_blank" rel="noreferrer">Hubungi {isSeller ? "pembeli" : "penjual"} di WhatsApp</a> : <p className="mt-2 text-[10px] font-medium text-slate-400">Nomor WhatsApp tidak dibagikan.</p>}</div><div className="flex flex-wrap gap-2 self-end sm:self-auto">{isSeller && order.status === "pending" ? <><button disabled={busy} onClick={() => onStatus(order.id, "confirmed")} className="inline-flex min-h-9 items-center gap-1 rounded-full bg-emerald-800 px-3 text-[11px] font-extrabold text-white disabled:opacity-50"><Check className="h-3 w-3" />Konfirmasi</button><button disabled={busy} onClick={() => onStatus(order.id, "cancelled")} className="min-h-9 rounded-full border border-slate-200 px-3 text-[11px] font-bold text-slate-600 disabled:opacity-50">Tolak</button></> : null}{isSeller && order.status === "confirmed" ? <button disabled={busy} onClick={() => onStatus(order.id, "fulfilled")} className="min-h-9 rounded-full bg-emerald-50 px-3 text-[11px] font-extrabold text-emerald-800 disabled:opacity-50">Tandai selesai</button> : null}{!isSeller && ["pending", "confirmed"].includes(order.status) ? <button disabled={busy} onClick={() => onStatus(order.id, "cancelled")} className="min-h-9 rounded-full border border-slate-200 px-3 text-[11px] font-bold text-slate-600 disabled:opacity-50">Batalkan</button> : null}</div></article>;
}

export default function UserOpenPoWorkspace({ embedded = false }) {
  const [activeTab, setActiveTab] = useState("batches");
  const [profile, setProfile] = useState(null);
  const [batches, setBatches] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [form, setForm] = useState({ ...EMPTY_FORM, closesAt: localDateTime() });
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sessionBlocked, setSessionBlocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [mineResponse, campusResponse] = await Promise.all([
        fetch("/api/open-po/mine", { cache: "no-store" }),
        fetch("/api/kampus", { cache: "no-store" }),
      ]);
      const mine = await mineResponse.json().catch(() => ({}));
      const campusData = await campusResponse.json().catch(() => ({}));
      if (!mineResponse.ok) {
        setSessionBlocked(mineResponse.status === 401 || mineResponse.status === 403);
        setShowCreate(false);
        throw new Error(mine.error || "Data PO gagal dimuat.");
      }
      setSessionBlocked(false);
      setProfile(mine.profile);
      setBatches(mine.batches || []);
      setIncoming(mine.incoming || []);
      setOutgoing(mine.outgoing || []);
      const options = Array.isArray(campusData.campuses) ? campusData.campuses : [];
      setCampuses(options);
      setForm((current) => ({ ...current, campus: current.campus || mine.profile?.campus || options[0]?.shortName || "" }));
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openBatches = useMemo(() => batches.filter((batch) => batch.status === "open"), [batches]);

  async function createBatch(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/open-po", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, closesAt: new Date(form.closesAt).toISOString(), price: Number(form.price), quota: Number(form.quota) }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Batch gagal dibuat.");
      setForm({ ...EMPTY_FORM, campus: form.campus, closesAt: localDateTime() });
      setShowCreate(false);
      setNotice("Batch Open PO berhasil diterbitkan.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setSaving(false); }
  }

  async function setBatchStatus(batch, status) {
    setBusyId(batch.id);
    setError("");
    try {
      const response = await fetch("/api/open-po/mine", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: batch.id, status }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Batch gagal diperbarui.");
      setNotice(status === "closed" ? "Batch ditutup." : "Batch dibuka kembali.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setBusyId(""); }
  }

  async function changeOrderStatus(orderId, status) {
    setBusyId(orderId);
    setError("");
    try {
      const response = await fetch("/api/open-po/orders", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId, status }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Status pesanan gagal diperbarui.");
      setNotice("Status pesanan diperbarui.");
      await load();
    } catch (cause) { setError(cause.message); }
    finally { setBusyId(""); }
  }

  const tabs = [
    ["batches", `Batch saya (${batches.length})`],
    ["incoming", `Pesanan masuk (${incoming.length})`],
    ["outgoing", `Pesanan saya (${outgoing.length})`],
  ];

  return (
    <section className={embedded ? "py-2 text-slate-950" : "min-h-screen bg-[#f5f8f6] px-4 py-5 pb-20 text-slate-950 sm:px-7 sm:py-8"}>
      <div className="mx-auto max-w-6xl space-y-5">
        {!embedded && <Link href="/open-po" className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-slate-500 hover:text-emerald-800"><ArrowLeft className="h-4 w-4" />Kembali ke etalase PO</Link>}
        <section className="rounded-[26px] bg-[linear-gradient(118deg,#064e3b_0%,#047857_58%,#10a46b_100%)] p-5 text-white shadow-lg shadow-emerald-950/10 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-emerald-100/70">Akun Jual Beli</p><h1 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">Open PO saya</h1><p className="mt-2 text-sm text-emerald-50/85">{profile?.name || "Akun JB"}{profile?.campus ? ` · ${profile.campus}` : ""}. Kelola batch dan pesanan dari akun yang sama.</p><Link href="/keranjang?tab=po" className="mt-3 inline-flex min-h-9 items-center gap-2 text-xs font-extrabold text-white underline underline-offset-4"><ShoppingBag className="h-4 w-4" />Lihat progres pesanan saya</Link></div>{!sessionBlocked && <button onClick={() => { setShowCreate((value) => !value); setActiveTab("batches"); }} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-white px-5 text-xs font-extrabold text-emerald-950 hover:bg-emerald-50 sm:self-auto"><CirclePlus className="h-4 w-4" />Buat batch</button>}</div></section>
        {error ? <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><span>{error}</span><button onClick={load} className="shrink-0 underline">Coba lagi</button></div> : null}
        {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}

        {showCreate ? <form onSubmit={createBatch} className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700">Batch baru</p><h2 className="mt-1 text-lg font-black">Terbitkan Open PO</h2></div><button type="button" onClick={() => setShowCreate(false)} className="rounded-lg px-3 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100">Tutup</button></div>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Nama produk<input required maxLength={100} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: Roti bakar isi" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold">Judul batch<input required maxLength={120} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="PO Roti Bakar Jumat" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold sm:col-span-2">Deskripsi<textarea maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Bahan, varian, ukuran, atau informasi penting" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold">Kategori<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600">{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-bold">Satuan<input required maxLength={30} value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })} placeholder="pcs, cup, box" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold">Kampus<select required value={form.campus} onChange={(event) => setForm({ ...form, campus: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600"><option value="">Pilih kampus</option>{campuses.map((campus) => <option key={campus.id || campus.shortName} value={campus.shortName}>{campus.shortName}</option>)}</select><span className="mt-1 block text-[10px] text-slate-400">Pilih kampus aktif; akun kampus tidak diwajibkan.</span></label><label className="text-xs font-bold">Harga per satuan<input required type="number" min="0" max="100000000" step="1" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="15000" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold">Kuota<input required type="number" min="1" max="100000" step="1" value={form.quota} onChange={(event) => setForm({ ...form, quota: event.target.value })} placeholder="30" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold">Tutup pada<input required type="datetime-local" min={localDateTime(0)} value={form.closesAt} onChange={(event) => setForm({ ...form, closesAt: event.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold sm:col-span-2">Titik pengambilan<input required maxLength={180} value={form.pickupPoint} onChange={(event) => setForm({ ...form, pickupPoint: event.target.value })} placeholder="Contoh: Lobby fakultas, jam 12.00" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold sm:col-span-2">Catatan pickup<input maxLength={500} value={form.pickupNote} onChange={(event) => setForm({ ...form, pickupNote: event.target.value })} placeholder="Petunjuk tambahan (opsional)" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><label className="text-xs font-bold sm:col-span-2">URL foto HTTPS (opsional)<input type="url" value={form.imageUrl} onChange={(event) => setForm({ ...form, imageUrl: event.target.value })} placeholder="https://..." className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label></div>
          <label className="flex cursor-pointer items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950"><input type="checkbox" checked={form.shareContact} onChange={(event) => setForm({ ...form, shareContact: event.target.checked })} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" /><span>Saya setuju nomor WhatsApp saya dibagikan kepada pembeli setelah mereka membuat reservasi.</span></label>
          <button disabled={saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-5 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60 sm:w-auto">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CirclePlus className="h-4 w-4" />}{saving ? "Menerbitkan…" : "Terbitkan batch"}</button>
        </form> : null}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="flex gap-1 overflow-x-auto border-b border-slate-100 p-3 sm:px-4">{tabs.map(([key, label]) => <button key={key} onClick={() => setActiveTab(key)} className={`min-h-9 shrink-0 rounded-full px-3 text-[11px] font-extrabold ${activeTab === key ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{label}</button>)}<button onClick={load} className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full text-slate-500 hover:bg-slate-100" aria-label="Segarkan"><RefreshCw className="h-4 w-4" /></button></div>
          {loading ? <div className="grid min-h-48 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 animate-spin" /></div> : activeTab === "batches" ? batches.length ? <div className="divide-y divide-slate-100">{batches.map((batch) => { const product = batch.product || {}; const busy = busyId === batch.id; return <article key={batch.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:px-5"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800"><Package className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-extrabold">{batch.title}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${statusStyle(batch.status === "open" ? "confirmed" : batch.status)}`}>{batch.status}</span><span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-800"><MapPin className="h-3 w-3" />{product.campus || "Kampus belum dicantumkan"}</span></div><p className="mt-1 text-xs font-bold text-slate-700">{rupiah(batch.price_idr)} · {batch.reserved_count}/{batch.quota} slot</p><p className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><CalendarClock className="h-3 w-3" />Tutup {safeDate(batch.closes_at)} · {batch.pickup_point}</p></div>{batch.status === "open" || batch.status === "closed" ? <button disabled={busy} onClick={() => setBatchStatus(batch, batch.status === "open" ? "closed" : "open")} className="inline-flex min-h-9 items-center justify-center gap-1.5 self-end rounded-full border border-slate-200 px-3 text-[11px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 sm:self-auto">{batch.status === "open" ? <><Pause className="h-3.5 w-3.5" />Tutup</> : <><Play className="h-3.5 w-3.5" />Buka lagi</>}</button> : null}</article>; })}</div> : <Empty title="Belum ada batch PO" detail={sessionBlocked ? "Open PO memerlukan nomor WhatsApp pada akun." : "Terbitkan batch pertama agar pembeli bisa memesan."} action={sessionBlocked ? null : () => setShowCreate(true)} /> : activeTab === "incoming" ? incoming.length ? <div className="space-y-2 p-3 sm:p-4">{incoming.map((order) => <OrderRow key={order.id} kind="incoming" order={order} onStatus={changeOrderStatus} busy={busyId === order.id} />)}</div> : <Empty title="Belum ada pesanan masuk" detail="Reservasi pembeli akan muncul di sini." /> : outgoing.length ? <div className="space-y-2 p-3 sm:p-4">{outgoing.map((order) => <OrderRow key={order.id} kind="outgoing" order={order} onStatus={changeOrderStatus} busy={busyId === order.id} />)}</div> : <Empty title="Belum ada pesanan" detail="Pesanan PO yang Anda buat akan muncul di sini." />}
        </section>
      </div>
    </section>
  );
}

function Empty({ title, detail, action }) {
  return <div className="grid min-h-48 place-items-center px-5 py-9 text-center"><div><ShoppingBag className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-extrabold text-slate-600">{title}</p><p className="mt-1 text-xs text-slate-400">{detail}</p>{action ? <button onClick={action} className="mt-4 min-h-9 rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white">Buat batch</button> : null}</div></div>;
}
