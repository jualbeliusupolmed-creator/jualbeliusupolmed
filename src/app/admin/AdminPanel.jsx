"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { rupiah } from "@/lib/fees";
import { downloadCSV } from "@/lib/csv";
import AdminListingModal from "./AdminListingModal";

const REPORT_LABELS = {
  penipuan: "Penipuan / scam",
  barang_terlarang: "Barang terlarang",
  spam: "Spam / iklan ganda",
  salah_kategori: "Salah kategori",
  lainnya: "Lainnya",
};

const PAYMENT_TYPES = ["iklan", "bump", "featured", "sold_fee"];
const PAYMENT_STATUS = ["pending", "paid", "failed", "expired"];

export default function AdminPanel({
  listings = [],
  payments = [],
  blacklist = [],
  reports = [],
  ratings = [],
  categories = [],
  settings = {},
}) {
  const router = useRouter();
  const [tab, setTab] = useState("overview");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editing, setEditing] = useState(null);
  const [newBl, setNewBl] = useState("");
  const [payType, setPayType] = useState("all");
  const [payStatus, setPayStatus] = useState("all");

  // ── Derived stats ──────────────────────────────────────────────────────────
  const active = listings.filter((l) => l.status === "active");
  const sold = listings.filter((l) => l.status === "sold");
  const pending = listings.filter((l) => l.status === "pending");
  const paidPayments = payments.filter((p) => p.status === "paid");
  const pendingPayments = payments.filter((p) => p.status === "pending");
  const totalRevenue = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const openReports = reports.filter((r) => r.status === "open");
  const totalViews = listings.reduce((s, l) => s + (l.views || 0), 0);
  const avgRating =
    ratings.length > 0
      ? (ratings.reduce((s, r) => s + (r.rating || 0), 0) / ratings.length).toFixed(1)
      : "–";

  const perCat = useMemo(() => {
    const m = {};
    listings.forEach((l) => (m[l.category] = (m[l.category] || 0) + 1));
    return m;
  }, [listings]);

  // Revenue 14 hari terakhir
  const revByDay = useMemo(() => {
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      days.push({ key: d.toISOString().slice(0, 10), total: 0 });
    }
    const idx = Object.fromEntries(days.map((d, i) => [d.key, i]));
    paidPayments.forEach((p) => {
      const k = (p.created_at || "").slice(0, 10);
      if (k in idx) days[idx[k]].total += p.amount || 0;
    });
    return days;
  }, [paidPayments]);
  const maxRev = Math.max(1, ...revByDay.map((d) => d.total));

  // ── Actions ────────────────────────────────────────────────────────────────
  async function action(body) {
    await fetch("/api/admin/action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    router.refresh();
  }
  async function logout() {
    await fetch("/api/admin/login", { method: "DELETE" });
    router.refresh();
  }

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
      (payStatus === "all" || p.status === payStatus)
  );

  const TABS = [
    ["overview", "📊 Overview"],
    ["listings", "📦 Listing"],
    ["transaksi", "💳 Transaksi"],
    ["rating", "⭐ Rating"],
    ["reports", `🚩 Laporan${openReports.length ? ` (${openReports.length})` : ""}`],
    ["kategori", "🏷️ Kategori"],
    ["pengaturan", "⚙️ Pengaturan"],
    ["blacklist", "🚫 Blacklist"],
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {editing && (
        <AdminListingModal
          listing={editing}
          categories={categories}
          onSave={action}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">Admin Panel</h1>
        <button onClick={logout} className="btn-outline text-sm">
          Keluar
        </button>
      </div>

      {/* KPI */}
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Total Iklan" value={listings.length} sub={`${active.length} aktif`} />
        <Kpi label="Terjual" value={sold.length} sub={`${pending.length} pending`} />
        <Kpi
          label="Revenue (paid)"
          value={rupiah(totalRevenue)}
          sub={`${pendingPayments.length} pending`}
        />
        <Kpi label="Total Views" value={totalViews} sub={`★ ${avgRating} rata-rata`} />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium ${
              tab === k
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {tab === "overview" && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card p-4">
            <h2 className="mb-3 font-bold">Revenue 14 Hari (paid)</h2>
            <div className="flex h-40 items-end gap-1">
              {revByDay.map((d) => (
                <div key={d.key} className="group flex flex-1 flex-col items-center justify-end">
                  <div
                    className="w-full rounded-t bg-primary/80 transition-all hover:bg-primary"
                    style={{ height: `${(d.total / maxRev) * 100}%` }}
                    title={`${d.key}: ${rupiah(d.total)}`}
                  />
                  <span className="mt-1 text-[9px] text-gray-400">
                    {d.key.slice(8)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-400">
              Total 14 hari:{" "}
              <strong>{rupiah(revByDay.reduce((s, d) => s + d.total, 0))}</strong>
            </p>
          </div>

          <div className="card p-4">
            <h2 className="mb-3 font-bold">Listing per Kategori</h2>
            {Object.entries(perCat).length === 0 && (
              <p className="text-sm text-gray-400">Belum ada listing.</p>
            )}
            {Object.entries(perCat).map(([name, count]) => {
              const max = Math.max(1, ...Object.values(perCat));
              return (
                <div key={name} className="mb-3 last:mb-0">
                  <div className="flex justify-between text-sm">
                    <span>{name}</span>
                    <span className="text-gray-400">{count}</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="card p-4 lg:col-span-2">
            <h2 className="mb-3 font-bold">Revenue per Tipe</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {PAYMENT_TYPES.map((t) => {
                const sum = paidPayments
                  .filter((p) => p.type === t)
                  .reduce((s, p) => s + (p.amount || 0), 0);
                return (
                  <div key={t} className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs capitalize text-gray-400">{t}</p>
                    <p className="mt-1 font-bold text-primary">{rupiah(sum)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── LISTINGS ─────────────────────────────────────────────────────────── */}
      {tab === "listings" && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              className="input flex-1 min-w-[200px]"
              placeholder="Cari judul / nama / WA…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="input w-auto"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Semua status</option>
              {["pending", "active", "sold", "expired", "suspended"].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs text-gray-400">{filteredListings.length} listing</p>
            <button
              onClick={() =>
                downloadCSV(
                  "listing.csv",
                  filteredListings.map((l) => ({
                    id: l.id,
                    judul: l.title,
                    kategori: l.category,
                    tipe: l.type,
                    harga: l.price,
                    stok: l.stock,
                    status: l.status,
                    featured: l.featured,
                    views: l.views || 0,
                    penjual: l.seller_name,
                    wa: l.seller_wa,
                    dibuat: l.created_at,
                  }))
                )
              }
              className="btn-outline text-xs"
            >
              ⬇️ Export CSV
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
                <tr>
                  <th className="p-3">Barang</th>
                  <th className="p-3">Penjual</th>
                  <th className="p-3">Harga</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">👁️</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredListings.map((l) => (
                  <tr key={l.id} className="border-t align-top">
                    <td className="max-w-[200px] p-3">
                      <p className="truncate font-medium">{l.title}</p>
                      <p className="text-xs text-gray-400">{l.category}</p>
                      {l.featured && (
                        <span className="badge bg-amber-100 text-amber-700">⭐</span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500">
                      {l.seller_name}
                      <br />
                      <span className="text-xs">{l.seller_wa}</span>
                    </td>
                    <td className="p-3">{rupiah(l.price)}</td>
                    <td className="p-3">
                      <span className="badge bg-gray-100 text-gray-600">{l.status}</span>
                    </td>
                    <td className="p-3 text-gray-500">{l.views || 0}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setEditing(l)}
                          className="rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary"
                        >
                          Edit
                        </button>
                        {l.status !== "active" && (
                          <button
                            onClick={() => action({ action: "activate", id: l.id })}
                            className="rounded-lg bg-green-100 px-2 py-1 text-xs text-green-700"
                          >
                            Aktifkan
                          </button>
                        )}
                        {l.status !== "suspended" && (
                          <button
                            onClick={() => action({ action: "suspend", id: l.id })}
                            className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-700"
                          >
                            Suspend
                          </button>
                        )}
                        {l.featured ? (
                          <button
                            onClick={() => action({ action: "unfeature", id: l.id })}
                            className="rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600"
                          >
                            Unfeature
                          </button>
                        ) : (
                          <button
                            onClick={() => action({ action: "feature", id: l.id, days: 7 })}
                            className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-600"
                          >
                            ⭐7h
                          </button>
                        )}
                        <button
                          onClick={() =>
                            confirm("Hapus listing ini?") &&
                            action({ action: "delete", id: l.id })
                          }
                          className="rounded-lg bg-rose-100 px-2 py-1 text-xs text-rose-700"
                        >
                          Hapus
                        </button>
                        <button
                          onClick={() =>
                            confirm(`Blacklist ${l.seller_wa}?`) &&
                            action({ action: "blacklist", wa: l.seller_wa })
                          }
                          className="rounded-lg bg-gray-900 px-2 py-1 text-xs text-white"
                        >
                          Blacklist
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TRANSAKSI ────────────────────────────────────────────────────────── */}
      {tab === "transaksi" && (
        <div className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <select className="input w-auto" value={payType} onChange={(e) => setPayType(e.target.value)}>
              <option value="all">Semua tipe</option>
              {PAYMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select className="input w-auto" value={payStatus} onChange={(e) => setPayStatus(e.target.value)}>
              <option value="all">Semua status</option>
              {PAYMENT_STATUS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                downloadCSV(
                  "transaksi.csv",
                  filteredPayments.map((p) => ({
                    order_id: p.midtrans_order_id || p.id,
                    tipe: p.type,
                    jumlah: p.amount,
                    status: p.status,
                    listing_id: p.listing_id || "",
                    dibuat: p.created_at,
                  }))
                )
              }
              className="btn-outline text-xs"
            >
              ⬇️ Export CSV
            </button>
            <span className="ml-auto self-center text-sm text-gray-400">
              {filteredPayments.length} transaksi
            </span>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400">
                <tr>
                  <th className="p-3">Order ID</th>
                  <th className="p-3">Tipe</th>
                  <th className="p-3">Jumlah</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Tanggal</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="max-w-[160px] truncate p-3 font-mono text-xs">
                      {p.midtrans_order_id || p.id.slice(0, 8)}
                    </td>
                    <td className="p-3 capitalize">{p.type}</td>
                    <td className="p-3 font-medium">{rupiah(p.amount)}</td>
                    <td className="p-3">
                      <span
                        className={`badge ${
                          p.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : p.status === "pending"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-rose-100 text-rose-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-gray-400">
                      {new Date(p.created_at).toLocaleDateString("id-ID")}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {p.status !== "paid" && (
                          <button
                            onClick={() => action({ action: "update_payment", id: p.id, status: "paid" })}
                            className="rounded-lg bg-green-100 px-2 py-1 text-xs text-green-700"
                          >
                            Tandai paid
                          </button>
                        )}
                        {p.status !== "failed" && (
                          <button
                            onClick={() => action({ action: "update_payment", id: p.id, status: "failed" })}
                            className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-700"
                          >
                            Failed
                          </button>
                        )}
                        <button
                          onClick={() =>
                            confirm("Hapus transaksi ini?") &&
                            action({ action: "delete_payment", id: p.id })
                          }
                          className="rounded-lg bg-rose-100 px-2 py-1 text-xs text-rose-700"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RATING ───────────────────────────────────────────────────────────── */}
      {tab === "rating" && (
        <div className="mt-6 space-y-3">
          {ratings.length === 0 && (
            <p className="text-sm text-gray-400">Belum ada rating.</p>
          )}
          {ratings.map((r) => (
            <div key={r.id} className="card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">
                  {"⭐".repeat(r.rating)}{" "}
                  <span className="text-xs text-gray-400">({r.rating}/5)</span>
                </p>
                <p className="mt-1 text-sm">{r.listings?.title || "(listing terhapus)"}</p>
                <p className="text-xs text-gray-400">
                  {r.buyer_name || "Anonim"} → {r.seller_wa} ·{" "}
                  {new Date(r.created_at).toLocaleDateString("id-ID")}
                </p>
                {r.comment && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">“{r.comment}”</p>
                )}
              </div>
              <button
                onClick={() =>
                  confirm("Hapus rating ini?") &&
                  action({ action: "delete_rating", id: r.id })
                }
                className="shrink-0 rounded-lg bg-rose-100 px-2 py-1 text-xs text-rose-700"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── LAPORAN ──────────────────────────────────────────────────────────── */}
      {tab === "reports" && (
        <div className="mt-6 space-y-3">
          {reports.length === 0 && (
            <p className="text-sm text-gray-400">Tidak ada laporan. 🎉</p>
          )}
          {reports.map((r) => (
            <div
              key={r.id}
              className={`card p-4 ${r.status === "resolved" ? "opacity-60" : ""}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="badge bg-rose-100 text-rose-700">
                    {REPORT_LABELS[r.reason] || r.reason}
                  </span>
                  {r.status === "resolved" && (
                    <span className="badge ml-1 bg-green-100 text-green-700">selesai</span>
                  )}
                  <p className="mt-2 font-medium">{r.listings?.title || "(listing terhapus)"}</p>
                  <p className="text-xs text-gray-400">
                    Penjual: {r.listings?.seller_wa || "-"} ·{" "}
                    {new Date(r.created_at).toLocaleString("id-ID")}
                  </p>
                  {r.detail && (
                    <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">“{r.detail}”</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  {r.listing_id && (
                    <a
                      href={`/produk/${r.listing_id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-gray-100 px-2 py-1 text-center text-xs text-gray-600"
                    >
                      Lihat
                    </a>
                  )}
                  {r.listing_id && (
                    <button
                      onClick={() => action({ action: "suspend", id: r.listing_id })}
                      className="rounded-lg bg-amber-100 px-2 py-1 text-xs text-amber-700"
                    >
                      Suspend
                    </button>
                  )}
                  {r.status !== "resolved" && (
                    <button
                      onClick={() => action({ action: "resolve_report", id: r.id })}
                      className="rounded-lg bg-green-100 px-2 py-1 text-xs text-green-700"
                    >
                      Selesai
                    </button>
                  )}
                  <button
                    onClick={() => action({ action: "delete_report", id: r.id })}
                    className="rounded-lg bg-rose-100 px-2 py-1 text-xs text-rose-700"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── KATEGORI ─────────────────────────────────────────────────────────── */}
      {tab === "kategori" && (
        <CategoryManager categories={categories} action={action} />
      )}

      {/* ── PENGATURAN ───────────────────────────────────────────────────────── */}
      {tab === "pengaturan" && <SettingsManager settings={settings} action={action} />}

      {/* ── BLACKLIST ────────────────────────────────────────────────────────── */}
      {tab === "blacklist" && (
        <div className="mt-6 max-w-lg">
          <div className="card flex gap-2 p-4">
            <input
              className="input"
              placeholder="Nomor WA untuk diblokir"
              value={newBl}
              onChange={(e) => setNewBl(e.target.value)}
            />
            <button
              onClick={() => {
                if (newBl.trim()) action({ action: "blacklist", wa: newBl.trim() });
                setNewBl("");
              }}
              className="btn-primary shrink-0"
            >
              Tambah
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {blacklist.length === 0 && (
              <p className="text-sm text-gray-400">Belum ada nomor diblokir.</p>
            )}
            {blacklist.map((b) => (
              <div key={b.id} className="card flex items-center justify-between p-3 text-sm">
                <span className="font-medium">{b.wa}</span>
                <button
                  onClick={() => action({ action: "unblacklist", id: b.id })}
                  className="text-rose-600 hover:underline"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-primary">{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Kategori manager ─────────────────────────────────────────────────────────
function CategoryManager({ categories, action }) {
  const [form, setForm] = useState({ name: "", icon: "🏷️", sort_order: "" });

  return (
    <div className="mt-6 max-w-2xl">
      <div className="card grid grid-cols-[1fr_auto_auto_auto] items-end gap-2 p-4">
        <div>
          <label className="label text-xs">Nama kategori</label>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Otomotif"
          />
        </div>
        <div>
          <label className="label text-xs">Ikon</label>
          <input
            className="input w-16 text-center"
            value={form.icon}
            onChange={(e) => setForm({ ...form, icon: e.target.value })}
          />
        </div>
        <div>
          <label className="label text-xs">Urutan</label>
          <input
            type="number"
            className="input w-20"
            value={form.sort_order}
            onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
          />
        </div>
        <button
          onClick={() => {
            if (!form.name.trim()) return;
            action({ action: "category_upsert", ...form });
            setForm({ name: "", icon: "🏷️", sort_order: "" });
          }}
          className="btn-primary"
        >
          Tambah
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {categories.map((c) => (
          <CategoryRow key={c.id || c.slug} c={c} action={action} />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ c, action }) {
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({
    name: c.name,
    icon: c.icon || "🏷️",
    sort_order: c.sort_order ?? 0,
  });

  if (edit) {
    return (
      <div className="card flex items-center gap-2 p-3">
        <input
          className="input w-14 text-center"
          value={f.icon}
          onChange={(e) => setF({ ...f, icon: e.target.value })}
        />
        <input
          className="input flex-1"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <input
          type="number"
          className="input w-20"
          value={f.sort_order}
          onChange={(e) => setF({ ...f, sort_order: e.target.value })}
        />
        <button
          onClick={() => {
            action({ action: "category_upsert", id: c.id, slug: c.slug, ...f });
            setEdit(false);
          }}
          className="btn-primary text-xs"
        >
          Simpan
        </button>
        <button onClick={() => setEdit(false)} className="btn-outline text-xs">
          Batal
        </button>
      </div>
    );
  }

  return (
    <div className="card flex items-center justify-between p-3 text-sm">
      <span className="flex items-center gap-2">
        <span className="text-lg">{c.icon}</span>
        <span className="font-medium">{c.name}</span>
        <span className="text-xs text-gray-400">/{c.slug} · #{c.sort_order ?? 0}</span>
      </span>
      <div className="flex gap-2">
        <button onClick={() => setEdit(true)} className="text-primary hover:underline">
          Edit
        </button>
        {c.id && (
          <button
            onClick={() =>
              confirm(`Hapus kategori "${c.name}"?`) &&
              action({ action: "category_delete", id: c.id })
            }
            className="text-rose-600 hover:underline"
          >
            Hapus
          </button>
        )}
      </div>
    </div>
  );
}

// ── Settings manager ─────────────────────────────────────────────────────────
function SettingsManager({ settings, action }) {
  const [pricing, setPricing] = useState(settings.pricing || {});
  const [contact, setContact] = useState(settings.contact || {});
  const [site, setSite] = useState(settings.site || {});
  const [saved, setSaved] = useState("");

  function flash(key) {
    setSaved(key);
    setTimeout(() => setSaved(""), 2000);
  }
  const numP = (k) => (e) =>
    setPricing({ ...pricing, [k]: Math.max(0, Number(e.target.value) || 0) });

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      {/* Harga */}
      <div className="card p-4">
        <h3 className="font-bold">💰 Harga & Biaya</h3>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <Field label="Iklan barang">
            <input type="number" className="input" value={pricing.adBarang ?? ""} onChange={numP("adBarang")} />
          </Field>
          <Field label="Iklan poster">
            <input type="number" className="input" value={pricing.adPoster ?? ""} onChange={numP("adPoster")} />
          </Field>
          <Field label="Bump / sundul">
            <input type="number" className="input" value={pricing.bump ?? ""} onChange={numP("bump")} />
          </Field>
          <Field label="Featured / hari">
            <input type="number" className="input" value={pricing.featuredPerDay ?? ""} onChange={numP("featuredPerDay")} />
          </Field>
          <Field label="Featured maks / hari">
            <input type="number" className="input" value={pricing.featuredMaxPerDay ?? ""} onChange={numP("featuredMaxPerDay")} />
          </Field>
        </div>

        <p className="mt-4 text-xs font-semibold text-gray-500">Fee setelah terjual (tier)</p>
        <div className="mt-1 space-y-2">
          {(pricing.soldTiers || []).map((t, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="w-20 text-gray-400">
                {t.upto == null ? "≥ batas atas" : `< ${rupiah(t.upto)}`}
              </span>
              <input
                type="number"
                className="input w-24"
                placeholder="batas (upto)"
                value={t.upto ?? ""}
                onChange={(e) => {
                  const tiers = [...pricing.soldTiers];
                  tiers[i] = { ...t, upto: e.target.value === "" ? null : Number(e.target.value) };
                  setPricing({ ...pricing, soldTiers: tiers });
                }}
              />
              <input
                type="number"
                className="input w-20"
                placeholder="flat Rp"
                value={t.flat ?? ""}
                onChange={(e) => {
                  const tiers = [...pricing.soldTiers];
                  tiers[i] = { ...t, flat: e.target.value === "" ? undefined : Number(e.target.value) };
                  setPricing({ ...pricing, soldTiers: tiers });
                }}
              />
              <input
                type="number"
                className="input w-16"
                placeholder="%"
                value={t.pct ?? ""}
                onChange={(e) => {
                  const tiers = [...pricing.soldTiers];
                  tiers[i] = { ...t, pct: e.target.value === "" ? undefined : Number(e.target.value) };
                  setPricing({ ...pricing, soldTiers: tiers });
                }}
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            action({ action: "save_settings", key: "pricing", value: pricing });
            flash("pricing");
          }}
          className="btn-primary mt-4 w-full"
        >
          {saved === "pricing" ? "✅ Tersimpan" : "Simpan Harga"}
        </button>
      </div>

      {/* Kontak */}
      <div className="card p-4">
        <h3 className="font-bold">📲 Kontak</h3>
        <div className="mt-3 space-y-3">
          <Field label="Nomor WA marketplace">
            <input
              className="input"
              value={contact.marketplaceWa ?? ""}
              onChange={(e) => setContact({ ...contact, marketplaceWa: e.target.value })}
            />
          </Field>
          <Field label="Link grup WhatsApp">
            <input
              className="input"
              value={contact.waGroupLink ?? ""}
              onChange={(e) => setContact({ ...contact, waGroupLink: e.target.value })}
            />
          </Field>
        </div>
        <button
          onClick={() => {
            action({ action: "save_settings", key: "contact", value: contact });
            flash("contact");
          }}
          className="btn-primary mt-4 w-full"
        >
          {saved === "contact" ? "✅ Tersimpan" : "Simpan Kontak"}
        </button>
      </div>

      {/* Teks situs */}
      <div className="card p-4 lg:col-span-2">
        <h3 className="font-bold">📝 Teks Situs</h3>
        <div className="mt-3 space-y-3">
          <Field label="Judul banner beranda">
            <input
              className="input"
              value={site.heroTitle ?? ""}
              onChange={(e) => setSite({ ...site, heroTitle: e.target.value })}
            />
          </Field>
          <Field label="Subjudul banner">
            <textarea
              className="input min-h-16"
              value={site.heroSubtitle ?? ""}
              onChange={(e) => setSite({ ...site, heroSubtitle: e.target.value })}
            />
          </Field>
          <Field label="Tagline footer">
            <input
              className="input"
              value={site.footerTagline ?? ""}
              onChange={(e) => setSite({ ...site, footerTagline: e.target.value })}
            />
          </Field>
        </div>
        <button
          onClick={() => {
            action({ action: "save_settings", key: "site", value: site });
            flash("site");
          }}
          className="btn-primary mt-4 w-full sm:w-auto sm:px-10"
        >
          {saved === "site" ? "✅ Tersimpan" : "Simpan Teks"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="label text-xs">{label}</span>
      {children}
    </label>
  );
}
