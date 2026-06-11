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
  "Dr. Mansyur",
  "Pintu 1 USU",
  "Pintu 2 USU",
  "Pintu 3 USU",
  "Perpustakaan USU",
  "Pendopo USU",
  "Lapangan FK USU",
  "Polmed Gedung Z",
  "Polmed Cafetaria"
];

export function formatWa(num) {
  if (!num) return "";
  let cleaned = num.replace(/\D/g, "");
  if (cleaned.startsWith("62")) {
    cleaned = "0" + cleaned.slice(2);
  } else if (cleaned.startsWith("8")) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}
