"use client";

import { useEffect, useState } from "react";

// Bilah alat yang tahu diri: menyingkir saat pengguna menggulir ke bawah
// (sedang membaca), lalu muncul lagi begitu digulir ke atas — juga selalu
// tampil di puncak dan di dasar halaman.
export function useHideOnScroll({ ambang = 10, batasAtas = 72 } = {}) {
  const [tersembunyi, setTersembunyi] = useState(false);

  useEffect(() => {
    let terakhir = window.scrollY;
    let menunggu = false;

    const perbarui = () => {
      const y = window.scrollY;
      const selisih = y - terakhir;
      const diPuncak = y < batasAtas;
      const diDasar =
        window.innerHeight + y >= document.documentElement.scrollHeight - 48;

      if (diPuncak || diDasar) {
        setTersembunyi(false);
        terakhir = y;
      } else if (Math.abs(selisih) > ambang) {
        setTersembunyi(selisih > 0);
        terakhir = y;
      }
      menunggu = false;
    };

    const saatGulir = () => {
      if (menunggu) return;
      menunggu = true;
      window.requestAnimationFrame(perbarui);
    };

    window.addEventListener("scroll", saatGulir, { passive: true });
    return () => window.removeEventListener("scroll", saatGulir);
  }, [ambang, batasAtas]);

  return tersembunyi;
}
