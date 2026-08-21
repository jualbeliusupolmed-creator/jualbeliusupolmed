"use client";

import { usePathname } from "next/navigation";

/*
 * Panel admin dipasang di DUA alamat dari satu kode yang sama:
 *
 *   /admin       — panel sungguhan, bergerbang sandi, data sungguhan
 *   /admin-demo  — salinan terbuka untuk dipelajari siapa saja, data karangan
 *
 * Yang membedakan keduanya cuma dua hal: dari mana datanya datang, dan apakah
 * tombolnya benar-benar mengerjakan sesuatu. Rupanya sengaja sama persis —
 * itu memang gunanya.
 *
 * Basisnya diturunkan dari alamat halaman, bukan dari prop yang dioper dari
 * atas. Alasannya praktis: komponen nav sudah membaca `usePathname()` untuk
 * menandai menu yang aktif, jadi menambahkan prop `base` ke seluruh pohon
 * komponen berarti dua sumber kebenaran untuk satu hal yang sama — dan yang
 * satu pasti akan lupa diperbarui.
 */

/** "/admin" atau "/admin-demo", menurut alamat yang sedang dibuka. */
export function useBasisAdmin() {
  const pathname = usePathname() || "";
  return pathname.startsWith("/admin-demo") ? "/admin-demo" : "/admin";
}

/** true kalau yang sedang dibuka adalah salinan demo. */
export function useModeDemo() {
  const pathname = usePathname() || "";
  return pathname.startsWith("/admin-demo");
}

/**
 * Awalan API yang cocok dengan basis halaman.
 *
 * Halaman Keuangan, Tren, dan Audit adalah komponen klien yang mengambil
 * datanya sendiri lewat fetch. Supaya ketiganya bisa dipakai apa adanya di
 * salinan demo — bukan disalin jadi versi kedua yang perlahan berbeda —
 * yang berubah cuma alamat yang dipanggilnya.
 */
export function useBasisApi() {
  const pathname = usePathname() || "";
  return pathname.startsWith("/admin-demo") ? "/api/admin-demo" : "/api/admin";
}
