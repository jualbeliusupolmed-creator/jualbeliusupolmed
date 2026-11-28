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
  if (status === "pending") return "bg-amber-100 text-amber-950 dark:bg-amber-950/60 dark:text-amber-200";
  if (status === "confirmed") return "bg-sky-100 text-sky-950 dark:bg-sky-950/60 dark:text-sky-200";
  if (status === "fulfilled") return "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/60 dark:text-emerald-200";
  if (status === "open") return "bg-lime-100 text-emerald-950 dark:bg-lime-950/60 dark:text-lime-200";
  return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
}

function statusLabel(status) {
  return {
    pending: "Menunggu",
    confirmed: "Dikonfirmasi",
    fulfilled: "Selesai",
    cancelled: "Dibatalkan",
    open: "Menerima pesanan",
    closed: "Ditutup",
  }[status] || status;
}

function OrderRow({ order, kind, onStatus, busy }) {
  const batch = order.batch || {};
  const product = batch.product || {};
  const isSeller = kind === "incoming";
  const contact = isSeller ? order.buyer_wa : order.seller_wa;
  const title = batch.title || product.name || "Open PO";
  const actionsClass =
    "inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg px-4 text-xs font-bold transition-colors active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 break-words text-sm font-extrabold text-slate-950 dark:text-white">
            {title}
          </h3>
          <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusStyle(order.status)}`}>
            {statusLabel(order.status)}
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-800 dark:text-slate-200">
          {isSeller ? `Pembeli: ${order.buyer_name}` : `Jumlah: ${order.quantity} ${product.unit || "unit"}`}
          {" · "}
          {order.quantity} × {rupiah(order.unit_price_idr)}
          {" · "}
          <strong>{rupiah(order.total_idr)}</strong>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700 dark:text-slate-300">
          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{batch.pickup_point || "Titik pengambilan mengikuti detail batch"}</span>
          <span aria-hidden="true">·</span>
          <time dateTime={order.created_at}>{safeDate(order.created_at)}</time>
        </p>
        {contact ? (
          <a
            className="mt-2 inline-flex min-h-11 items-center font-bold text-emerald-900 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-emerald-300"
            href={`https://wa.me/${contact}`}
            target="_blank"
            rel="noreferrer"
          >
            Hubungi {isSeller ? "pembeli" : "penjual"} di WhatsApp
          </a>
        ) : (
          <p className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300">
            Nomor WhatsApp tidak dibagikan.
          </p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {isSeller && order.status === "pending" ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(order.id, "confirmed")}
              className={`${actionsClass} bg-[#134e35] text-white hover:bg-[#0a2e1f]`}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Konfirmasi
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onStatus(order.id, "cancelled")}
              className={`${actionsClass} border border-slate-400 text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800`}
            >
              Tolak
            </button>
          </>
        ) : null}
        {isSeller && order.status === "confirmed" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus(order.id, "fulfilled")}
            className={`${actionsClass} bg-emerald-100 text-emerald-950 hover:bg-emerald-200 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900`}
          >
            Tandai selesai
          </button>
        ) : null}
        {!isSeller && ["pending", "confirmed"].includes(order.status) ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => onStatus(order.id, "cancelled")}
            className={`${actionsClass} border border-slate-400 text-slate-900 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800`}
          >
            Batalkan
          </button>
        ) : null}
      </div>
    </article>
  );
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
  const fieldClass =
    "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-600 dark:bg-slate-800 dark:text-white";
  const labelClass = "block text-sm font-bold text-slate-900 dark:text-slate-100";

  return (
    <section className={embedded ? "space-y-5 py-2 text-slate-950 dark:text-slate-100" : "min-h-screen space-y-5 bg-[#f4faf5] px-4 py-5 pb-24 text-slate-950 dark:bg-slate-950 dark:text-slate-100 sm:px-7 sm:py-8"}>
      {!embedded ? (
        <Link
          href="/open-po"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-bold text-emerald-950 underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:text-emerald-300"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Kembali ke etalase PO
        </Link>
      ) : null}
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-col gap-5 rounded-2xl border border-emerald-950/10 bg-[#0a2e1f] p-5 text-white sm:flex-row sm:items-end sm:justify-between sm:p-7">
          <div className="min-w-0">
            <p className="text-xs font-bold text-lime-200">Kelola Open PO</p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
              Batch dan pesanan
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-50">
              {profile?.name || "Akun JB"}
              {profile?.campus ? ` · ${profile.campus}` : ""}. Kelola batch dan pesanan dari akun yang sama.
            </p>
            <Link
              href="/keranjang?tab=po"
              className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-white underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300"
            >
              <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              Lihat progres pesanan saya
            </Link>
          </div>
          {!sessionBlocked ? (
            <button
              type="button"
              onClick={() => {
                setShowCreate((value) => !value);
                setActiveTab("batches");
              }}
              aria-expanded={showCreate}
              aria-controls={showCreate ? "open-po-create-form" : undefined}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-lg bg-[#bef264] px-5 text-sm font-extrabold text-[#0a2e1f] transition-colors hover:bg-lime-300 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime-300 sm:self-auto"
            >
              <CirclePlus className="h-4 w-4" aria-hidden="true" />
              {showCreate ? "Tutup formulir" : "Buat batch"}
            </button>
          ) : null}
        </header>

        {!loading && !sessionBlocked ? (
          <section aria-label="Ringkasan Open PO" className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Semua batch", value: batches.length, Icon: Package },
              { label: "Menerima pesanan", value: openBatches.length, Icon: Play },
              {
                label: "Menunggu konfirmasi",
                value: incoming.filter((order) => order.status === "pending").length,
                Icon: CalendarClock,
              },
            ].map(({ label, value, Icon }) => (
              <div
                key={label}
                className="flex min-h-24 items-center gap-3 rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-2xl font-extrabold tabular-nums text-slate-950 dark:text-white">
                    {value}
                  </p>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
                </div>
              </div>
            ))}
          </section>
        ) : null}

        {error ? (
          <div
            role="alert"
            className="flex flex-col gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-100 sm:flex-row sm:items-center sm:justify-between"
          >
            <span>{error}</span>
            <button
              type="button"
              onClick={load}
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 font-bold underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-800"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Coba lagi
            </button>
          </div>
        ) : null}
        {notice ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-100"
          >
            {notice}
          </div>
        ) : null}

        {showCreate ? (
          <form
            id="open-po-create-form"
            onSubmit={createBatch}
            className="space-y-5 rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-slate-900 sm:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Batch baru</p>
                <h3 className="mt-1 text-xl font-extrabold text-slate-950 dark:text-white">
                  Terbitkan Open PO
                </h3>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  Isi detail produk, kuota, dan titik pengambilan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-slate-400 px-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                Tutup
              </button>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-extrabold text-slate-950 dark:text-white">
                Informasi produk
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Nama produk
                  <input
                    required
                    maxLength={100}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    placeholder="Contoh: Roti bakar isi"
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Judul batch
                  <input
                    required
                    maxLength={120}
                    value={form.title}
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    placeholder="PO Roti Bakar Jumat"
                    className={fieldClass}
                  />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  Deskripsi
                  <textarea
                    maxLength={2000}
                    rows={3}
                    value={form.description}
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    placeholder="Bahan, varian, ukuran, atau informasi penting"
                    className={`${fieldClass} py-2.5`}
                  />
                </label>
                <label className={labelClass}>
                  Kategori
                  <select
                    value={form.category}
                    onChange={(event) => setForm({ ...form, category: event.target.value })}
                    className={`${fieldClass} cursor-pointer`}
                  >
                    {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className={labelClass}>
                  Satuan
                  <input
                    required
                    maxLength={30}
                    value={form.unit}
                    onChange={(event) => setForm({ ...form, unit: event.target.value })}
                    placeholder="pcs, cup, box"
                    className={fieldClass}
                  />
                </label>
              </div>
            </fieldset>

            <fieldset className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">
              <legend className="px-1 text-sm font-extrabold text-slate-950 dark:text-white">
                Harga, kuota, dan pengambilan
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className={labelClass}>
                  Kampus
                  <select
                    required
                    value={form.campus}
                    onChange={(event) => setForm({ ...form, campus: event.target.value })}
                    className={`${fieldClass} cursor-pointer`}
                  >
                    <option value="">Pilih kampus</option>
                    {campuses.map((campus) => (
                      <option key={campus.id || campus.shortName} value={campus.shortName}>
                        {campus.shortName}
                      </option>
                    ))}
                  </select>
                  <span className="mt-1 block text-xs font-normal text-slate-700 dark:text-slate-300">
                    Pilih kampus aktif; akun kampus tidak diwajibkan.
                  </span>
                </label>
                <label className={labelClass}>
                  Harga per satuan
                  <input
                    required
                    type="number"
                    min="0"
                    max="100000000"
                    step="1"
                    value={form.price}
                    onChange={(event) => setForm({ ...form, price: event.target.value })}
                    placeholder="15000"
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Kuota
                  <input
                    required
                    type="number"
                    min="1"
                    max="100000"
                    step="1"
                    value={form.quota}
                    onChange={(event) => setForm({ ...form, quota: event.target.value })}
                    placeholder="30"
                    className={fieldClass}
                  />
                </label>
                <label className={labelClass}>
                  Tutup pada
                  <input
                    required
                    type="datetime-local"
                    min={localDateTime(0)}
                    value={form.closesAt}
                    onChange={(event) => setForm({ ...form, closesAt: event.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  Titik pengambilan
                  <input
                    required
                    maxLength={180}
                    value={form.pickupPoint}
                    onChange={(event) => setForm({ ...form, pickupPoint: event.target.value })}
                    placeholder="Contoh: Lobby fakultas, jam 12.00"
                    className={fieldClass}
                  />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  Catatan pickup
                  <input
                    maxLength={500}
                    value={form.pickupNote}
                    onChange={(event) => setForm({ ...form, pickupNote: event.target.value })}
                    placeholder="Petunjuk tambahan (opsional)"
                    className={fieldClass}
                  />
                </label>
                <label className={`${labelClass} sm:col-span-2`}>
                  URL foto HTTPS (opsional)
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(event) => setForm({ ...form, imageUrl: event.target.value })}
                    placeholder="https://..."
                    className={fieldClass}
                  />
                </label>
              </div>
            </fieldset>

            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
              <input
                type="checkbox"
                checked={form.shareContact}
                onChange={(event) => setForm({ ...form, shareContact: event.target.checked })}
                className="mt-1 h-4 w-4 shrink-0 accent-emerald-700"
              />
              <span>
                Saya setuju nomor WhatsApp saya dibagikan kepada pembeli setelah mereka membuat reservasi.
              </span>
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#134e35] px-5 text-sm font-extrabold text-white transition-colors hover:bg-[#0a2e1f] active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {saving ? (
                <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <CirclePlus className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? "Menerbitkan…" : "Terbitkan batch"}
            </button>
          </form>
        ) : null}

        <section
          aria-label="Data pengelolaan Open PO"
          className="overflow-hidden rounded-2xl border border-emerald-950/10 bg-white dark:border-white/10 dark:bg-slate-900"
        >
          <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-slate-700 sm:flex-row sm:items-center sm:p-4">
            <div
              role="group"
              aria-label="Tampilkan data Open PO"
              className="flex min-w-0 gap-2 overflow-x-auto"
            >
              {tabs.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={activeTab === key}
                  onClick={() => setActiveTab(key)}
                  className={`min-h-11 shrink-0 cursor-pointer rounded-lg px-3 text-sm font-bold transition-colors active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 ${
                    activeTab === key
                      ? "bg-[#134e35] text-white"
                      : "bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              aria-label="Segarkan data Open PO"
              className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 self-start rounded-lg border border-slate-400 px-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 sm:ml-auto sm:self-auto"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Segarkan
            </button>
          </div>

          {loading ? (
            <div
              role="status"
              aria-live="polite"
              className="grid min-h-52 place-items-center gap-2 p-6 text-center text-sm text-slate-700 dark:text-slate-300"
            >
              <LoaderCircle className="h-5 w-5 motion-safe:animate-spin" aria-hidden="true" />
              Memuat batch dan pesanan Open PO…
            </div>
          ) : activeTab === "batches" ? (
            batches.length ? (
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {batches.map((batch) => {
                  const product = batch.product || {};
                  const busy = busyId === batch.id;
                  const quota = Math.max(0, Number(batch.quota) || 0);
                  const reserved = Math.max(0, Number(batch.reserved_count) || 0);
                  const remaining = Math.max(0, quota - reserved);
                  const progress = quota ? Math.min(100, Math.round((reserved / quota) * 100)) : 0;
                  return (
                    <article
                      key={batch.id}
                      className="grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="break-words text-base font-extrabold text-slate-950 dark:text-white">
                            {batch.title}
                          </h3>
                          <span className={`rounded-md px-2 py-1 text-xs font-bold ${statusStyle(batch.status)}`}>
                            {statusLabel(batch.status)}
                          </span>
                          <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-950 dark:bg-emerald-950 dark:text-emerald-200">
                            <MapPin className="h-4 w-4" aria-hidden="true" />
                            {product.campus || "Kampus belum dicantumkan"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                          {rupiah(batch.price_idr)} per {product.unit || "unit"}
                        </p>
                        <div className="mt-3 max-w-xl">
                          <div
                            role="progressbar"
                            aria-label={`${reserved} dari ${quota} slot sudah dipesan`}
                            aria-valuemin={0}
                            aria-valuemax={Math.max(quota, 1)}
                            aria-valuenow={Math.min(reserved, quota)}
                            className="h-2 overflow-hidden rounded-full bg-emerald-100 dark:bg-emerald-950"
                          >
                            <span
                              className="block h-full rounded-full bg-[#134e35]"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <p className="mt-1 text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {reserved} dari {quota} slot dipesan, {remaining} tersisa
                          </p>
                        </div>
                        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700 dark:text-slate-300">
                          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" />
                          Tutup {safeDate(batch.closes_at)}
                          <span aria-hidden="true">·</span>
                          <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
                          {batch.pickup_point}
                        </p>
                      </div>
                      {batch.status === "open" || batch.status === "closed" ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => setBatchStatus(batch, batch.status === "open" ? "closed" : "open")}
                          className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-lg border border-slate-400 px-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-100 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:text-slate-100 dark:hover:bg-slate-800 sm:self-center"
                        >
                          {batch.status === "open" ? (
                            <>
                              <Pause className="h-4 w-4" aria-hidden="true" />
                              Tutup batch
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" aria-hidden="true" />
                              Buka lagi
                            </>
                          )}
                        </button>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            ) : (
              <Empty
                title="Belum ada batch PO"
                detail={sessionBlocked ? "Open PO memerlukan nomor WhatsApp pada akun." : "Terbitkan batch pertama agar pembeli bisa memesan."}
                action={sessionBlocked ? null : () => setShowCreate(true)}
              />
            )
          ) : activeTab === "incoming" ? (
            incoming.length ? (
              <div className="space-y-3 p-3 sm:p-4">
                {incoming.map((order) => (
                  <OrderRow
                    key={order.id}
                    kind="incoming"
                    order={order}
                    onStatus={changeOrderStatus}
                    busy={busyId === order.id}
                  />
                ))}
              </div>
            ) : (
              <Empty title="Belum ada pesanan masuk" detail="Reservasi pembeli akan muncul di sini." />
            )
          ) : outgoing.length ? (
            <div className="space-y-3 p-3 sm:p-4">
              {outgoing.map((order) => (
                <OrderRow
                  key={order.id}
                  kind="outgoing"
                  order={order}
                  onStatus={changeOrderStatus}
                  busy={busyId === order.id}
                />
              ))}
            </div>
          ) : (
            <Empty title="Belum ada pesanan" detail="Pesanan PO yang Anda buat akan muncul di sini." />
          )}
        </section>
      </div>
    </section>
  );
}

function Empty({ title, detail, action }) {
  return (
    <div className="grid min-h-52 place-items-center px-5 py-9 text-center">
      <div>
        <ShoppingBag className="mx-auto h-7 w-7 text-emerald-900 dark:text-emerald-300" aria-hidden="true" />
        <p className="mt-3 text-base font-extrabold text-slate-950 dark:text-white">{title}</p>
        <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">{detail}</p>
        {action ? (
          <button
            type="button"
            onClick={action}
            className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg bg-[#bef264] px-4 text-sm font-extrabold text-[#0a2e1f] transition-colors hover:bg-lime-300 active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
          >
            Buat batch
          </button>
        ) : null}
      </div>
    </div>
  );
}
