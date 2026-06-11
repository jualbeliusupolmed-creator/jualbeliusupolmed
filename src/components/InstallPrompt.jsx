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
    <div className="fixed bottom-24 left-4 right-4 z-50 rounded-2xl bg-white p-4 shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center justify-between md:hidden dark:bg-slate-900 dark:border-slate-800 animate-in slide-in-from-bottom-5">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary dark:bg-white/10 dark:text-white">
          <Icon.Download className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 dark:text-white truncate">Install Aplikasi</p>
          <p className="text-[11px] text-gray-500 dark:text-slate-400 truncate">Akses lebih cepat & hemat kuota</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={handleDismiss} className="text-xs text-gray-400 p-2 font-medium">Nanti</button>
        <button onClick={handleInstall} className="bg-primary text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-primary/20 active:scale-95 transition-transform">Install</button>
      </div>
    </div>
  );
}
