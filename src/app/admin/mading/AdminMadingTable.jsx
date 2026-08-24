"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

function angka(value) {
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

function formatWa(wa) {
  if (!wa) return "";
  const s = String(wa).trim();
  if (s.startsWith("62")) return "0" + s.slice(2);
  return s;
}

export default function AdminMadingTable({
  posts = [],
  waMap = {},
  profileMap = {},
  reportCountMap = {},
  searchQuery = "",
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg, isError = false) {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleToggleStatus(post) {
    const nextStatus = post.status === "active" ? "suspended" : "active";
    const label = nextStatus === "suspended" ? "menyembunyikan" : "mengaktifkan kembali";
    if (!confirm(`Yakin ingin ${label} postingan ini?`)) return;

    setBusyId(post.id);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_mading_status",
          id: post.id,
          status: nextStatus,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengubah status postingan");
      showToast(`Postingan berhasil ${nextStatus === "suspended" ? "disembunyikan" : "diaktifkan"}!`);
      router.refresh();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusyId(null);
    }
  }

  async function handleDeletePost(post) {
    if (!confirm(`HAPUS PERMANEN postingan ini?\n\n"${post.title || post.content.slice(0, 50)}..."\n\nTindakan ini tidak dapat dibatalkan.`)) return;

    setBusyId(post.id);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete_mading_post",
          id: post.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus postingan");
      showToast("Postingan berhasil dihapus permanen!");
      router.refresh();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusyId(null);
    }
  }

  async function handlePublishInstagram(post) {
    if (!confirm("Terbitkan Menfess ini ke Instagram sekarang? Pastikan isi dan moderasinya sudah benar.")) return;

    setBusyId(post.id);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_mading_instagram", id: post.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menerbitkan ke Instagram");
      showToast("Menfess berhasil diterbitkan ke Instagram.");
      router.refresh();
    } catch (err) {
      showToast(err.message, true);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="relative">
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-2xl px-4 py-3 text-xs font-bold shadow-lg transition-all animate-bounce ${
            toast.isError
              ? "bg-rose-600 text-white"
              : "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm font-sans">
            <thead className="bg-slate-50/80 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-850 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3.5 font-bold">Isi Postingan &amp; Foto</th>
                <th className="px-4 py-3.5 font-bold">Identitas Pengirim</th>
                <th className="px-4 py-3.5 font-bold">Status &amp; Laporan</th>
                <th className="px-4 py-3.5 text-right font-bold">Dilihat</th>
                <th className="px-4 py-3.5 text-right font-bold">Bagikan</th>
                <th className="px-4 py-3.5 text-right font-bold">Interaksi</th>
                <th className="px-4 py-3.5 text-center font-bold">Moderasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {posts.map((post) => {
                const authorWa = post.author_ip_hash ? waMap[post.author_ip_hash] : null;
                const profile = authorWa ? profileMap[authorWa] : null;
                const cleanWa = authorWa ? formatWa(authorWa) : null;
                const reportCount = reportCountMap[post.id] || 0;
                const isBusy = busyId === post.id;

                return (
                  <tr key={post.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-850/40 transition-colors">
                    <td className="max-w-xs sm:max-w-md px-4 py-3.5">
                      {post.title && (
                        <p className="font-bold text-slate-900 dark:text-white line-clamp-1 mb-0.5">{post.title}</p>
                      )}
                      <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">{post.content}</p>
                      {post.image_url && (
                        <div className="mt-2">
                          <a
                            href={post.image_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-primary dark:text-emerald-400 hover:underline"
                          >
                            🖼️ Lihat Lampiran Foto ↗
                          </a>
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-slate-400">
                        Tipe: <span className="font-semibold text-slate-600 dark:text-slate-300">{post.type === "info" ? "Info Kampus" : "Menfess"}</span> • Kampus: <span className="font-semibold">{post.faculty || "Umum"}</span>
                      </p>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {authorWa ? (
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-slate-900 dark:text-white">
                              {profile?.name || post.sender_name || "Mahasiswa"}
                            </span>
                            {profile?.anonymous_name && (
                              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-semibold">
                                Alias: {profile.anonymous_name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Link
                              href={`/admin/penjual/${encodeURIComponent(authorWa)}`}
                              className="text-[11px] font-bold text-primary dark:text-emerald-400 hover:underline flex items-center gap-1 bg-primary/5 dark:bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20"
                            >
                              👤 Profil ({cleanWa})
                            </Link>
                            <a
                              href={`https://wa.me/${authorWa.replace(/^0/, "62")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                              title="Chat via WhatsApp"
                            >
                              💬 WA
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-slate-500">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{post.sender_name}</span>
                          <p className="text-[10px] text-slate-400 mt-0.5">Anonim (Belum terhubung)</p>
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold text-center w-fit ${
                          post.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400"
                            : post.status === "suspended"
                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400"
                            : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400"
                        }`}>
                          {post.status === "active" ? "● Aktif" : post.status === "suspended" ? "🚫 Disembunyikan" : `⚠️ ${post.status}`}
                        </span>
                        {reportCount > 0 && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-lg border border-rose-200 dark:border-rose-900/50">
                            🚩 {reportCount} Laporan
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-right tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300">{angka(post.views_count)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300">{angka(post.shares_count)}</td>
                    <td className="px-4 py-3.5 text-right tabular-nums text-xs font-semibold text-slate-700 dark:text-slate-300">{angka((post.likes_count || 0) + (post.comments_count || 0))}</td>

                    <td className="px-4 py-3.5 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleStatus(post)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all border ${
                            post.status === "active"
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100"
                              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100"
                          } disabled:opacity-50`}
                          title={post.status === "active" ? "Sembunyikan dari publik" : "Aktifkan kembali ke feed"}
                        >
                          {post.status === "active" ? "🚫 Sembunyikan" : "✅ Pulihkan"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || post.status !== "active" || post.instagram_status === "published"}
                          onClick={() => handlePublishInstagram(post)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-900/50 hover:bg-fuchsia-100 transition-all disabled:opacity-50"
                          title={post.instagram_status === "published" ? "Sudah terbit di Instagram" : "Terbitkan ke Instagram sekarang"}
                        >
                          {post.instagram_status === "published" ? "📸 Terbit IG" : post.instagram_status === "queued" ? "⏳ Sedang Proses" : "📸 Terbitkan IG"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleDeletePost(post)}
                          className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 transition-all disabled:opacity-50"
                          title="Hapus permanen"
                        >
                          🗑️ Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!posts.length && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500 text-xs">
                    {searchQuery ? `Tidak ada postingan yang cocok dengan pencarian "${searchQuery}".` : "Belum ada postingan Menfess."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
