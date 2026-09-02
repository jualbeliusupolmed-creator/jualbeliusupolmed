"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import InstallPrompt from "./InstallPrompt";
import NotifPrompt from "./NotifPrompt";
import BottomNavbar from "./BottomNavbar";
import GlobalChatNotifier from "./GlobalChatNotifier";
import PopupSponsor from "./PopupSponsor";
import SwipeBackGesture from "./SwipeBackGesture";
import GlobalPullToRefresh from "./GlobalPullToRefresh";
import { SesiProvider } from "./SesiProvider";
import { cn } from "@/lib/utils";
import GlobalImageLightbox from "./GlobalImageLightbox";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isChat = pathname?.startsWith("/chat");
  const isTeman = pathname?.startsWith("/teman");
  const isDashboard = pathname?.startsWith("/dashboard");
  const isHome = pathname === "/";
  const hideFooter = isAdmin || isChat || isTeman || isDashboard || isHome;
  const isImmersive = isAdmin;
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => setConfig(data))
        .catch((err) => console.error("Gagal memuat config:", err));
    }
  }, [isAdmin]);

  // Sinkronisasi Google OAuth:
  // 1. Query param ?_gwa=<identifier> (dari redirect GET /auth/callback)
  // 2. Hash fragment #access_token=... (jika Supabase me-redirect langsung ke root URL pada implicit flow)
  useEffect(() => {
    if (typeof window === "undefined") return;

    // A. Tangani query param ?_gwa=...
    const params = new URLSearchParams(window.location.search);
    const gwa = params.get("_gwa");
    if (gwa) {
      localStorage.setItem("seller_wa", gwa);
      params.delete("_gwa");
      const newSearch = params.toString() ? `?${params.toString()}` : "";
      const newUrl = `${window.location.pathname}${newSearch}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
    }

    // B. Tangani hash fragment #access_token=...
    const hash = window.location.hash.substring(1);
    if (hash && hash.includes("access_token=")) {
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      if (accessToken) {
        // Segera bersihkan hash dari URL browser agar bersih
        window.history.replaceState(
          null,
          "",
          window.location.pathname + (window.location.search || "")
        );

        fetch("/auth/callback", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: accessToken,
            next: window.location.pathname,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              if (data.wa) localStorage.setItem("seller_wa", data.wa);
              if (data.name) localStorage.setItem("seller_name", data.name);
              if (data.redirectUrl) {
                window.location.href = data.redirectUrl;
              } else {
                window.location.reload();
              }
            } else {
              console.error("[OAuth Sync] Gagal sinkronisasi token Google:", data.error);
            }
          })
          .catch((err) => {
            console.error("[OAuth Sync] Error fetch /auth/callback:", err);
          });
      }
    }
  }, []);

  return (
    // Sesi dibungkus di sini, bukan di layout.jsx, supaya Navbar dan seluruh
    // halaman membaca SATU hasil `/api/auth/me` yang sama. Sebelumnya Navbar
    // memanggilnya sendiri setiap kali alamat berpindah, dan hasilnya tidak
    // pernah sampai ke komponen lain.
    <SesiProvider>
      <div className="mx-auto w-full max-w-md min-h-screen relative bg-[#f5f5f7] dark:bg-[#000000] shadow-2xl overflow-x-hidden flex flex-col">
        {!isImmersive && <Navbar config={config} />}
        <main className={cn(
          "flex-1 flex flex-col",
          // Ruang bawah disesuaikan: dock + kolom cari yang menempel di bawah
          !isAdmin && !isChat && !isTeman ? "pb-36 md:pb-32" : ""
        )}>
          {children}
        </main>
        {!isImmersive && (
          <>
            <GlobalChatNotifier />
            <SwipeBackGesture />
            <GlobalPullToRefresh />
            <InstallPrompt />
            {/* Ajakan notifikasi peramban. Menahan dirinya sendiri (kunjungan
                kedua / 25 detik), karena izin notifikasi cuma bisa diminta sekali. */}
            <NotifPrompt />
            <PopupSponsor config={config} />
            <BottomNavbar />
            {!hideFooter && <Footer config={config} />}
          </>
        )}
        {/* Lightbox global — aktif di semua halaman, dipicu oleh img[data-zoom] */}
        <GlobalImageLightbox />
      </div>
    </SesiProvider>
  );
}
