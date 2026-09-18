"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { PageHeader } from "@/components/admin/ui";
import ConfirmModal from "@/components/ConfirmModal";

export default function ProfilRequestClient({ profileRequests = [] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [rejectNote, setRejectNote] = useState({});
  
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

  const pending = profileRequests.filter(r => r.status === "pending");
  const done = profileRequests.filter(r => r.status !== "pending");

  const formatDate = (d) => d ? new Date(d).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" }) : "-";
  const fieldLabel = (f) => f === "name" ? "Nama" : "Bio";

  return (
    <div>
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <PageHeader title="Permintaan Ubah Profil" />

      <p className="mb-4 text-sm text-gray-500">
        Permintaan penjual untuk mengubah nama atau bio profil. Setiap perubahan perlu disetujui admin sebelum berlaku.
      </p>

      {pending.length === 0 && (
        <div className="text-sm text-gray-400 py-8 text-center rounded-xl border border-dashed border-gray-200 dark:border-slate-700">
          Tidak ada permintaan pending saat ini.
        </div>
      )}

      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-3 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-xs font-black">{pending.length}</span>
            Menunggu Persetujuan
          </h3>
          <div className="space-y-3">
            {pending.map((r) => (
              <div key={r.id} className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-900/10 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Ubah {fieldLabel(r.field)}</span>
                    <div className="mt-1 font-mono text-xs text-gray-500 dark:text-slate-400">{r.seller_wa}</div>
                    <div className="mt-2 text-sm">
                      <span className="text-gray-400">Sebelum: </span>
                      <span className="line-through text-gray-400">{r.current_value || "(kosong)"}</span>
                    </div>
                    <div className="text-sm font-semibold dark:text-white">
                      <span className="text-gray-400 font-normal">Setelah: </span>
                      {r.requested_value}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-400">
                      Via {r.requested_via} · {formatDate(r.requested_at)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    <button
                      onClick={() => confirmThen({ title: "Setujui Perubahan", message: `Setujui perubahan ${fieldLabel(r.field).toLowerCase()} menjadi "${r.requested_value}"?` }, () => action({ action: "approve_profile_change", id: r.id }, "Disetujui & profil diperbarui"))}
                      className="rounded-lg bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:bg-emerald-200 transition-colors"
                    >
                       Setujui
                    </button>
                    <div className="flex gap-1">
                      <input
                        className="g-input text-xs py-1 px-2 flex-1 min-w-0"
                        placeholder="Alasan tolak (opsional)"
                        value={rejectNote[r.id] || ""}
                        onChange={(e) => setRejectNote(prev => ({ ...prev, [r.id]: e.target.value }))}
                      />
                      <button
                        onClick={() => confirmThen({ title: "Tolak Permintaan", message: `Tolak perubahan ${fieldLabel(r.field).toLowerCase()} ini?`, danger: true }, () => action({ action: "reject_profile_change", id: r.id, note: rejectNote[r.id] || "" }, "Ditolak"))}
                        className="rounded-lg bg-rose-100 px-2 py-1.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 hover:bg-rose-200 transition-colors shrink-0 flex items-center justify-center"
                      >
                        <Icon.X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {done.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 mb-3">Riwayat ({done.length})</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
                <tr>
                  <th className="p-3">Penjual</th>
                  <th className="p-3">Field</th>
                  <th className="p-3">Nilai Baru</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Diproses</th>
                  <th className="p-3">Catatan</th>
                </tr>
              </thead>
              <tbody className="dark:text-slate-300">
                {done.map((r) => (
                  <tr key={r.id} className="border-t border-black/[0.04] dark:border-white/[0.06]">
                    <td className="p-3 font-mono text-xs">{r.seller_wa}</td>
                    <td className="p-3">{fieldLabel(r.field)}</td>
                    <td className="p-3 max-w-[180px] truncate">{r.requested_value}</td>
                    <td className="p-3">
                      {r.status === "approved"
                        ? <span className="text-xs font-semibold text-emerald-600"> Disetujui</span>
                        : <span className="text-xs font-semibold text-rose-600"> Ditolak</span>}
                    </td>
                    <td className="p-3 text-xs text-gray-400">{formatDate(r.reviewed_at)}</td>
                    <td className="p-3 text-xs text-gray-400">{r.review_note || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
