"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, CalendarClock, Check, CircleAlert, LoaderCircle, MapPin, Package, Search, ShoppingBag, Users } from "lucide-react";
import { rupiah } from "@/lib/fees";

const CATEGORIES = ["Semua", "Makanan", "Minuman", "Merchandise", "Jastip", "Lainnya"];

function dateLabel(value) {
  if (!value) return "Waktu tutup belum ditentukan";
  return new Date(value).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function OpenPoClient({ initialBatches = [], isAuthenticated = false, initialError = "" }) {
  const [query, setQuery] = useState("");
  const [campusFilter, setCampusFilter] = useState("Semua kampus");
  const [category, setCategory] = useState("Semua");
  const [selected, setSelected] = useState(null);
  const [buyerName, setBuyerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [contactConsent, setContactConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(initialError);
  const [success, setSuccess] = useState(null);

  const campuses = useMemo(() => ["Semua kampus", ...new Set(initialBatches.map((batch) => batch.campus).filter(Boolean))], [initialBatches]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return initialBatches.filter((batch) => {
      const text = `${batch.title} ${batch.name} ${batch.description} ${batch.pickup_point} ${batch.seller_name}`.toLowerCase();
      return (!needle || text.includes(needle)) && (campusFilter === "Semua kampus" || batch.campus === campusFilter) && (category === "Semua" || batch.category === category);
    });
  }, [initialBatches, query, campusFilter, category]);

  async function reserve(event) {
    event.preventDefault();
    if (!selected) return;
    if (!isAuthenticated) {
      window.location.href = `/dashboard/login?next=${encodeURIComponent("/open-po")}`;
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/open-po/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: selected.id, buyerName, quantity, contactConsent }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Reservasi gagal dibuat.");
      setSuccess({ order: result.order, sellerContact: result.sellerContact, productName: result.productName });
      setSelected(null);
      setBuyerName("");
      setQuantity(1);
      setContactConsent(false);
    } catch (cause) { setError(cause.message); }
    finally { setSubmitting(false); }
  }

  const nextPath = isAuthenticated ? "/dashboard/open-po" : "/dashboard/login?next=%2Fdashboard%2Fopen-po";

  return (
    <main className="min-h-screen bg-[#f5f8f6] pb-24 text-slate-950">
      <section className="relative overflow-hidden bg-[linear-gradient(118deg,#064e3b_0%,#047857_56%,#10a46b_100%)] px-4 pb-9 pt-9 text-white sm:px-7 sm:pb-12 sm:pt-12">
        <div className="pointer-events-none absolute -right-24 -top-20 h-72 w-72 rounded-full border-[44px] border-white/5" />
        <div className="relative mx-auto max-w-6xl"><Link href="/" className="inline-flex min-h-9 items-center gap-2 text-xs font-bold text-emerald-50/85 hover:text-white">Kampus Kita <ArrowRight className="h-3.5 w-3.5" /> Open PO</Link><div className="mt-7 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end"><div className="max-w-2xl"><p className="text-[10px] font-extrabold uppercase tracking-[.19em] text-emerald-100/75">Jualan & pre-order kampus</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Open PO, lebih dekat.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-emerald-50/85 sm:text-base">Temukan makanan, minuman, jastip, dan merchandise dari komunitas kampus. Pesan dengan akun JB yang sama.</p></div><div className="flex flex-wrap gap-2 lg:justify-end"><Link href="/keranjang?tab=po" className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full bg-white px-5 text-xs font-extrabold text-emerald-950 shadow-lg shadow-emerald-950/10 transition hover:bg-emerald-50"><ShoppingBag className="h-4 w-4" />Pesanan & keranjang</Link><Link href={nextPath} className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-full border border-white/30 bg-emerald-950/20 px-5 text-xs font-extrabold text-white transition hover:bg-emerald-950/35"><Users className="h-4 w-4" />Dashboard PO</Link></div></div>
          <label className="mt-7 flex h-12 max-w-2xl items-center gap-3 rounded-2xl border border-white/20 bg-white px-4 text-slate-500 shadow-xl shadow-emerald-950/10"><Search className="h-4 w-4 shrink-0" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari menu, produk, atau lokasi pickup" className="h-full min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400" /></label>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-7 sm:py-8">
        {error ? <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold leading-relaxed text-rose-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
        {success ? <div role="status" className="flex flex-col gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-700 text-white"><Check className="h-4 w-4" /></span><div><p className="text-sm font-extrabold text-emerald-950">Reservasi berhasil dibuat</p><p className="mt-1 text-xs leading-relaxed text-emerald-900/70">Pesanan {success.productName} tercatat. Lihat progresnya di Keranjang → Pesanan Open PO.</p></div></div><div className="flex flex-wrap gap-2">{success.sellerContact ? <a href={`https://wa.me/${success.sellerContact}`} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center justify-center rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white">Hubungi penjual</a> : null}<Link href="/keranjang?tab=po" className="inline-flex min-h-9 items-center justify-center rounded-full border border-emerald-200 px-4 text-xs font-extrabold text-emerald-900">Lihat progres pesanan</Link><Link href="/dashboard?tab=open-po" className="inline-flex min-h-9 items-center justify-center rounded-full border border-emerald-200 px-4 text-xs font-extrabold text-emerald-900">Dashboard PO</Link><button onClick={() => setSuccess(null)} className="rounded-full px-3 text-xs font-bold text-emerald-700">Tutup</button></div></div> : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-emerald-700">Batch yang menerima pesanan</p><h2 className="mt-1 text-xl font-black tracking-tight">Temukan PO pilihanmu</h2></div><div className="flex flex-wrap gap-2"><select value={campusFilter} onChange={(event) => setCampusFilter(event.target.value)} className="h-10 rounded-full border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 outline-none focus:border-emerald-600">{campuses.map((campus) => <option key={campus}>{campus}</option>)}</select><Link href="/keranjang?tab=po" className="inline-flex h-10 items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 text-xs font-extrabold text-emerald-800 hover:bg-emerald-50"><ShoppingBag className="h-3.5 w-3.5" />Pesanan saya</Link><Link href={nextPath} className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white hover:bg-emerald-900"><Users className="h-3.5 w-3.5" />Dashboard PO</Link></div></div>
        <div className="flex gap-2 overflow-x-auto pb-1">{CATEGORIES.map((item) => <button key={item} onClick={() => setCategory(item)} className={`min-h-9 shrink-0 rounded-full px-4 text-xs font-extrabold transition ${category === item ? "bg-emerald-800 text-white" : "border border-slate-200 bg-white text-slate-600 hover:border-emerald-200 hover:text-emerald-800"}`}>{item}</button>)}</div>

        {initialError ? <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-6 text-center"><div><CircleAlert className="mx-auto h-7 w-7 text-amber-600" /><p className="mt-3 text-sm font-extrabold text-slate-800">Etalase PO belum siap</p><p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-slate-500">Database Open PO baru belum tersedia. Jalankan migrasi proyek ini sebelum batch dapat dipublikasikan.</p><Link href={nextPath} className="mt-4 inline-flex min-h-9 items-center rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white">Buka dashboard PO</Link></div></div> : filtered.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((batch) => {
          const remaining = Math.max(0, batch.quota - batch.reserved);
          return <article key={batch.id} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_18px_-16px_rgba(15,23,42,.28)] transition hover:-translate-y-0.5 hover:shadow-lg"><div className="relative h-44 bg-emerald-50">{batch.photo ? <img src={batch.photo} alt={batch.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <div className="grid h-full place-items-center text-emerald-700/30"><Package className="h-10 w-10" /></div>}<span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-extrabold text-emerald-900 shadow-sm">{batch.category}</span><span className="absolute right-3 top-3 rounded-full bg-slate-950/70 px-3 py-1.5 text-[10px] font-extrabold text-white">Sisa {remaining} slot</span></div><div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="line-clamp-1 text-base font-black tracking-tight">{batch.title}</h3><p className="mt-1 text-xs font-semibold text-slate-500">{batch.seller_name}{batch.faculty ? ` · ${batch.faculty}` : ""}</p></div><div className="shrink-0 text-right"><p className="text-sm font-black text-emerald-800">{rupiah(batch.price)}</p><p className="text-[10px] text-slate-400">/ {batch.unit}</p></div></div>{batch.description ? <p className="mt-3 line-clamp-2 min-h-9 text-xs leading-relaxed text-slate-500">{batch.description}</p> : <p className="mt-3 min-h-9 text-xs text-slate-400">Detail produk tersedia dari penjual.</p>}<div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-[10px] font-semibold text-slate-500"><p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-700" />{batch.campus} · {batch.pickup_point}</p><p className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-emerald-700" />Tutup {dateLabel(batch.closes_at)}</p></div><button onClick={() => { setSelected(batch); setError(""); setSuccess(null); }} disabled={remaining < 1} className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-slate-300">Pesan slot <ArrowRight className="h-3.5 w-3.5" /></button></div></article>;
        })}</div> : <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center"><div><ShoppingBag className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-extrabold text-slate-700">Belum ada batch yang cocok</p><p className="mt-1 text-xs text-slate-400">Coba ubah kata pencarian atau filter kampus.</p><Link href={nextPath} className="mt-4 inline-flex min-h-9 items-center rounded-full bg-emerald-800 px-4 text-xs font-extrabold text-white">Buat batch PO</Link></div></div>}
      </div>

      {selected ? <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><form onSubmit={reserve} className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-emerald-700">Reservasi slot</p><h2 className="mt-1 text-lg font-black">{selected.title}</h2><p className="mt-1 text-xs text-slate-500">{rupiah(selected.price)} / {selected.unit}</p></div><button type="button" onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">×</button></div>{!isAuthenticated ? <div className="mt-5 rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">Masuk dengan akun JB untuk memesan. Akun marketplace yang sama digunakan untuk semua aktivitas.</div> : <div className="mt-5 space-y-3"><label className="block text-xs font-bold">Nama pemesan<input required minLength={2} maxLength={80} value={buyerName} onChange={(event) => setBuyerName(event.target.value)} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" placeholder="Nama yang dapat dikenali penjual" /></label><label className="block text-xs font-bold">Jumlah<input required type="number" min="1" max={Math.max(1, selected.quota - selected.reserved)} value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-emerald-600" /></label><p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs font-bold text-slate-700">Total: {rupiah(selected.price * quantity)}</p><label className="flex cursor-pointer items-start gap-2 rounded-xl bg-emerald-50 p-3 text-[11px] leading-relaxed text-emerald-950"><input required type="checkbox" checked={contactConsent} onChange={(event) => setContactConsent(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-emerald-700" /><span>Saya setuju nomor WhatsApp akun JB saya dibagikan kepada penjual untuk kebutuhan reservasi ini.</span></label></div>}{error ? <p role="alert" className="mt-3 text-xs font-semibold text-rose-700">{error}</p> : null}<button disabled={submitting} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-800 text-xs font-extrabold text-white hover:bg-emerald-900 disabled:opacity-60">{submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}{!isAuthenticated ? "Masuk untuk memesan" : submitting ? "Menyimpan reservasi…" : "Buat reservasi"}</button></form></div> : null}
    </main>
  );
}
