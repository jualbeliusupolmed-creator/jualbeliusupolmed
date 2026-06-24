export const CATEGORIES = [
  { name: "Elektronik", slug: "elektronik" },
  { name: "Fashion", slug: "fashion" },
  { name: "Buku", slug: "buku" },
  { name: "Makanan", slug: "makanan" },
  { name: "Kos", slug: "kos" },
  { name: "buku", slug: "buku-kuliah" },
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
export function formatWa(num) {
  if (!num) return "";
  const s = String(num);
  // @lid JID tidak bisa dikonversi ke nomor HP → tolak
  if (s.includes("@lid")) return "";
  let cleaned = s.replace(/\D/g, "");
  if (cleaned.startsWith("62")) {
    cleaned = "0" + cleaned.slice(2);
  } else if (cleaned.startsWith("8")) {
    cleaned = "0" + cleaned;
  }
  // Nomor HP Indonesia: 10–13 digit, harus diawali 0
  if (!cleaned.startsWith("0") || cleaned.length < 10 || cleaned.length > 13) return "";
  return cleaned;
}

// Konversi nomor ke format internasional (628xxx) untuk dikirim ke Baileys API
export function formatWaForBaileys(num) {
  if (!num) return "";
  let cleaned = num.replace(/\D/g, "");
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  } else if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }
  // Jika sudah 62xxx atau format internasional lain, kembalikan apa adanya
  return cleaned;
}
