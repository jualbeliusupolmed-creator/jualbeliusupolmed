"use client";
import { useEffect, useState } from "react";
import { rupiah } from "@/lib/fees";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Badge({ status }) {
  const cls = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    accepted: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    rejected: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    expired: "bg-gray-100 text-gray-500 dark:bg-slate-800",
  }[status] || "bg-gray-100 text-gray-500";
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{status || "-"}</span>;
}

export default function TawaranPanel() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/offers");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat");
      setOffers(json.offers || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = offers.filter(o => {
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    if (!matchStatus) return false;
    if (!q) return true;
    const lower = q.toLowerCase();
    return (o.listings?.title || "").toLowerCase().includes(lower) ||
      (o.buyer_wa || "").includes(lower) ||
      (o.listings?.seller_wa || "").includes(lower);
  });

  const stats = {
    total: offers.length,
    pending: offers.filter(o => o.status === "pending").length,
    accepted: offers.filter(o => o.status === "accepted").length,
    rejected: offers.filter(o => o.status === "rejected").length,
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[["Total", stats.total, ""], ["Pending", stats.pending, "text-yellow-600"], ["Diterima", stats.accepted, "text-green-600"], ["Ditolak", stats.rejected, "text-rose-600"]].map(([l, v, cls]) => (
          <div key={l} className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 text-center">
            <div className={`text-2xl font-bold ${cls || "text-gray-700 dark:text-slate-200"}`}>{v}</div>
            <div className="text-xs text-gray-500">{l}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Cari judul iklan atau nomor WA..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Diterima</option>
          <option value="rejected">Ditolak</option>
          <option value="expired">Expired</option>
        </select>
        <button onClick={load} className="btn-outline px-4">Refresh</button>
      </div>

      {loading && <p className="text-center text-sm text-gray-400">Memuat...</p>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20">{error}</p>}

      {!loading && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                {["Iklan", "Harga Iklan", "Tawaran", "Pembeli", "Status", "Waktu"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">Tidak ada tawaran harga</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 max-w-[180px]">
                    <p className="truncate font-medium">{o.listings?.title || "-"}</p>
                    <p className="text-[11px] text-gray-400">{o.listings?.seller_name || o.listings?.seller_wa || ""}</p>
                  </td>
                  <td className="px-3 py-2 text-xs">{o.original_price ? rupiah(o.original_price) : "-"}</td>
                  <td className="px-3 py-2 font-semibold text-emerald-600">{o.offer_price ? rupiah(o.offer_price) : "-"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.buyer_wa || "-"}</td>
                  <td className="px-3 py-2"><Badge status={o.status} /></td>
                  <td className="px-3 py-2 text-xs text-gray-500">{fmt(o.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">Menampilkan {filtered.length} dari {offers.length} tawaran</p>
    </div>
  );
}
