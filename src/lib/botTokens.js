import crypto from "crypto";

// Token bot: SATU env, tapi boleh berisi lebih dari satu nilai.
//
// Sampai 22 Agustus 2026 `BAILEYS_API_TOKEN` selalu satu nilai, dibandingkan
// dengan sama-persis. Itu benar selama cuma ada satu perangkat WhatsApp. Sore
// itu perangkat kedua ditautkan — dan yang dipegangnya justru nomor yang
// dipajang situs. Perangkat kedua punya tokennya sendiri (memang harus: token
// itu juga gerbang dashboard masing-masing bot, jadi menyamakannya berarti
// siapa pun yang bisa masuk ke satu panel bisa masuk ke keduanya). Akibatnya
// setiap pesan yang masuk lewat nomor di situs ditolak webhook dengan 401, dan
// pengirimnya cuma menerima sapaan lalu kesunyian.
//
// Jadi env-nya sekarang dibaca sebagai DAFTAR dipisah koma:
//
//     BAILEYS_API_TOKEN=<token-bot-1>,<token-bot-2>
//
// Satu nilai tetap berarti persis seperti dulu — tidak ada yang perlu diubah
// kalau perangkatnya memang cuma satu.
//
// Yang PERTAMA istimewa: itulah tujuan semua panggilan situs KE bot (kirim
// pesan, ambil log, proxy panel). Situs cuma tahu satu `BAILEYS_API_URL`, jadi
// nilai pertama harus milik bot yang alamat itu tunjuk.
function daftarToken() {
  return String(process.env.BAILEYS_API_TOKEN || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Token bot utama — dipakai untuk semua panggilan KE bot. Kosong = belum diset. */
export function tokenBotUtama() {
  return daftarToken()[0] || "";
}

/** Berapa perangkat yang tokennya dikenali. Dipakai catatan diagnostik. */
export function jumlahTokenBot() {
  return daftarToken().length;
}

/**
 * Apakah header Authorization ini milik salah satu bot yang dikenal?
 *
 * Fail-closed: env kosong berarti TIDAK ADA yang lewat, bukan semua lewat.
 * Bandingkan lewat hash supaya panjang yang berbeda tidak melempar, dan supaya
 * lamanya menjawab tidak membocorkan berapa banyak awalan yang cocok — idiom
 * yang sama dengan tolakCron() di cronAuth.js.
 */
export function tokenBotSah(headerAuthorization) {
  const semua = daftarToken();
  if (!semua.length) return false;

  const dikirim = String(headerAuthorization || "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();
  if (!dikirim) return false;

  const hash = (s) => crypto.createHash("sha256").update(s).digest();
  const a = hash(dikirim);

  // Tanpa short-circuit: semua kandidat tetap dibandingkan, supaya lamanya
  // menjawab tidak memberi tahu token KE BERAPA yang cocok.
  let cocok = false;
  for (const t of semua) {
    if (crypto.timingSafeEqual(a, hash(t))) cocok = true;
    if (crypto.timingSafeEqual(a, hash(`Bearer ${t}`))) cocok = true;
  }
  return cocok;
}
