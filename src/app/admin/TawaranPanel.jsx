"use client";
import { useEffect, useState } from "react";
import { rupiah } from "@/lib/fees";
import { StatGrid, Stat, TableWrap, Badge, EmptyState, Notice, Toolbar } from "@/components/admin/ui";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const toneMap = { pending: "warn", accepted: "ok", rejected: "bad", expired: "netral" };
  return <Badge tone={toneMap[status] || "netral"}>{status || "-"}</Badge>;
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
      <StatGrid>
        <Stat label="Total" value={stats.total} />
        <Stat label="Pending" value={stats.pending} tone={stats.pending > 0 ? "warn" : ""} />
        <Stat label="Diterima" value={stats.accepted} tone={stats.accepted > 0 ? "ok" : ""} />
        <Stat label="Ditolak" value={stats.rejected} tone={stats.rejected > 0 ? "bad" : ""} />
      </StatGrid>

      <Toolbar>
        <input className="input flex-1" placeholder="Cari judul iklan atau nomor WA..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="input w-36" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="accepted">Diterima</option>
          <option value="rejected">Ditolak</option>
          <option value="expired">Expired</option>
        </select>
        <button onClick={load} className="g-btn">Refresh</button>
      </Toolbar>

      {loading && <p className="text-center text-sm text-gray-400">Memuat...</p>}
      {error && <Notice tone="bad">{error}</Notice>}

      {!loading && (
        filtered.length === 0
          ? <EmptyState title="Tidak ada tawaran harga" />
          : (
            <TableWrap>
              <thead>
                <tr>
                  {["Iklan", "Harga Iklan", "Tawaran", "Pembeli", "Status", "Waktu"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td className="max-w-[180px]">
                      <p className="truncate font-medium">{o.listings?.title || "-"}</p>
                      <p className="text-meta text-gray-400">{o.listings?.seller_name || o.listings?.seller_wa || ""}</p>
                    </td>
                    <td>{o.original_price ? rupiah(o.original_price) : "-"}</td>
                    <td className="font-semibold text-emerald-600">{o.offer_price ? rupiah(o.offer_price) : "-"}</td>
                    <td className="font-mono text-xs">{o.buyer_wa || "-"}</td>
                    <td><StatusBadge status={o.status} /></td>
                    <td>{fmt(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )
      )}

      <p className="text-caption text-gray-400">Menampilkan {filtered.length} dari {offers.length} tawaran</p>
    </div>
  );
}
