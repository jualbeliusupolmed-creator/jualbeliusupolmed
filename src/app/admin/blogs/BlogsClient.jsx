"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { PageHeader } from "@/components/admin/ui";
import ConfirmModal from "@/components/ConfirmModal";

export default function BlogsClient({ blogs = [], penulisBadge = [] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [tolakArtikel, setTolakArtikel] = useState(null);
  const [catatanTolak, setCatatanTolak] = useState("");
  
  const [confirmState, setConfirmState] = useState({ show: false, title: "", message: "", action: null, danger: false });

  function confirmThen({ title, message, danger }, act) {
    setConfirmState({ show: true, title, message, danger, action: act });
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

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
      if (data.warning) setToast({ type: "err", msg: data.warning });
      else setToast({ type: "ok", msg: okMsg || "Berhasil" });
      router.refresh();
      return true;
    } catch (e) {
      setToast({ type: "err", msg: e.message });
      return false;
    } finally {
      setBusy(false);
    }
  }

  const basis = typeof window !== "undefined" ? window.location.origin : "";
  const menunggu = blogs.filter((b) => b.status === "menunggu");
  const sisanya = blogs.filter((b) => b.status !== "menunggu");
  const badgeWa = new Set((penulisBadge || []).map((p) => p.wa));
  const NADA = {
    published: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    menunggu: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    ditolak: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    draft: "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300",
  };
  const LABEL = { published: "Terbit", menunggu: "Menunggu review", ditolak: "Ditolak", draft: "Draf" };

  const Penulis = ({ b }) =>
    b.author_wa ? (
      <span className="inline-flex items-center gap-1">
        <span>{b.author || "Penjual"}</span>
        {badgeWa.has(b.author_wa) && (
          <span title="Penulis berbadge — tulisannya terbit tanpa antre" className="text-[var(--g-primary)]"><Icon.PencilSquare className="h-3.5 w-3.5" /></span>
        )}
      </span>
    ) : (
      <span className="text-gray-400">Admin</span>
    );

  return (
    <div className="max-w-4xl">
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <PageHeader title="Artikel Blog" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-gray-400">
          {blogs.length} artikel
          {menunggu.length > 0 && <span className="ml-2 font-bold text-amber-600">· {menunggu.length} menunggu review</span>}
          {penulisBadge.length > 0 && <span className="ml-2">· {penulisBadge.length} penulis berbadge</span>}
        </p>
        <button
          onClick={() => router.push(`${basis}/blogs/new`)}
          className="g-btn g-btn-primary"
        >
          Tulis Artikel Baru
        </button>
      </div>

      {menunggu.length > 0 && (
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400">Menunggu review</h3>
          {menunggu.map((b) => (
            <div key={b.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/60 dark:bg-amber-900/10">
              <p className="font-semibold dark:text-white">{b.title}</p>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
                oleh <Penulis b={b} />
                {b.author_wa ? ` · ${b.author_wa}` : ""}
                {b.submitted_at ? ` · dikirim ${new Date(b.submitted_at).toLocaleString("id-ID")}` : ""}
              </p>
              {b.excerpt && <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">{b.excerpt}</p>}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={`${basis}/blogs/${b.id}`} className="g-btn g-btn-outlined text-xs">Baca / sunting</a>
                <button
                  onClick={() => action({ action: "blog_setujui", id: b.id }, "Artikel diterbitkan")}
                  disabled={busy}
                  className="g-btn g-btn-primary bg-green-600 hover:bg-green-700 border-green-600 text-xs"
                >
                  Setujui &amp; terbitkan
                </button>
                <button
                  onClick={() => { setTolakArtikel(tolakArtikel === b.id ? null : b.id); setCatatanTolak(""); }}
                  disabled={busy}
                  className="g-btn g-btn-outlined border-rose-300 text-rose-600 text-xs dark:border-rose-800"
                >
                  Tolak…
                </button>
                {b.author_wa && !badgeWa.has(b.author_wa) && (
                  <button
                    onClick={() => confirmThen(
                      { title: "Beri badge penulis", message: `Setelah ini, semua artikel dari ${b.author || b.author_wa} langsung terbit tanpa melewati antrean ini. Lanjutkan?` },
                      () => action({ action: "set_blog_badge", wa: b.author_wa, value: true }, "Badge diberikan")
                    )}
                    className="text-xs text-[var(--g-primary)] hover:underline ml-2"
                  >
                    Beri badge penulis
                  </button>
                )}
              </div>

              {tolakArtikel === b.id && (
                <div className="mt-3 rounded-lg border border-rose-200 bg-white p-3 dark:border-rose-900 dark:bg-slate-900">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-slate-300">
                    Alasan penolakan — dikirim ke WhatsApp penulisnya
                  </label>
                  <textarea
                    value={catatanTolak}
                    onChange={(e) => setCatatanTolak(e.target.value)}
                    rows={2}
                    maxLength={300}
                    placeholder="Mis. judulnya tidak sesuai isi, atau ada bagian yang menyalin tulisan orang lain."
                    className="g-input mt-1 w-full text-sm"
                  />
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={async () => {
                        const ok = await action({ action: "blog_tolak", id: b.id, catatan: catatanTolak }, "Artikel ditolak");
                        if (ok) { setTolakArtikel(null); setCatatanTolak(""); }
                      }}
                      disabled={busy}
                      className="g-btn g-btn-primary bg-rose-600 hover:bg-rose-700 border-rose-600 text-xs"
                    >
                      Kirim penolakan
                    </button>
                    <button onClick={() => setTolakArtikel(null)} className="g-btn g-btn-outlined text-xs">Batal</button>
                  </div>
                  <p className="mt-2 text-[11px] text-gray-400">
                    Tulisannya tidak dihapus — ia kembali jadi draf milik penulisnya supaya bisa diperbaiki.
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
            <tr>
              <th className="p-3">Judul</th>
              <th className="p-3">Penulis</th>
              <th className="p-3">Status</th>
              <th className="p-3">Tanggal</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="dark:text-slate-300">
            {sisanya.length === 0 && (
              <tr><td colSpan="5" className="p-4 text-center text-gray-500">Belum ada artikel.</td></tr>
            )}
            {sisanya.map((b) => (
              <tr key={b.id} className="border-t border-black/[0.04] dark:border-white/[0.06]">
                <td className="p-3">
                  <p className="font-medium dark:text-white">{b.title}</p>
                  <p className="text-xs text-gray-400">/{b.slug}</p>
                  {b.status === "ditolak" && b.reject_note && (
                    <p className="mt-1 text-xs text-rose-500">Alasan: {b.reject_note}</p>
                  )}
                </td>
                <td className="p-3 text-xs"><Penulis b={b} /></td>
                <td className="p-3">
                  <span className={`g-badge ${b.status === "published" ? "is-ok" : b.status === "menunggu" ? "is-warn" : b.status === "ditolak" ? "is-bad" : ""}`}>{LABEL[b.status] || b.status}</span>
                </td>
                <td className="p-3 text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString("id-ID")}</td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <a href={`${basis}/blogs/${b.id}`} className="text-[var(--g-primary)] hover:underline">Edit</a>
                    {b.status === "published" && <a href={`/blog/${b.slug}`} target="_blank" rel="noreferrer" className="text-gray-500 hover:text-gray-900 dark:hover:text-white">Lihat</a>}
                    {b.status === "published" && b.author_wa && (
                      <button
                        onClick={() => confirmThen(
                          { title: "Turunkan artikel", message: `Kembalikan "${b.title}" ke antrean review? Ia akan hilang dari /blog sampai disetujui lagi.`, danger: true },
                          () => action({ action: "blog_tolak", id: b.id, catatan: "Ditinjau ulang oleh admin." }, "Artikel diturunkan")
                        )}
                        className="text-amber-600 hover:underline"
                      >
                        Turunkan
                      </button>
                    )}
                    {b.status === "ditolak" && (
                      <button
                        onClick={() => action({ action: "blog_setujui", id: b.id }, "Artikel diterbitkan")}
                        className="text-green-600 hover:underline"
                      >
                        Terbitkan
                      </button>
                    )}
                    <button onClick={() => confirmThen({ title: "Hapus Artikel", message: `Hapus "${b.title}"?`, danger: true }, () => action({ action: "delete_blog", id: b.id }, "Artikel dihapus"))} className="text-rose-600 hover:underline">Hapus</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {penulisBadge.length > 0 && (
        <div className="mt-6 rounded-xl border border-[var(--g-primary)]/20 bg-[var(--g-primary)]/5 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-[var(--g-primary)]"><Icon.PencilSquare className="h-4 w-4" /> Penulis berbadge</h3>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">
            Artikel dari nomor-nomor ini terbit tanpa melewati antrean review.
          </p>
          <ul className="mt-3 space-y-2">
            {penulisBadge.map((p) => (
              <li key={p.wa} className="flex items-center justify-between gap-3 text-sm">
                <span className="dark:text-slate-200">
                  {p.name || "(tanpa nama)"} <span className="text-xs text-gray-400">{p.wa}</span>
                  {p.blog_badge_at && (
                    <span className="ml-2 text-[11px] text-gray-400">sejak {new Date(p.blog_badge_at).toLocaleDateString("id-ID")}</span>
                  )}
                </span>
                <button
                  onClick={() => confirmThen(
                    { title: "Cabut badge penulis", message: `Artikel dari ${p.name || p.wa} akan kembali melewati antrean review. Artikel yang sudah tayang tidak diturunkan. Lanjutkan?`, danger: true },
                    () => action({ action: "set_blog_badge", wa: p.wa, value: false }, "Badge dicabut")
                  )}
                  className="text-xs text-rose-600 hover:underline"
                >
                  Cabut
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {confirmState.show && (
        <ConfirmModal
          title={confirmState.title}
          message={confirmState.message}
          danger={confirmState.danger}
          onConfirm={() => { confirmState.action?.(); setConfirmState({ ...confirmState, show: false }); }}
          onCancel={() => setConfirmState({ ...confirmState, show: false })}
        />
      )}
    </div>
  );
}
