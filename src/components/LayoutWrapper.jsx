"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import InstallPrompt from "./InstallPrompt";
import NotifPrompt from "./NotifPrompt";
import BottomNavbar from "./BottomNavbar";

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
      {!isAdmin && <Navbar config={config} />}
      <main className={isAdmin ? "flex-1" : "flex-1 pb-24 md:pb-28"}>{children}</main>
      {!isAdmin && (
        <>
          <InstallPrompt />
          {/* Ajakan notifikasi peramban. Menahan dirinya sendiri (kunjungan
              kedua / 25 detik), karena izin notifikasi cuma bisa diminta sekali. */}
          <NotifPrompt />
          <BottomNavbar />
          {!isChat && !isHome && <Footer config={config} />}
        </>
      )}
    </>
  );
}
