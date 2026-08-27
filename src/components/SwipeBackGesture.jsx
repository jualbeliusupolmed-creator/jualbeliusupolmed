"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hapticLight } from "@/lib/haptics";

// Usap dari tepi kiri untuk kembali. Hanya dinyalakan saat aplikasi dibuka
// sebagai PWA (layar penuh, tanpa tombol back peramban) — di dalam peramban
// biasa gerakan ini sudah disediakan sistem, dan menimpanya membuat halaman
// melompat dua kali.
export default function SwipeBackGesture() {
  const router = useRouter();

  useEffect(() => {
    const standalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      window.navigator.standalone === true;
    if (!standalone) return undefined;

    let x0 = null;
    let y0 = 0;
    let t0 = 0;

    const mulai = (e) => {
      const t = e.touches[0];
      if (t.clientX <= 26) {
        x0 = t.clientX;
        y0 = t.clientY;
        t0 = Date.now();
      } else {
        x0 = null;
      }
    };

    const selesai = (e) => {
      if (x0 === null) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - x0;
      const dy = Math.abs(t.clientY - y0);
      const dt = Date.now() - t0;
      x0 = null;
      if (dx > 84 && dy < 56 && dt < 700) {
        hapticLight();
        router.back();
      }
    };

    window.addEventListener("touchstart", mulai, { passive: true });
    window.addEventListener("touchend", selesai, { passive: true });
    return () => {
      window.removeEventListener("touchstart", mulai);
      window.removeEventListener("touchend", selesai);
    };
  }, [router]);

  return null;
}
