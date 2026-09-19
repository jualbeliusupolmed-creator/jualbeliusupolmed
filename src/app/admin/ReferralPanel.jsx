"use client";
import { useEffect, useState } from "react";
import { StatGrid, Stat, TableWrap, Badge, EmptyState, Notice, Toolbar } from "@/components/admin/ui";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ status }) {
  const toneMap = { pending: "warn", rewarded: "ok", expired: "netral" };
  return <Badge tone={toneMap[status] || "netral"}>{status || "-"}</Badge>;
}

export default function ReferralPanel({ action }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/referrals");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat");
      setReferrals(json.referrals || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = referrals.filter(r => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (r.referrer_wa || "").includes(lower) || (r.referred_wa || "").includes(lower) || (r.status || "").includes(lower);
  });

  const stats = {
    total: referrals.length,
    pending: referrals.filter(r => r.status === "pending").length,
    rewarded: referrals.filter(r => r.status === "rewarded").length,
  };

  return (
    <div className="space-y-4">
      <StatGrid>
        <Stat label="Total" value={stats.total} />
        <Stat label="Pending" value={stats.pending} tone={stats.pending > 0 ? "warn" : ""} />
        <Stat label="Tereward" value={stats.rewarded} tone={stats.rewarded > 0 ? "ok" : ""} />
      </StatGrid>

      <Toolbar>
        <input className="input flex-1" placeholder="Cari nomor WA atau status..." value={q} onChange={e => setQ(e.target.value)} />
        <button onClick={load} className="g-btn">Refresh</button>
      </Toolbar>

      {loading && <p className="text-center text-sm text-gray-400">Memuat...</p>}
      {error && <Notice tone="bad">{error}</Notice>}

      {!loading && (
        filtered.length === 0
          ? <EmptyState title="Tidak ada data referral" />
          : (
            <TableWrap>
              <thead>
                <tr>
                  {["Referrer (Pengundang)", "Referred (Diundang)", "Status", "Dibuat", "Aksi"].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td className="font-mono text-xs">{r.referrer_wa || "-"}</td>
                    <td className="font-mono text-xs">{r.referred_wa || "-"}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td>{fmt(r.created_at)}</td>
                    <td>
                      <div className="flex gap-1.5">
                        {r.status === "pending" && (
                          <button
                            onClick={() => action({ action: "resolve_referral", id: r.id }, "Referral ditandai tereward").then(load)}
                            className="g-btn is-ok text-xs"
                          >
                            Tandai Reward
                          </button>
                        )}
                        {r.referrer_wa && (
                          <button
                            onClick={() => action({ action: "award_bumps", wa: r.referrer_wa, count: 1 }, "1 free bump diberikan ke referrer").then(load)}
                            className="g-btn text-xs"
                          >
                            +1 Bump
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )
      )}

      <p className="text-caption text-gray-400">Menampilkan {filtered.length} dari {referrals.length} referral</p>
    </div>
  );
}
