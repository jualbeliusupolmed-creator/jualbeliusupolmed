"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Navbar from "./Navbar";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import InstallPrompt from "./InstallPrompt";

export default function LayoutWrapper({ children }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
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
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      {!isAdmin && (
        <>
          <BottomNav />
          <InstallPrompt />
          <div className="pb-16 md:pb-0">
            <Footer config={config} />
          </div>
        </>
      )}
    </>
  );
}
