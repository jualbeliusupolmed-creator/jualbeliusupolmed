"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/*
 * Satu sumber sesi untuk seluruh sisi klien.
 *
 * MASALAH YANG DIPERBAIKINYA
 *
 * Kebenaran sesi tinggal di kuki `seller_session` — httpOnly, 30 hari,
 * bertanda tangan (lihat lib/auth.js). Tapi yang dibaca hampir seluruh
 * antarmuka bukan kuki itu, melainkan `localStorage.seller_wa`: delapan
 * berkas membacanya untuk menentukan "siapa yang sedang memakai ini".
 *
 * Dua nilai itu bisa berbeda, dan yang paling sering terjadi adalah yang
 * paling menyakitkan: kukinya masih sah, localStorage-nya kosong. Cukup
 * satu pembersihan data peramban, satu ganti peramban, atau satu peranti
 * baru. Navbar sendiri sudah memanggil `/api/auth/me` dan mengetahui nomor
 * yang benar — tapi ia TIDAK PERNAH menuliskannya kembali ke localStorage.
 * Jadi pengunjung melihat namanya terpampang di pojok kanan atas, lalu
 * menekan "Jual" dan diminta masuk lagi, seolah ia orang asing.
 *
 * Ditambah satu pemborosan: pemeriksaan itu berjalan ULANG setiap kali
 * alamat berpindah, dan setiap panggilan `/api/auth/me` ikut menanyai
 * Supabase untuk profilnya.
 *
 * ATURANNYA SEKARANG
 *
 * 1. Kuki tetap satu-satunya kebenaran. localStorage cuma cerminannya —
 *    dipakai supaya formulir bisa terisi tanpa menunggu jaringan.
 * 2. Cerminnya dipulihkan otomatis. Kalau kuki sah dan localStorage kosong,
 *    provider ini mengisinya kembali. Tidak ada lagi "login berkali-kali".
 * 3. Kalau kuki sudah tidak sah, cerminnya dihapus — supaya tidak ada
 *    antarmuka yang menyangka dirinya masih masuk lalu ditolak 401.
 * 4. Satu permintaan per pemuatan halaman, dipakai bersama semua pemakai
 *    (lihat `janjiSesi`), bukan satu per komponen dan bukan satu per pindah
 *    alamat.
 *
 * `siap` membedakan "belum tahu" dari "sudah tahu, memang tidak masuk".
 * Tanpa itu, tiap gerbang akan berkedip jadi layar login selama satu detik
 * pertama — bentuk lain dari disuruh masuk lagi.
 */

const KUNCI_WA = "seller_wa";
const KUNCI_NAMA = "seller_name";

const SesiCtx = createContext(null);

function bacaCermin() {
  if (typeof window === "undefined") return { wa: "", nama: "" };
  try {
    return {
      wa: window.localStorage.getItem(KUNCI_WA) || "",
      nama: window.localStorage.getItem(KUNCI_NAMA) || "",
    };
  } catch {
    // Mode privat sebagian peramban melempar saat localStorage disentuh.
    return { wa: "", nama: "" };
  }
}

function tulisCermin(wa, nama) {
  if (typeof window === "undefined") return;
  try {
    if (wa) window.localStorage.setItem(KUNCI_WA, wa);
    else window.localStorage.removeItem(KUNCI_WA);
    if (nama) window.localStorage.setItem(KUNCI_NAMA, nama);
    else if (!wa) window.localStorage.removeItem(KUNCI_NAMA);
  } catch {
    /* localStorage tidak tersedia — sesi tetap jalan lewat kuki. */
  }
}

// Satu permintaan dipakai bersama. Sepuluh komponen yang bertanya bersamaan
// saat halaman dibuka tetap menghasilkan satu panggilan jaringan.
let janjiSesi = null;

function ambilSesi({ paksa = false } = {}) {
  if (paksa) janjiSesi = null;
  if (!janjiSesi) {
    janjiSesi = fetch("/api/auth/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null);
  }
  return janjiSesi;
}

export function SesiProvider({ children }) {
  // Tebakan awal dari cermin supaya formulir tidak berkedip kosong. Ia
  // dikoreksi begitu server menjawab — termasuk dikosongkan kalau ternyata
  // kukinya sudah tidak sah.
  const [sesi, setSesi] = useState(() => ({ ...bacaCermin(), siap: false, profil: null }));

  const terapkan = useCallback((data) => {
    if (data?.loggedIn && data.wa) {
      const nama = data.name || bacaCermin().nama || "";
      tulisCermin(data.wa, nama);
      setSesi({ wa: data.wa, nama, siap: true, profil: data.profile || null });
    } else {
      tulisCermin("", "");
      setSesi({ wa: "", nama: "", siap: true, profil: null });
    }
  }, []);

  useEffect(() => {
    let hidup = true;
    ambilSesi().then((d) => {
      if (hidup) terapkan(d);
    });
    return () => {
      hidup = false;
    };
  }, [terapkan]);

  // Dipanggil sesudah masuk/keluar. Menyegarkan dari server, bukan menebak —
  // supaya nomor yang tersimpan selalu nomor yang benar-benar dipegang kuki.
  const segarkan = useCallback(async () => {
    const d = await ambilSesi({ paksa: true });
    terapkan(d);
    return d;
  }, [terapkan]);

  const keluar = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      janjiSesi = null;
      tulisCermin("", "");
      setSesi({ wa: "", nama: "", siap: true, profil: null });
    }
  }, []);

  return (
    <SesiCtx.Provider value={{ ...sesi, masuk: segarkan, segarkan, keluar }}>
      {children}
    </SesiCtx.Provider>
  );
}

/**
 * `{ wa, nama, siap, profil, segarkan(), masuk(), keluar() }`
 *
 * Di luar provider — misalnya komponen yang dipakai halaman admin — ia
 * mengembalikan bentuk yang sama dengan `siap: true` dan sesi kosong, jadi
 * pemakainya tidak perlu menjaga-jaga null.
 */
export function useSesi() {
  return (
    useContext(SesiCtx) || {
      wa: "",
      nama: "",
      siap: true,
      profil: null,
      masuk: async () => null,
      segarkan: async () => null,
      keluar: async () => {},
    }
  );
}
