"use client";

import { useEffect } from "react";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { playChatSound } from "@/lib/sound";
import { hapticSuccess } from "@/lib/haptics";

export default function MatchModal({
  isOpen,
  onClose,
  myProfile,
  partner,
}) {
  useEffect(() => {
    if (isOpen) {
      playChatSound();
      hapticSuccess();
    }
  }, [isOpen]);

  if (!isOpen || !partner) return null;

  const cleanWa = (partner.whatsapp || "").replace(/\D/g, "");
  const waUrl = cleanWa
    ? `https://wa.me/${cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa}?text=${encodeURIComponent(
        `Halo ${partner.display_name || "kak"}! Kita match di Cari Teman Kampus USU & Polmed nih 👋`
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-gradient-to-b from-[#1c1c1e] to-black p-6 text-center text-white shadow-2xl border border-white/15">
        
        {/* Confetti & Title */}
        <div className="space-y-1 my-2">
          <span className="inline-block animate-bounce text-4xl">🎉</span>
          <h2 className="text-3xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
            IT'S A MATCH!
          </h2>
          <p className="text-xs text-gray-300">
            Kamu dan <span className="font-bold text-white">{partner.display_name}</span> saling suka!
          </p>
        </div>

        {/* 2 Circular Avatars with Heart */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-full border-3 border-emerald-400 shadow-xl -mr-3 z-10">
            {myProfile?.photo_url ? (
              <Image
                src={myProfile.photo_url}
                alt="Foto Kamu"
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-2xl">
                👤
              </div>
            )}
          </div>

          <div className="absolute z-20 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-black animate-pulse">
            <span className="text-base">💚</span>
          </div>

          <div className="relative h-24 w-24 overflow-hidden rounded-full border-3 border-emerald-400 shadow-xl -ml-3 z-10">
            {partner.photo_url ? (
              <Image
                src={partner.photo_url}
                alt={partner.display_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-slate-800 text-2xl">
                👤
              </div>
            )}
          </div>
        </div>

        {/* Partner Info Tag */}
        <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10 text-xs mb-6">
          <p className="font-bold text-sm text-white">{partner.display_name}</p>
          <p className="text-[11px] text-gray-300 mt-0.5">
            🎓 {partner.campus} · {partner.faculty || "Umum"} {partner.batch ? `('${partner.batch.slice(-2)})` : ""}
          </p>
          {partner.intent && (
            <span className="mt-2 inline-block rounded-full bg-primary/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
              {partner.intent}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-600 active:scale-[0.98] transition-all"
            >
              <span>💬 Sapa di WhatsApp</span>
            </a>
          )}

          {partner.instagram && (
            <a
              href={`https://instagram.com/${partner.instagram.replace(/^@/, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/10 py-2.5 text-xs font-bold text-white hover:bg-white/15 border border-white/15 active:scale-[0.98] transition-all"
            >
              <span>📸 Instagram @{partner.instagram.replace(/^@/, "")}</span>
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
            Lanjut Cari Teman Lain ➔
          </button>
        </div>
      </div>
    </div>
  );
}
