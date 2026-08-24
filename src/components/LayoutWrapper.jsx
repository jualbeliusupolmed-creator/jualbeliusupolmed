"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import InstallPrompt from "./InstallPrompt";
import NotifPrompt from "./NotifPrompt";
import BottomNavbar from "./BottomNavbar";
import GlobalChatNotifier from "./GlobalChatNotifier";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isChat = pathname?.startsWith("/chat");
  const isHome = pathname === "/";
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (!isAdmin) {
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => setConfig(data))
        .catch((err) => console.error("Gagal memuat config:", err));
    }
  }, [isAdmin]);

  return (
    <>
      {!isAdmin && !isChat && <Navbar config={config} />}
      <main className={isAdmin ? "flex-1" : isChat ? "flex-1 bg-[#f5f5f7] dark:bg-[#000000] flex flex-col" : "flex-1 bg-[#f5f5f7] pb-24 md:pb-28 dark:bg-[#0b0b0f]"}>{children}</main>
      {!isAdmin && (
        <>
          <GlobalChatNotifier />
          <InstallPrompt />
          {/* Ajakan notifikasi peramban. Menahan dirinya sendiri (kunjungan
              kedua / 25 detik), karena izin notifikasi cuma bisa diminta sekali. */}
          <NotifPrompt />
          {!isChat && <BottomNavbar />}
          {!isChat && !isHome && <Footer config={config} />}
        </>
      )}
    </>
  );
}
