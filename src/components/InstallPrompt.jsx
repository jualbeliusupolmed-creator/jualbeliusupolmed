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

  // Render floating banner (hanya muncul di perangkat mobile)
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-xl bg-gray-900/95 backdrop-blur-md p-3 shadow-2xl flex items-center justify-between md:hidden dark:bg-slate-800/95 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 shrink-0 bg-white/20 rounded-lg flex items-center justify-center text-white">
          <Icon.Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">Install Aplikasi</p>
          <p className="text-[10px] text-gray-300 truncate">Lebih cepat & hemat kuota</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleDismiss} className="text-xs text-gray-400 p-2 font-medium">Batal</button>
        <button onClick={handleInstall} className="bg-white text-gray-900 px-4 py-2 rounded-lg text-xs font-bold active:scale-95 transition-transform">Install</button>
      </div>
    </div>
  );
}
