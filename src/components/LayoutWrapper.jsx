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
      <div className="w-full min-h-screen relative bg-[#f5f5f7] dark:bg-[#0f172a]">
        <div className={cn(
          "w-full mx-auto flex justify-center",
          !isAdmin && "md:max-w-7xl"
        )}>
          {/* Kiri: Sidebar Menu */}
          {!isImmersive && <LeftSidebar />}

          {/* Tengah: Main Feed Container */}
          <div className={cn(
            "w-full max-w-md md:max-w-[600px] flex-1 flex flex-col min-h-screen bg-white dark:bg-black border-x border-black/[0.06] dark:border-white/[0.08]",
            !isAdmin && "shadow-2xl md:shadow-none",
            isHome ? "lg:max-w-[1050px]" : "lg:max-w-[680px]"
          )}>
            {!isImmersive && (
              <div className="md:hidden">
                <Navbar config={config} />
              </div>
            )}
            
            <main className={cn(
              "flex-1 flex flex-col",
              !isAdmin && !isChat && !isTeman ? "pb-36 md:pb-8" : ""
            )}>
              {children}
            </main>
          </div>

          {/* Kanan: Widget/Trending */}
          {!isImmersive && !isHome && <RightSidebar config={config} />}
        </div>

        {!isImmersive && (
          <>
            <GlobalChatNotifier />
            <SwipeBackGesture />
            <GlobalPullToRefresh />
            <InstallPrompt />
            <NotifPrompt />
            <PopupSponsor config={config} />
            <BottomNavbar />
            {!hideFooter && <Footer config={config} />}
          </>
        )}
        <GlobalImageLightbox />
      </div>
    </SesiProvider>
  );
}
