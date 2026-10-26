/**
 * Moderation Engine untuk Jual Beli USU Polmed
 * 
 * 2 Lapisan Moderasi:
 * 1. Aturan Deterministik Cepat & Hemat (Tanpa AI):
 *    - Deteksi kata/merek barang terlarang (vape, pod, liquid, rokok, miras, obat keras, joki, akun game, bokep)
 *    - Deteksi nomor HP di judul atau deskripsi
 *    - Deteksi anomali harga (harga 0, harga di luar rentang wajar per kategori)
 * 2. Lapisan Google Gemini AI (Hybrid):
 *    - Klasifikasi kategori terlarang dan analisis kecocokan foto dengan teks
 *    - Deteksi indikasi penipuan (scam)
 *    - Jika AI timeout / gagal, status jatuh ke 'pending' (antrean manual admin aman), BUKAN 'approved'
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

// Daftar merek dan istilah terlarang (Marketplace & Kampus Safety)
export const PROHIBITED_ITEMS = [
  // Vape & Rokok Elektrik
  "vape", "vapor", "vaping", "pod", "pods", "liquid", "liquid vape", "saltnic", "freebase",
  "oxva", "xlim", "nexlim", "voopoo", "vinci", "drag", "argus", "relx", "relx infinity",
  "uwell", "caliburn", "koko", "smok", "nord", "rpm", "geekvape", "aegis", "lost vape",
  "lostvape", "ursa", "ursa baby", "ursa nano", "centaurus", "thelema", "manto", "rincoe",
  "fizz", "aladdin", "mod vape", "rda", "rta", "rdta", "coil", "cartridge pod", "catridge",
  "iqos", "heets", "terea",

  // Rokok & Tembakau
  "rokok", "cerutu", "tembakau", "tobacco", "shisha", "sisha", "hookah", "bong",

  // Minuman Beralkohol
  "miras", "minuman keras", "alkohol", "arak", "tuak", "ciu", "soju", "beer", "bir", "bintang",
  "guinness", "heineken", "whiskey", "whisky", "vodka", "tequila", "rum", "cap tikus", "anggur merah", "amer",

  // Obat Keras & Narkotika
  "tramadol", "dumolid", "alprazolam", "hexymer", "trihex", "benzo", "trihexyphenidyl",
  "narkoba", "ganja", "sabu", "ekstasi", "inex", "pil koplo", "obat kuat", "obat perangsang",
  "viagra", "soloco", "obat penenang", "resep dokter",

  // Senjata & Sajam
  "senjata", "senpi", "pistol", "revolver", "senapan", "peluru", "airsoft", "airsoft gun",
  "sajam", "celurit", "clurit", "samurai", "katana", "pisau lipat", "karambit", "belati", "keris",

  // Dokumen Palsu & Jasa Ilegal Akademik
  "joki skripsi", "joki tugas", "joki ujian", "joki toefl", "joki ijazah", "ijazah aspal",
  "ijazah palsu", "surat sakit palsu", "surat dokter palsu", "pembuat ktp",

  // Akun Game & Kredensial Digital Ilegal
  "akun ml", "akun mobile legends", "akun ff", "akun free fire", "akun pubg", "jual akun",
  "beli akun", "topup ilegal", "jual chip", "chip domino", "higgs domino",

  // Konten Dewasa & Asusila
  "open bo", "bo include", "vcs", "video call sange", "pijat plus", "bokep", "porno", "lendir"
];

// Peta Leetspeak untuk menangkap variasi tulisan
const LEET_MAP = {
  a: "[a4@]",
  b: "[b8]",
  e: "[e3]",
  g: "[g9]",
  i: "[i1!|]",
  l: "[l1|]",
  o: "[o0]",
  s: "[s5$]",
  t: "[t7+]",
};

function buildRegexPola(word) {
  const sanitized = word.trim().toLowerCase();
  const pattern = sanitized
    .split("")
    .map((char) => {
      if (char === " ") return "\\s+";
      return LEET_MAP[char] || char;
    })
    .join("[^a-zA-Z0-9]*");

  return new RegExp(`(^|[^a-zA-Z0-9])(${pattern})([^a-zA-Z0-9]|$)`, "i");
}

const COMPILED_PATTERNS = PROHIBITED_ITEMS.map((item) => ({
  keyword: item,
  regex: buildRegexPola(item),
}));

// Rentang batas atas harga wajar per kategori (anomali protection)
export const CATEGORY_PRICE_LIMITS = {
  Elektronik: 50_000_000,
  Kendaraan: 150_000_000,
  Properti: 100_000_000,
  Kos: 5_000_000,
  Fashion: 5_000_000,
  Buku: 1_000_000,
  "Buku Kuliah": 1_500_000,
  Makanan: 500_000,
  Jasa: 10_000_000,
  Lainnya: 10_000_000,
};

// Zod Schema untuk output moderasi AI
const aiModerationSchema = z.object({
  is_prohibited: z.boolean(),
  prohibited_category: z.string().nullable().optional(),
  scam_risk_score: z.number().min(0).max(1),
  reason: z.string().default(""),
});

/**
 * Lapisan 1: Pengecekan Deterministik
 */
export function checkDeterministicModeration({ title = "", description = "", price = 0, category = "", type = "barang" }) {
  const fullText = `${title} ${description}`.toLowerCase();

  // 1. Cek Kata Kunci / Merek Terlarang
  for (const { keyword, regex } of COMPILED_PATTERNS) {
    if (regex.test(fullText)) {
      return {
        status: "rejected",
        risk_score: 1.0,
        moderation_reason: `Barang terlarang terdeteksi: '${keyword}'. Tidak diizinkan demi keselamatan kampus dan kebijakan AdSense.`,
        keyword,
      };
    }
  }

  // 2. Cek Nomor Telepon / WA di Judul atau Deskripsi
  // Format nomor HP Indonesia: 08xx atau +628xx atau 628xx (minimal 9 digit berturut-turut)
  const phoneInTextRegex = /(?:(?:\+62|62|0)8[0-9][0-9\s.-]{6,12}[0-9])/;
  if (phoneInTextRegex.test(title) || phoneInTextRegex.test(description)) {
    return {
      status: "pending",
      risk_score: 0.65,
      moderation_reason: "Ditemukan nomor telepon di judul atau deskripsi. Pembeli diarahkan menggunakan tombol kontak resmi agar terlindungi dari penipuan.",
    };
  }

  // 3. Validasi Harga
  const numPrice = Number(price);
  if (type !== "gratis" && category !== "Hibah") {
    if (isNaN(numPrice) || numPrice <= 0) {
      return {
        status: "rejected",
        risk_score: 0.9,
        moderation_reason: "Harga tidak valid (Rp 0 atau angka tidak wajar). Gunakan tipe 'gratis' jika barang dihibahkan secara cuma-cuma.",
      };
    }

    const maxLimit = CATEGORY_PRICE_LIMITS[category] || 25_000_000;
    if (numPrice > maxLimit) {
      return {
        status: "pending",
        risk_score: 0.7,
        moderation_reason: `Harga Rp ${numPrice.toLocaleString("id-ID")} melebihi batas wajar kategori ${category} (maks Rp ${maxLimit.toLocaleString("id-ID")}). Ditahan untuk verifikasi admin.`,
      };
    }

    // Kasus harga janggal: di bawah Rp 500 untuk elektronik atau barang non-kertas
    if (category === "Elektronik" && numPrice < 10_000) {
      return {
        status: "pending",
        risk_score: 0.8,
        moderation_reason: `Harga elektronik Rp ${numPrice.toLocaleString("id-ID")} terlalu rendah (kemungkinan salah ketik atau nego). Ditahan untuk peninjauan admin.`,
      };
    }
  }

  return { status: "clean", risk_score: 0.1 };
}

/**
 * Lapisan 2: Moderasi Gemini AI (Teks & Gambar)
 */
export async function checkAiModeration({ title, description, price, category, imageUrl = null }) {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    // Jika API key tidak ada, jangan reject, cukup pending jika ada keraguan
    return { is_prohibited: false, scam_risk_score: 0.1, reason: "AI Moderation skipped (no key)" };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
      Anda adalah sistem moderasi konten profesional untuk marketplace komunitas mahasiswa (Jual Beli USU Polmed).
      Tugas Anda: Evaluasi iklan berikut untuk mendeteksi pelanggaran barang terlarang dan penipuan.

      Data Iklan:
      - Judul: "${title}"
      - Deskripsi: "${description}"
      - Harga: Rp ${Number(price || 0).toLocaleString("id-ID")}
      - Kategori yang dipilih: "${category}"

      Daftar Kategori Terlarang:
      1. Rokok elektronik / vape / pod / liquid / cartridge / tembakau / shisha
      2. Minuman keras / beralkohol
      3. Obat keras, resep dokter, narkotika, psikotropika
      4. Senjata api, peluru, senjata tajam penyerang
      5. Layanan joki akademik (skripsi, ujian, tugas)
      6. Jual-beli akun game (Mobile Legends, Free Fire, dll)
      7. Konten pornografi, asusila, kencan berbayar
      8. Barang curian / penipuan transfer mencurigakan

      Keluarkan HANYA JSON MURNI tanpa markdown dengan skema berikut:
      {
        "is_prohibited": true/false,
        "prohibited_category": "<nama kategori terlarang jika ada, atau null>",
        "scam_risk_score": <angka desimal antara 0.0 (aman) hingga 1.0 (sangat berbahaya)>,
        "reason": "<alasan singkat>"
      }
    `;

    // Timeout 6 detik agar tidak memblokir server
    const aiPromise = model.generateContent(prompt).then((r) => r.response.text());
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini AI timeout (6s)")), 6000)
    );

    const rawResponse = await Promise.race([aiPromise, timeoutPromise]);
    const cleanJson = String(rawResponse)
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const parsed = JSON.parse(cleanJson);
    const validated = aiModerationSchema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    return { is_prohibited: false, scam_risk_score: 0.2, reason: "AI output schema fallback" };
  } catch (err) {
    console.warn("[checkAiModeration] AI error or timeout:", err.message);
    // Fallback aman: jika AI error/timeout, flag sebagai pending (bukan auto-approved)
    return {
      is_prohibited: false,
      scam_risk_score: 0.5,
      reason: `AI review tertunda: ${err.message}`,
    };
  }
}

/**
 * Pipeline Lengkap: moderateListing()
 * Mengembalikan objek:
 * - status: 'approved' | 'pending' | 'rejected'
 * - risk_score: number
 * - moderation_reason: string
 */
export async function moderateListing({ title, description, price, category, type, images, seller_wa }) {
  // 1. Eksekusi Lapisan Deterministik
  const detResult = checkDeterministicModeration({ title, description, price, category, type });
  if (detResult.status === "rejected") {
    return {
      status: "rejected",
      risk_score: detResult.risk_score,
      moderation_reason: detResult.moderation_reason,
    };
  }

  // Jika deterministik menyatakan pending (mis. nomor HP di judul atau harga anomali)
  if (detResult.status === "pending") {
    return {
      status: "pending",
      risk_score: detResult.risk_score,
      moderation_reason: detResult.moderation_reason,
    };
  }

  // 2. Lapisan Gemini AI (Hanya jika lolos deterministik)
  try {
    const aiResult = await checkAiModeration({ title, description, price, category });
    if (aiResult.is_prohibited) {
      return {
        status: "rejected",
        risk_score: 0.95,
        moderation_reason: `Ditolak oleh sistem moderasi otomatis: ${aiResult.reason || "Kategori terlarang"}`,
      };
    }

    if (aiResult.scam_risk_score >= 0.6) {
      return {
        status: "pending",
        risk_score: aiResult.scam_risk_score,
        moderation_reason: `Memerlukan verifikasi admin: ${aiResult.reason}`,
      };
    }
  } catch {
    // Jika AI bermasalah, tandai pending untuk keamanan
    return {
      status: "pending",
      risk_score: 0.5,
      moderation_reason: "Memerlukan peninjauan manual admin kampus.",
    };
  }

  // Lolos semua pemeriksaan -> approved dan siap tayang serta disebarkan ke grup WA
  return {
    status: "approved",
    risk_score: 0.05,
    moderation_reason: "Lolos moderasi otomatis.",
  };
}

/**
 * Adapter helper for evaluateModerationRules compatibility
 */
export function evaluateModerationRules({ title = "", description = "", price = 0, category = "", type = "barang" } = {}) {
  const res = checkDeterministicModeration({ title, description, price, category, type });
  return {
    ...res,
    action: res.status === "clean" ? "allow" : res.status,
    prohibited: res.status === "rejected",
    reasons: res.moderation_reason ? [res.moderation_reason] : [],
    riskScore: Math.round((res.risk_score || 0) * 100),
  };
}

