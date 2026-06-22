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

export function formatWa(num) {
  if (!num) return "";
  if (num.includes("@g.us")) return num;
  let cleaned = num.replace(/\D/g, "");
  if (cleaned.startsWith("62")) {
    cleaned = "0" + cleaned.slice(2);
  } else if (cleaned.startsWith("8")) {
    cleaned = "0" + cleaned;
  }
  return cleaned;
}
