export const CATEGORIES = [
  { name: "Elektronik", slug: "elektronik" },
  { name: "Fashion", slug: "fashion" },
  { name: "Buku", slug: "buku" },
  { name: "Makanan", slug: "makanan" },
  { name: "Kos", slug: "kos" },
  { name: "Buku Kuliah", slug: "buku-kuliah" },
  { name: "Jasa", slug: "jasa" },
];

export const WA_GROUP_LINK =
  process.env.NEXT_PUBLIC_WA_GROUP_LINK || "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA";

export const MARKETPLACE_WA =
  process.env.NEXT_PUBLIC_MARKETPLACE_WA || "62895429126232";

export const POPULAR_AREAS = [
  "Medan Baru",
  "Medan Selayang",
  "Medan Kota",
  "Medan Petisah",
  "Medan Sunggal",
  "Medan Helvetia",
  "Medan Johor",
  "Medan Tembung"
];

// Normalisasi nomor ke format lokal (08xxx) untuk disimpan di DB
// Return "" jika bukan nomor HP Indonesia yang valid → diabaikan webhook
// Pengenal yang BUKAN nomor telepon.
//
// `seller_profiles.wa` adalah primary key, tapi pendaftaran lewat email dan
// lewat Google tidak punya nomor. Keduanya dibuatkan pengenal sintetis:
// `email_<awalan>_<4 digit>` (api/auth/email/daftar) dan
// `google_<awalan>_<base36>` (auth/callback). Satu kolom memuat dua jenis
// benda yang berbeda.
//
// Aturannya sengaja BUKAN daftar awalan yang dikenali. Versi pertama tambalan
// ini hanya memeriksa "email_", dan tiga akun `google_` di produksi lolos begitu
// saja — daftar awalan selalu ketinggalan satu langkah dari pengenal berikutnya
// yang ditambahkan seseorang. Yang dipakai sekarang adalah sifat yang tidak
// berubah: nomor telepon tidak pernah mengandung huruf.
export function adalahIdSintetis(nilai) {
  return /[a-z]/i.test(String(nilai || ""));
}

export function formatWa(num) {
  if (!num) return "";
  const s = String(num);
  // @lid JID tidak bisa dikonversi ke nomor HP → tolak
  if (s.includes("@lid")) return "";

  // Pengenal sintetis ditolak SEBELUM digitnya disaring, dan itu bukan
  // kerapian belaka. Tanpa baris ini `email_0812345_1234` disaring menjadi
  // "08123451234" — panjangnya pas, awalannya 08, jadi lolos semua syarat di
  // bawah dan dikembalikan sebagai nomor yang sah. Nomor itu MILIK ORANG LAIN:
  // ia lahir dari menempelkan bagian depan sebuah alamat email dengan empat
  // angka acak. Notifikasi WhatsApp untuk akun tersebut akan sampai ke orang
  // yang tidak pernah mendaftar apa pun.
  //
  // Diuji ke produksi 26 Agustus 2026 — semuanya lolos sebelum baris ini ada:
  //   email_0812345_1234      -> "08123451234"
  //   email_081234567_9012    -> "0812345679012"
  //   google_0812345678_ab12x -> "081234567812"
  if (adalahIdSintetis(s)) return "";

  let cleaned = s.replace(/\D/g, "");
  if (cleaned.startsWith("62")) {
    cleaned = "0" + cleaned.slice(2);
  } else if (cleaned.startsWith("8")) {
    cleaned = "0" + cleaned;
  }
  // Nomor HP Indonesia: 10–13 digit, harus diawali 08
  if (!cleaned.startsWith("08") || cleaned.length < 10 || cleaned.length > 13) return "";
  return cleaned;
}

// Konversi nomor ke format internasional (628xxx) untuk dikirim ke Baileys API
// Return "" jika bukan nomor Indonesia yang valid
export function formatWaForBaileys(num) {
  if (!num) return "";
  const local = formatWa(num); // validasi dulu
  if (!local) return "";
  return "62" + local.slice(1); // 08xxx → 628xxx
}
