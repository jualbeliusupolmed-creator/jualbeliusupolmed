"use client";
import { useCallback, useEffect, useState } from "react";
import { useBasisApi } from "@/components/admin/basis";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function Badge({ status }) {
  const cls = {
    pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
    deal: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    gagal: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    no_reply: "bg-gray-100 text-gray-500 dark:bg-slate-800",
  }[status] || "bg-gray-100 text-gray-500";
  return <span className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${cls}`}>{status || "-"}</span>;
}

export default function BuyerContactsPanel() {
  // Satu komponen, dua alamat: di /admin ia memanggil /api/admin/buyer-contacts
  // (data sungguhan, bergerbang), di /admin-demo ia memanggil
  // /api/admin-demo/buyer-contacts (data karangan). Tanpa ini panelnya memang
  // tampil di salinan demo, tapi isinya cuma "Unauthorized".
  const basisApi = useBasisApi();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${basisApi}/buyer-contacts?page=${page}&limit=50`;
      if (statusFilter !== "all") url += `&deal_status=${statusFilter}`;
      if (q) url += `&q=${encodeURIComponent(q)}`;

      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat");
      
      setContacts(json.contacts || []);
      setTotal(json.total || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [basisApi, page, q, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      load();
    }, 500);
    return () => clearTimeout(t);
  }, [q, load]);

  const waLink = (wa) => wa ? `https://wa.me/${wa.startsWith("0") ? "62" + wa.slice(1) : wa}` : "#";

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Cari judul iklan, nama, atau WA..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="deal">Deal</option>
          <option value="gagal">Gagal</option>
          <option value="no_reply">No Reply</option>
        </select>
        <button onClick={load} className="btn-outline px-4">Refresh</button>
      </div>

      {loading && <p className="text-center text-sm text-gray-400">Memuat data...</p>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Waktu</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Iklan</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Penjual</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Pembeli</th>
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">Deal Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {contacts.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">Tidak ada log kontak pembeli</td></tr>
              ) : contacts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 text-[11px] text-gray-500">{fmt(c.created_at)}</td>
                  <td className="px-3 py-2 max-w-[200px]">
                    <p className="truncate font-medium">{c.listing_title || "-"}</p>
                    <p className="text-[10px] text-gray-400 font-mono">{c.listing_code || "-"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{c.seller_name || "-"}</p>
                    <a href={waLink(c.seller_wa)} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline">{c.seller_wa || "-"}</a>
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{c.buyer_name || "Seseorang"}</p>
                    {c.buyer_wa ? (
                      <a href={waLink(c.buyer_wa)} target="_blank" rel="noreferrer" className="text-[11px] text-blue-500 hover:underline">{c.buyer_wa}</a>
                    ) : (
                      <span className="text-[11px] text-gray-400 italic">Tanpa WA</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Badge status={c.deal_status} />
                    {c.followup_sent_at && <p className="text-[10px] text-gray-400 mt-1">Followup: {fmt(c.followup_sent_at)}</p>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !error && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-400">Total {total} kontak</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-outline px-3 py-1 text-xs">Prev</button>
            <button disabled={contacts.length < 50} onClick={() => setPage(p => p + 1)} className="btn-outline px-3 py-1 text-xs">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
