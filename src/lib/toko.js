/**
 * toko.js — aturan bersama untuk storefront penjual (/toko/[slug]).
 *
 * Dipakai dua sisi: form di dasbor (supaya penjual tahu kenapa slug-nya
 * ditolak sebelum menekan simpan) dan API (yang tidak boleh mempercayai
 * pemeriksaan sisi peramban sama sekali). Karena itu semua aturannya duduk
 * di satu berkas — dua salinan aturan yang perlahan berbeda adalah cara
 * paling umum sebuah validasi berubah jadi lubang.
 */

// Alamat toko tinggal satu ruas di bawah /toko/, jadi bentrokan dengan rute
// aplikasi tidak mungkin terjadi. Yang tetap dilarang: kata yang membuat
// tautannya menipu ("admin", "official"), dan ruas yang mungkin kita pakai
// sendiri di masa depan di bawah /toko/.
const TERLARANG = new Set([
  "admin", "administrator", "api", "official", "resmi", "support", "bantuan",
  "jualbeliusupolmed", "usu", "polmed", "pandi", "new", "baru", "daftar",
  "login", "logout", "masuk", "keluar", "dashboard", "dasbor", "toko",
  "settings", "pengaturan", "edit", "buat", "cari", "search", "null",
  "undefined", "index", "sitemap", "robots", "favicon", "static", "assets",
]);

export const SLUG_MIN = 3;
export const SLUG_MAX = 32;

/**
 * Ubah apa pun yang diketik penjual menjadi bentuk slug yang sah.
 * Sengaja permisif: yang dipakai penjual adalah nama tokonya, dan menolak
 * "Warung Ridho!" lebih menjengkelkan daripada diam-diam membuat
 * "warung-ridho" lalu memperlihatkan hasilnya sebelum disimpan.
 */
export function normalisasiSlug(nilai) {
  return String(nilai ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // buang tanda diakritik
    .replace(/[^a-z0-9]+/g, "-")       // apa pun selain huruf/angka jadi pemisah
    .replace(/^-+|-+$/g, "")           // jangan diawali/diakhiri tanda hubung
    .replace(/-{2,}/g, "-")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");              // pemotongan bisa menyisakan tanda hubung
}

/**
 * @returns {{ok: true, slug: string} | {ok: false, alasan: string}}
 */
export function periksaSlug(nilai) {
  const slug = normalisasiSlug(nilai);
  if (!slug) return { ok: false, alasan: "Alamat toko belum diisi." };
  if (slug.length < SLUG_MIN) {
    return { ok: false, alasan: `Terlalu pendek — minimal ${SLUG_MIN} huruf.` };
  }
  if (TERLARANG.has(slug)) {
    return { ok: false, alasan: `"${slug}" sudah dipakai sistem. Pilih yang lain.` };
  }
  // Slug yang seluruhnya angka gampang tertukar dengan nomor HP, dan itu
  // justru hal yang ingin disembunyikan halaman toko dari URL.
  if (/^\d+$/.test(slug)) {
    return { ok: false, alasan: "Jangan hanya angka — pakai nama tokomu." };
  }
  return { ok: true, slug };
}

/** Pilihan warna aksen. Terbatas dan sudah dicek kontrasnya, bukan pemilih
 *  warna bebas: penjual tidak seharusnya bisa membuat tokonya sendiri
 *  tidak terbaca. */
export const AKSEN = {
  emerald: { nama: "Hijau",  utama: "#059669", muda: "#ecfdf5", teks: "#065f46" },
  blue:    { nama: "Biru",   utama: "#2563eb", muda: "#eff6ff", teks: "#1e40af" },
  rose:    { nama: "Merah",  utama: "#e11d48", muda: "#fff1f2", teks: "#9f1239" },
  amber:   { nama: "Kuning", utama: "#d97706", muda: "#fffbeb", teks: "#92400e" },
  violet:  { nama: "Ungu",   utama: "#7c3aed", muda: "#f5f3ff", teks: "#5b21b6" },
  slate:   { nama: "Abu",    utama: "#334155", muda: "#f8fafc", teks: "#1e293b" },
};

export function aksenAman(kunci) {
  return AKSEN[kunci] ? kunci : "emerald";
}

/** Batas panjang teks bebas. Dipaksa di API juga, bukan cuma maxLength di
 *  form — atribut HTML tidak mengikat siapa pun yang memanggil API langsung. */
export const BATAS = {
  store_name: 60,
  tagline: 120,
  store_area: 60,
  store_hours: 80,
  store_instagram: 40,
  store_announcement: 300,
  bio: 500,
};

export function potong(nilai, batas) {
  const teks = String(nilai ?? "").trim();
  return teks ? teks.slice(0, batas) : null;
}

/** Bersihkan input Instagram: orang menempel URL penuh, "@nama", atau nama
 *  polos — ketiganya harus mendarat sebagai nama polos. */
export function normalisasiInstagram(nilai) {
  const teks = String(nilai ?? "").trim();
  if (!teks) return null;
  const nama = teks
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "")
    .trim();
  return /^[A-Za-z0-9._]{1,30}$/.test(nama) ? nama : null;
}

/** Nama yang ditampilkan di halaman toko: nama toko kalau ada, kalau tidak
 *  nama penjual apa adanya. Storefront tanpa nama tidak boleh terjadi. */
export function namaToko(profil) {
  return (profil?.store_name || profil?.name || "Toko").trim();
}

/* ── Persetujuan admin ──────────────────────────────────────────────────────
 *
 * Sejak "punya toko = iklan gratis", membuat toko bukan lagi urusan tampilan:
 * ia pintu masuk ke iklan tanpa biaya. Karena itu toko baru menunggu
 * persetujuan admin dulu, dan alurnya cuma satu arah:
 *
 *   draf → menunggu → aktif
 *              └───→ ditolak → (penjual perbaiki) → menunggu
 *
 * Kolomnya lahir di BAGIAN 26. Sebelum migrasi itu dijalankan, `store_status`
 * TIDAK ADA di baris mana pun — dan pada saat itu satu-satunya jawaban yang
 * benar adalah "toko lama tetap hidup". Itulah kenapa tokoAktif() jatuh ke
 * `!!slug` saat kolomnya undefined: migrasi yang belum dijalankan tidak boleh
 * memadamkan halaman toko yang alamatnya sudah disebar penjualnya.
 */

export const STATUS_TOKO = ["draf", "menunggu", "aktif", "ditolak"];

export const LABEL_STATUS = {
  draf: "Belum diajukan",
  menunggu: "Menunggu persetujuan admin",
  aktif: "Aktif",
  ditolak: "Ditolak admin",
};

export function statusToko(profil) {
  if (!profil) return "draf";
  // Kolomnya belum ada (migrasi BAGIAN 26 belum jalan) → toko lama tetap aktif.
  if (profil.store_status === undefined) return profil.slug ? "aktif" : "draf";
  return STATUS_TOKO.includes(profil.store_status) ? profil.store_status : "draf";
}

/** Boleh tayang di /toko/<slug> dan berhak atas iklan gratis. */
export function tokoAktif(profil) {
  return !!profil?.slug && statusToko(profil) === "aktif";
}
