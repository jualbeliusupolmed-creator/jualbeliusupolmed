"use client";
import { useEffect, useState } from "react";

function fmt(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function GroupPostsPanel({ action }) {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/group-posts");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal memuat");
      setPosts(json.posts || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = posts.filter(p => {
    if (!q) return true;
    const lower = q.toLowerCase();
    return (p.message || p.content || p.text || "").toLowerCase().includes(lower) ||
      (p.group_jid || p.jid || "").toLowerCase().includes(lower);
  });

  async function handleDelete(id) {
    if (!confirm("Hapus post ini?")) return;
    await action({ action: "delete_group_post", id }, "Post dihapus");
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Total <strong>{posts.length}</strong> post grup tersimpan</p>
        <button onClick={load} className="btn-outline px-4 text-sm">Refresh</button>
      </div>

      <input className="input w-full" placeholder="Cari isi pesan atau JID grup..." value={q} onChange={e => setQ(e.target.value)} />

      {loading && <p className="text-center text-sm text-gray-400">Memuat...</p>}
      {error && <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/20">{error}</p>}

      {!loading && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-gray-400">Tidak ada post grup</p>
          ) : filtered.map(p => (
            <div key={p.id} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono text-gray-400 truncate">{p.group_jid || p.jid || "Grup tidak diketahui"}</span>
                    <span className="text-[11px] text-gray-400">{fmt(p.created_at)}</span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap break-words line-clamp-4">
                    {p.message || p.content || p.text || JSON.stringify(p)}
                  </p>
                  {p.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image_url} alt="post" className="mt-2 h-24 w-24 rounded-lg object-cover" />
                  )}
                </div>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="shrink-0 rounded-md bg-rose-100 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">Menampilkan {filtered.length} dari {posts.length} post</p>
    </div>
  );
}
