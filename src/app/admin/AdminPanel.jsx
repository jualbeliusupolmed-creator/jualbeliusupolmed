"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { downloadCSV } from "@/lib/csv";
import { buildSlug } from "@/lib/slug";
import AdminListingModal from "./AdminListingModal";
import ConfirmModal from "@/components/ConfirmModal";

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
  initialTab = "overview",
}) {
  const router = useRouter();
  const VALID_TABS = ["overview","listings","transaksi","rating","reports","dicari","kategori","pengaturan","blacklist"];
  const tab = VALID_TABS.includes(initialTab) ? initialTab : "overview";
  function goTab(key) { router.push(`/admin/${key}`); }
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
      setToast({ type: "ok", msg: okMsg || "Berhasil" });
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
  const totalRevenue = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);
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
    return (
      l.title?.toLowerCase().includes(s) ||
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

  const NAV = [
    { key: "overview", label: "Ringkasan" },
    { key: "listings", label: "Listing", count: listings.length },
    { key: "transaksi", label: "Transaksi" },
    { key: "rating", label: "Rating" },
    { key: "reports", label: "Laporan", count: openReports.length || null },
    { key: "dicari", label: "Dicari", count: activeWanted.length || null },
    { key: "kategori", label: "Kategori" },
    { key: "pengaturan", label: "Pengaturan" },
    { key: "blacklist", label: "Blacklist" },
  ];
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
          <nav className="space-y-0.5">
            {NAV.map((n) => (
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
          </nav>
          <button onClick={logout} className="btn-outline mt-4 w-full text-sm">Keluar</button>
        </div>
      </aside>

      {/* Content */}
      <main className="min-w-0 flex-1">
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <h1 className="text-xl font-extrabold dark:text-white">{activeLabel}</h1>
          <button onClick={logout} className="btn-outline text-xs">Keluar</button>
        </div>
        <div className="mb-4 flex gap-1 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => goTab(n.key)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                tab === n.key
                  ? "bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-gray-100 text-gray-600 dark:bg-slate-900 dark:text-slate-400"
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>

        <h1 className="mb-4 hidden text-2xl font-extrabold dark:text-white lg:block">{activeLabel}</h1>

        {tab !== "pengaturan" && (
          <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Kpi label="Iklan aktif" value={active.length} sub={`${listings.length} total`} />
            <Kpi label="Terjual" value={sold.length} sub={`${pending.length} pending`} />
            <Kpi label="Revenue" value={rupiah(totalRevenue)} sub={`${pendingPayments.length} pending`} />
            <Kpi label="Total views" value={totalViews} />
            <Kpi label="Rating rata-rata" value={avgRating} sub={`${ratings.length} ulasan`} />
            <Kpi label="Laporan terbuka" value={openReports.length} sub={`${pendingVerif.length} verifikasi`} />
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
                {["pending", "active", "sold", "expired", "suspended"].map((s) => <option key={s} value={s}>{s}</option>)}
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
                      <td className="max-w-[200px] p-3">
                        <p className="truncate font-medium dark:text-white">{l.title}</p>
                        <p className="text-xs text-gray-400">{l.category}{l.featured ? " · ⭐" : ""}</p>
                      </td>
                      <td className="p-3 text-gray-500">{l.seller_name}<br /><span className="text-xs">{l.seller_wa}</span></td>
                      <td className="p-3">{rupiah(l.price)}</td>
                      <td className="p-3"><StatusBadge s={l.status} /></td>
                      <td className="p-3 text-gray-500">{l.views || 0}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1">
                          <button onClick={() => setEditing(l)} className="rounded-md bg-gray-900 px-2 py-1 text-xs text-white dark:bg-slate-200 dark:text-slate-900">Edit</button>
                          {l.status !== "active" && <button onClick={() => action({ action: "activate", id: l.id }, "Diaktifkan")} className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700">Aktifkan</button>}
                          {l.status !== "suspended" && <button onClick={() => action({ action: "suspend", id: l.id }, "Disuspend")} className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700">Suspend</button>}
                          {l.featured ? (
                            <button onClick={() => action({ action: "unfeature", id: l.id }, "Featured dilepas")} className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-slate-800 dark:text-slate-300">Unfeature</button>
                          ) : (
                            <button onClick={() => action({ action: "feature", id: l.id, days: 7 }, "Featured 7 hari")} className="rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-600">Featured</button>
                          )}
                          <button onClick={() => confirmThen({ title: "Hapus listing", message: `Hapus "${l.title}"?`, danger: true }, () => action({ action: "delete", id: l.id }, "Dihapus"))} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">Hapus</button>
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
                    {r.comment && <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-400">“{r.comment}”</p>}
                  </div>
                  <button onClick={() => confirmThen({ title: "Hapus rating", message: "Hapus rating ini?", danger: true }, () => action({ action: "delete_rating", id: r.id }, "Dihapus"))} className="shrink-0 rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700">Hapus</button>
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
                    {r.detail && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-slate-400">“{r.detail}”</p>}
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
        {tab === "blacklist" && (
          <div className="max-w-lg">
            <div className="card flex gap-2 p-4">
              <input className="input" placeholder="Nomor WA untuk diblokir" value={newBl} onChange={(e) => setNewBl(e.target.value)} />
              <button onClick={() => { if (newBl.trim()) action({ action: "blacklist", wa: newBl.trim() }, "Diblokir"); setNewBl(""); }} className="btn-primary shrink-0">Tambah</button>
            </div>
            <div className="mt-4 space-y-2">
              {blacklist.length === 0 && <p className="text-sm text-gray-400">Belum ada nomor diblokir.</p>}
              {blacklist.map((b) => (
                <div key={b.id} className="card flex items-center justify-between p-3 text-sm">
                  <span className="font-medium dark:text-white">{b.wa}</span>
                  <button onClick={() => action({ action: "unblacklist", id: b.id }, "Dihapus")} className="text-rose-600 hover:underline">Hapus</button>
                </div>
              ))}
            </div>
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
    <div className={`card p-4 ${className}`}>
      <h2 className="mb-3 font-bold dark:text-white">{title}</h2>
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

// ── Settings manager ──────────────────────────────────────────────────────────
function SettingsManager({ settings, action }) {
  const [pricing, setPricing] = useState(settings.pricing || {});
  const [contact, setContact] = useState(settings.contact || {});
  const [site, setSite] = useState(settings.site || {});
  const [saved, setSaved] = useState("");
  function flash(k) { setSaved(k); setTimeout(() => setSaved(""), 2000); }
  const numP = (k) => (e) => setPricing({ ...pricing, [k]: Math.max(0, Number(e.target.value) || 0) });
  const tiers = pricing.soldTiers || [];
  const setTiers = (t) => setPricing({ ...pricing, soldTiers: t });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title="Harga & Biaya">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Iklan barang"><input type="number" className="input" value={pricing.adBarang ?? ""} onChange={numP("adBarang")} /></Field>
          <Field label="Iklan poster"><input type="number" className="input" value={pricing.adPoster ?? ""} onChange={numP("adPoster")} /></Field>
          <Field label="Bump / sundul"><input type="number" className="input" value={pricing.bump ?? ""} onChange={numP("bump")} /></Field>
          <Field label="Featured / hari"><input type="number" className="input" value={pricing.featuredPerDay ?? ""} onChange={numP("featuredPerDay")} /></Field>
          <Field label="Featured maks / hari"><input type="number" className="input" value={pricing.featuredMaxPerDay ?? ""} onChange={numP("featuredMaxPerDay")} /></Field>
        </div>
        <div className="mt-4 flex items-center justify-between">
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
          <p className="text-[11px] text-gray-400">Kosongkan “&lt; batas” untuk tier teratas. Isi flat atau %.</p>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "pricing", value: pricing }, "Harga disimpan"); flash("pricing"); }} className="btn-primary mt-4 w-full">{saved === "pricing" ? "✓ Tersimpan" : "Simpan Harga"}</button>
      </Card>

      <Card title="Kontak">
        <div className="space-y-3">
          <Field label="Nomor WA marketplace"><input className="input" value={contact.marketplaceWa ?? ""} onChange={(e) => setContact({ ...contact, marketplaceWa: e.target.value })} /></Field>
          <Field label="Link grup WhatsApp"><input className="input" value={contact.waGroupLink ?? ""} onChange={(e) => setContact({ ...contact, waGroupLink: e.target.value })} /></Field>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "contact", value: contact }, "Kontak disimpan"); flash("contact"); }} className="btn-primary mt-4 w-full">{saved === "contact" ? "✓ Tersimpan" : "Simpan Kontak"}</button>
      </Card>

      <Card title="Teks Situs" className="lg:col-span-2">
        <div className="space-y-3">
          <Field label="Judul banner beranda"><input className="input" value={site.heroTitle ?? ""} onChange={(e) => setSite({ ...site, heroTitle: e.target.value })} /></Field>
          <Field label="Subjudul banner"><textarea className="input min-h-16" value={site.heroSubtitle ?? ""} onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })} /></Field>
          <Field label="Tagline footer"><input className="input" value={site.footerTagline ?? ""} onChange={(e) => setSite({ ...site, footerTagline: e.target.value })} /></Field>
        </div>
        <button onClick={() => { action({ action: "save_settings", key: "site", value: site }, "Teks disimpan"); flash("site"); }} className="btn-primary mt-4 w-full sm:w-auto sm:px-10">{saved === "site" ? "✓ Tersimpan" : "Simpan Teks"}</button>
      </Card>
    </div>
  );
}
function Field({ label, children }) {
  return <label className="block"><span className="label">{label}</span>{children}</label>;
}
