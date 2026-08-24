"use client";

import Image from "next/image";
import { Icon } from "@/components/Icons";

export default function MatchesDrawer({
  isOpen,
  onClose,
  matches = [],
  loading = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative h-full w-full max-w-md bg-white dark:bg-[#1c1c1e] shadow-2xl p-5 flex flex-col border-l border-black/[0.08] dark:border-white/[0.1] animate-in slide-in-from-right duration-300">
        
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎉</span>
            <div>
              <h3 className="text-base font-black tracking-tight text-[#1d1d1f] dark:text-white">
                Daftar Teman Cocok ({matches.length})
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Teman yang saling LIKE denganmu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 active:scale-90"
          >
            <Icon.X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-gray-400">
              Memuat daftar matches...
            </div>
          ) : matches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
              <span className="text-4xl">☕</span>
              <p className="text-sm font-bold text-[#1d1d1f] dark:text-white">
                Belum ada match
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
                Terus swipe like pada profil yang menarik untuk mendapatkan kecocokan baru!
              </p>
            </div>
          ) : (
            matches.map((item) => {
              const cleanWa = (item.whatsapp || "").replace(/\D/g, "");
              const waUrl = cleanWa
                ? `https://wa.me/${cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa}?text=${encodeURIComponent(
                    `Halo ${item.display_name || "kak"}! Kita match di Cari Teman Kampus USU & Polmed nih 👋`
                  )}`
                : null;

              return (
                <div
                  key={item.matchId || item.id}
                  className="rounded-2xl border border-black/[0.06] bg-black/[0.02] dark:border-white/[0.08] dark:bg-white/[0.04] p-3.5 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-emerald-400 shadow-xs">
                      {item.photo_url ? (
                        <Image
                          src={item.photo_url}
                          alt={item.display_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-slate-800 text-base">
                          👤
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#1d1d1f] dark:text-white truncate">
                        {item.display_name}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                        🎓 {item.campus} · {item.faculty || "Umum"}
                      </p>
                      {item.intent && (
                        <span className="inline-block mt-0.5 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {item.intent}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {waUrl && (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-emerald-500 hover:bg-emerald-600 text-white p-2 shadow-xs active:scale-90 transition-all"
                        title="Chat di WhatsApp"
                      >
                        <span className="text-xs">💬</span>
                      </a>
                    )}
                    {item.instagram && (
                      <a
                        href={`https://instagram.com/${item.instagram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-pink-500 hover:bg-pink-600 text-white p-2 shadow-xs active:scale-90 transition-all"
                        title="Lihat Instagram"
                      >
                        <span className="text-xs">📸</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
