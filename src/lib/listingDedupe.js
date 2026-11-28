export function normalizeListingTitleKey(title) {
  return String(title || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Mencari iklan aktif/pending milik penjual yang sama dengan judul ternormalisasi
 * dan harga identik dalam jendela waktu tertentu (default 30 menit).
 * Digunakan untuk mencegah iklan ganda akibat double-submit, retry jaringan, atau webhook ulang.
 */
export async function findRecentDuplicateListing(
  supa,
  { sellerWa, title, price, windowMinutes = 30 } = {}
) {
  if (!supa || !sellerWa || !title) return null;

  const titleKey = normalizeListingTitleKey(title);
  if (!titleKey) return null;

  const numericPrice = Math.round(Number(price) || 0);
  const cutoffIso = new Date(Date.now() - Math.max(1, windowMinutes) * 60_000).toISOString();

  try {
    const query = supa
      .from("listings")
      .select("*")
      .eq("seller_wa", sellerWa)
      .in("status", ["active", "pending"])
      .eq("price", numericPrice)
      .gte("created_at", cutoffIso)
      .order("created_at", { ascending: false })
      .limit(10);

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return null;

    return data.find((row) => normalizeListingTitleKey(row?.title) === titleKey) || null;
  } catch {
    // Tetap aman bila dipanggil pada lingkungan test dengan mock Supabase parsial
    return null;
  }
}
