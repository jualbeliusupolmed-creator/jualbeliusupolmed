"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Jangan tampilkan jika user sudah dismiss sebelumnya
    if (localStorage.getItem("pwa_prompt_dismissed")) return;

    const handler = (e) => {
      // Mencegah Chrome memunculkan mini-infobar bawaan
      e.preventDefault();
      // Simpan event agar bisa dipanggil nanti
      window.pwaDeferredPrompt = e;
      setDeferredPrompt(e);
      // Tampilkan banner kustom kita
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    
    // Tampilkan prompt instalasi native
    deferredPrompt.prompt();
    
    // Tunggu respon user
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      window.pwaDeferredPrompt = null;
      setDeferredPrompt(null);
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem("pwa_prompt_dismissed", "true");
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  // Render floating banner (hanya muncul di perangkat mobile, tepat di atas BottomNavbar)
  return (
    <div className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] left-3.5 right-3.5 z-50 rounded-2xl bg-gray-900/95 backdrop-blur-xl p-3.5 shadow-2xl border border-white/10 flex items-center justify-between md:hidden dark:bg-slate-900/95 dark:border-slate-800 animate-in slide-in-from-bottom-5 duration-300">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="h-9 w-9 shrink-0 bg-primary/20 text-primary dark:text-emerald-400 rounded-xl flex items-center justify-center">
          <Icon.Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">Install Aplikasi</p>
          <p className="text-[10px] text-gray-300 dark:text-slate-400 truncate">Akses instan & lebih hemat kuota</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button onClick={handleDismiss} className="text-xs text-gray-400 hover:text-white px-2.5 py-1.5 font-medium rounded-lg active:scale-95 transition-all">Batal</button>
        <button onClick={handleInstall} className="bg-white text-gray-900 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-md active:scale-95 transition-all">Install</button>
      </div>
    </div>
  );
}
