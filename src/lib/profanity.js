// Utilitas filter kata-kata kasar / SARA / Toxic untuk Mading & Menfess

const BAD_WORDS = [
  "anjing", "babi", "bangsat", "kontol", "memek", "pantek", "puki", "jembut",
  "itil", "ngentot", "ngewe", "titit", "lonte", "perek", "bencong", "banci",
  "tolol", "goblok", "idiot", "cacat", "autis", "kampret", "bajingan", "asu",
  "tai", "tae", "pepek", "sange", "bokep", "porno", "coly", "coli", "open bo",
  "vcs", "judi", "slot", "gacor", "zeus", "pragmatic", "maxwin", "togel"
];

// Dua kelemahan versi lama yang sama-sama diperbaiki di sini:
//
//   1. Gampang ditembus — "a n j i n g", "b4ngsat", "g0blok" lolos begitu saja
//      karena pencocokannya harfiah. Sekarang tiap huruf boleh diganti angka /
//      simbol yang serupa (leet) dan boleh diselingi spasi atau tanda baca.
//   2. Salah sensor — kata pendek dicocokkan sebagai substring, jadi "pantai"
//      kena karena mengandung "tai" dan "asuransi" kena karena "asu". Sekarang
//      kata pendek (≤4 huruf) wajib berdiri sendiri; kata panjang cukup diawali
//      batas kata supaya "anjingnya" tetap tertangkap.
const LEET = {
  a: "a4@", b: "b8", e: "e3", g: "g9", i: "i1!", l: "l1",
  o: "o0", s: "s5$", t: "t7",
};
const SELA = "[^a-zA-Z0-9]*"; // penyela antar-huruf: spasi, titik, simbol

function polaKata(word) {
  return word
    .split("")
    .map((ch) => {
      if (ch === " ") return "[^a-zA-Z0-9]+";
      return LEET[ch] ? `[${LEET[ch]}]` : ch;
    })
    .join(SELA);
}

const POLA = BAD_WORDS.map((word) => {
  const pendek = word.replace(/ /g, "").length <= 4;
  return new RegExp(
    `(^|[^a-zA-Z0-9])(${polaKata(word)})${pendek ? "(?![a-zA-Z0-9])" : ""}`,
    "gi"
  );
});

// Catatan: dulu ada `hasProfanity()` di sini, tidak pernah dipanggil siapa pun.
// Penyensoran yang sungguhan berjalan lewat `censorProfanity()` di tujuh rute
// (mading, komentar, balasan, chat, nama anonim). Kembaran yang hanya menjawab
// ya/tidak tidak pernah dibutuhkan, dan keberadaannya bikin orang mengira
// filternya belum terpasang.

/**
 * Menyensor kata terlarang menjadi tanda bintang (***)
 * @param {string} text
 * @returns {string}
 */
export function censorProfanity(text) {
  if (!text || typeof text !== "string") return text;
  let censored = text;
  for (const p of POLA) {
    p.lastIndex = 0;
    censored = censored.replace(p, (m, awal, kata) => awal + "*".repeat(kata.length));
  }
  return censored;
}

export const FACULTIES = [
  "Umum",
  "FASILKOM-TI",
  "Fakultas Teknik (FT)",
  "Fakultas Kedokteran (FK)",
  "Fakultas Ekonomi & Bisnis (FEB)",
  "Fakultas Hukum (FH)",
  "Fakultas Ilmu Budaya (FIB)",
  "Fakultas Pertanian (FP)",
  "Fakultas MIPA (FMIPA)",
  "Fakultas ISIP (FISIP)",
  "Fakultas Psikologi",
  "Fakultas Kesehatan Masyarakat (FKM)",
  "Fakultas Farmasi (FF)",
  "Fakultas Keperawatan",
  "Fakultas Kedokteran Gigi (FKG)",
  "Fakultas Kehutanan",
  "POLMED (Politeknik Negeri Medan)",
];

// Daftar barang terlarang marketplace (AdSense policy & Kampus Safety)
export const PROHIBITED_MARKETPLACE_KEYWORDS = [
  "vape", "vapor", "pod", "pods", "liquid", "relx", "mod vape", "rda", "rta",
  "oxva", "xlim", "nexlim", "iqos", "ursa", "caliburn", "vinci", "geekvape", "smok", "voopoo", "lostvape", "lost vape", "centaurus", "fizz", "aladdin",
  "rokok", "cerutu", "tembakau", "shisha", "sisha", "hookah",
  "tramadol", "dumolid", "alprazolam", "obat keras", "obat kuat", "miras", "alkohol", "arak", "tuak",
  "senjata", "sajam", "celurit", "airsoft"
];

/**
 * Memeriksa apakah judul atau deskripsi barang mengandung barang terlarang
 * @param {string} title
 * @param {string} description
 * @returns {{ prohibited: boolean, keyword?: string, reason?: string }}
 */
export function checkProhibitedListing(title = "", description = "") {
  const combined = `${title || ""} ${description || ""}`.toLowerCase();
  for (const item of PROHIBITED_MARKETPLACE_KEYWORDS) {
    const regex = new RegExp(`(^|[^a-z0-9])${item}([^a-z0-9]|$)`, "i");
    if (regex.test(combined)) {
      return {
        prohibited: true,
        keyword: item,
        reason: `Kata '${item}' dilarang untuk menjaga keamanan akun Google AdSense dan aturan kampus (vape, rokok, miras, obat)`,
      };
    }
  }
  return { prohibited: false };
}

/**
 * Deteksi risiko doxxing pada teks Menfess (NIM/Stambuk atau nomor kontak pribadi spesifik)
 * @param {string} text
 * @returns {{ risky: boolean, reason?: string }}
 */
export function detectDoxxingRisk(text = "") {
  if (!text || typeof text !== "string") return { risky: false };

  // 1. Nomor WhatsApp / ponsel eksplisit di dalam teks
  const phonePattern = /(?:(?:\+62|62|0)8[1-9][0-9]{7,11})/;
  if (phonePattern.test(text)) {
    return {
      risky: true,
      reason: "Dilarang menyebarkan nomor telepon/kontak pribadi di publik untuk mencegah doxxing dan spam.",
    };
  }

  // 2. Pola pencantuman NIM / Stambuk spesifik (format USU/POLMED biasanya 9-10 digit)
  const nimExplicitPattern = /\b(?:nim|stambuk|stb|stb:|nim:)\s*[0-9]{7,12}\b/i;
  const longDigitsPattern = /\b[0-9]{8,12}\b/;
  if (nimExplicitPattern.test(text) || longDigitsPattern.test(text)) {
    return {
      risky: true,
      reason: "Dilarang mencantumkan nomor induk mahasiswa (NIM/Stambuk) spesifik untuk menjaga privasi mahasiswa.",
    };
  }

  // 3. Pola target individu spesifik: inisial + stambuk / prodi / callout personal
  const personalCalloutPattern = /\b(?:inisial\s+[a-z]{1,3}|abang\s+inisial|kakak\s+inisial|dek\s+lain\s+kali|circle\s+di\s+prodi)\b/i;
  if (personalCalloutPattern.test(text)) {
    return {
      risky: true,
      reason: "Dilarang menargetkan individu lewat inisial, prodi, dan angkatan demi mencegah perundungan/doxxing di kampus.",
    };
  }

  return { risky: false };
}
