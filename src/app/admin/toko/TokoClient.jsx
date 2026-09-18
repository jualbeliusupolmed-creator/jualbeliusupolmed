"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { downloadCSV } from "@/lib/csv";
import ConfirmModal from "@/components/ConfirmModal";
import { LABEL_STATUS, statusToko } from "@/lib/toko";

export default function TokoClient({ stores = [], storesMigrationMissing = false, storesError = null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [storeSearch, setStoreSearch] = useState("");
  
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

  const daftar = stores.filter(t =>
    !storeSearch ||
    (t.store_name || "").toLowerCase().includes(storeSearch.toLowerCase()) ||
    (t.slug || "").toLowerCase().includes(storeSearch.toLowerCase()) ||
    (t.wa || "").includes(storeSearch)
  );

  return (
    <div>
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <PageHeader title="Toko Penjual" />

      {storesMigrationMissing ? (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
          <p className="font-semibold">Kolom toko belum ada di database.</p>
          <p className="mt-1">
            Jalankan <code className="rounded bg-amber-100 px-1 dark:bg-amber-900/40">supabase/migration_storefront.sql</code>{" "}
            di SQL Editor Supabase, lalu muat ulang halaman ini. Sampai itu dilakukan,
            penjual tidak bisa membuat toko dan halaman <code>/toko/[slug]</code> tidak punya isi.
          </p>
          {storesError && <p className="mt-2 font-mono text-xs opacity-70">{storesError}</p>}
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <input
              className="g-input min-w-[200px] flex-1"
              placeholder="Cari nama toko / slug / nomor WA…"
              value={storeSearch}
              onChange={(e) => setStoreSearch(e.target.value)}
            />
            <button
              onClick={() => downloadCSV("toko.csv", daftar.map(t => ({
                toko: t.store_name, slug: t.slug, wa: t.wa,
                wilayah: t.store_area, buka: t.store_open === false ? "Tutup" : "Buka",
                diperbarui: t.store_updated_at,
              })))}
              className="g-btn g-btn-outlined text-xs"
            >
              Export CSV
            </button>
          </div>
          <p className="mb-2 text-xs text-gray-400">
            {daftar.length} dari {stores.length} toko · alamatnya publik dan bisa dibuka siapa saja
          </p>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
                <tr>
                  <th className="p-3">Toko</th>
                  <th className="p-3">Alamat</th>
                  <th className="p-3">Penjual</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Diperbarui</th>
                  <th className="p-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="dark:text-slate-300">
                {daftar.length === 0 && (
                  <tr><td colSpan="6" className="p-4 text-center text-gray-400">
                    {stores.length === 0 ? "Belum ada penjual yang membuat toko." : "Tidak ada toko yang cocok."}
                  </td></tr>
                )}
                {daftar.map((t) => (
                  <tr key={t.wa} className="border-t border-black/[0.04] dark:border-white/[0.06]">
                    <td className="p-3 font-medium dark:text-white">
                      <div>{t.store_name || <span className="text-gray-400">Tanpa nama toko</span>}</div>
                      {t.tagline && <div className="mt-0.5 text-xs text-gray-400">{t.tagline}</div>}
                      {t.store_announcement && (
                        <div className="mt-1 text-xs text-amber-600 dark:text-amber-400"> {t.store_announcement}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <a href={`/toko/${t.slug}`} target="_blank" rel="noreferrer" className="font-mono text-xs text-[var(--g-primary)] hover:underline">
                        /toko/{t.slug} ↗
                      </a>
                      {t.store_area && <div className="mt-0.5 text-xs text-gray-400">{t.store_area}</div>}
                    </td>
                    <td className="p-3 font-mono text-xs">
                      <a href={`${basis}/penjual/${String(t.wa).replace(/\D/g, "")}`} className="hover:text-[var(--g-primary)]">{t.name || t.wa}</a>
                      <div className="text-gray-400">{t.wa}</div>
                    </td>
                    <td className="p-3">
                      {(() => {
                        const st = statusToko(t);
                        const nada = st === "aktif" ? "is-ok" : st === "menunggu" ? "is-warn" : st === "ditolak" ? "is-bad" : "";
                        return <span className={`g-badge ${nada}`}>{LABEL_STATUS[st] || st}</span>;
                      })()}
                      <div className="mt-1 text-xs text-gray-400">
                        {t.store_open === false ? "⏸ Sedang tutup" : "▶ Buka"}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-gray-400">
                      {t.store_updated_at ? new Date(t.store_updated_at).toLocaleDateString("id-ID") : "–"}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {statusToko(t) !== "aktif" && (
                          <a
                            href={`/approve-toko?wa=${encodeURIComponent(t.wa)}`}
                            className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700 hover:opacity-80 transition"
                          >
                            Tinjau & aktifkan
                          </a>
                        )}
                        <button
                          onClick={() => action({ action: "set_store_open", wa: t.wa, open: t.store_open === false }, t.store_open === false ? "Toko dibuka" : "Toko ditutup")}
                          className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:opacity-80 transition"
                        >
                          {t.store_open === false ? "Buka Toko" : "Tutup Toko"}
                        </button>
                        <button
                          onClick={() => confirmThen(
                            { title: "Cabut alamat toko", message: `Halaman /toko/${t.slug} akan berhenti bisa dibuka. Isi toko (nama, logo, iklan) tidak dihapus, dan penjual bisa memilih alamat baru.`, danger: true },
                            () => action({ action: "clear_store_slug", wa: t.wa }, "Alamat toko dicabut")
                          )}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-slate-700 dark:text-slate-400 hover:opacity-80 transition"
                        >
                          Cabut Alamat
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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
