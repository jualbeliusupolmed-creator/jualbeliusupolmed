// Utilitas filter kata-kata kasar / SARA / Toxic untuk Mading & Menfess

const BAD_WORDS = [
  "anjing", "babi", "bangsat", "kontol", "memek", "pantek", "puki", "jembut",
  "itil", "ngentot", "ngewe", "titit", "lonte", "perek", "bencong", "banci",
  "tolol", "goblok", "idiot", "cacat", "autis", "kampret", "bajingan", "asu",
  "tai", "tae", "pepek", "sange", "bokep", "porno", "coly", "coli", "open bo",
  "vcs", "judi", "slot", "gacor", "zeus", "pragmatic", "maxwin", "togel"
];

/**
 * Memeriksa apakah ada kata terlarang dalam teks
 * @param {string} text 
 * @returns {boolean}
 */
export function hasProfanity(text) {
  if (!text || typeof text !== "string") return false;
  const lower = text.toLowerCase();
  return BAD_WORDS.some(word => {
    const regex = new RegExp(`\\b${word}\\b`, "i");
    return regex.test(lower) || lower.includes(word);
  });
}

/**
 * Menyensor kata terlarang menjadi tanda bintang (***)
 * @param {string} text 
 * @returns {string}
 */
export function censorProfanity(text) {
  if (!text || typeof text !== "string") return text;
  let censored = text;
  BAD_WORDS.forEach(word => {
    const regex = new RegExp(word, "gi");
    censored = censored.replace(regex, (match) => "*".repeat(match.length));
  });
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
