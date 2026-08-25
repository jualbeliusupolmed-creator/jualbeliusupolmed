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
import { cn } from "@/lib/utils";

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

  // Sinkronisasi Google OAuth: setelah redirect /auth/callback, URL mengandung
  // ?_gwa=<identifier> yang perlu disimpan ke localStorage agar komponen lain
  // (profil, dashboard) tahu siapa yang sedang login.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const gwa = params.get("_gwa");
    if (gwa) {
      localStorage.setItem("seller_wa", gwa);
      // Bersihkan query param dari URL tanpa reload
      params.delete("_gwa");
      const newUrl = [window.location.pathname, params.toString()].filter(Boolean).join("?");
      window.history.replaceState({}, "", newUrl);
    }
  }, []);

  return (
    <>
      {!isImmersive && <Navbar config={config} />}
      <main className={cn(
        "flex-1 flex flex-col bg-[#f5f5f7]",
        isAdmin ? "dark:bg-[#000000]" : isChat || isTeman ? "dark:bg-[#000000]" : "dark:bg-[#0b0b0f]",
        !isAdmin && !isChat && !isTeman ? "pb-28 md:pb-32" : ""
      )}>
        {children}
      </main>
      {!isImmersive && (
        <>
          <GlobalChatNotifier />
          <InstallPrompt />
          {/* Ajakan notifikasi peramban. Menahan dirinya sendiri (kunjungan
              kedua / 25 detik), karena izin notifikasi cuma bisa diminta sekali. */}
          <NotifPrompt />
          <PopupSponsor config={config} />
          <BottomNavbar />
          {!hideFooter && <Footer config={config} />}
        </>
      )}
    </>
  );
}
