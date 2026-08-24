"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Icon } from "@/components/Icons";
import { hapticLight } from "@/lib/haptics";

export default function SwipeCard({
  profile,
  onSwipe,
  isTop = false,
}) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitAction, setExitAction] = useState(null);
  const [showBio, setShowBio] = useState(false);
  const cardRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const SWIPE_THRESHOLD = 96;

  const setOffset = (offset) => {
    dragOffsetRef.current = offset;
    setDragOffset(offset);
  };

  const finishDrag = () => {
    if (!isDragging || !isTop || exitAction) return;
    const { x } = dragOffsetRef.current;
    const action = x > SWIPE_THRESHOLD ? "like" : x < -SWIPE_THRESHOLD ? "pass" : null;
    setIsDragging(false);
    if (!action) {
      setIsDragging(false);
      setOffset({ x: 0, y: 0 });
      return;
    }

    const direction = action === "pass" ? -1 : 1;
    const width = cardRef.current?.clientWidth || 320;
    setExitAction(action);
    setOffset({ x: direction * width * 1.18, y: -10 });
    window.setTimeout(() => onSwipe?.(action), 180);
  };

  const handlePointerDown = (e) => {
    if (!isTop || exitAction || (e.pointerType === "mouse" && e.button !== 0)) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    setOffset({ x: 0, y: 0 });
    setIsDragging(true);
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !isTop || exitAction) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > Math.abs(dy)) e.preventDefault();
    setOffset({ x: dx, y: dy });
  };

  const handlePointerEnd = () => finishDrag();
  const handlePointerCancel = () => {
    if (!exitAction) {
      setIsDragging(false);
      setOffset({ x: 0, y: 0 });
    }
  };

  const rotation = dragOffset.x * 0.08;
  const likeOpacity = Math.min(1, Math.max(0, dragOffset.x / 75));
  const passOpacity = Math.min(1, Math.max(0, -dragOffset.x / 75));

  if (!profile) return null;

  return (
    <div
      ref={cardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
      style={{
        transform: isTop
          ? `translate3d(${dragOffset.x}px, ${dragOffset.y * 0.4}px, 0) rotate(${rotation}deg)`
          : "scale(0.96) translateY(12px)",
        transition: isDragging ? "none" : "transform 0.24s cubic-bezier(0.22, 1, 0.36, 1)",
        zIndex: isTop ? 20 : 10,
      }}
      className={`absolute inset-0 touch-pan-y select-none overflow-hidden rounded-[28px] border border-black/[0.08] bg-black shadow-[0_12px_36px_rgba(0,0,0,0.18)] dark:border-white/[0.12] dark:shadow-[0_16px_40px_rgba(0,0,0,0.6)] cursor-grab active:cursor-grabbing ${
        !isTop ? "pointer-events-none opacity-80" : ""
      }`}
    >
      {/* BACKGROUND PHOTO */}
      <div className="relative h-full w-full bg-gradient-to-b from-[#1c1c1e] to-[#0a0a0c] overflow-hidden">
        {profile.photo_url ? (
          <Image
            src={profile.photo_url}
            alt={profile.display_name || "Foto Teman"}
            fill
            priority={isTop}
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover pointer-events-none"
          />
        ) : (
          <div className="flex flex-col h-full w-full items-center justify-center bg-gradient-to-tr from-slate-950 via-primary/20 to-indigo-950/80 text-center p-6 space-y-3 select-none pb-24">
            <div className="w-24 h-24 rounded-full bg-white/10 border-2 border-white/15 backdrop-blur-xl flex items-center justify-center text-3xl font-black text-white shadow-2xl">
              {profile.display_name ? profile.display_name.charAt(0).toUpperCase() : "👤"}
            </div>
            <p className="text-[11px] font-medium text-white/50 tracking-wider">
              {profile.campus} · {profile.faculty || "Mahasiswa"}
            </p>
          </div>
        )}

        {/* GRADIENT OVERLAYS */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent" />

        {/* STAMPS (LIKE & PASS) */}
        {isTop && (
          <>
            {/* LIKE STAMP */}
            <div
              style={{ opacity: likeOpacity }}
              className="pointer-events-none absolute top-8 left-8 -rotate-15 rounded-xl border-3 border-emerald-400 bg-emerald-500/30 backdrop-blur-xs px-4 py-1.5 shadow-lg"
            >
              <span className="text-xl xs:text-2xl font-black uppercase tracking-wider text-emerald-300">
                LIKE 💚
              </span>
            </div>

            {/* PASS STAMP */}
            <div
              style={{ opacity: passOpacity }}
              className="pointer-events-none absolute top-8 right-8 rotate-15 rounded-xl border-3 border-rose-400 bg-rose-500/30 backdrop-blur-xs px-4 py-1.5 shadow-lg"
            >
              <span className="text-xl xs:text-2xl font-black uppercase tracking-wider text-rose-300">
                PASS ❌
              </span>
            </div>
          </>
        )}

        {/* TOP BADGES */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <span className="rounded-full bg-black/60 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-xs border border-white/10 flex items-center gap-1">
            <span>🎓 {profile.campus}</span>
            {profile.faculty && <span>· {profile.faculty}</span>}
          </span>
          {profile.intent && (
            <span className="rounded-full bg-primary/80 backdrop-blur-md px-3 py-1 text-[11px] font-bold text-white shadow-xs border border-white/15">
              {profile.intent}
            </span>
          )}
        </div>

        {/* BOTTOM PROFILE INFO */}
        <div className="absolute bottom-0 inset-x-0 p-5 text-white">
          <div className="flex items-end justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <h2 className="text-2xl font-black tracking-tight text-white drop-shadow-md truncate">
                  {profile.display_name}
                </h2>
                {profile.batch && (
                  <span className="text-sm font-semibold text-white/80 shrink-0">
                    '{profile.batch.slice(-2)}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-white/90 drop-shadow-xs flex items-center gap-1.5">
                <span>📍 Mahasiswa {profile.campus}</span>
                <span>•</span>
                <span>{profile.faculty || "Umum"}</span>
              </p>
            </div>

            {/* Info Toggle Button */}
            {profile.bio && (
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowBio(!showBio);
                  hapticLight();
                }}
                className="shrink-0 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md p-2 text-white transition-all active:scale-90"
                title="Lihat Bio"
              >
                <Icon.ChevronRight
                  className={`w-4 h-4 transition-transform duration-300 ${
                    showBio ? "rotate-90" : "-rotate-90"
                  }`}
                />
              </button>
            )}
          </div>

          {/* EXPANDABLE BIO */}
          {profile.bio && showBio && (
            <div className="mt-3 rounded-2xl bg-white/15 backdrop-blur-md p-3.5 border border-white/15 text-xs leading-relaxed text-white/95 animate-in fade-in slide-in-from-bottom-2 duration-200">
              <p className="font-semibold mb-1 text-[11px] text-white/75 uppercase tracking-wider">Tentang Aku:</p>
              <p className="whitespace-pre-line">{profile.bio}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
