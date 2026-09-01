"use client";

import { useState } from "react";
import { useTransactionMode } from "@/lib/useTransactionMode";
import { toast } from "sonner";

export default function TransactionModeToggle({ variant = "card" }) {
  const { mode, isWaMode, isChatMode, loading, setTransactionMode } = useTransactionMode();
  const [updating, setUpdating] = useState(false);

  async function handleSwitch(targetMode) {
    if (targetMode === mode || updating) return;
    setUpdating(true);
    try {
      await setTransactionMode(targetMode);
      toast.success(
        targetMode === "whatsapp"
          ? "Mode diubah ke: WhatsApp Langsung (Transaksi via WA)"
          : "Mode diubah ke: In-App DM Web (Transaksi via Chat Web)"
      );
    } catch (err) {
      toast.error(err.message || "Gagal mengubah mode transaksi");
    } finally {
      setUpdating(false);
    }
  }

  // Variant "compact": Untuk diletakkan di Topbar / Header
  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
        <button
          type="button"
          disabled={updating || loading}
          onClick={() => handleSwitch("in_app_chat")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
            isChatMode
              ? "bg-blue-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
          title="Mode DM Web: Pembeli & penjual chat lewat inbox web"
        >
          <span>DM</span>
          <span className="hidden sm:inline">DM Web</span>
        </button>

        <button
          type="button"
          disabled={updating || loading}
          onClick={() => handleSwitch("whatsapp")}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold transition-all ${
            isWaMode
              ? "bg-emerald-600 text-white shadow-xs"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
          }`}
          title="Mode WA: Pembeli langsung diarahkan ke nomor WhatsApp penjual"
        >
          <span>WA</span>
          <span className="hidden sm:inline">WA Langsung</span>
        </button>
      </div>
    );
  }

  // Variant "card": Untuk tampilan kontrol penuh di Ringkasan / Overview Admin
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl"><svg aria-hidden="true" viewBox="0 0 24 24" className="inline-block h-[1em] w-[1em] shrink-0 align-[-0.125em] fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/><path d="M5 17l.75 2.25L8 20l-2.25.75L5 23l-.75-2.25L2 20l2.25-.75L5 17z"/></svg></span>
            <h3 className="text-base font-black tracking-tight text-slate-900 dark:text-white">
              Mode Alur Transaksi Marketplace
            </h3>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isChatMode
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
              }`}
            >
              Aktif: {isChatMode ? "Mode 2 (DM Web)" : "Mode 1 (WhatsApp)"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Tentukan ke mana tombol &quot;Minat / Chat Penjual&quot; dan tawaran harga pada produk akan diarahkan secara global.
          </p>
        </div>

        {/* Switch Selector */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 w-full sm:w-auto">
          {/* Opsi 1: WhatsApp */}
          <button
            type="button"
            disabled={updating || loading}
            onClick={() => handleSwitch("whatsapp")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all duration-150 ${
              isWaMode
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>WA Mode 1: WhatsApp</span>
            {isWaMode && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </button>

          {/* Opsi 2: In-App DM Web */}
          <button
            type="button"
            disabled={updating || loading}
            onClick={() => handleSwitch("in_app_chat")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all duration-150 ${
              isChatMode
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <span>DM Mode 2: DM Web</span>
            {isChatMode && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          </button>
        </div>
      </div>

      {/* Penjelasan Singkat Mode Aktif */}
      <div className="mt-4 pt-3 border-t border-slate-150 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div
          className={`p-3 rounded-xl border transition-all ${
            isWaMode
              ? "bg-emerald-50/70 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/60"
              : "bg-slate-50 border-slate-200/60 opacity-60 dark:bg-slate-800/30 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
            <span>WA Mode 1: Direct WhatsApp</span>
            {isWaMode && <span className="text-[10px] bg-emerald-200 dark:bg-emerald-800 px-1.5 py-0.2 rounded font-extrabold">AKTIF</span>}
          </div>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Pembeli langsung dialihkan ke obrolan WhatsApp penjual via tautan <code>wa.me</code>. Data prospek tetap tercatat di log kontak admin.
          </p>
        </div>

        <div
          className={`p-3 rounded-xl border transition-all ${
            isChatMode
              ? "bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/60"
              : "bg-slate-50 border-slate-200/60 opacity-60 dark:bg-slate-800/30 dark:border-slate-800"
          }`}
        >
          <div className="flex items-center gap-1.5 font-bold text-blue-800 dark:text-blue-300">
            <span>DM Mode 2: In-App Direct Message</span>
            {isChatMode && <span className="text-[10px] bg-blue-200 dark:bg-blue-800 px-1.5 py-0.2 rounded font-extrabold">AKTIF</span>}
          </div>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Transaksi &amp; negosiasi berlangsung di ruang <code>/chat</code> internal web. Nomor WhatsApp aman terlindungi sampai sepakat tukar kontak.
          </p>
        </div>
      </div>
    </div>
  );
}
