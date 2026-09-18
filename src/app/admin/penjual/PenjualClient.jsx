"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { downloadCSV } from "@/lib/csv";
import ConfirmModal from "@/components/ConfirmModal";

export default function PenjualClient({ initialSellers = [], initialBlacklist = [], settings = {} }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [sellerSearch, setSellerSearch] = useState("");
  const [newBl, setNewBl] = useState("");
  
  // States to mimic local mutation without waiting for full refresh immediately if possible, 
  // though we rely on router.refresh() for now
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

  const filteredSellers = initialSellers.filter(s =>
    !sellerSearch ||
    (s.seller_name || "").toLowerCase().includes(sellerSearch.toLowerCase()) ||
    (s.seller_wa || "").includes(sellerSearch)
  );

  return (
    <div>
      {toast && <div className={`g-toast${toast.type === "err" ? " is-bad" : ""}`}>{toast.msg}</div>}
      <PageHeader title="Penjual" />
      
      <div className="mb-3 flex flex-wrap gap-2">
        <input
          className="g-input min-w-[200px] flex-1"
          placeholder="Cari nama / nomor WA…"
          value={sellerSearch}
          onChange={(e) => setSellerSearch(e.target.value)}
        />
        <button
          onClick={() => downloadCSV("penjual.csv", filteredSellers.map(s => ({
            nama: s.seller_name, wa: s.seller_wa,
            total_iklan: s.total_iklan, aktif: s.active_iklan, terjual: s.sold_iklan,
            trusted: s.trusted_seller ? "Ya" : "Tidak",
          })))}
          className="g-btn g-btn-outlined text-xs"
        >
          Export CSV
        </button>
      </div>
      <p className="mb-2 text-xs text-gray-400">{filteredSellers.length} dari {initialSellers.length} penjual</p>
      
      <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-400 dark:bg-slate-900">
            <tr>
              <th className="p-3">Nama Penjual</th>
              <th className="p-3">WhatsApp</th>
              <th className="p-3">Iklan</th>
              <th className="p-3">Aktif</th>
              <th className="p-3">Terjual</th>
              <th className="p-3">Status Bot</th>
              <th className="p-3">Aksi</th>
            </tr>
          </thead>
          <tbody className="dark:text-slate-300">
            {filteredSellers.length === 0 && (
              <tr><td colSpan="7" className="p-4 text-center text-gray-400">Tidak ada penjual ditemukan.</td></tr>
            )}
            {filteredSellers.map((s) => {
              const isPaused = settings?.bot?.paused_users?.includes(s.seller_wa);
              return (
                <tr key={s.seller_wa} className="border-t border-black/[0.04] dark:border-white/[0.06]">
                  <td className="p-3 font-medium dark:text-white">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span>{s.seller_name}</span>
                      {s.trusted_seller && <span className="text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 rounded px-1"> Terpercaya</span>}
                      {s.subscription_tier === "pro" && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-900/30 rounded px-1">⭐ PRO</span>}
                    </div>
                    <div className="mt-0.5 flex gap-2 text-xs">
                      <a href={`/penjual/${s.seller_wa.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-gray-400 hover:underline">Profil ↗</a>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-xs">
                    <a href={`https://wa.me/${s.seller_wa.replace(/\D/g, "")}`} className="hover:text-[var(--g-primary)]" target="_blank" rel="noreferrer">{s.seller_wa}</a>
                  </td>
                  <td className="p-3">{s.total_iklan}</td>
                  <td className="p-3 text-green-600">{s.active_iklan}</td>
                  <td className="p-3 text-gray-500">{s.sold_iklan}</td>
                  <td className="p-3">
                    {isPaused
                      ? <span className="text-xs text-amber-600 font-medium">⏸ Paused</span>
                      : <span className="text-xs text-green-600">▶ Aktif</span>}
                  </td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <button
                        onClick={() => action({ action: "update_seller_profile", wa: s.seller_wa, trusted_seller: !s.trusted_seller }, "Badge diperbarui")}
                        className="rounded-md bg-blue-100 px-2 py-1 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 hover:opacity-80 transition"
                      >
                        {s.trusted_seller ? "Cabut Badge" : "Beri Badge"}
                      </button>
                      {isPaused ? (
                        <button
                          onClick={() => action({ action: "unpause_bot", wa: s.seller_wa }, "Bot diaktifkan")}
                          className="rounded-md bg-green-100 px-2 py-1 text-xs text-green-700 hover:opacity-80 transition"
                        >
                          Aktifkan Bot
                        </button>
                      ) : (
                        <button
                          onClick={() => confirmThen({ title: "Pause Bot", message: `Pause bot untuk ${s.seller_name}?` }, () => action({ action: "pause_bot", wa: s.seller_wa }, "Bot di-pause"))}
                          className="rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-700 hover:opacity-80 transition"
                        >
                          Pause Bot
                        </button>
                      )}
                      <button
                        onClick={() => action({ action: "award_bumps", wa: s.seller_wa, count: 1 }, "+1 free bump diberikan")}
                        className="rounded-md bg-emerald-100 px-2 py-1 text-xs text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 hover:opacity-80 transition"
                      >
                        +1 Bump
                      </button>
                      <button
                        onClick={() => confirmThen({ title: "Reset PIN", message: `Reset PIN/OTP untuk ${s.seller_wa}?` }, () => action({ action: "reset_pin", wa: s.seller_wa }, "PIN direset"))}
                        className="rounded-md bg-violet-100 px-2 py-1 text-xs text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 hover:opacity-80 transition"
                      >
                        Reset PIN
                      </button>
                      <button
                        onClick={() => confirmThen({ title: "Blacklist", message: `Blokir ${s.seller_wa}? Semua iklannya disuspend.`, danger: true }, () => action({ action: "blacklist", wa: s.seller_wa }, "Diblacklist"))}
                        className="rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-slate-700 dark:text-slate-400 hover:opacity-80 transition"
                      >
                        Blacklist
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Blacklist — nomor terblokir */}
      <div className="mt-8 border-t border-black/[0.05] pt-6 dark:border-white/[0.08]">
        <h3 className="mb-3 text-sm font-bold dark:text-white">Nomor Diblokir ({initialBlacklist.length})</h3>
        <div className="flex max-w-lg gap-2">
          <input className="g-input flex-1" placeholder="Nomor WA untuk diblokir" value={newBl} onChange={(e) => setNewBl(e.target.value)} />
          <button onClick={() => { if (newBl.trim()) { action({ action: "blacklist", wa: newBl.trim() }, "Diblokir"); setNewBl(""); } }} className="g-btn g-btn-primary shrink-0">Blokir</button>
        </div>
        <div className="mt-3 max-w-lg space-y-2">
          {initialBlacklist.length === 0 && <p className="text-sm text-gray-400">Belum ada nomor diblokir.</p>}
          {initialBlacklist.map((b) => (
            <div key={b.id} className="g-card flex items-center justify-between p-3 text-sm">
              <span className="font-mono text-xs dark:text-white">{b.wa}</span>
              <button onClick={() => action({ action: "unblacklist", id: b.id }, "Dihapus dari blacklist")} className="text-rose-600 hover:underline text-xs">Hapus</button>
            </div>
          ))}
        </div>
      </div>

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
