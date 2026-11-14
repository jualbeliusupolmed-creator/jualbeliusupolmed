"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Clock3, LoaderCircle, PackageSearch, RefreshCw, Search, X, SearchCheck, Trash2, Store, Layers, Pencil, ExternalLink, MessageCircle, ArrowUp, Sparkles } from "lucide-react";
import { rupiah } from "@/lib/fees";
import { useAdmin } from "./AdminProvider";
import OmnichannelPublishModal from "./OmnichannelPublishModal";

const FILTERS = [
  ["active", "Aktif"],
  ["all", "Semua status"],
  ["pending", "Menunggu review"],
  ["sold", "Terjual"],
  ["suspended", "Ditangguhkan"],
  ["rejected", "Ditolak"],
];
const WANTED_FILTERS = [
  ["active", "Aktif"],
  ["all", "Semua status"],
  ["pending", "Menunggu"],
  ["resolved", "Selesai"],
];
const STORE_FILTERS = [
  ["aktif", "Aktif"],
  ["all", "Semua status"],
  ["menunggu", "Menunggu review"],
  ["ditolak", "Ditolak"],
];

function ActionButton({ busy, onClick, label, icon: Icon, tone = "neutral" }) {
  const colors = {
    neutral: "border border-slate-200 text-slate-600 hover:bg-slate-50",
    danger: "border border-rose-200 text-rose-700 hover:bg-rose-50",
    primary: "bg-emerald-800 text-white hover:bg-emerald-900",
  };
  return <button disabled={busy} onClick={onClick} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold active:opacity-85 disabled:opacity-50 ${colors[tone]}`}>{busy ? <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" /> : <Icon className="h-3.5 w-3.5" />}{label}</button>;
}

export default function MarketplaceWorkspace({ initialMode = "listings", initialStatus = "active", canReview = false, canManage = false, superadmin = false }) {
  const { confirmThen, promptThen } = useAdmin();
  const [items, setItems] = useState([]);
  const [mode, setMode] = useState(initialMode);
  const [status, setStatus] = useState(initialStatus || (initialMode === "stores" ? "aktif" : "active"));
  const [statusCounts, setStatusCounts] = useState({});
  const [nextOffset, setNextOffset] = useState(null);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [publishListing, setPublishListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [inspectListing, setInspectListing] = useState(null);
  const [inspectForm, setInspectForm] = useState({ price: "", stock: "", category: "" });
  const [editForm, setEditForm] = useState({
    title: "",
    price: "",
    category: "",
    condition: "Bekas",
    stock: 1,
    area: "",
    campus: "",
    seller_name: "",
    seller_wa: "",
    description: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingInspect, setSavingInspect] = useState(false);

  const load = useCallback(async (offset = 0, append = false) => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ status, offset: String(offset) });
    if (mode !== "stores") params.set("mode", mode === "wanted" ? "wanted" : "listings");
    if (query.trim()) params.set("q", query.trim());
    try {
      const endpoint = mode === "stores" ? "/api/admin/stores" : "/api/admin/marketplace";
      const response = await fetch(`${endpoint}?${params}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Data marketplace gagal dimuat.");
      setItems((current) => append ? [...current, ...(data.items || [])] : (data.items || []));
      setNextOffset(data.nextOffset ?? null);
      setTotal(data.total || 0);
      if (data.statusCounts) setStatusCounts(data.statusCounts);
    } catch (cause) { setError(cause.message); }
    finally { setLoading(false); }
  }, [status, query, mode]);
  useEffect(() => { load(); }, [load]);

  const pendingCount = useMemo(() => {
    if (typeof statusCounts?.pending === "number" && mode !== "stores") {
      return statusCounts.pending;
    }
    if (typeof statusCounts?.menunggu === "number" && mode === "stores") {
      return statusCounts.menunggu;
    }
    return items.filter((item) =>
      mode === "stores"
        ? item.status === "menunggu"
        : mode === "wanted"
        ? item.status === "active" || item.status === "pending"
        : item.status === "pending"
    ).length;
  }, [items, mode, statusCounts]);

  async function reviewStore(item, action) {
    const execute = async (reason = "") => {
      setBusyId(item.storeToken);
      setNotice("");
      setError("");
      try {
        const response = await fetch("/api/admin/stores", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ storeToken: item.storeToken, action, reason }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Pengajuan toko gagal diproses.");
        setNotice(action === "approve" ? "Toko diaktifkan dan penjual diberi kabar." : "Pengajuan toko ditolak dan penjual diberi alasan.");
        await load(0);
      } catch (cause) { setError(cause.message); }
      finally { setBusyId(""); }
    };
    if (action === "reject") {
      promptThen({ title: "Tolak pengajuan toko?", label: "Alasan penolakan", hint: "Alasan wajib diisi dan akan dikirim kepada penjual.", confirmLabel: "Tolak pengajuan" }, execute);
    } else {
      confirmThen({ title: "Aktifkan toko?", message: "Toko yang disetujui memberi penjual hak memasang iklan tanpa biaya.", confirmLabel: "Aktifkan toko" }, execute);
    }
  }

  async function review(item, action) {
    const needsReason = action === "reject" || action === "suspend";
    const execute = async (reason = "") => {
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
    };
    if (needsReason) {
      promptThen({ title: action === "suspend" ? "Tangguhkan iklan?" : "Tolak iklan?", label: action === "suspend" ? "Alasan penangguhan (opsional)" : "Alasan penolakan (opsional)", allowEmpty: true, confirmLabel: action === "suspend" ? "Tangguhkan" : "Tolak" }, execute);
    } else {
      execute();
    }
  }

  async function handleWanted(item, action) {
    const execute = async () => {
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
    };
    if (action === "remove") {
      confirmThen({ title: "Hapus kebutuhan?", message: `Hapus kebutuhan “${item.title}” secara permanen?`, danger: true, confirmLabel: "Hapus kebutuhan" }, execute);
    } else {
      execute();
    }
  }

  function openEditModal(item) {
    setEditingListing(item);
    setEditForm({
      title: item.title || "",
      price: item.price || 0,
      category: item.category || "",
      condition: item.condition || "Bekas",
      stock: item.stock ?? 1,
      area: item.area || "",
      campus: item.campus || "",
      seller_name: item.seller_name || "",
      seller_wa: item.seller_wa || "",
      description: item.description || "",
    });
  }

  async function handleSaveEdit(e) {
    if (e) e.preventDefault();
    if (!editingListing) return;
    setSavingEdit(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch("/api/admin/marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingListing.id,
          action: "edit",
          ...editForm,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan perubahan iklan.");
      setNotice("Iklan berhasil diperbarui.");
      setEditingListing(null);
      await load(0);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSavingEdit(false);
    }
  }

  async function saveInspect() {
    if (!inspectListing) return;
    setSavingInspect(true);
    setError("");
    setNotice("");
    try {
      const updates = {};
      if (inspectForm.price !== undefined && inspectForm.price !== "") {
        updates.price = Math.max(0, parseInt(inspectForm.price, 10) || 0);
      }
      if (inspectForm.stock !== undefined && inspectForm.stock !== "") {
        updates.stock = Math.max(0, parseInt(inspectForm.stock, 10) || 0);
      }
      if (inspectForm.category !== undefined && inspectForm.category !== "") {
        updates.category = String(inspectForm.category).trim().slice(0, 60);
      }
      if (Object.keys(updates).length === 0) {
        setInspectListing(null);
        return;
      }
      const response = await fetch("/api/admin/marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inspectListing.id, action: "edit", ...updates }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Gagal menyimpan perubahan.");
      setNotice("Iklan berhasil diperbarui.");
      setInspectListing(null);
      await load(0);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSavingInspect(false);
    }
  }

  async function handleDeleteListing(item) {
    confirmThen(
      {
        title: "Hapus iklan permanen?",
        message: `Hapus iklan “${item.title}” secara permanen? Data akan terhapus dari basis data dan tidak dapat dikembalikan.`,
        danger: true,
        confirmLabel: "Hapus permanen",
      },
      async () => {
        setBusyId(String(item.id));
        setNotice("");
        setError("");
        try {
          const response = await fetch(`/api/admin/marketplace?id=${encodeURIComponent(item.id)}&entityType=listings`, {
            method: "DELETE",
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || "Iklan gagal dihapus.");
          setNotice("Iklan berhasil dihapus secara permanen.");
          await load(0);
        } catch (cause) {
          setError(cause.message);
        } finally {
          setBusyId("");
        }
      }
    );
  }

  async function handleVipAction(item, action) {
    setBusyId(String(item.id));
    setNotice("");
    setError("");
    try {
      const response = await fetch("/api/admin/marketplace", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType: "listings", id: item.id, action }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Aksi VIP gagal diterapkan.");
      setNotice(data.message || (action === "force_bump" ? "Iklan berhasil di-bump ke posisi teratas!" : "Iklan disematkan ke FYP!"));
      await load(0);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight">Marketplace</h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">Tinjau iklan dan kebutuhan jual-beli di kampus dalam cakupan akun.</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {pendingCount > 0 ? (
            <div className="inline-flex min-h-10 items-center gap-2 rounded-full bg-amber-50 px-3 text-xs font-extrabold text-amber-900">
              <Clock3 className="h-4 w-4" />
              {pendingCount} menunggu review
            </div>
          ) : (
            <div className="inline-flex min-h-10 items-center gap-2 rounded-full bg-emerald-50 px-3 text-xs font-extrabold text-emerald-900">
              <PackageSearch className="h-4 w-4" />
              {total.toLocaleString("id-ID")} {mode === "wanted" ? "kebutuhan" : mode === "stores" ? "toko" : "iklan"} {status === "all" ? "total" : status === "active" || status === "aktif" ? "aktif" : status}
            </div>
          )}
          <button onClick={() => load(0)} aria-label="Segarkan daftar" className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 hover:border-emerald-200 hover:text-emerald-800">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>
      {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{notice}</div> : null}
      {error ? <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-800"><span>{error}</span><button onClick={() => load(0)} className="shrink-0 underline">Coba lagi</button></div> : null}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-col gap-3">
            <div className="flex gap-1">
              {[["listings", "Iklan jual"], ["wanted", "Dicari"], ["stores", "Toko"]].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => {
                    setMode(key);
                    setStatus(key === "stores" ? "aktif" : "active");
                  }}
                  aria-pressed={mode === key}
                  className={`min-h-9 rounded-full px-3 text-[11px] font-extrabold ${mode === key ? "bg-emerald-50 text-emerald-900" : "text-slate-500 hover:bg-slate-100"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(mode === "stores" ? STORE_FILTERS : mode === "wanted" ? WANTED_FILTERS : FILTERS).map(([key, label]) => {
                const count = statusCounts?.[key];
                return (
                  <button
                    key={key}
                    onClick={() => setStatus(key)}
                    aria-pressed={status === key}
                    className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold transition ${
                      status === key ? "bg-emerald-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    <span>{label}</span>
                    {typeof count === "number" ? (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                          status === key ? "bg-emerald-900/80 text-emerald-100" : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {count.toLocaleString("id-ID")}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="relative block w-full sm:max-w-[250px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Cari iklan atau kebutuhan"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setQuery(searchInput.trim());
                }
              }}
              placeholder="Cari judul iklan · Enter"
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-xs outline-none focus:border-emerald-600"
            />
          </label>
        </div>
        {loading ? <div className="grid min-h-56 place-items-center text-slate-400"><LoaderCircle className="h-5 w-5 motion-safe:animate-spin" /></div> : items.length ? <div className="divide-y divide-slate-100">{items.map((item) => {
          if (mode === "stores") {
            const busy = busyId === item.storeToken;
            return <article key={item.storeToken} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:px-5"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><Store className="h-6 w-6" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-extrabold">{item.storeName}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${item.status === "menunggu" ? "bg-amber-50 text-amber-800" : item.status === "aktif" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>{item.status}</span></div><p className="mt-1 text-xs text-slate-500">{item.name} · {item.campus || "Kampus tidak diisi"} · {item.maskedPhone}</p><p className="mt-1 text-[10px] font-semibold text-slate-400">{item.area || "Lokasi belum diisi"}{item.hours ? ` · ${item.hours}` : ""}{item.requestedAt ? ` · Diajukan ${new Date(item.requestedAt).toLocaleDateString("id-ID")}` : ""}</p>{item.bio ? <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">{item.bio}</p> : null}{item.rejectNote ? <p className="mt-2 text-xs text-rose-700">Alasan sebelumnya: {item.rejectNote}</p> : null}{item.slug ? <a href={`/toko/${encodeURIComponent(item.slug)}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[11px] font-bold text-emerald-800 underline">Lihat toko ↗</a> : null}</div>{item.status === "menunggu" && canReview ? <div className="flex shrink-0 gap-2 self-end sm:self-auto"><ActionButton busy={busy} onClick={() => reviewStore(item, "reject")} label="Tolak" icon={X} tone="danger" /><ActionButton busy={busy} onClick={() => reviewStore(item, "approve")} label="Aktifkan" icon={Check} tone="primary" /></div> : null}</article>;
          }
          const busy = busyId === String(item.id);
          const buttons = mode === "wanted"
            ? <>{canManage && ["active", "pending"].includes(item.status) ? <ActionButton busy={busy} onClick={() => handleWanted(item, "resolve")} label="Tandai selesai" icon={Check} tone="primary" /> : null}{superadmin ? <ActionButton busy={busy} onClick={() => handleWanted(item, "remove")} label="Hapus" icon={Trash2} tone="danger" /> : null}</>
            : <div className="flex flex-wrap items-center gap-1.5">
                {canManage && <ActionButton busy={busy} onClick={() => openEditModal(item)} label="Edit" icon={Pencil} tone="neutral" />}
                {(canManage || superadmin) && item.status === "active" && (
                  <>
                    <ActionButton busy={busy} onClick={() => handleVipAction(item, "force_bump")} label="Bump" icon={ArrowUp} tone="primary" />
                    <ActionButton busy={busy} onClick={() => handleVipAction(item, "pin_fyp")} label="Pin FYP" icon={Sparkles} tone="neutral" />
                  </>
                )}
                {canManage && <ActionButton busy={busy} onClick={() => setPublishListing(item)} label="Distribusi" icon={Layers} tone="neutral" />}
                {item.status === "pending" && canReview && (
                  <>
                    <ActionButton busy={busy} onClick={() => review(item, "reject")} label="Tolak" icon={X} tone="danger" />
                    <ActionButton busy={busy} onClick={() => review(item, "approve")} label="Setujui" icon={Check} tone="primary" />
                  </>
                )}
                {canManage && item.status === "active" && (
                  <ActionButton busy={busy} onClick={() => review(item, "suspend")} label="Tangguhkan" icon={X} tone="danger" />
                )}
                {canManage && ["suspended", "hidden", "rejected"].includes(item.status) && (
                  <ActionButton busy={busy} onClick={() => review(item, "restore")} label="Pulihkan" icon={Check} tone="primary" />
                )}
                {(canManage || superadmin) && (
                  <ActionButton busy={busy} onClick={() => handleDeleteListing(item)} label="Hapus" icon={Trash2} tone="danger" />
                )}
              </div>;
          return (
            <article key={item.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:px-5">
              <div className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-emerald-800">
                {mode === "wanted" ? (
                  <SearchCheck className="h-6 w-6" />
                ) : item.image_url ? (
                  <img src={item.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <PackageSearch className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {mode === "listings" ? (
                    <span
                      onClick={() => setInspectListing(item)}
                      className="truncate text-sm font-extrabold text-slate-900 cursor-pointer hover:text-emerald-800 hover:underline"
                      title="Klik untuk Quick Inspect"
                    >
                      {item.title}
                    </span>
                  ) : (
                    item.title
                  )}
                  {mode === "listings" && (
                    <a
                      href={`/admin/listings/${item.slug || item.id}`}
                      target="_blank"
                      rel="noreferrer"
                      title="Buka detail & kelola di admin (tab baru)"
                      className="inline-flex text-slate-400 hover:text-emerald-700"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                      item.status === "pending"
                        ? "bg-amber-50 text-amber-800"
                        : item.status === "active"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs font-bold text-slate-700">
                  {mode === "wanted" ? "Anggaran " + rupiah(item.budget || 0) : rupiah(item.price || 0)}{" "}
                  <span className="font-medium text-slate-400">· {item.category || "Tanpa kategori"}</span>
                  {item.condition ? <span className="font-medium text-slate-400"> · {item.condition}</span> : null}
                  {typeof item.stock === "number" ? <span className="font-medium text-slate-400"> · Stok {item.stock}</span> : null}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-500">
                  {item.description || "Tidak ada deskripsi."}
                </p>
                {/* Info Penjual / Pemesan */}
                {mode === "listings" && (item.seller_name || item.seller_wa) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-500">Penjual:</span>
                    {item.seller_wa ? (
                      <Link
                        href={`/admin/penjual/${encodeURIComponent(item.seller_wa)}`}
                        className="font-bold text-emerald-800 hover:underline"
                        title="Buka rekap toko penjual"
                      >
                        {item.seller_name || "Tanpa nama"} ({item.seller_wa})
                      </Link>
                    ) : (
                      <span className="font-medium text-slate-700">{item.seller_name || "—"}</span>
                    )}
                    {item.seller_wa && (
                      <a
                        href={`https://wa.me/${item.seller_wa.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                        title="Chat WhatsApp dengan penjual"
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                )}
                {mode === "wanted" && (item.contact_wa || item.buyer_wa) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-slate-500">Kontak:</span>
                    <span className="font-medium text-slate-700">{item.buyer_name || "Pembeli"} ({item.contact_wa || item.buyer_wa})</span>
                    <a
                      href={`https://wa.me/${(item.contact_wa || item.buyer_wa).replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100"
                    >
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </a>
                  </div>
                )}
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-slate-400">
                  <span>{item.campus || "Kampus tidak diisi"}</span>
                  {item.area ? <span>{item.area}</span> : null}
                  <span>{new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</span>
                </div>
              </div>
              {buttons ? <div className="flex shrink-0 gap-2 self-end sm:self-auto">{buttons}</div> : null}
            </article>
          );
        })}</div> : <div className="grid min-h-56 place-items-center px-5 text-center"><div><PackageSearch className="mx-auto h-7 w-7 text-slate-300" /><p className="mt-3 text-sm font-bold text-slate-600">Tidak ada iklan pada filter ini</p><p className="mt-1 text-xs text-slate-400">Coba ubah status atau kata pencarian.</p></div></div>}
        {nextOffset !== null ? <div className="flex flex-col items-center gap-2 border-t border-slate-100 p-3"><p className="text-[10px] text-slate-400">Menampilkan {items.length.toLocaleString("id-ID")} dari {total.toLocaleString("id-ID")}</p><button onClick={() => load(nextOffset, true)} disabled={loading} className="inline-flex min-h-9 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-xs font-bold text-slate-700 hover:bg-slate-200 active:opacity-85 disabled:opacity-50">{loading ? <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" /> : null}Muat berikutnya</button></div> : null}
      </section>

      {/* Slide-over Drawer Edit Listing */}
      {editingListing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm" onClick={() => setEditingListing(null)}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Edit Cepat Listing</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {editingListing.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingListing(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="mb-1 block font-bold text-slate-700">Judul Barang</label>
                <input
                  type="text"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Harga (Rp)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editForm.price}
                    onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Stok</label>
                  <input
                    type="number"
                    min="0"
                    value={editForm.stock}
                    onChange={(e) => setEditForm((f) => ({ ...f, stock: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Kategori</label>
                  <input
                    type="text"
                    value={editForm.category}
                    onChange={(e) => setEditForm((f) => ({ ...f, category: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Kondisi</label>
                  <select
                    value={editForm.condition}
                    onChange={(e) => setEditForm((f) => ({ ...f, condition: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  >
                    <option value="Bekas">Bekas</option>
                    <option value="Baru">Baru</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Nama Penjual</label>
                  <input
                    type="text"
                    value={editForm.seller_name}
                    onChange={(e) => setEditForm((f) => ({ ...f, seller_name: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Nomor WhatsApp</label>
                  <input
                    type="text"
                    value={editForm.seller_wa}
                    onChange={(e) => setEditForm((f) => ({ ...f, seller_wa: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Kampus</label>
                  <input
                    type="text"
                    value={editForm.campus}
                    onChange={(e) => setEditForm((f) => ({ ...f, campus: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-bold text-slate-700">Lokasi / Titik COD</label>
                  <input
                    type="text"
                    value={editForm.area}
                    onChange={(e) => setEditForm((f) => ({ ...f, area: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-slate-200 px-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-bold text-slate-700">Deskripsi Barang</label>
                <textarea
                  rows={4}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingListing(null)}
                  className="min-h-9 rounded-full border border-slate-200 px-4 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-emerald-800 px-5 font-extrabold text-white hover:bg-emerald-900 active:opacity-85 disabled:opacity-50"
                >
                  {savingEdit ? <LoaderCircle className="h-3.5 w-3.5 motion-safe:animate-spin" /> : null}
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Omnichannel Distribution */}
      <OmnichannelPublishModal
        listing={publishListing}
        isOpen={!!publishListing}
        onClose={() => setPublishListing(null)}
        onSuccess={() => load(0)}
      />

      {/* Quick Inspect Drawer */}
      {inspectListing && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-sm" onClick={() => setInspectListing(null)}>
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl animate-in slide-in-from-right duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Quick Inspect</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {inspectListing.id}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectListing(null)}
                className="grid h-8 w-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {/* Galeri foto */}
              <div>
                <h4 className="font-bold text-slate-700 mb-2">Galeri Foto</h4>
                <div className="grid grid-cols-3 gap-2">
                  {(inspectListing.images && Array.isArray(inspectListing.images) ? inspectListing.images : [inspectListing.image_url].filter(Boolean)).map((img, i) => (
                    <div key={i} className="aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                      <img src={img} alt="" className="h-full w-full object-cover" loading="lazy" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Riwayat moderasi */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="font-bold text-slate-700 mb-2">Status & Moderasi</h4>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold ${inspectListing.status === "pending" ? "bg-amber-50 text-amber-800" : inspectListing.status === "active" ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600"}`}
                  >
                    {inspectListing.status}
                  </span>
                  {inspectListing.risk_score != null && (
                    <span className="text-slate-400">Risiko: {(Number(inspectListing.risk_score) * 100).toFixed(0)}%</span>
                  )}
                </div>
                {inspectListing.moderation_reason && (
                  <p className="text-[10px] text-slate-500">{inspectListing.moderation_reason}</p>
                )}
              </div>

              {/* Penjual & WA */}
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="font-bold text-slate-700 mb-2">Penjual</h4>
                <p className="text-sm font-bold text-slate-900">{inspectListing.seller_name || "—"}</p>
                <p className="text-[10px] text-slate-500 truncate">{inspectListing.seller_wa || "—"}</p>
                {inspectListing.seller_wa ? (
                  <button
                    onClick={() => {
                      const wa = String(inspectListing.seller_wa).replace(/\D/g, "");
                      const msg = `Halo, saya admin Kampus Kita. Saya ingin menawarkan bantuan terkait iklan Anda: "${inspectListing.title}". Apakah barang ini masih tersedia?`;
                      window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}
                    className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-emerald-800 px-3 text-[11px] font-extrabold text-white hover:bg-emerald-900 active:opacity-85"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> Chat Admin ke Penjual
                  </button>
                ) : null}
              </div>

              {/* Quick edit */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <h4 className="font-bold text-slate-700 mb-2">Edit Cepat</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Harga (Rp)</label>
                    <input
                      type="number"
                      value={inspectForm.price}
                      onChange={(e) => setInspectForm((f) => ({ ...f, price: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[11px] outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block font-bold text-slate-700">Stok</label>
                    <input
                      type="number"
                      value={inspectForm.stock}
                      onChange={(e) => setInspectForm((f) => ({ ...f, stock: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[11px] outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1 block font-bold text-slate-700">Kategori</label>
                    <input
                      type="text"
                      value={inspectForm.category}
                      onChange={(e) => setInspectForm((f) => ({ ...f, category: e.target.value }))}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-[11px] outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectListing(null)}
                    className="min-h-8 rounded-full border border-slate-200 px-3 font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Batal
                  </button>
                  <button
                    onClick={saveInspect}
                    disabled={savingInspect}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-full bg-emerald-800 px-3 font-extrabold text-white hover:bg-emerald-900 active:opacity-85 disabled:opacity-50"
                  >
                    {savingInspect ? <LoaderCircle className="h-3 w-3 motion-safe:animate-spin" /> : null} Simpan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
