"use client";
import { useCallback, useEffect, useState } from "react";
import { useBasisApi } from "@/components/admin/basis";
import { TableWrap, Badge, Notice, Toolbar, EmptyState } from "@/components/admin/ui";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const toneMap = { pending: "warn", deal: "ok", gagal: "bad", no_reply: "netral" };
  return <Badge tone={toneMap[status] || "netral"}>{status || "-"}</Badge>;
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
      <Toolbar>
        <input className="input flex-1" placeholder="Cari judul iklan, nama, atau WA..." value={q} onChange={e => setQ(e.target.value)} />
        <select className="input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="all">Semua Status</option>
          <option value="pending">Pending</option>
          <option value="deal">Deal</option>
          <option value="gagal">Gagal</option>
          <option value="no_reply">No Reply</option>
        </select>
        <button onClick={load} className="g-btn">Refresh</button>
      </Toolbar>

      {loading && <p className="text-center text-sm text-gray-400">Memuat data...</p>}
      {error && <Notice tone="bad">{error}</Notice>}

      {!loading && !error && (
        contacts.length === 0
          ? <EmptyState title="Tidak ada log kontak pembeli" />
          : (
            <TableWrap>
              <thead>
                <tr>
                  {["Waktu", "Iklan", "Penjual", "Pembeli", "Deal Status"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id}>
                    <td className="text-meta">{fmt(c.created_at)}</td>
                    <td className="max-w-[200px]">
                      <p className="truncate font-medium">{c.listing_title || "-"}</p>
                      <p className="text-badge text-gray-400 font-mono">{c.listing_code || "-"}</p>
                    </td>
                    <td>
                      <p className="font-medium">{c.seller_name || "-"}</p>
                      <a href={waLink(c.seller_wa)} target="_blank" rel="noreferrer" className="text-meta text-blue-500 hover:underline">{c.seller_wa || "-"}</a>
                    </td>
                    <td>
                      <p className="font-medium">{c.buyer_name || "Seseorang"}</p>
                      {c.buyer_wa ? (
                        <a href={waLink(c.buyer_wa)} target="_blank" rel="noreferrer" className="text-meta text-blue-500 hover:underline">{c.buyer_wa}</a>
                      ) : (
                        <span className="text-meta text-gray-400 italic">Tanpa WA</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={c.deal_status} />
                      {c.followup_sent_at && <p className="text-badge text-gray-400 mt-1">Followup: {fmt(c.followup_sent_at)}</p>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )
      )}

      {!loading && !error && (
        <div className="flex items-center justify-between">
          <p className="text-caption text-gray-400">Total {total} kontak</p>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="g-btn text-xs">Prev</button>
            <button disabled={contacts.length < 50} onClick={() => setPage(p => p + 1)} className="g-btn text-xs">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
