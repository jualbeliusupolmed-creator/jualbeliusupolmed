"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/Icons";
import { toast } from "sonner";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { getTemanIntentLabel } from "@/lib/temanIntents";
import SwipeCard from "@/components/teman/SwipeCard";
import PhotoUploadModal from "@/components/teman/PhotoUploadModal";
import MatchModal from "@/components/teman/MatchModal";
import MatchesDrawer from "@/components/teman/MatchesDrawer";

function getClientId() {
  if (typeof window === "undefined") return "";
  let cid = localStorage.getItem("teman_client_id");
  if (!cid) {
    cid = "usr_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    localStorage.setItem("teman_client_id", cid);
  }
  return cid;
}

export default function TemanSwipePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [userId, setUserId] = useState("");
  const [myProfile, setMyProfile] = useState(null);
  const [deck, setDeck] = useState([]);
  const [loading, setLoading] = useState(true);
  const [campusFilter, setCampusFilter] = useState("Semua");
  
  // History for rewind
  const [history, setHistory] = useState([]);

  // Modals & Drawers
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [matchedPartner, setMatchedPartner] = useState(null);
  const [showMatchesDrawer, setShowMatchesDrawer] = useState(false);
  const [matchesList, setMatchesList] = useState([]);
  const [matchesLoading, setMatchesLoading] = useState(false);

  useEffect(() => {
    setMounted(true);
    const cid = getClientId();
    setUserId(cid);
  }, []);

  // Fetch Deck & Profile
  // deckOnly=true → hanya refresh kartu, jangan override myProfile atau buka onboarding
  const loadDeck = useCallback(async (deckOnly = false) => {
    if (!userId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/teman/profiles?userId=${userId}&campus=${campusFilter}`);
      const data = await res.json();
      if (data.ok) {
        setDeck(data.profiles || []);
        if (!deckOnly) {
          setMyProfile(data.myProfile);
          if (!data.myProfile) {
            setShowOnboarding(true);
          }
        }
      }
    } catch (err) {
      console.error("Load deck error:", err);
      toast.error("Gagal memuat deck teman");
    } finally {
      setLoading(false);
    }
  }, [userId, campusFilter]);

  useEffect(() => {
    if (userId) {
      loadDeck();
    }
  }, [userId, loadDeck]);

  // Fetch Matches List
  const loadMatches = async () => {
    if (!userId) return;
    try {
      setMatchesLoading(true);
      const res = await fetch(`/api/teman/matches?userId=${userId}`);
      const data = await res.json();
      if (data.ok) {
        setMatchesList(data.matches || []);
      }
    } catch (err) {
      console.error("Load matches error:", err);
    } finally {
      setMatchesLoading(false);
    }
  };

  const handleOpenMatches = () => {
    setShowMatchesDrawer(true);
    loadMatches();
  };

  // Process Swipe Action
  const handleSwipe = async (action) => {
    if (!myProfile) {
      setShowOnboarding(true);
      return;
    }
    if (deck.length === 0) return;

    const currentCard = deck[0];
    const nextDeck = deck.slice(1);
    
    // Save to history for undo
    setHistory((prev) => [currentCard, ...prev.slice(0, 4)]);
    setDeck(nextDeck);

    if (action === "like" || action === "superlike") {
      hapticSuccess();
    } else {
      hapticLight();
    }

    try {
      const res = await fetch("/api/teman/swipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          swiper_id: myProfile.id,
          target_id: currentCard.id,
          action,
          // Dibutuhkan pemakai anonim (belum punya akun) supaya server bisa
          // memastikan `swiper_id` memang miliknya. Yang sudah masuk akun
          // diabaikan nilainya — sesi yang menentukan.
          userId,
        }),
      });

      const data = await res.json();
      if (data.ok && data.matched && data.partner) {
        setMatchedPartner(data.partner);
      }
    } catch (err) {
      console.error("Swipe submission error:", err);
    }
  };

  const handleUndo = () => {
    if (history.length === 0) {
      toast("Tidak ada aksi sebelumnya untuk dibatalkan");
      return;
    }
    const lastCard = history[0];
    setHistory((prev) => prev.slice(1));
    setDeck((prev) => [lastCard, ...prev]);
    toast.success(`Mengembalikan ${lastCard.display_name}`);
  };

  const handleToggleVisibility = async () => {
    if (!myProfile) return;
    const newStatus = !myProfile.is_active;
    
    setMyProfile((prev) => ({ ...prev, is_active: newStatus }));
    toast(newStatus ? "Profilmu kini bisa dilihat!" : "Profilmu disembunyikan", {
      icon: newStatus ? <Icon.Eye className="h-4 w-4 text-emerald-600" /> : <Icon.EyeOff className="h-4 w-4 text-slate-500" />,
    });

    try {
      const res = await fetch("/api/teman/profiles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, is_active: newStatus }),
      });
      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      toast.error("Gagal mengubah status privasi");
      setMyProfile((prev) => ({ ...prev, is_active: !newStatus }));
    }
  };

  const currentTopProfile = deck[0] || null;
  const nextProfile = deck[1] || null;

  if (!mounted) {
    return (
      <div className="fixed inset-x-0 bottom-0 top-[52px] z-20 flex flex-col bg-[#f5f5f7] dark:bg-[#000000] font-sans max-w-lg w-full mx-auto px-4 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-[calc(4.5rem+env(safe-area-inset-bottom))] overflow-hidden">
        <div className="flex flex-col items-center justify-center my-auto py-24 space-y-3">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-xs text-gray-400 font-medium">Menyiapkan Cari Teman Kampus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 top-[52px] z-20 flex flex-col bg-[#f5f5f7] dark:bg-[#000000] font-sans max-w-lg w-full mx-auto px-4 pt-3 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-[calc(4.5rem+env(safe-area-inset-bottom))] select-none overflow-hidden">
      
      {/* TOP BAR & FILTER */}
      <div className="flex items-center justify-between gap-2 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/chat")}
            className="p-1.5 -ml-1 text-gray-500 hover:text-black dark:hover:text-white rounded-full active:scale-90 transition-transform"
            title="Kembali ke Obrolan"
          >
            <Icon.ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-black tracking-tight text-[#1d1d1f] dark:text-white flex items-center gap-1.5">
              <span>Cari Teman Kampus</span>
              <Icon.Handshake className="h-4 w-4 text-orange-500" />
            </h1>
          </div>
        </div>

        {/* Right Buttons: Matches & Profile */}
        <div className="flex items-center gap-1.5">
          {myProfile && (
            <button
              onClick={handleToggleVisibility}
              className={`flex items-center justify-center h-8 w-8 rounded-full border shadow-2xs active:scale-95 transition-all ${
                myProfile.is_active
                  ? "bg-white/90 dark:bg-[#1c1c1e] border-black/[0.06] dark:border-white/[0.08]"
                  : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800 dark:text-red-400"
              }`}
              title={myProfile.is_active ? "Sembunyikan Profil" : "Tampilkan Profil"}
            >
              {myProfile.is_active ? <Icon.Eye className="h-4 w-4" /> : <Icon.EyeOff className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={handleOpenMatches}
            className="relative flex items-center gap-1 bg-white/90 dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] px-3 py-1.5 rounded-full text-xs font-bold text-[#1d1d1f] dark:text-white shadow-2xs active:scale-95 transition-all"
            title="Buka Daftar Matches"
          >
            <Icon.MessageCircle className="h-3.5 w-3.5" />
            <span>Matches</span>
          </button>

          <button
            onClick={() => setShowOnboarding(true)}
            className="flex items-center justify-center h-8 w-8 rounded-full bg-white/90 dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-xs shadow-2xs active:scale-95 transition-all"
            title="Edit Profil Saya"
          >
            <Icon.Edit2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* CAMPUS FILTER CAPSULES */}
      <div className="flex items-center gap-1.5 pb-3 overflow-x-auto [scrollbar-width:none]">
        {["Semua", "USU", "Polmed"].map((c) => (
          <button
            key={c}
            onClick={() => setCampusFilter(c)}
            className={`rounded-full px-3.5 py-1 text-[11px] font-bold transition-all ${
              campusFilter === c
                ? "bg-primary text-white shadow-xs"
                : "bg-white/80 dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-300 border border-black/[0.04] dark:border-white/[0.06]"
            }`}
          >
            {c === "Semua" ? "Semua Kampus" : c}
          </button>
        ))}
      </div>

      {/* MAIN CARD STACK CONTAINER */}
      <div className="relative flex-1 min-h-0 w-full flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-16">
            <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-medium">Menyiapkan profil mahasiswa...</p>
          </div>
        ) : myProfile && !myProfile.is_active ? (
          <div className="flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-3 w-full h-full max-h-[400px]">
            <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
              <Icon.EyeOff className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-black text-[#1d1d1f] dark:text-white">
              Profilmu Disembunyikan
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              Kamu tidak bisa mencari teman dan profilmu tidak akan ditampilkan ke orang lain saat ini.
            </p>
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleToggleVisibility}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
              >
                <Icon.Eye className="h-4 w-4" />
                Aktifkan Profil
              </button>
            </div>
          </div>
        ) : deck.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-3 w-full">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-white/[0.06] dark:text-slate-300">
              <Icon.Coffee className="h-7 w-7" />
            </div>
            <h3 className="text-base font-black text-[#1d1d1f] dark:text-white">
              Semua Profil Sudah Dilihat!
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
              Kamu sudah menjelajahi semua mahasiswa aktif di filter ini. Coba ubah filter kampus atau periksa daftar matches kamu!
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={loadDeck}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs hover:brightness-105 active:scale-95 transition-all"
              >
                <Icon.RefreshCcw className="h-3.5 w-3.5" />
                Muat Ulang Deck
              </button>
              <button
                onClick={handleOpenMatches}
                className="inline-flex items-center gap-2 rounded-full bg-black/[0.04] dark:bg-white/[0.08] px-4 py-2 text-xs font-bold text-[#1d1d1f] dark:text-white active:scale-95 transition-all"
              >
                <Icon.HeartFilled className="h-3.5 w-3.5 text-rose-500" />
                Buka Matches
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* UNDER CARD */}
            {nextProfile && (
              <SwipeCard
                key={nextProfile.id}
                profile={nextProfile}
                isTop={false}
              />
            )}

            {/* TOP CARD */}
            {currentTopProfile && (
              <SwipeCard
                key={currentTopProfile.id}
                profile={currentTopProfile}
                onSwipe={handleSwipe}
                isTop={true}
              />
            )}
          </>
        )}
      </div>

      {/* BOTTOM ACTION CONTROLS */}
      {deck.length > 0 && (
        <div className="shrink-0 flex items-center justify-center gap-4 py-3 z-30 bg-transparent">
          {/* UNDO / REWIND */}
          <button
            onClick={handleUndo}
            disabled={history.length === 0}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-[#1c1c1e] text-amber-500 shadow-md border border-black/[0.06] dark:border-white/[0.08] active:scale-90 hover:scale-105 transition-all disabled:opacity-40"
            title="Kembalikan Profil Terakhir"
          >
            <Icon.ArrowLeft className="h-5 w-5" />
          </button>

          {/* PASS BUTTON (❌) */}
          <button
            onClick={() => handleSwipe("pass")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-[#1c1c1e] text-rose-500 shadow-xl border border-black/[0.08] dark:border-white/[0.12] active:scale-90 hover:scale-105 transition-all"
            title="Lewati (Pass)"
          >
            <Icon.X className="h-7 w-7" />
          </button>

          {/* LIKE BUTTON (💚) */}
          <button
            onClick={() => handleSwipe("like")}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-xl shadow-emerald-500/30 active:scale-90 hover:scale-105 transition-all"
            title="Suka (Like)"
          >
            <Icon.HeartFilled className="h-7 w-7" />
          </button>

          {/* SUPERLIKE BUTTON (⭐) */}
          <button
            onClick={() => handleSwipe("superlike")}
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white dark:bg-[#1c1c1e] text-sky-500 shadow-md border border-black/[0.06] dark:border-white/[0.08] active:scale-90 hover:scale-105 transition-all"
            title="Superlike"
          >
            <Icon.Star className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* MODALS & DRAWERS */}
      <PhotoUploadModal
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        initialProfile={myProfile}
        userId={userId}
        onSuccess={(updated) => {
          // 1. Segera update profil & tutup modal dari sini
          //    (PhotoUploadModal juga memanggil onClose() setelahnya, tapi ini lebih cepat)
          setMyProfile(updated);
          setShowOnboarding(false);
          // 2. Refresh daftar kartu saja (deckOnly=true) agar tidak overwrite myProfile
          //    dan tidak memicu buka-ulang onboarding
          loadDeck(true);
        }}
      />

      <MatchModal
        isOpen={!!matchedPartner}
        onClose={() => setMatchedPartner(null)}
        myProfile={myProfile}
        partner={matchedPartner}
      />

      <MatchesDrawer
        isOpen={showMatchesDrawer}
        onClose={() => setShowMatchesDrawer(false)}
        matches={matchesList}
        loading={matchesLoading}
      />
    </div>
  );
}
