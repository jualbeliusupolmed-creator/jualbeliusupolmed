"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { downloadCSV } from "@/lib/csv";
import { buildSlug } from "@/lib/slug";
import { formatWa } from "@/lib/constants";
import AdminListingModal from "./AdminListingModal";
import ConfirmModal from "@/components/ConfirmModal";
import { getSupabase } from "@/lib/supabase";
import BaileysDashboard from "./baileys/BaileysDashboard";
import AIPanel from "./AIPanel";
import BroadcastPanel from "./BroadcastPanel";
import ReferralPanel from "./ReferralPanel";
import TawaranPanel from "./TawaranPanel";
import GroupPostsPanel from "./GroupPostsPanel";
import NotifikasiPanel from "./NotifikasiPanel";

const REPORT_LABELS = {
  penipuan: "Penipuan / scam",
  barang_terlarang: "Barang terlarang",
  spam: "Spam / iklan ganda",
  salah_kategori: "Salah kategori",
  lainnya: "Lainnya",
};
const PAYMENT_TYPES = ["iklan", "bump", "featured", "sold_fee"];
const PAYMENT_STATUS = ["pending", "paid", "failed", "expired"];
const PAGE = 25;

// tanggal lokal YYYY-MM-DD (konsisten utk grafik, hindari geser zona waktu)
function localDay(d) {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
}

const ICONS = {
  overview: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  listings: "M4 6h16M4 12h16M4 18h16",
  transaksi: "M3 10h18M7 15h2m4 0h4M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  rating: "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z",
  reports: "M12 9v4m0 4h.01M10.3 3.3l-8 14A2 2 0 004 20h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z",
  dicari: "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  kategori: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  pengaturan: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.18-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-2.18 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 002.18.33h.08A1.65 1.65 0 009 3.09V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 2.18v.08a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  blacklist: "M18.36 6.64A9 9 0 105.64 18.36 9 9 0 0018.36 6.64zM5.64 5.64l12.72 12.72",
  penjual: "M17 20h5V4H2v16h5m10 0v2m-10-2v2M8 9h8",
  blogs: "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2zM14 4v6h6M9 13h6M9 17h6",
  wabot: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  ai: "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  broadcast: "M3 3h18v4H3zM3 17h18v4H3zM7 8h10v8H7z",
  referral: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm10 0l2 2-2 2m4-2H15",
  tawaran: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14H7l4-8 4 6-2-2-2 4z",
  grouppost: "M17 3a2 2 0 012 2v6a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h12z",
  notifikasi: "M15 17h5l-1.41-1.41A1 1 0 0118 15V10a6 6 0 00-5-5.92V4a1 1 0 00-2 0v.08A6 6 0 006 10v5a1 1 0 01-.59.89L4 17h5m6 0a3 3 0 01-6 0",
  profil_request: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM9 12h6M12 9v6",
};

function NavIcon({ name }) {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[name]} />
    </svg>
  );
}

export default function AdminPanel({
  listings = [],
  payments = [],
  blacklist = [],
  reports = [],
  ratings = [],
  categories = [],
  settings = {},
  wanted = [],
  sellersList = [],
  profileRequests = [],
  blogs = [],
  revenue = 0,
  pendingCount = 0,
  initialTab = "overview",
  listingsTotal = 0,
  paymentsTotal = 0,
  pwaInstallsTotal = 0,
  currentPage = 1,
  pageSize = 100,
}) {
  const router = useRouter();
  const VALID_TABS = ["overview","listings","transaksi","rating","reports","dicari","kategori","pengaturan","penjual","profil_request","blogs","wabot","ai","broadcast","referral","tawaran","grouppost","notifikasi"];
  const tab = VALID_TABS.includes(initialTab) ? initialTab : "overview";
  function goTab(key) {
    router.push(`/admin/${key}`);
  }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmState, setConfirmState] = useState(null);
  const [editing, setEditing] = useState(null);

  // filters / pagination
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(() => new Set());
  const [payType, setPayType] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [paySearch, setPaySearch] = useState("");
  const [payLimit, setPayLimit] = useState(PAGE);
  const [ratingSearch, setRatingSearch] = useState("");
  const [ratingLimit, setRatingLimit] = useState(PAGE);
  const [reportLimit, setReportLimit] = useState(PAGE);
  const [newBl, setNewBl] = useState("");
  const [editingSeller, setEditingSeller] = useState(null);
  const [sellerForm, setSellerForm] = useState({ name: "", bio: "" });
  const [sellerSearch, setSellerSearch] = useState("");
  const [rejectNote, setRejectNote] = useState({});

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── action with proper error handling + toast + loading ────────────────────
  async function action(body, okMsg) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Aksi gagal");
      if (data.warning) setToast({ type: "err", msg: data.warning });
      else setToast({ type: "ok", msg: okMsg || "Berhasil" });
      router.refresh();
      return true;
    } catch (e) {
      setToast({ type: "err", msg: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }
  function confirmThen(opts, fn) {
    setConfirmState({ ...opts, onConfirm: fn });
  }
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

  // ── derived stats ──────────────────────────────────────────────────────────
  const active = listings.filter((l) => l.status === "active");
  const sold = listings.filter((l) => l.status === "sold");
  const pending = listings.filter((l) => l.status === "pending");
  const paidPayments = payments.filter((p) => p.status === "paid");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const openReports = reports.filter((r) => r.status === "open");
  const activeWanted = wanted.filter((w) => w.status === "active");
  const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
  const pendingVerif = []; // reserved for future verification queue
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1)
      : "–";

  const perCat = useMemo(() => {
    const m = {};
    listings.forEach((l) => (m[l.category] = (m[l.category] || 0) + 1));
    return m;
  }, [listings]);

  const revByDay = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({ key: localDay(d), total: 0 });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    paidPayments.forEach((p) => {
      const k = localDay(p.created_at);
      if (k in idx) days[idx[k]].total += p.amount || 0;
    });
    return days;
  }, [paidPayments]);
  const maxRev = Math.max(1, ...revByDay.map((d) => d.total));

  const filteredListings = listings.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    // Normalize kedua sisi agar 08... dan 628... keduanya match
    const normalizedQ = formatWa(q) || q;
    const normalizedWa = formatWa(l.seller_wa || "") || l.seller_wa || "";
    return (
      l.title?.toLowerCase().includes(s) ||
      normalizedWa.includes(normalizedQ) ||
      l.seller_wa?.includes(q) ||
      l.seller_name?.toLowerCase().includes(s)
    );
  });

  const filteredPayments = payments.filter(
    (p) =>
      (payType === "all" || p.type === payType) &&
      (payStatus === "all" || p.status === payStatus) &&
      (!paySearch ||
        (p.midtrans_order_id || "").toLowerCase().includes(paySearch.toLowerCase()))
  );
  const filteredRatings = ratings.filter(
    (r) =>
      !ratingSearch ||
      r.listings?.title?.toLowerCase().includes(ratingSearch.toLowerCase()) ||
      (r.seller_wa || "").includes(ratingSearch) ||
      (r.comment || "").toLowerCase().includes(ratingSearch.toLowerCase())
  );

  // bulk selection
  const allVisibleSelected =
    filteredListings.length > 0 && filteredListings.every((l) => selected.has(l.id));
  function toggleSel(id) {
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }
  function toggleSelAll() {
    setSelected(() => (allVisibleSelected ? new Set() : new Set(filteredListings.map((l) => l.id))));
  }
  function bulk(op, label) {
    const ids = [...selected];
    if (!ids.length) return;
    confirmThen(
      { title: "Aksi massal", message: `${label} ${ids.length} listing terpilih?`, danger: op === "delete" },
      async () => {
        const ok = await action({ action: "bulk", op, ids }, `${ids.length} listing diproses`);
        if (ok) setSelected(new Set());
      }
    );
  }

  const pendingProfileCount = profileRequests.filter((r) => r.status === "pending").length;

  const NAV_GROUPS = [
    {
      label: "Utama",
      items: [
        { key: "overview",   label: "Ringkasan" },
        { key: "listings",   label: "Listing",        count: listings.length || null },
        { key: "transaksi",  label: "Transaksi",       count: pendingPayments.length || null },
        { key: "tawaran",    label: "Tawaran Harga" },
      ],
    },
    {
      label: "Pengguna",
      items: [
        { key: "penjual",        label: "Penjual" },
        { key: "profil_request", label: "Ubah Profil", count: pendingProfileCount || null },
        { key: "rating",         label: "Rating" },
        { key: "reports",        label: "Laporan",     count: openReports.length || null },
      ],
    },
    {
      label: "Konten",
      items: [
        { key: "dicari",    label: "Dicari",       count: activeWanted.length || null },
        { key: "grouppost", label: "Post Grup" },
        { key: "blogs",     label: "Artikel Blog" },
      ],
    },
    {
      label: "Otomasi",
      items: [
        { key: "wabot",      label: "WhatsApp Bot" },
        { key: "broadcast",  label: "Broadcast" },
        { key: "ai",         label: "AI & Memori" },
        { key: "notifikasi", label: "Notifikasi" },
        { key: "referral",   label: "Referral" },
      ],
    },
    {
      label: "Sistem",
      items: [
        { key: "kategori",   label: "Kategori" },
        { key: "pengaturan", label: "Pengaturan" },
      ],
    },
  ];
  const NAV = NAV_GROUPS.flatMap((g) => g.items);
  const activeLabel = NAV.find((n) => n.key === tab)?.label;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:flex lg:gap-6">
      {editing && (
        <AdminListingModal
          listing={editing}
          categories={categories}
          onSave={action}
          onClose={() => setEditing(null)}
        />
      )}
      <ConfirmModal
        open={!!confirmState}
        title={confirmState?.title}
        message={confirmState?.message}
        danger={confirmState?.danger}
        confirmLabel={confirmState?.confirmLabel}
        onConfirm={() => confirmState?.onConfirm?.()}
        onClose={() => setConfirmState(null)}
      />

      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.type === "err" ? "bg-rose-600" : "bg-gray-900 dark:bg-emerald-600"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 lg:block">
        <div className="sticky top-20">
          <div className="mb-4 px-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Panel</p>
            <p className="text-lg font-extrabold tracking-tight dark:text-white">Admin</p>
          </div>
          <nav className="space-y-3">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-600">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((n) => (
                    <button
                      key={n.key}
                      onClick={() => goTab(n.key)}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        tab === n.key
                          ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-900"
                      }`}
                    >
                      <NavIcon name={n.key} />
                      <span className="flex-1 text-left">{n.label}</span>
                      {n.count ? (
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            tab === n.key
                              ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900"
                              : "bg-gray-200 text-gray-600 dark:bg-slate-800 dark:text-slate-300"
                          }`}
                        >
                          {n.count}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <button onClick={logout} className="btn-outline mt-6 w-full text-sm">Keluar</button>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <h1 className="text-xl font-extrabold dark:text-white">{activeLabel}</h1>
          <button onClick={logout} className="btn-outline text-xs">Keluar</button>
        </div>
        <div className="mb-4 lg:hidden">
          <select
            value={tab}
            onChange={(e) => goTab(e.target.value)}
            className="input w-full"
          >
            {NAV_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.items.map((n) => (
                  <option key={n.key} value={n.key}>
                    {n.label}{n.count ? ` (${n.count})` : ""}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <h1 className="mb-4 hidden text-2xl font-extrabold dark:text-white lg:block">{activeLabel}</h1>

        {tab === "overview" && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-7">
            <Kpi label="Iklan aktif" value={active.length} sub={`${listings.length} total`} />
            <Kpi label="Terjual" value={sold.length} sub={`${pending.length} pending`} />
            <Kpi label="Revenue" value={rupiah(revenue)} sub={`${pendingCount} pending`} />
            <Kpi label="Total views" value={totalViews} />
            <Kpi label="Install PWA" value={pwaInstallsTotal} sub="Orang" />
            <Kpi label="Rating" value={avgRating} sub={`${ratings.length} ulasan`} />
            <Kpi label="Laporan" value={openReports.length} sub={`${pendingVerif.length} verifikasi`} />
          </div>
        )}

        {/* OVERVIEW */}
        {tab === "overview" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title="Revenue 14 Hari (paid)">
              <div className="flex h-40 items-end gap-1">
                {revByDay.map((d) => (
                  <div key={d.key} className="flex flex-1 flex-col items-center justify-end">
                    <div
                      className="w-full rounded-t bg-gray-900 transition-all hover:bg-gray-700 dark:bg-slate-200 dark:hover:bg-white"
                      style={{ height: `${(d.total / maxRev) * 100}%` }}
                      title={`${d.key}: ${rupiah(d.total)}`}
                    />
                    <span className="mt-1 text-[9px] text-gray-400">{d.key.slice(8)}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-gray-400">
                Total 14 hari: <strong className="text-gray-700 dark:text-slate-200">{rupiah(revByDay.reduce((s, d) => s + d.total, 0))}</strong>
              </p>
            </Card>

            <Card title="Listing per Kategori">
              {Object.entries(perCat).length === 0 && <p className="text-sm text-gray-400">Belum ada listing.</p>}
              {Object.entries(perCat).map(([name, count]) => {
                const max = Math.max(1, ...Object.values(perCat));
                return (
                  <div key={name} className="mb-3 last:mb-0">
                    <div className="flex justify-between text-sm dark:text-slate-300">
                      <span>{name}</span>
                      <span className="text-gray-400">{count}</span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-gray-100 dark:bg-slate-800">
                      <div className="h-2 rounded-full bg-gray-900 dark:bg-slate-200" style={{ width: `${(count / max) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </Card>

            <Card title="Revenue per Tipe" className="lg:col-span-2">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {PAYMENT_TYPES.map((t) => {
                  const sum = paidPayments.filter((p) => p.type === t).reduce((s, p) => s + (p.amount || 0), 0);
                  return (
                    <div key={t} className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800/50">
                      <p className="text-xs capitalize text-gray-400">{t}</p>
                      <p className="mt-1 font-bold dark:text-white">{rupiah(sum)}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* LISTINGS */}
        {tab === "listings" && (
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <input className="input min-w-[200px] flex-1" placeholder="Cari judul / nama / WA…" value={q} onChange={(e) => setQ(e.target.value)} />
              <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="all">Semua status</option>
                {["pending", "active", "sold", "expired", "suspended", "deletion_pending", "deleted"].map((s) => (
                  <option key={s} value={s}>{s === "deletion_pending" ? "⏳ Minta Hapus" : s}</option>
                ))}
              </select>
              <button
                onClick={() =>
                  downloadCSV("listing.csv", filteredListings.map((l) => ({
                    id: l.id, judul: l.title, kategori: l.category, tipe: l.type, harga: l.price,
                    stok: l.stock, status: l.status, featured: l.featured, views: l.views || 0,
                    kampus: l.campus, penjual: l.seller_name, wa: l.seller_wa, dibuat: l.created_at,
                  })))
                }
                className="btn-outline text-xs"
              >
                Export CSV
              </button>
            </div>

            {selected.size > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
                <span className="font-medium dark:text-white">{selected.size} dipilih</span>
                <button onClick={() => bulk("activate", "Aktifkan")} className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">Aktifkan</button>
                <button onClick={() => bulk("suspend", "Suspend")} className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">Suspend</button>
                <button onClick={() => bulk("delete", "Hapus")} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">Hapus</button>
                <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-gray-500 hover:underline">Batal pilih</button>
              </div>
            )}

            <p className="mb-2 text-xs text-gray-400">{filteredListings.length} listing</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
                  <tr>
                    <th className="p-3"><input type="checkbox" checked={allVisibleSelected} onChange={toggleSelAll} /></th>
                    <th className="p-3">Barang</th>
                    <th className="p-3">Penjual</th>
                    <th className="p-3">Harga</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Views</th>
                    <th className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="dark:text-slate-300">
                  {filteredListings.map((l) => (
                    <tr key={l.id} className="border-t align-top dark:border-slate-800">
                      <td className="p-3"><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSel(l.id)} /></td>
                      <td className="max-w-[250px] p-3 flex items-center gap-3">
                        {l.image_url ? (
                          <img src={l.image_url} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover bg-gray-100 dark:bg-slate-800" loading="lazy" />
                        ) : (
                          <div className="h-10 w-10 shrink-0 rounded-md bg-gray-100 dark:bg-slate-800 flex items-center justify-center text-gray-300">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </div>
                        )}
                        <div className="min-w-0">
                          <a href={`/admin/listings/${buildSlug(l.title, l.id)}`} className="block truncate font-medium hover:text-primary dark:text-white dark:hover:text-primary" title={l.title}>
                            {l.title}
                          </a>
                          <p className="text-xs text-gray-400">{l.category}{l.featured ? " · ⭐" : ""}</p>
                        </div>
                      </td>
                      <td className="p-3 text-gray-500">{l.seller_name}<br /><span className="text-xs">{l.seller_wa}</span></td>
                      <td className="p-3">{rupiah(l.price)}</td>
                      <td className="p-3"><StatusBadge s={l.status} /></td>
                      <td className="p-3 text-gray-500">{l.views || 0}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <a href={`/admin/listings/${buildSlug(l.title, l.id)}`} className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white dark:bg-slate-200 dark:text-slate-900">Edit</a>
                          {l.status === "deletion_pending" ? (
                            <>
                              <button onClick={() => confirmThen({ title: "Setujui penghapusan", message: `Hapus permanen "${l.title}"?`, danger: true }, () => action({ action: "delete", id: l.id }, "Iklan dihapus (APPROVED)"))} className="rounded-md bg-rose-600 px-2 py-1 text-xs text-white">✓ Approve</button>
                              <button onClick={() => action({ action: "activate", id: l.id }, "Penghapusan ditolak — iklan aktif kembali")} className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">✗ Reject</button>
                            </>
                          ) : (
                            <>
                              {l.status !== "active" && <button onClick={() => action({ action: "activate", id: l.id }, "Diaktifkan")} className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">Aktifkan</button>}
                              {l.status !== "suspended" && <button onClick={() => action({ action: "suspend", id: l.id }, "Disuspend")} className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">Suspend</button>}
                              {l.featured ? (
                                <button onClick={() => action({ action: "unfeature", id: l.id }, "Featured dilepas")} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">Unfeature</button>
                              ) : (
                                <button onClick={() => action({ action: "feature", id: l.id, days: 7 }, "Featured 7 hari")} className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-600">Featured</button>
                              )}
                              {l.sponsored_until && new Date(l.sponsored_until) > new Date() ? (
                                <button onClick={() => action({ action: "set_sponsored", id: l.id, days: 0 }, "Sponsored dilepas")} className="rounded-md bg-purple-100 px-2 py-1 text-xs text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">Unsponsored</button>
                              ) : (
                                <button onClick={() => action({ action: "set_sponsored", id: l.id, days: 7 }, "Sponsored 7 hari")} className="rounded-md bg-purple-50 px-2 py-1 text-xs text-purple-600">Sponsored</button>
                              )}
                              <button onClick={() => confirmThen({ title: "Hapus listing", message: `Hapus "${l.title}"?`, danger: true }, () => action({ action: "delete", id: l.id }, "Dihapus"))} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">Hapus</button>
                            </>
                          )}
                          <button onClick={() => confirmThen({ title: "Blacklist penjual", message: `Blokir ${l.seller_wa}? Semua iklannya disuspend.`, danger: true }, () => action({ action: "blacklist", wa: l.seller_wa }, "Diblacklist"))} className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-700 dark:border-slate-700 dark:text-slate-300">Blacklist</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TRANSAKSI */}
        {tab === "transaksi" && (
          <div>
            <div className="mb-3 flex flex-wrap gap-2">
              <input className="input min-w-[160px] flex-1" placeholder="Cari Order ID…" value={paySearch} onChange={(e) => { setPaySearch(e.target.value); setPayLimit(PAGE); }} />
              <select className="input w-auto" value={payType} onChange={(e) => setPayType(e.target.value)}>
                <option value="all">Semua tipe</option>
                {PAYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <select className="input w-auto" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
                <option value="all">Semua status</option>
                {PAYMENT_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <button
                onClick={() => downloadCSV("transaksi.csv", filteredPayments.map((p) => ({
                  order_id: p.midtrans_order_id || p.id, tipe: p.type, jumlah: p.amount, status: p.status, listing_id: p.listing_id || "", dibuat: p.created_at,
                })))}
                className="btn-outline text-xs"
              >
                Export CSV
              </button>
            </div>
            {/* Revenue summary per tipe */}
            {(() => {
              const paidOnly = filteredPayments.filter(p => p.status === "paid");
              const totalPaid = paidOnly.reduce((s, p) => s + (p.amount || 0), 0);
              const byType = PAYMENT_TYPES.reduce((acc, t) => {
                const sum = paidOnly.filter(p => p.type === t).reduce((s, p) => s + (p.amount || 0), 0);
                if (sum > 0) acc[t] = sum;
                return acc;
              }, {});
              return (
                <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  <div className="rounded-xl border border-green-200 bg-green-50 p-3 dark:border-green-900 dark:bg-green-900/20">
                    <p className="text-xs text-green-600 dark:text-green-400">Total Lunas</p>
                    <p className="mt-0.5 text-base font-bold text-green-700 dark:text-green-300">{rupiah(totalPaid)}</p>
                    <p className="text-[10px] text-gray-400">{paidOnly.length} transaksi</p>
                  </div>
                  {Object.entries(byType).map(([t, sum]) => (
                    <div key={t} className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs capitalize text-gray-500 dark:text-gray-400">{t}</p>
                      <p className="mt-0.5 text-sm font-bold dark:text-white">{rupiah(sum)}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
            <p className="mb-2 text-xs text-gray-400">{filteredPayments.length} transaksi</p>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
                  <tr><th className="p-3">Order ID</th><th className="p-3">Tipe</th><th className="p-3">Jumlah</th><th className="p-3">Status</th><th className="p-3">Tanggal</th><th className="p-3">Aksi</th></tr>
                </thead>
                <tbody className="dark:text-slate-300">
                  {filteredPayments.slice(0, payLimit).map((p) => (
                    <tr key={p.id} className="border-t dark:border-slate-800">
                      <td className="max-w-[160px] truncate p-3 font-mono text-xs">{p.midtrans_order_id || p.id.slice(0, 8)}</td>
                      <td className="p-3 capitalize">{p.type}</td>
                      <td className="p-3 font-medium dark:text-white">{rupiah(p.amount)}</td>
                      <td className="p-3"><StatusBadge s={p.status} /></td>
                      <td className="p-3 text-xs text-gray-400">{new Date(p.created_at).toLocaleDateString("id-ID")}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          {p.status !== "paid" && <button onClick={() => action({ action: "update_payment", id: p.id, status: "paid" }, "Ditandai paid")} className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">Paid</button>}
                          {p.status !== "failed" && <button onClick={() => action({ action: "update_payment", id: p.id, status: "failed" }, "Ditandai failed")} className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">Failed</button>}
                          <button onClick={() => confirmThen({ title: "Hapus transaksi", message: "Hapus transaksi ini?", danger: true }, () => action({ action: "delete_payment", id: p.id }, "Dihapus"))} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <LoadMore shown={Math.min(payLimit, filteredPayments.length)} total={filteredPayments.length} onClick={() => setPayLimit((n) => n + PAGE)} />
          </div>
        )}

        {/* RATING */}
        {tab === "rating" && (
          <div>
            <input className="input mb-3 max-w-md" placeholder="Cari judul / WA / komentar…" value={ratingSearch} onChange={(e) => { setRatingSearch(e.target.value); setRatingLimit(PAGE); }} />
            <p className="mb-2 text-xs text-gray-400">{filteredRatings.length} rating</p>
            <div className="space-y-3">
              {filteredRatings.length === 0 && <p className="text-sm text-gray-400">Tidak ada rating.</p>}
              {filteredRatings.slice(0, ratingLimit).map((r) => (
                <div key={r.id} className="card flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="font-medium text-amber-500">{"★".repeat(r.rating)}<span className="text-gray-300 dark:text-slate-700">{"★".repeat(5 - r.rating)}</span> <span className="text-xs text-gray-400">({r.rating}/5)</span></p>
                    <p className="mt-1 text-sm dark:text-slate-200">{r.listings?.title || "(listing terhapus)"}</p>
                    <p className="text-xs text-gray-400">{r.buyer_name || "Anonim"} → {r.seller_wa} · {new Date(r.created_at).toLocaleDateString("id-ID")}</p>
                    {r.comment && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-400">"{r.comment}"</p>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button onClick={() => action({ action: r.hidden ? "show_rating" : "hide_rating", id: r.id }, r.hidden ? "Rating ditampilkan" : "Rating disembunyikan")} className={`rounded-md px-2 py-1 text-xs ${r.hidden ? "bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-100 text-amber-700"}`}>{r.hidden ? "Tampilkan" : "Sembunyikan"}</button>
                    <button onClick={() => confirmThen({ title: "Hapus rating", message: "Hapus rating ini?", danger: true }, () => action({ action: "delete_rating", id: r.id }, "Dihapus"))} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">Hapus</button>
                  </div>
                </div>
              ))}
            </div>
            <LoadMore shown={Math.min(ratingLimit, filteredRatings.length)} total={filteredRatings.length} onClick={() => setRatingLimit((n) => n + PAGE)} />
          </div>
        )}

        {/* LAPORAN */}
        {tab === "reports" && (
          <div className="space-y-3">
            {reports.length === 0 && <p className="text-sm text-gray-400">Tidak ada laporan.</p>}
            {reports.slice(0, reportLimit).map((r) => (
              <div key={r.id} className={`card p-4 ${r.status === "resolved" ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="badge bg-rose-100 text-rose-700">{REPORT_LABELS[r.reason] || r.reason}</span>
                    {r.status === "resolved" && <span className="badge ml-1 bg-green-100 text-green-700">selesai</span>}
                    <p className="mt-2 font-medium dark:text-white">{r.listings?.title || "(listing terhapus)"}</p>
                    <p className="text-xs text-gray-400">Penjual: {r.listings?.seller_wa || "-"} · {new Date(r.created_at).toLocaleString("id-ID")}</p>
                    {r.detail && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-400">"{r.detail}"</p>}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    {r.listing_id && <a href={`/produk/${buildSlug(r.listings?.title, r.listing_id)}`} target="_blank" rel="noreferrer" className="rounded-md bg-gray-100 px-2 py-1 text-center text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">Lihat</a>}
                    {r.listing_id && <button onClick={() => action({ action: "suspend", id: r.listing_id }, "Listing disuspend")} className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">Suspend</button>}
                    {r.status !== "resolved" && <button onClick={() => action({ action: "resolve_report", id: r.id }, "Ditandai selesai")} className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">Selesai</button>}
                    <button onClick={() => confirmThen({ title: "Hapus laporan", message: "Hapus laporan ini?", danger: true }, () => action({ action: "delete_report", id: r.id }, "Dihapus"))} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
            <LoadMore shown={Math.min(reportLimit, reports.length)} total={reports.length} onClick={() => setReportLimit((n) => n + PAGE)} />
          </div>
        )}

        {/* DICARI */}
        {tab === "dicari" && (
          <div className="space-y-3">
            {wanted.length === 0 && <p className="text-sm text-gray-400">Belum ada permintaan barang.</p>}
            {wanted.map((w) => (
              <div key={w.id} className={`card p-4 ${w.status !== "active" ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium dark:text-white">{w.title}</p>
                      <span className="badge bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300">{w.status}</span>
                    </div>
                    <p className="text-sm text-gray-500">Budget {rupiah(w.budget)} · {w.category} · {w.campus}{w.area ? ` · ${w.area}` : ""}</p>
                    {w.description && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-400">{w.description}</p>}
                    <p className="text-xs text-gray-400">{w.buyer_name} · {w.buyer_wa} · {new Date(w.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <a href={`https://wa.me/${(w.buyer_wa || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="rounded-md bg-gray-100 px-2 py-1 text-center text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">Chat</a>
                    {w.status === "active" && <button onClick={() => action({ action: "resolve_wanted", id: w.id }, "Ditandai selesai")} className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">Selesai</button>}
                    <button onClick={() => confirmThen({ title: "Hapus permintaan", message: "Hapus permintaan ini?", danger: true }, () => action({ action: "delete_wanted", id: w.id }, "Dihapus"))} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* KATEGORI */}
        {tab === "kategori" && <CategoryManager categories={categories} action={action} confirmThen={confirmThen} />}

        {/* PENGATURAN */}
        {tab === "pengaturan" && <SettingsManager settings={settings} action={action} />}

        {/* BLACKLIST */}
        {/* PENJUAL */}
        {tab === "penjual" && (() => {
          const filteredSellers = sellersList.filter(s =>
            !sellerSearch ||
            (s.seller_name || "").toLowerCase().includes(sellerSearch.toLowerCase()) ||
            (s.seller_wa || "").includes(sellerSearch)
          );
          return (
            <div>
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  className="input min-w-[200px] flex-1"
                  placeholder="Cari nama / nomor WA…"
                  value={sellerSearch}
                  onChange={(e) => setSellerSearch(e.target.value)}
                />
                <button
                  onClick={() => downloadCSV("penjual.csv", filteredSellers.map(s => ({
                    nama: s.seller_name, wa: s.seller_wa,
                    total_iklan: s.total_iklan, aktif: s.active_iklan, terjual: s.sold_iklan,
                    trusted: s.trusted_seller ? "Ya" : "Tidak",
                  })))}
                  className="btn-outline text-xs"
                >
                  Export CSV
                </button>
              </div>
              <p className="mb-2 text-xs text-gray-400">{filteredSellers.length} dari {sellersList.length} penjual</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
                    <tr>
                      <th className="p-3">Nama Penjual</th>
                      <th className="p-3">WhatsApp</th>
                      <th className="p-3">Iklan</th>
                      <th className="p-3">Aktif</th>
                      <th className="p-3">Terjual</th>
                      <th className="p-3">Status Bot</th>
                      <th className="p-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="dark:text-slate-300">
                    {filteredSellers.length === 0 && (
                      <tr><td colSpan="7" className="p-4 text-center text-gray-400">Tidak ada penjual ditemukan.</td></tr>
                    )}
                    {filteredSellers.map((s) => {
                      const isPaused = settings?.bot?.paused_users?.includes(s.seller_wa);
                      return (
                        <tr key={s.seller_wa} className="border-t dark:border-slate-800">
                          <td className="p-3 font-medium dark:text-white">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{s.seller_name}</span>
                              {s.trusted_seller && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded px-1">☑ Terpercaya</span>}
                              {s.subscription_tier === "pro" && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded px-1">⭐ PRO</span>}
                            </div>
                            <div className="mt-0.5 flex gap-2 text-xs">
                              <a href={`/admin/penjual/${s.seller_wa.replace(/\D/g, "")}`} className="text-primary hover:underline">Edit</a>
                              <a href={`/penjual/${s.seller_wa.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:underline">Profil ↗</a>
                            </div>
                          </td>
                          <td className="p-3 font-mono text-xs">
                            <a href={`https://wa.me/${s.seller_wa.replace(/\D/g, "")}`} className="hover:text-primary" target="_blank" rel="noreferrer">{s.seller_wa}</a>
                          </td>
                          <td className="p-3">{s.total_iklan}</td>
                          <td className="p-3 text-green-600">{s.active_iklan}</td>
                          <td className="p-3 text-gray-500">{s.sold_iklan}</td>
                          <td className="p-3">
                            {isPaused
                              ? <span className="text-xs text-amber-600 font-medium">⏸ Paused</span>
                              : <span className="text-xs text-green-600">▶ Aktif</span>}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              <button
                                onClick={() => action({ action: "update_seller_profile", wa: s.seller_wa, trusted_seller: !s.trusted_seller }, "Badge diperbarui")}
                                className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                              >
                                {s.trusted_seller ? "Cabut Badge" : "Beri Badge"}
                              </button>
                              {isPaused ? (
                                <button
                                  onClick={() => action({ action: "unpause_bot", wa: s.seller_wa }, "Bot diaktifkan")}
                                  className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700"
                                >
                                  Aktifkan Bot
                                </button>
                              ) : (
                                <button
                                  onClick={() => confirmThen({ title: "Pause Bot", message: `Pause bot untuk ${s.seller_name}?` }, () => action({ action: "pause_bot", wa: s.seller_wa }, "Bot di-pause"))}
                                  className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700"
                                >
                                  Pause Bot
                                </button>
                              )}
                              <button
                                onClick={() => action({ action: "award_bumps", wa: s.seller_wa, count: 1 }, "+1 free bump diberikan")}
                                className="rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              >
                                +1 Bump
                              </button>
                              <button
                                onClick={() => confirmThen({ title: "Reset PIN", message: `Reset PIN/OTP untuk ${s.seller_wa}?` }, () => action({ action: "reset_pin", wa: s.seller_wa }, "PIN direset"))}
                                className="rounded-md bg-violet-100 px-2 py-1 text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                              >
                                Reset PIN
                              </button>
                              <button
                                onClick={() => confirmThen({ title: "Blacklist", message: `Blokir ${s.seller_wa}? Semua iklannya disuspend.`, danger: true }, () => action({ action: "blacklist", wa: s.seller_wa }, "Diblacklist"))}
                                className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-slate-700 dark:text-slate-400"
                              >
                                Blacklist
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Blacklist — nomor terblokir */}
              <div className="mt-8 border-t border-gray-100 pt-6 dark:border-slate-800">
                <h3 className="mb-3 text-sm font-bold dark:text-white">Nomor Diblokir ({blacklist.length})</h3>
                <div className="flex max-w-lg gap-2">
                  <input className="input" placeholder="Nomor WA untuk diblokir" value={newBl} onChange={(e) => setNewBl(e.target.value)} />
                  <button onClick={() => { if (newBl.trim()) { action({ action: "blacklist", wa: newBl.trim() }, "Diblokir"); setNewBl(""); } }} className="btn-primary shrink-0">Blokir</button>
                </div>
                <div className="mt-3 max-w-lg space-y-2">
                  {blacklist.length === 0 && <p className="text-sm text-gray-400">Belum ada nomor diblokir.</p>}
                  {blacklist.map((b) => (
                    <div key={b.id} className="card flex items-center justify-between p-3 text-sm">
                      <span className="font-mono text-xs dark:text-white">{b.wa}</span>
                      <button onClick={() => action({ action: "unblacklist", id: b.id }, "Dihapus dari blacklist")} className="text-rose-600 hover:underline text-xs">Hapus</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* PERMINTAAN UBAH PROFIL */}
        {tab === "profil_request" && (() => {
          const pending = profileRequests.filter(r => r.status === "pending");
          const done = profileRequests.filter(r => r.status !== "pending");

          const formatDate = (d) => d ? new Date(d).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-";
          const fieldLabel = (f) => f === "name" ? "Nama" : "Bio";
          return (
            <div>
              <p className="mb-4 text-sm text-gray-500">
                Permintaan penjual untuk mengubah nama atau bio profil. Setiap perubahan perlu disetujui admin sebelum berlaku.
              </p>

              {pending.length === 0 && (
                <div className="text-sm text-gray-400 py-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
                  Tidak ada permintaan pending saat ini.
                </div>
              )}

              {pending.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-xs font-black">{pending.length}</span>
                    Menunggu Persetujuan
                  </h3>
                  <div className="space-y-3">
                    {pending.map((r) => (
                      <div key={r.id} className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Ubah {fieldLabel(r.field)}</span>
                            <div className="mt-1 font-mono text-xs text-gray-500 dark:text-slate-400">{r.seller_wa}</div>
                            <div className="mt-2 text-sm">
                              <span className="text-gray-400">Sebelum: </span>
                              <span className="line-through text-gray-400">{r.current_value || "(kosong)"}</span>
                            </div>
                            <div className="text-sm font-semibold dark:text-white">
                              <span className="text-gray-400 font-normal">Setelah: </span>
                              {r.requested_value}
                            </div>
                            <div className="mt-1 text-[11px] text-gray-400">
                              Via {r.requested_via} · {formatDate(r.requested_at)}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 min-w-[160px]">
                            <button
                              onClick={() => confirmThen({ title: "Setujui Perubahan", message: `Setujui perubahan ${fieldLabel(r.field).toLowerCase()} menjadi "${r.requested_value}"?` }, () => action({ action: "approve_profile_change", id: r.id }, "Disetujui & profil diperbarui"))}
                              className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 transition-colors"
                            >
                              ✅ Setujui
                            </button>
                            <div className="flex gap-1">
                              <input
                                className="input text-xs py-1 px-2 flex-1 min-w-0"
                                placeholder="Alasan tolak (opsional)"
                                value={rejectNote[r.id] || ""}
                                onChange={(e) => setRejectNote(prev => ({ ...prev, [r.id]: e.target.value }))}
                              />
                              <button
                                onClick={() => confirmThen({ title: "Tolak Permintaan", message: `Tolak perubahan ${fieldLabel(r.field).toLowerCase()} ini?`, danger: true }, () => action({ action: "reject_profile_change", id: r.id, note: rejectNote[r.id] || "" }, "Ditolak"))}
                                className="rounded-lg bg-rose-100 px-2 py-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200 transition-colors shrink-0"
                              >
                                ❌
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {done.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-500 mb-3">Riwayat ({done.length})</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
                        <tr>
                          <th className="p-3">Penjual</th>
                          <th className="p-3">Field</th>
                          <th className="p-3">Nilai Baru</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Diproses</th>
                          <th className="p-3">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="dark:text-slate-300">
                        {done.map((r) => (
                          <tr key={r.id} className="border-t dark:border-slate-800">
                            <td className="p-3 font-mono text-xs">{r.seller_wa}</td>
                            <td className="p-3">{fieldLabel(r.field)}</td>
                            <td className="p-3 max-w-[180px] truncate">{r.requested_value}</td>
                            <td className="p-3">
                              {r.status === "approved"
                                ? <span className="text-xs font-semibold text-emerald-600">✅ Disetujui</span>
                                : <span className="text-xs font-semibold text-rose-600">❌ Ditolak</span>}
                            </td>
                            <td className="p-3 text-xs text-gray-400">{formatDate(r.reviewed_at)}</td>
                            <td className="p-3 text-xs text-gray-400">{r.review_note || "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* BLOGS */}
        {tab === "blogs" && (
          <div className="max-w-4xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs text-gray-400">{blogs.length} artikel</p>
              <button 
                onClick={() => router.push("/admin/blogs/new")} 
                className="btn-primary"
              >
                Tulis Artikel Baru
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
                  <tr>
                    <th className="p-3">Judul</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">Aksi</th>
                  </tr>
                </thead>
                <tbody className="dark:text-slate-300">
                  {blogs.length === 0 && (
                    <tr><td colSpan="4" className="p-4 text-center text-gray-500">Belum ada artikel.</td></tr>
                  )}
                  {blogs.map((b) => (
                    <tr key={b.id} className="border-t dark:border-slate-800">
                      <td className="p-3">
                        <p className="font-medium dark:text-white">{b.title}</p>
                        <p className="text-xs text-gray-400">/{b.slug}</p>
                      </td>
                      <td className="p-3">
                        <span className={`badge ${b.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300"}`}>{b.status}</span>
                      </td>
                      <td className="p-3 text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString("id-ID")}</td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <a href={`/admin/blogs/${b.id}`} className="text-primary hover:underline">Edit</a>
                          {b.status === "published" && <a href={`/blog/${b.slug}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">Lihat</a>}
                          <button onClick={() => confirmThen({ title: "Hapus Artikel", message: `Hapus "${b.title}"?`, danger: true }, () => action({ action: "delete_blog", id: b.id }, "Artikel dihapus"))} className="text-rose-600 hover:underline">Hapus</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WHATSAPP BOT */}
        {tab === "wabot" && (
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <BaileysDashboard />
          </div>
        )}

        {/* BROADCAST */}
        {tab === "broadcast" && <BroadcastPanel sellers={sellersList} />}

        {/* AI PANEL */}
        {tab === "ai" && <AIPanel settings={settings} action={action} />}

        {/* REFERRAL */}
        {tab === "referral" && (
          <div>
            <p className="mb-4 text-sm text-gray-500">Kelola program referral — lihat siapa yang mengundang siapa, tandai reward, dan berikan free bump secara manual.</p>
            <ReferralPanel action={action} />
          </div>
        )}

        {/* TAWARAN HARGA */}
        {tab === "tawaran" && (
          <div>
            <p className="mb-4 text-sm text-gray-500">Monitor semua tawaran harga dari pembeli ke penjual di seluruh marketplace.</p>
            <TawaranPanel />
          </div>
        )}

        {/* POST GRUP */}
        {tab === "grouppost" && (
          <div>
            <p className="mb-4 text-sm text-gray-500">Moderasi postingan yang dikirim ke grup WA — lihat isi dan hapus jika perlu.</p>
            <GroupPostsPanel action={action} />
          </div>
        )}

        {/* NOTIFIKASI */}
        {tab === "notifikasi" && (
          <div>
            <p className="mb-4 text-sm text-gray-500">Kelola subscriber notifikasi — berlangganan kategori WA dan push notification browser.</p>
            <NotifikasiPanel action={action} />
          </div>
        )}

        {busy && <div className="fixed bottom-5 left-5 z-[60] rounded-lg bg-gray-900/80 px-3 py-1.5 text-xs text-white">Memproses…</div>}
      </main>
    </div>
  );
}

// ── small components ──────────────────────────────────────────────────────────
function Kpi({ label, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold tracking-tight dark:text-white">{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}
function Card({ title, children, className = "" }) {
  return (
    <div className={`card p-5 ${className}`}>
      {title && <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-800 dark:text-gray-200">{title}</h2>}
      {children}
    </div>
  );
}
function StatusBadge({ s }) {
  const map = {
    active: "bg-green-100 text-green-700",
    paid: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    sold: "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-slate-200",
    expired: "bg-rose-100 text-rose-700",
    failed: "bg-rose-100 text-rose-700",
    suspended: "bg-rose-100 text-rose-700",
  };
  return <span className={`badge ${map[s] || "bg-gray-100 text-gray-600"}`}>{s}</span>;
}
function LoadMore({ shown, total, onClick }) {
  if (shown >= total) return null;
  return (
    <div className="mt-4 text-center">
      <button onClick={onClick} className="btn-outline text-sm">Muat lebih banyak ({total - shown} lagi)</button>
    </div>
  );
}

// ── Kategori manager ──────────────────────────────────────────────────────────
function CategoryManager({ categories, action, confirmThen }) {
  const [form, setForm] = useState({ name: "", icon: "🏷️", sort_order: "" });
  return (
    <div className="max-w-2xl">
      <div className="card grid grid-cols-[1fr_auto_auto_auto] items-end gap-2 p-4">
        <div><label className="label">Nama</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Otomotif" /></div>
        <div><label className="label">Ikon</label><input className="input w-16 text-center" value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></div>
        <div><label className="label">Urutan</label><input type="number" className="input w-20" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: e.target.value })} /></div>
        <button onClick={() => { if (!form.name.trim()) return; action({ action: "category_upsert", ...form }, "Kategori ditambah"); setForm({ name: "", icon: "🏷️", sort_order: "" }); }} className="btn-primary">Tambah</button>
      </div>
      <div className="mt-4 space-y-2">
        {categories.map((c) => <CategoryRow key={c.id || c.slug} c={c} action={action} confirmThen={confirmThen} />)}
      </div>
    </div>
  );
}
function CategoryRow({ c, action, confirmThen }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ name: c.name, icon: c.icon || "🏷️", sort_order: c.sort_order ?? 0 });
  if (edit) {
    return (
      <div className="card flex items-center gap-2 p-3">
        <input className="input w-14 text-center" value={f.icon} onChange={(e) => setF({ ...f, icon: e.target.value })} />
        <input className="input flex-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input type="number" className="input w-20" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} />
        <button onClick={() => { action({ action: "category_upsert", id: c.id, slug: c.slug, ...f }, "Kategori disimpan"); setEdit(false); }} className="btn-primary text-xs">Simpan</button>
        <button onClick={() => setEdit(false)} className="btn-outline text-xs">Batal</button>
      </div>
    );
  }
  return (
    <div className="card flex items-center justify-between p-3 text-sm">
      <span className="flex items-center gap-2">
        <span className="text-lg">{c.icon}</span>
        <span className="font-medium dark:text-white">{c.name}</span>
        <span className="text-xs text-gray-400">/{c.slug} · #{c.sort_order ?? 0}</span>
      </span>
      <div className="flex gap-2">
        <button onClick={() => setEdit(true)} className="text-gray-900 hover:underline dark:text-slate-200">Edit</button>
        {c.id && <button onClick={() => confirmThen({ title: "Hapus kategori", message: `Hapus "${c.name}"?`, danger: true }, () => action({ action: "category_delete", id: c.id }, "Dihapus"))} className="text-rose-600 hover:underline">Hapus</button>}
      </div>
    </div>
  );
}

// Deteksi mode pricing dari nilai saat ini
function detectMode(p) {
  const ad = Number(p.adBarang || 0);
  const bump = Number(p.bump || 0);
  const featured = Number(p.featuredPerDay || 0);
  const adPoster = Number(p.adPoster || 0);
  const hasSold = (p.soldTiers || []).some(t => t.pct > 0 || t.flat > 0);
  const hasAdCost = ad > 0 || (p.adTiers || []).some(t => t.pct > 0 || (t.flat > 0 && t.upto != null));
  if (ad === 0 && bump === 0 && featured === 0 && adPoster === 0 && !hasSold)
    return { key: "gratis_semua", label: "✅ Gratis Semua", bg: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" };
  if (ad === 0 && hasSold && !hasAdCost)
    return { key: "jual_dulu", label: "💸 Jual Dulu (Komisi)", bg: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" };
  if (ad === 0 && !hasSold && (bump > 0 || featured > 0))
    return { key: "freemium", label: "⚡ Freemium (Upsell)", bg: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" };
  if (hasAdCost || ad > 0)
    return { key: "sewa_lapak", label: "🏪 Sewa Lapak", bg: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
  return { key: "custom", label: "⚙️ Custom", bg: "bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300" };
}

// ── Settings manager ──────────────────────────────────────────────────────────
function SettingsManager({ settings, action }) {
  const [pricing, setPricing] = useState(settings.pricing || {});
  const [contact, setContact] = useState(settings.contact || {});
  const [site, setSite] = useState(settings.site || {});
  const [adminCfg, setAdminCfg] = useState(settings.admin || {});
  const [metaCfg, setMetaCfg] = useState(settings.meta || {});
  const [botCfg, setBotCfg] = useState(settings.bot || {});
  const [messages, setMessages] = useState(settings.messages || {});
  const [areas, setAreas] = useState((settings.areas || []).join("\n"));
  const [saved, setSaved] = useState("");
  const [showPriceConfirm, setShowPriceConfirm] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const match = (k) => !searchQuery || k.toLowerCase().includes(searchQuery.toLowerCase());

  function flash(k) { setSaved(k); setTimeout(() => setSaved(""), 2000); }
  const numP = (k) => (e) => setPricing({ ...pricing, [k]: Math.max(0, Number(e.target.value) || 0) });
  const tiers = pricing.soldTiers || [];
  const setTiers = (t) => setPricing({ ...pricing, soldTiers: t });
  const adTiers = pricing.adTiers || [];
  const setAdTiers = (t) => setPricing({ ...pricing, adTiers: t });

  async function handleFileUpload(e, type) {
    const file = e.target.files?.[0];
    if (!file) return;

    const isLogo = type === "logo";
    if (isLogo) setUploadingLogo(true);
    else setUploadingFavicon(true);

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("bucket", `site-${type}`);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload gagal");

      const updatedSite = { ...site, [isLogo ? "logoUrl" : "faviconUrl"]: data.url };
      setSite(updatedSite);

      await action({ action: "save_settings", key: "site", value: updatedSite }, `${isLogo ? "Logo" : "Favicon"} berhasil diperbarui`);
    } catch (err) {
      alert(`Gagal mengunggah ${type}: ` + err.message);
    } finally {
      if (isLogo) setUploadingLogo(false);
      else setUploadingFavicon(false);
    }
  }

  const applyTemplate = (mode) => {
    let p = { ...pricing };
    if (mode === "sewa_lapak") {
      p.adTiers = [
        { upto: 50000, flat: 2000 },
        { upto: 100000, flat: 3000 },
        { upto: 500000, flat: 5000 },
        { upto: 1000000, flat: 7000 },
        { upto: null, pct: 1 },
      ];
      p.soldTiers = [];
      p.bump = 1000;
      p.featuredPerDay = 5000;
      p.adBarang = 2000;
    } else if (mode === "jual_dulu") {
      p.adTiers = [{ upto: null, flat: 0 }];
      p.soldTiers = [
        { upto: 50000, flat: 0 },
        { upto: 100000, pct: 10 },
        { upto: null, pct: 5 },
      ];
      p.bump = 1000;
      p.featuredPerDay = 5000;
      p.adBarang = 0;
    } else if (mode === "freemium") {
      p.adTiers = [{ upto: null, flat: 0 }];
      p.soldTiers = [];
      p.bump = 2000;
      p.featuredPerDay = 5000;
      p.adBarang = 0;
    } else if (mode === "gratis_semua") {
      p.adTiers = [{ upto: null, flat: 0 }];
      p.soldTiers = [];
      p.bump = 0;
      p.featuredPerDay = 0;
      p.adBarang = 0;
      p.adPoster = 0;
      p.renewalFee = 0;
    }
    setPricing(p);
  };

  return (
    <div className="space-y-6">
      {/* PENCARIAN PENGATURAN */}
      <div className="sticky top-[72px] z-30 -mx-4 mb-6 bg-gray-50/80 px-4 py-3 backdrop-blur-xl dark:bg-[#0B1120]/80 sm:-mx-6 sm:px-6">
        <div className="relative max-w-2xl">
          <input 
            type="text" 
            placeholder="Cari sub-pengaturan (contoh: meta, harga, bot, admin, wa)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full pl-11 shadow-sm bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all text-sm py-2.5" 
          />
          <svg className="absolute left-3.5 top-3 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* HARGA & BIAYA */}
        <Card title="Harga & Biaya" className={match("harga biaya tarif sewa lapak jual dulu freemium gratis iklan bump sundul featured komisi laku tier batas limit dicari free") ? "" : "hidden"}>
        <div className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Template Monetisasi Cepat</p>
            {(() => { const m = detectMode(pricing); return (
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${m.bg}`}>
                Mode aktif: {m.label}
              </span>
            ); })()}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <button onClick={() => { applyTemplate("sewa_lapak"); setShowPriceConfirm(false); }} className={`btn-outline border-primary/30 text-[10px] sm:text-xs ${detectMode(pricing).key === "sewa_lapak" ? "ring-2 ring-amber-400" : ""}`}>1. Sewa Lapak (Bayar Iklan)</button>
            <button onClick={() => { applyTemplate("jual_dulu"); setShowPriceConfirm(false); }} className={`btn-outline border-primary/30 text-[10px] sm:text-xs ${detectMode(pricing).key === "jual_dulu" ? "ring-2 ring-blue-400" : ""}`}>2. Jual Dulu (Komisi Laku)</button>
            <button onClick={() => { applyTemplate("freemium"); setShowPriceConfirm(false); }} className={`btn-outline border-primary/30 text-[10px] sm:text-xs ${detectMode(pricing).key === "freemium" ? "ring-2 ring-purple-400" : ""}`}>3. Freemium (Hanya Upsell)</button>
            <button onClick={() => { applyTemplate("gratis_semua"); setShowPriceConfirm(false); }} className={`btn-outline border-primary/30 text-[10px] sm:text-xs bg-green-50 hover:bg-green-100 text-green-700 ${detectMode(pricing).key === "gratis_semua" ? "ring-2 ring-green-400" : ""}`}>4. Gratis Semua</button>
          </div>
          <p className="mt-2 text-[10px] text-gray-500">Klik tombol di atas untuk mengisi otomatis tarif di bawah ini, lalu klik Simpan Harga.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <Field label="Iklan barang"><input type="number" className="input" value={pricing.adBarang ?? ""} onChange={numP("adBarang")} /></Field>
          <Field label="Iklan poster"><input type="number" className="input" value={pricing.adPoster ?? ""} onChange={numP("adPoster")} /></Field>
          <Field label="Bump / sundul"><input type="number" className="input" value={pricing.bump ?? ""} onChange={numP("bump")} /></Field>
          <Field label="Featured / hari"><input type="number" className="input" value={pricing.featuredPerDay ?? ""} onChange={numP("featuredPerDay")} /></Field>
          <Field label="Featured maks / hari"><input type="number" className="input" value={pricing.featuredMaxPerDay ?? ""} onChange={numP("featuredMaxPerDay")} /></Field>
          <Field label="Durasi Iklan (hari)">
            <input
              type="number"
              min="1"
              max="365"
              className="input"
              value={pricing.listingDays ?? 14}
              onChange={numP("listingDays")}
            />
            <p className="mt-1 text-xs text-gray-400">Iklan aktif selama berapa hari setelah pembayaran. Default: 14 hari.</p>
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Tier biaya iklan (berdasarkan harga barang)</p>
          <button onClick={() => setAdTiers([...adTiers, { upto: null, flat: 5000 }])} className="text-xs text-gray-900 hover:underline dark:text-slate-200">+ Tambah tier</button>
        </div>
        <div className="mt-2 space-y-2">
          {adTiers.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <input type="number" className="input w-24" placeholder="< batas Rp" value={t.upto ?? ""} onChange={(e) => { const c = [...adTiers]; c[i] = { ...t, upto: e.target.value === "" ? null : Number(e.target.value) }; setAdTiers(c); }} />
              <input type="number" className="input w-20" placeholder="flat Rp" value={t.flat ?? ""} onChange={(e) => { const c = [...adTiers]; c[i] = { ...t, flat: e.target.value === "" ? undefined : Number(e.target.value) }; setAdTiers(c); }} />
              <input type="number" className="input w-16" placeholder="%" value={t.pct ?? ""} onChange={(e) => { const c = [...adTiers]; c[i] = { ...t, pct: e.target.value === "" ? undefined : Number(e.target.value) }; setAdTiers(c); }} />
              <button onClick={() => setAdTiers(adTiers.filter((_, j) => j !== i))} className="rounded-md bg-rose-100 px-2 py-1 text-rose-700">✕</button>
            </div>
          ))}
          <p className="text-[11px] text-gray-400">Biaya pasang iklan sesuai harga barang. Kosongkan batas untuk tier akhir. Isi flat (Rp) atau % dari harga.</p>
        </div>
        <hr className="my-3 border-gray-100 dark:border-slate-800" />
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Fee setelah terjual</p>
          <button onClick={() => setTiers([...tiers, { upto: null, pct: 5 }])} className="text-xs text-gray-900 hover:underline dark:text-slate-200">+ Tambah tier</button>
        </div>
        <div className="mt-2 space-y-2">
          {tiers.map((t, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <input type="number" className="input w-24" placeholder="< batas" value={t.upto ?? ""} onChange={(e) => { const c = [...tiers]; c[i] = { ...t, upto: e.target.value === "" ? null : Number(e.target.value) }; setTiers(c); }} />
              <input type="number" className="input w-20" placeholder="flat Rp" value={t.flat ?? ""} onChange={(e) => { const c = [...tiers]; c[i] = { ...t, flat: e.target.value === "" ? undefined : Number(e.target.value) }; setTiers(c); }} />
              <input type="number" className="input w-16" placeholder="%" value={t.pct ?? ""} onChange={(e) => { const c = [...tiers]; c[i] = { ...t, pct: e.target.value === "" ? undefined : Number(e.target.value) }; setTiers(c); }} />
              <button onClick={() => setTiers(tiers.filter((_, j) => j !== i))} className="rounded-md bg-rose-100 px-2 py-1 text-rose-700">✕</button>
            </div>
          ))}
          <p className="text-[11px] text-gray-400">Kosongkan "&lt; batas" untuk tier teratas. Isi flat atau %.</p>
        </div>
        <Field label="Limit DICARI gratis per user">
          <input type="number" min="1" className="input" value={pricing.dicariFreeLimt ?? 3} onChange={(e) => setPricing({ ...pricing, dicariFreeLimt: Math.max(1, Number(e.target.value) || 3) })} />
          <p className="mt-1 text-xs text-gray-400">Berapa kali user bisa post DICARI gratis. Default: 3.</p>
        </Field>
        {!showPriceConfirm ? (
          <button
            onClick={() => setShowPriceConfirm(true)}
            className="btn-primary mt-4 w-full"
          >
            {saved === "pricing" ? "✓ Tersimpan" : "Simpan Harga"}
          </button>
        ) : (
          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
            <p className="mb-3 text-sm font-medium dark:text-white">Kirim pemberitahuan perubahan harga ke grup WA?</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={async () => {
                  await action({ action: "save_settings", key: "pricing", value: pricing }, "Harga disimpan");
                  flash("pricing"); setShowPriceConfirm(false);
                }}
                className="btn-outline flex-1 text-sm"
              >
                Simpan Saja
              </button>
              <button
                onClick={async () => {
                  await action({ action: "save_settings", key: "pricing", value: pricing }, "Harga disimpan");
                  flash("pricing");
                  await action({ action: "notify_group_pricing", pricing }, "Notifikasi harga dikirim ke grup");
                  setShowPriceConfirm(false);
                }}
                className="btn-primary flex-1 text-sm"
              >
                Simpan + Kirim ke Grup WA
              </button>
              <button
                onClick={() => setShowPriceConfirm(false)}
                className="w-full text-xs text-gray-400 hover:text-gray-600 mt-1"
              >
                Batal
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* KONTAK DUKUNGAN */}
      <Card title="Kontak & Dukungan" className={match("kontak dukungan wa whatsapp email cs admin customer service") ? "" : "hidden"}>
        <div className="space-y-3">
          <Field label="Nomor WA Marketplace"><input className="input" value={contact.marketplaceWa ?? ""} onChange={(e) => setContact({ ...contact, marketplaceWa: e.target.value })} /></Field>
          <Field label="Link Grup WhatsApp"><input className="input" value={contact.waGroupLink ?? ""} onChange={(e) => setContact({ ...contact, waGroupLink: e.target.value })} /></Field>
          <Field label="Email Dukungan"><input type="email" className="input" value={contact.supportEmail ?? ""} onChange={(e) => setContact({ ...contact, supportEmail: e.target.value })} /></Field>
          <Field label="Nomor Telepon Dukungan"><input className="input" value={contact.supportPhone ?? ""} onChange={(e) => setContact({ ...contact, supportPhone: e.target.value })} /></Field>
          <Field label="Alamat Kantor/Dukungan"><textarea className="input min-h-16" value={contact.supportAddress ?? ""} onChange={(e) => setContact({ ...contact, supportAddress: e.target.value })} /></Field>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "contact", value: contact }, "Kontak disimpan"); flash("contact"); }} className="btn-primary mt-4 w-full">{saved === "contact" ? "✓ Tersimpan" : "Simpan Kontak"}</button>
      </Card>

      {/* BRANDING & IDENTITAS VISUAL */}
      <Card title="Identitas Visual (Logo & Favicon)" className={match("identitas visual logo favicon icon gambar web situs") ? "" : "hidden"}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Logo Web</label>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-1 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-center">
                {site.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={site.logoUrl} alt="Logo Preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-400 text-center font-medium">Default SVG</span>
                )}
              </div>
              <div className="flex-1">
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "logo")} disabled={uploadingLogo} className="hidden" id="logo-upload-input" />
                <label htmlFor="logo-upload-input" className="btn-outline text-xs inline-block cursor-pointer px-4 py-2">
                  {uploadingLogo ? "Mengunggah..." : "Unggah Logo Baru"}
                </label>
                {site.logoUrl && (
                  <button onClick={() => { const u = { ...site, logoUrl: "" }; setSite(u); action({ action: "save_settings", key: "site", value: u }, "Logo dikembalikan ke default"); }} className="text-xs text-rose-600 block mt-1 hover:underline">
                    Reset ke Default
                  </button>
                )}
              </div>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-slate-800" />

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Favicon Web</label>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 p-2 dark:border-slate-800 dark:bg-slate-900 flex items-center justify-center">
                {site.faviconUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={site.faviconUrl} alt="Favicon Preview" className="h-full w-full object-contain" />
                ) : (
                  <span className="text-[10px] text-gray-400 text-center font-medium">Default</span>
                )}
              </div>
              <div className="flex-1">
                <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, "favicon")} disabled={uploadingFavicon} className="hidden" id="favicon-upload-input" />
                <label htmlFor="favicon-upload-input" className="btn-outline text-xs inline-block cursor-pointer px-4 py-2">
                  {uploadingFavicon ? "Mengunggah..." : "Unggah Favicon Baru"}
                </label>
                {site.faviconUrl && (
                  <button onClick={() => { const u = { ...site, faviconUrl: "" }; setSite(u); action({ action: "save_settings", key: "site", value: u }, "Favicon dikembalikan ke default"); }} className="text-xs text-rose-600 block mt-1 hover:underline">
                    Reset ke Default
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* TATA LETAK BERANDA */}
      <Card title="Tata Letak Beranda" className={match("tata letak layout beranda home ucapan welcome teks sambutan hero populer banner") ? "" : "hidden"}>
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            Geser urutan atau hapus seksi yang tidak ingin ditampilkan. Tersedia: hero, featured, main.
          </p>
          <div className="flex gap-2">
            {(site.layoutOrder || ["hero", "featured", "main"]).map((key, i) => (
              <span key={i} className="badge bg-gray-100 text-gray-800 dark:bg-slate-800 dark:text-slate-200 p-2 flex items-center gap-2">
                {key}
                <button onClick={() => {
                  const newLayout = [...(site.layoutOrder || ["hero", "featured", "main"])];
                  newLayout.splice(i, 1);
                  setSite({ ...site, layoutOrder: newLayout });
                }} className="text-rose-500 font-bold hover:text-rose-700">✕</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <select id="addLayout" className="input text-sm">
              <option value="hero">hero (Banner)</option>
              <option value="featured">featured (Iklan Unggulan)</option>
              <option value="main">main (Daftar Iklan)</option>
            </select>
            <button onClick={() => {
              const val = document.getElementById("addLayout").value;
              const newLayout = [...(site.layoutOrder || ["hero", "featured", "main"])];
              if (!newLayout.includes(val)) newLayout.push(val);
              setSite({ ...site, layoutOrder: newLayout });
            }} className="btn-outline text-sm">Tambah Seksi</button>
          </div>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "site", value: site }, "Tata Letak disimpan"); flash("layout"); }} className="btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "layout" ? "✓ Tersimpan" : "Simpan Tata Letak"}</button>
      </Card>

      {/* TEKS & SEO SITUS */}
      <Card title="Teks & SEO Situs" className={`lg:col-span-2 ${match("teks seo situs nama domain url base footer rules disclaimer kebijakan privasi metadata") ? "" : "hidden"}`}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Tampilan Website</label>
              <div className="space-y-3">
                <Field label="Judul Banner Beranda"><input className="input" value={site.heroTitle ?? ""} onChange={(e) => setSite({ ...site, heroTitle: e.target.value })} /></Field>
                <Field label="Subjudul Banner"><textarea className="input min-h-16" value={site.heroSubtitle ?? ""} onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })} /></Field>
                <Field label="Tagline Footer"><input className="input" value={site.footerTagline ?? ""} onChange={(e) => setSite({ ...site, footerTagline: e.target.value })} /></Field>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">Metadata SEO</label>
              <div className="space-y-3">
                <Field label="Meta Title (Judul Browser)"><input className="input" value={site.metaTitle ?? ""} onChange={(e) => setSite({ ...site, metaTitle: e.target.value })} /></Field>
                <Field label="Meta Description"><textarea className="input min-h-16" value={site.metaDescription ?? ""} onChange={(e) => setSite({ ...site, metaDescription: e.target.value })} /></Field>
                <Field label="Meta Keywords (Pisahkan dengan koma)"><textarea className="input min-h-16" value={site.metaKeywords ?? ""} onChange={(e) => setSite({ ...site, metaKeywords: e.target.value })} /></Field>
              </div>
            </div>
          </div>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "site", value: site }, "Teks & SEO disimpan"); flash("site"); }} className="btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "site" ? "✓ Tersimpan" : "Simpan Teks & SEO"}</button>
      </Card>

      {/* KONFIGURASI ADMIN & WA */}
      <Card title="Konfigurasi Admin & WhatsApp" className={match("konfigurasi admin whatsapp nomor hp wa superadmin super") ? "" : "hidden"}>
        <div className="space-y-3">
          <Field label="Nomor WA Admin (Superadmin)">
            <input className="input font-mono" value={adminCfg.adminWa ?? ""} onChange={(e) => setAdminCfg({ ...adminCfg, adminWa: e.target.value })} placeholder="628xxxxxxxxxx" />
            <p className="mt-1 text-xs text-gray-400">Nomor yang menerima notifikasi iklan baru, pembayaran, dll.</p>
          </Field>
          <Field label="JID Grup WA Utama (Broadcast Iklan)">
            <input className="input font-mono" value={adminCfg.groupJid ?? ""} onChange={(e) => setAdminCfg({ ...adminCfg, groupJid: e.target.value })} placeholder="628xxx@g.us" />
            <p className="mt-1 text-xs text-gray-400">Format: 628xxx-timestamp@g.us. Dapat dicopy dari tab Grup di WhatsApp Bot.</p>
          </Field>
          <Field label="Grup WA Tambahan (pisah koma)">
            <textarea className="input min-h-16 font-mono text-xs" value={adminCfg.extraGroups ?? ""} onChange={(e) => setAdminCfg({ ...adminCfg, extraGroups: e.target.value })} placeholder="628xxx@g.us,628yyy@g.us" />
          </Field>
          <Field label="URL / Link Gambar QRIS">
            <input className="input" value={adminCfg.qrisUrl ?? ""} onChange={(e) => setAdminCfg({ ...adminCfg, qrisUrl: e.target.value })} placeholder="https://..." />
            <p className="mt-1 text-xs text-gray-400">URL gambar QRIS yang dikirim ke user saat checkout. Kosongkan untuk pakai default env.</p>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!adminCfg.fonnteFirst} onChange={(e) => setAdminCfg({ ...adminCfg, fonnteFirst: e.target.checked })} className="h-4 w-4 rounded" />
            <span className="dark:text-slate-200">Gunakan Fonnte sebagai gateway utama (bukan Baileys)</span>
          </label>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "admin", value: adminCfg }, "Konfigurasi Admin disimpan"); flash("admin"); }} className="btn-primary mt-4 w-full">{saved === "admin" ? "✓ Tersimpan" : "Simpan Konfigurasi Admin"}</button>
      </Card>

      {/* KONFIGURASI BOT */}
      <Card title="Konfigurasi Bot WhatsApp" className={match("konfigurasi bot whatsapp token fonnte api baileys provider sender key") ? "" : "hidden"}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Expiry Konteks Percakapan (menit)">
            <input type="number" min="5" className="input" value={botCfg.contextExpiryMinutes ?? 30} onChange={(e) => setBotCfg({ ...botCfg, contextExpiryMinutes: Number(e.target.value) || 30 })} />
          </Field>
          <Field label="Maks Riwayat Konteks">
            <input type="number" min="1" max="20" className="input" value={botCfg.contextMaxHistory ?? 5} onChange={(e) => setBotCfg({ ...botCfg, contextMaxHistory: Number(e.target.value) || 5 })} />
          </Field>
          <Field label="Expiry OTP (menit)">
            <input type="number" min="1" className="input" value={botCfg.otpExpiryMinutes ?? 10} onChange={(e) => setBotCfg({ ...botCfg, otpExpiryMinutes: Number(e.target.value) || 10 })} />
          </Field>
          <Field label="Maks Percobaan OTP">
            <input type="number" min="1" max="10" className="input" value={botCfg.otpMaxAttempts ?? 3} onChange={(e) => setBotCfg({ ...botCfg, otpMaxAttempts: Number(e.target.value) || 3 })} />
          </Field>
        </div>
        <Field label="Webhook URL Bot (untuk kirim notif ke bot)">
          <input className="input font-mono" value={botCfg.webhookUrl ?? ""} onChange={(e) => setBotCfg({ ...botCfg, webhookUrl: e.target.value })} placeholder="https://bot.railway.app/webhook" />
          <p className="mt-1 text-xs text-gray-400">URL endpoint bot untuk trigger notifikasi langsung. Opsional.</p>
        </Field>
        <button onClick={() => { action({ action: "save_settings", key: "bot", value: botCfg }, "Konfigurasi Bot disimpan"); flash("bot"); }} className="btn-primary mt-4 w-full">{saved === "bot" ? "✓ Tersimpan" : "Simpan Konfigurasi Bot"}</button>
      </Card>

      {/* KONFIGURASI META (IG & FB) */}
      <Card title="Konfigurasi Meta (Instagram & Facebook)" className={match("konfigurasi meta instagram ig facebook fb token access page id media graph api post") ? "" : "hidden"}>
        <div className="space-y-3">
          <Field label="Meta Page Access Token (Never Expire)">
            <input type="password" className="input font-mono text-sm" value={metaCfg.accessToken ?? ""} onChange={(e) => setMetaCfg({ ...metaCfg, accessToken: e.target.value })} placeholder="EAAI..." />
            <p className="mt-1 text-xs text-gray-400">Pastikan token memiliki izin: pages_manage_posts, instagram_basic, instagram_content_publish.</p>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Facebook Page ID">
              <input className="input font-mono" value={metaCfg.fbPageId ?? ""} onChange={(e) => setMetaCfg({ ...metaCfg, fbPageId: e.target.value })} placeholder="123456789" />
            </Field>
            <Field label="Instagram User ID">
              <input className="input font-mono" value={metaCfg.igUserId ?? ""} onChange={(e) => setMetaCfg({ ...metaCfg, igUserId: e.target.value })} placeholder="178414..." />
            </Field>
          </div>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "meta", value: metaCfg }, "Konfigurasi Meta disimpan"); flash("meta"); }} className="btn-primary mt-4 w-full">{saved === "meta" ? "✓ Tersimpan" : "Simpan Konfigurasi Meta"}</button>
      </Card>

      {/* TEMPLATE PESAN BOT */}
      <Card title="Template Pesan Bot WhatsApp" className={`lg:col-span-2 ${match("template pesan bot whatsapp balasan admin dicari wanted notif pesan") ? "" : "hidden"}`}>
        <p className="mb-3 text-xs text-gray-400">Gunakan <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">{"{{title}}"}</code>, <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">{"{{url}}"}</code>, <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">{"{{price}}"}</code>, <code className="rounded bg-gray-100 px-1 dark:bg-slate-800">{"{{seller}}"}</code> sebagai variabel.</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Pengingat H-3 (iklan hampir berakhir)">
            <textarea className="input min-h-24 text-sm" value={messages.reminderH3 ?? ""} onChange={(e) => setMessages({ ...messages, reminderH3: e.target.value })} />
          </Field>
          <Field label="Pengingat H-1 (iklan mau berakhir besok)">
            <textarea className="input min-h-24 text-sm" value={messages.reminderH1 ?? ""} onChange={(e) => setMessages({ ...messages, reminderH1: e.target.value })} />
          </Field>
          <Field label="Instruksi Pembayaran QRIS">
            <textarea className="input min-h-20 text-sm" value={messages.qrisInstruction ?? ""} onChange={(e) => setMessages({ ...messages, qrisInstruction: e.target.value })} />
          </Field>
          <Field label="Notif Iklan Aktif (ke penjual)">
            <textarea className="input min-h-20 text-sm" value={messages.listingActive ?? ""} onChange={(e) => setMessages({ ...messages, listingActive: e.target.value })} />
          </Field>
          <Field label="Notif Iklan Baru (ke grup)">
            <textarea className="input min-h-20 text-sm" value={messages.notifNewListing ?? ""} onChange={(e) => setMessages({ ...messages, notifNewListing: e.target.value })} />
          </Field>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "messages", value: messages }, "Template pesan disimpan"); flash("messages"); }} className="btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "messages" ? "✓ Tersimpan" : "Simpan Template Pesan"}</button>
      </Card>

      {/* AREA POPULER */}
      <Card title="Daftar Area / Wilayah Populer" className={match("daftar area wilayah populer lokasi cod kampus") ? "" : "hidden"}>
        <p className="mb-2 text-xs text-gray-400">Satu area per baris. Digunakan sebagai pilihan area di form iklan.</p>
        <textarea
          className="input min-h-48 font-mono text-sm"
          value={areas}
          onChange={(e) => setAreas(e.target.value)}
          placeholder={"Medan Baru\nMedan Selayang\nKampus USU\n..."}
        />
        <button
          onClick={() => {
            const list = areas.split("\n").map(s => s.trim()).filter(Boolean);
            action({ action: "save_settings", key: "areas", value: list }, "Daftar area disimpan");
            flash("areas");
          }}
          className="btn-primary mt-4 w-full"
        >{saved === "areas" ? "✓ Tersimpan" : "Simpan Daftar Area"}</button>
      </Card>
    </div>
  </div>
  );
}
function Field({ label, children }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>;
}
