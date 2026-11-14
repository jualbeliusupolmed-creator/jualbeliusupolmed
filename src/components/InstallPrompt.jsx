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

    let timer = null;
    const handler = (e) => {
      e.preventDefault();
      window.pwaDeferredPrompt = e;
      setDeferredPrompt(e);
      // Beri waktu user menjelajah dulu, jangan langsung todong popup
      timer = setTimeout(() => {
        if (!localStorage.getItem("pwa_prompt_dismissed")) {
          setShowPrompt(true);
        }
      }, 15000);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
    };
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

  return (
    <div data-mobile-overlay="install" className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom,0px))] left-3.5 right-3.5 z-50 rounded-2xl bg-slate-900 p-3.5 shadow-lg border border-slate-800 flex items-center justify-between md:hidden dark:bg-slate-900 dark:border-slate-800 animate-in slide-in-from-bottom-5 duration-300 motion-reduce:animate-none">
      <div className="flex items-center gap-3 min-w-0 pr-2">
        <div className="h-9 w-9 shrink-0 bg-primary/20 text-primary dark:text-emerald-400 rounded-xl flex items-center justify-center">
          <Icon.Download className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-white truncate">Install Aplikasi</p>
          <p className="text-[10px] text-slate-300 dark:text-slate-400 truncate">Akses instan &amp; lebih hemat kuota</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 font-medium rounded-lg active:translate-y-px transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          Batal
        </button>
        <button
          type="button"
          onClick={handleInstall}
          className="bg-white text-slate-900 px-3.5 py-1.5 rounded-xl text-xs font-bold shadow-xs active:translate-y-px transition-colors hover:bg-slate-100 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-emerald-600"
        >
          Install
        </button>
      </div>
    </div>
  );
}
