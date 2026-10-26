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
import LeftSidebar from "./LeftSidebar";
import RightSidebar from "./RightSidebar";
import ThemeToggleFloating from "./ThemeToggleFloating";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isChat = pathname?.startsWith("/chat");
  const isTeman = pathname?.startsWith("/teman");
  const hideFooter = isAdmin || isChat;
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => setConfig(data))
        .catch((err) => console.error("Gagal memuat config:", err));
    }
  }, [isAdmin]);

  // Sinkronisasi Google OAuth
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
    <SesiProvider>
      {isAdmin ? (
        children
      ) : (
        <div className="w-full min-h-screen relative overflow-x-clip bg-[#F8FAFC] dark:bg-[#0f172a] text-[#0F172A] dark:text-slate-100 flex flex-col justify-between font-sans">
          {/* Universal Sticky Top Navbar (Desktop 64px h-16, Mobile 56px h-14) */}
          <Navbar config={config} />

          {/* Main Content Area without vertical sidebar constraints */}
          <div className="w-full min-w-0 flex-1 flex flex-col">
            <main className={cn(
              "flex-1 flex flex-col w-full",
              !isChat && !isTeman ? "pb-24 lg:pb-0" : ""
            )}>
              {children}
            </main>
          </div>

          <GlobalChatNotifier />
          <SwipeBackGesture />
          <GlobalPullToRefresh />
          <InstallPrompt />
          <NotifPrompt />
          <PopupSponsor config={config} />
          <BottomNavbar />
          <ThemeToggleFloating />
          {!hideFooter && <Footer config={config} />}
        </div>
      )}
      <GlobalImageLightbox />
    </SesiProvider>
  );
}
