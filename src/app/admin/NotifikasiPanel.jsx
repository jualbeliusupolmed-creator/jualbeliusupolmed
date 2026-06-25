"use client";
import { useEffect, useState } from "react";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function NotifikasiPanel({ action }) {
  const [catSubs, setCatSubs] = useState([]);
  const [pushSubs, setPushSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subtab, setSubtab] = useState("kategori");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/subscriptions");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat");
      setCatSubs(json.catSubs || []);
      setPushSubs(json.pushSubs || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id, type) {
    if (!confirm(`Hapus subscription ini?`)) return;
    await action({ action: "delete_subscription", id, type }, "Subscription dihapus");
    load();
  }

  const filteredCat = catSubs.filter(s => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (s.wa || s.user_wa || "").includes(lower) || (s.category || "").toLowerCase().includes(lower);
  });

  const filteredPush = pushSubs.filter(s => {
    if (!q) return true;
    return (s.user_agent || "").toLowerCase().includes(q.toLowerCase());
  });

  const catGroups = {};
  for (const s of catSubs) {
    const cat = s.category || "Lainnya";
    catGroups[cat] = (catGroups[cat] || 0) + 1;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 text-center">
          <div className="text-2xl font-bold text-gray-700 dark:text-slate-200">{catSubs.length}</div>
          <div className="text-xs text-gray-500">Sub. Kategori</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 text-center">
          <div className="text-2xl font-bold text-blue-600">{pushSubs.length}</div>
          <div className="text-xs text-gray-500">Push Subscriber</div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900 text-center col-span-2">
          <div className="text-sm font-medium text-gray-700 dark:text-slate-200 truncate">
            {Object.entries(catGroups).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([cat,n]) => `${cat} (${n})`).join(" · ") || "-"}
          </div>
          <div className="text-xs text-gray-500">Top Kategori Berlangganan</div>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex rounded-lg border border-gray-200 dark:border-slate-700 overflow-hidden">
          {[["kategori", "Kategori WA"], ["push", "Push Browser"]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setSubtab(k)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${subtab === k ? "bg-gray-900 text-white dark:bg-white dark:text-gray-900" : "bg-white text-gray-600 hover:bg-gray-50 dark:bg-slate-900 dark:text-slate-400"}`}
            >
              {l}
            </button>
          ))}
        </div>
        <input className="input flex-1" placeholder={subtab === "kategori" ? "Cari nomor WA atau kategori..." : "Cari user agent..."} value={q} onChange={e => setQ(e.target.value)} />
        <button onClick={load} className="btn-outline px-4">Refresh</button>
      </div>

      {loading && <p className="text-center text-sm text-gray-400">Memuat...</p>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20">{error}</p>}

      {!loading && subtab === "kategori" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                {["Nomor WA", "Kategori", "Bergabung", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredCat.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">Tidak ada subscriber kategori</td></tr>
              ) : filteredCat.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-mono text-xs">{s.wa || s.user_wa || "-"}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {s.category || "-"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-500">{fmt(s.created_at)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleDelete(s.id, "category")} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-gray-400">{filteredCat.length} dari {catSubs.length} subscriber</div>
        </div>
      )}

      {!loading && subtab === "push" && (
        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-slate-800">
              <tr>
                {["ID", "User Agent", "Bergabung", "Aksi"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredPush.length === 0 ? (
                <tr><td colSpan={4} className="py-8 text-center text-gray-400">Tidak ada push subscriber</td></tr>
              ) : filteredPush.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-mono text-xs text-gray-400">{s.id?.slice(0, 8)}…</td>
                  <td className="px-3 py-2 text-xs max-w-[300px] truncate">{s.user_agent || "-"}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">{fmt(s.created_at)}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => handleDelete(s.id, "push")} className="rounded-md bg-rose-100 px-2 py-1 text-xs text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-3 py-2 text-xs text-gray-400">{filteredPush.length} dari {pushSubs.length} subscriber</div>
        </div>
      )}
    </div>
  );
}
