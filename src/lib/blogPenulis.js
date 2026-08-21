// Aturan tunggal untuk artikel yang ditulis penjual.
//
// Dipakai bersama oleh rute penulis (/api/blog/penulis), panel admin, dan
// dasbor penjual — supaya "kapan sebuah artikel terbit" hanya dijawab di satu
// tempat. Jawaban yang berbeda di dua tempat pada alur persetujuan berarti
// tulisan yang tampil padahal belum disetujui, atau sebaliknya.
import crypto from "crypto";

/**
 * Empat status, dan tiap status punya satu kalimat yang menjelaskan artinya
 * bagi penulisnya. Kalimat itu ikut di sini, bukan di komponen: penjual yang
 * tulisannya "menunggu" perlu tahu ia sudah terkirim, dan itu keterangan yang
 * sama di mana pun ia dibaca.
 */
export const STATUS_ARTIKEL = {
  draft: {
    label: "Draf",
    jelas: "Belum dikirim. Cuma kamu yang bisa melihatnya.",
    nada: "abu",
  },
  menunggu: {
    label: "Menunggu review",
    jelas: "Sudah masuk antrean admin. Belum tampil di halaman blog.",
    nada: "kuning",
  },
  published: {
    label: "Terbit",
    jelas: "Tayang di /blog dan bisa dibaca siapa saja.",
    nada: "hijau",
  },
  ditolak: {
    label: "Ditolak",
    jelas: "Perbaiki sesuai catatan admin, lalu kirim lagi.",
    nada: "merah",
  },
};

export const STATUS_SAH = Object.keys(STATUS_ARTIKEL);

/** Batas panjang. Ditegakkan di server; formulir cuma memberi tahu lebih awal. */
export const BATAS = {
  judul: 120,
  isi: 20000,
  ringkas: 220,
  kataKunci: 200,
};

/**
 * Badge penulis: satu-satunya hal yang memisahkan "langsung terbit" dari
 * "menunggu admin". Diberikan dan dicabut admin, tidak pernah oleh penjual.
 */
export function berbadge(profil) {
  return profil?.blog_badge === true;
}

/**
 * Status yang didapat sebuah artikel begitu penulisnya menekan "Kirim".
 *
 * Perhatikan yang TIDAK ada di sini: tidak ada jalan bagi penjual untuk
 * memilih "published" sendiri. Nilainya selalu dihitung dari profilnya di
 * server, jadi badan permintaan yang menyelipkan status apa pun tidak
 * berpengaruh.
 */
export function statusSetelahKirim(profil) {
  return berbadge(profil) ? "published" : "menunggu";
}

/** Alamat publik artikel. */
export function urlArtikel(slug) {
  const dasar = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  return `${dasar}/blog/${slug}`;
}

/**
 * Slug dari judul + penanda acak 6 huruf.
 *
 * Penandanya bukan hiasan: `blogs.slug` itu UNIQUE, dan dua penjual yang
 * sama-sama menulis "Tips Cari Kos Murah" akan bertabrakan tanpa itu —
 * yang kedua gagal menyimpan dengan galat database yang tidak berarti apa pun
 * baginya. Slug juga TIDAK pernah dihitung ulang saat artikel disunting:
 * alamat yang sudah dibagikan orang tidak boleh berubah di belakang mereka.
 */
export function slugArtikel(judul) {
  const dasar = String(judul || "artikel")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60)
    .replace(/^-|-$/g, "");
  const penanda = crypto.randomBytes(3).toString("hex");
  return `${dasar || "artikel"}-${penanda}`;
}

/** Ringkasan otomatis dari markdown, dipakai kalau penulis mengosongkannya. */
export function ringkasOtomatis(markdown, panjang = 180) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_`~>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, panjang);
}

/**
 * Periksa isian artikel. Mengembalikan pesan galat, atau null kalau lolos.
 * Satu fungsi supaya rute penulis dan editor admin tidak berbeda pendapat.
 */
export function periksaArtikel({ title, content_markdown, excerpt, keywords }) {
  const judul = String(title || "").trim();
  const isi = String(content_markdown || "").trim();

  if (judul.length < 5) return "Judul terlalu pendek — minimal 5 huruf.";
  if (judul.length > BATAS.judul) return `Judul maksimal ${BATAS.judul} huruf.`;
  if (isi.length < 200) return "Isi artikel terlalu pendek — minimal 200 huruf, kira-kira satu paragraf penuh.";
  if (isi.length > BATAS.isi) return `Isi artikel maksimal ${BATAS.isi.toLocaleString("id-ID")} huruf.`;
  if (String(excerpt || "").length > BATAS.ringkas) return `Ringkasan maksimal ${BATAS.ringkas} huruf.`;
  if (String(keywords || "").length > BATAS.kataKunci) return `Kata kunci maksimal ${BATAS.kataKunci} huruf.`;
  return null;
}
