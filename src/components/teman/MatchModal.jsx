"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { playChatSound } from "@/lib/sound";
import { hapticSuccess } from "@/lib/haptics";
import { getTemanIntent, getTemanIntentLabel } from "@/lib/temanIntents";

export default function MatchModal({
  isOpen,
  onClose,
  myProfile,
  partner,
}) {
  const router = useRouter();
  const [loadingDm, setLoadingDm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      playChatSound();
      hapticSuccess();
    }
  }, [isOpen]);

  if (!isOpen || !partner) return null;

  const intentMeta = getTemanIntent(partner.intent);
  const IntentIcon = intentMeta?.icon ? Icon[intentMeta.icon] : null;

  // WhatsApp fallback
  const cleanWa = (partner.whatsapp || "").replace(/\D/g, "");
  const waUrl = cleanWa
    ? `https://wa.me/${cleanWa.startsWith("0") ? "62" + cleanWa.slice(1) : cleanWa}?text=${encodeURIComponent(
        `Halo ${partner.display_name || "kak"}! Kita match di Cari Teman Kampus USU & Polmed nih 👋`
      )}`
    : null;

  const handleOpenDmWeb = async () => {
    if (!partner.whatsapp) return;
    setLoadingDm(true);
    try {
      const res = await fetch("/api/teman/match-dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerWa: partner.whatsapp }),
      });
      const data = await res.json();
      if (!res.ok || !data.roomId) {
        // Jika user belum login / tidak punya akun jual-beli, fallback ke WA
        if (res.status === 401 && waUrl) {
          window.open(waUrl, "_blank");
        } else {
          alert(data.error || "Gagal membuka DM. Coba sapa via WhatsApp.");
        }
        return;
      }
      onClose();
      router.push(`/chat?room=${data.roomId}`);
    } catch {
      alert("Gagal membuka DM. Coba sapa via WhatsApp.");
    } finally {
      setLoadingDm(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
      <div className="relative w-full max-w-sm overflow-hidden rounded-[32px] bg-gradient-to-b from-[#1c1c1e] to-black p-6 text-center text-white shadow-2xl border border-white/15">
        
        {/* Confetti & Title */}
        <div className="space-y-1 my-2">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/18 text-emerald-300">
            <Icon.HeartFilled className="h-7 w-7 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black italic tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
            IT&apos;S A MATCH!
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
                <Icon.User className="h-10 w-10" />
              </div>
            )}
          </div>

          <div className="absolute z-20 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg ring-4 ring-black animate-pulse">
            <Icon.HeartFilled className="h-5 w-5" />
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
                <Icon.User className="h-10 w-10" />
              </div>
            )}
          </div>
        </div>

        {/* Partner Info Tag */}
        <div className="rounded-2xl bg-white/10 p-3.5 backdrop-blur-md border border-white/10 text-xs mb-6">
          <p className="font-bold text-sm text-white">{partner.display_name}</p>
          <p className="text-[11px] text-gray-300 mt-0.5">
            <span className="inline-flex items-center gap-1.5">
              <Icon.GraduationCap className="h-3.5 w-3.5" />
              {partner.campus} · {partner.faculty || "Umum"} {partner.batch ? `('${partner.batch.slice(-2)})` : ""}
            </span>
          </p>
          {partner.intent && (
            <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/40 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
              {IntentIcon ? <IntentIcon className="h-3.5 w-3.5" /> : null}
              {getTemanIntentLabel(partner.intent)}
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          {/* DM Web — tombol utama */}
          <button
            type="button"
            onClick={handleOpenDmWeb}
            disabled={loadingDm}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-600 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {loadingDm ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Membuka DM...
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Icon.MessageCircle className="h-4 w-4" />
                Mulai DM Web
              </span>
            )}
          </button>

          {/* WhatsApp fallback — jika partner tidak punya akun web */}
          {waUrl && (
            <a
              href={waUrl}
              target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/10 py-2.5 text-xs font-bold text-white hover:bg-white/15 border border-white/15 active:scale-[0.98] transition-all"
          >
            <Icon.Phone className="h-4 w-4" />
            <span>Sapa di WhatsApp</span>
          </a>
          )}

          {partner.instagram && (
            <a
              href={`https://instagram.com/${partner.instagram.replace(/^@/, "")}`}
              target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-white/10 py-2.5 text-xs font-bold text-white hover:bg-white/15 border border-white/15 active:scale-[0.98] transition-all"
          >
              <Icon.Instagram className="h-4 w-4" />
              <span>Instagram @{partner.instagram.replace(/^@/, "")}</span>
            </a>
          )}

          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center gap-2 py-2.5 text-xs font-bold text-gray-400 hover:text-white transition-colors"
          >
            <span>Lanjut Cari Teman Lain</span>
            <Icon.ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
