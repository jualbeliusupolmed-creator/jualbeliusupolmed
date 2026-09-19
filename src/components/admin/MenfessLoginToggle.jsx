"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Icon } from "@/components/Icons";

function LockIcon({ className = "w-3.5 h-3.5" }) {
  if (Icon?.Lock) return <Icon.Lock className={className} />;
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`fill-none stroke-current ${className}`}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function UnlockIcon({ className = "w-3.5 h-3.5" }) {
  if (Icon?.Unlock) return <Icon.Unlock className={className} />;
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`fill-none stroke-current ${className}`}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function MessageCircleIcon({ className = "w-5 h-5 text-primary" }) {
  if (Icon?.MessageCircle) return <Icon.MessageCircle className={className} />;
  return (
    <svg viewBox="0 0 24 24" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={`fill-none stroke-current ${className}`}>
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function MenfessLoginToggle({ variant = "card", initialRequireLogin = true, onToggle }) {
  const [requireLogin, setRequireLogin] = useState(initialRequireLogin);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Muat konfigurasi aktual dari server
    fetch("/api/config")
      .then((res) => res.json())
      .then((cfg) => {
        if (cfg?.mading?.requireLogin != null) {
          setRequireLogin(!!cfg.mading.requireLogin);
        }
      })
      .catch(() => {});
  }, []);

  async function handleToggle(targetState) {
    if (targetState === requireLogin || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_settings",
          key: "mading",
          value: { requireLogin: targetState },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Gagal mengubah pengaturan");
      }
      setRequireLogin(targetState);
      if (onToggle) onToggle(targetState);
      toast.success(
        targetState
          ? "Kewajiban Login DIAKTIFKAN: Pengguna wajib login WhatsApp untuk buat menfess"
          : "Kewajiban Login DIMATIKAN: Pengguna bisa langsung buat menfess tanpa login"
      );
    } catch (err) {
      toast.error(err.message || "Gagal menyimpan pengaturan");
    } finally {
      setLoading(false);
    }
  }

  // Variant: compact (untuk topbar atau samping filter)
  if (variant === "compact") {
    return (
      <div className="inline-flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 pl-1.5">
          Login Menfess:
        </span>
        <button
          type="button"
          disabled={loading}
          onClick={() => handleToggle(!requireLogin)}
          className={`px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1 ${
            requireLogin
              ? "bg-primary text-white shadow-xs"
              : "bg-amber-500 text-white shadow-xs"
          }`}
          title={requireLogin ? "Wajib Login (Klik untuk Bebaskan)" : "Bebas Tanpa Login (Klik untuk Wajibkan)"}
        >
          {requireLogin ? (
            <>
              <LockIcon className="w-3 h-3" />
              <span>Wajib Login</span>
            </>
          ) : (
            <>
              <UnlockIcon className="w-3 h-3" />
              <span>Bebas (Off)</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Variant: card (untuk Dashboard Overview dan Pengaturan)
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xl shrink-0">
              <MessageCircleIcon className="w-5 h-5 text-primary" />
            </span>
            <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
              Kewajiban Login Pembuatan Menfess
            </h3>
            <span
              className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                requireLogin
                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  : "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
              }`}
            >
              {requireLogin ? "🔒 Wajib Login (ON)" : "⚡ Bebas Tanpa Login (OFF)"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {requireLogin
              ? "Mahasiswa harus login via nomor WhatsApp terlebih dahulu sebelum dapat mengirim menfess."
              : "Siapa pun dapat langsung mengirimkan menfess secara anonim tanpa login akun (tetap terlindung sensor kata kotor & rate-limit)."}
          </p>
        </div>

        {/* Switch Selector */}
        <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shrink-0 w-full sm:w-auto">
          {/* Opsi 1: ON (Wajib Login) */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleToggle(true)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              requireLogin
                ? "bg-primary text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <LockIcon className="w-3.5 h-3.5" />
            <span>ON (Wajib Login)</span>
          </button>

          {/* Opsi 2: OFF (Bebas) */}
          <button
            type="button"
            disabled={loading}
            onClick={() => handleToggle(false)}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              !requireLogin
                ? "bg-amber-500 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <UnlockIcon className="w-3.5 h-3.5" />
            <span>OFF (Bebas)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
