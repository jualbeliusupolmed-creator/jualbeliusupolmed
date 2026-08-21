/**
 * Satu-satunya daftar menu admin.
 *
 * Sebelum ini ada dua: satu di AdminSidebar (dipakai halaman baru) dan satu
 * lagi di dalam AdminPanel (dipakai halaman lama). Isinya sudah lama berbeda —
 * label tidak sama, urutan tidak sama, "Toko" dan "Distributor" cuma ada di
 * salah satunya, dan "Blacklist" masih dipajang padahal alamatnya sudah
 * dihapus dari ADMIN_TABS sehingga selalu berakhir 404.
 *
 * Semua yang butuh menu sekarang membaca berkas ini. Menambah halaman admin
 * berarti menambah satu baris di sini, bukan dua daftar yang harus diingat.
 */

export const ICONS = {
  overview:       "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z",
  moderasi:       "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  listings:       "M4 6h16M4 12h16M4 18h16",
  transaksi:      "M3 10h18M7 15h2m4 0h4M5 5h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z",
  tawaran:        "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14H7l4-8 4 6-2-2-2 4z",
  dicari:         "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  rating:         "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z",
  kategori:       "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  penjual:        "M17 20h5V4H2v16h5m10 0v2m-10-2v2M8 9h8",
  toko:           "M3 9l1-5h16l1 5M3 9h18M3 9v11a1 1 0 001 1h16a1 1 0 001-1V9M9 21v-6h6v6",
  profil_request: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7zM9 12h6M12 9v6",
  distributor:    "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM9 22V12h6v10",
  reports:        "M12 9v4m0 4h.01M10.3 3.3l-8 14A2 2 0 004 20h16a2 2 0 001.7-3l-8-14a2 2 0 00-3.4 0z",
  blogs:          "M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l6 6v10a2 2 0 01-2 2zM14 4v6h6M9 13h6M9 17h6",
  grouppost:      "M17 3a2 2 0 012 2v6a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h12z",
  keuangan:       "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  tren:           "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14zM21 3l-5 5m0-5l5 5",
  audit:          "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
  wabot:          "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z",
  broadcast:      "M3 3h18v4H3zM3 17h18v4H3zM7 8h10v8H7z",
  antrean:        "M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z",
  notifikasi:     "M15 17h5l-1.41-1.41A1 1 0 0118 15V10a6 6 0 00-5-5.92V4a1 1 0 00-2 0v.08A6 6 0 006 10v5a1 1 0 01-.59.89L4 17h5m6 0a3 3 0 01-6 0",
  ai:             "M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z",
  referral:       "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm10 0l2 2-2 2m4-2H15",
  pengaturan:     "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-2.18-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-2.18 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 002.18.33h.08A1.65 1.65 0 009 3.09V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 2.18v.08a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  search:         "M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z",
  logout:         "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
};

export const GROUPS = [
  {
    label: "Utama",
    items: [
      { key: "overview", label: "Ringkasan" },
      { key: "antrean",  label: "Antrean WA" },
      { key: "moderasi", label: "Moderasi" },
    ],
  },
  {
    label: "Marketplace",
    items: [
      { key: "listings",  label: "Listing" },
      { key: "transaksi", label: "Transaksi" },
      { key: "tawaran",   label: "Tawaran Harga" },
      { key: "dicari",    label: "Dicari" },
      { key: "rating",    label: "Rating" },
      { key: "kategori",  label: "Kategori" },
    ],
  },
  {
    label: "Pengguna",
    items: [
      { key: "penjual",        label: "Penjual" },
      { key: "toko",           label: "Toko" },
      { key: "profil_request", label: "Ubah Profil" },
      { key: "distributor",    label: "Distributor" },
      { key: "reports",        label: "Laporan" },
    ],
  },
  {
    label: "Konten",
    items: [
      { key: "blogs",     label: "Artikel Blog" },
      { key: "grouppost", label: "Post Grup" },
    ],
  },
  {
    label: "Analitik",
    items: [
      { key: "keuangan", label: "Keuangan" },
      { key: "tren",     label: "Tren Pencarian" },
      { key: "audit",    label: "Audit Trail" },
    ],
  },
  {
    label: "Bot & Komunikasi",
    items: [
      { key: "wabot",      label: "WhatsApp Bot" },
      { key: "broadcast",  label: "Broadcast" },
      { key: "notifikasi", label: "Notifikasi" },
      { key: "ai",         label: "AI & Memori" },
      { key: "referral",   label: "Referral" },
    ],
  },
  {
    label: "Sistem",
    items: [{ key: "pengaturan", label: "Pengaturan" }],
  },
];

/** Daftar datar untuk nav mobile dan pencarian judul halaman. */
export const NAV = GROUPS.flatMap((g) => g.items);

/** Judul halaman = label menunya, supaya keduanya tidak pernah berbeda. */
export function labelTab(key) {
  return NAV.find((n) => n.key === key)?.label || "Admin";
}
