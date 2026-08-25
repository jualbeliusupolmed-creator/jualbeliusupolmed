import { getAdminClient } from "@/lib/supabaseAdmin";
import { processInstagramQueue } from "@/lib/instagramQueue";
import { buildSlug } from "@/lib/slug";
import { formatInstagramPrice } from "@/lib/listingInstagramImage";

function catalogCredentials() {
  return {
    accessToken: process.env.META_KATALOG_IG_ACCESS_TOKEN,
    userId: process.env.META_KATALOG_IG_USER_ID,
  };
}

export function captionForListing(listing, origin) {
  const condition = listing.type === "jasa"
    ? "Jasa"
    : listing.condition === "new"
      ? "Baru"
      : "Preloved";
  const publicUrl = `${origin}/produk/${buildSlug(listing.title, listing.id)}`;
  const description = String(listing.description || "").trim().slice(0, 900);
  return [
    listing.title,
    "",
    `Harga: ${formatInstagramPrice(listing.price)}`,
    `Kategori: ${listing.category || "Lainnya"}`,
    `Kondisi: ${condition}`,
    `Lokasi: ${[listing.campus, listing.area].filter(Boolean).join(" · ") || "Sekitar kampus"}`,
    description ? `\n${description}` : "",
    `\nLihat detail dan hubungi penjual:\n${publicUrl}`,
    "\n#JualBeliUSU #POLMED #MarketplaceKampus #KatalogUSUPolmed",
  ].filter((line) => line !== "").join("\n").slice(0, 2200);
}

export async function queueListingInstagram(listingId, { supa = getAdminClient() } = {}) {
  const { data: listing } = await supa
    .from("listings")
    .select("id, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!listing || listing.status !== "active") {
    throw new Error("Iklan belum aktif atau tidak ditemukan.");
  }

  const { data: existing } = await supa
    .from("listing_instagram_publications")
    .select("status")
    .eq("listing_id", listingId)
    .maybeSingle();
  if (existing?.status === "published") return { alreadyPublished: true };

  const now = new Date().toISOString();
  const { error } = await supa.from("listing_instagram_publications").upsert(
    {
      listing_id: listingId,
      status: "queued",
      attempts: 0,
      last_error: null,
      instagram_container_id: null,
      instagram_media_id: null,
      next_attempt_at: null,
      published_at: null,
      queued_at: now,
      updated_at: now,
    },
    { onConflict: "listing_id" },
  );
  if (error) throw new Error("Gagal menambahkan iklan ke antrean Instagram.");
  return { queued: true };
}

export async function publishQueuedListingInstagram({
  origin,
  listingId = null,
  limit = 3,
}) {
  return processInstagramQueue({
    table: "listing_instagram_publications",
    targetColumn: "listing_id",
    targetId: listingId,
    limit,
    origin,
    credentials: catalogCredentials(),
    loadTarget: async (supa, id) => {
      const { data } = await supa
        .from("listings")
        .select("id, title, description, price, category, type, condition, campus, area, image_url, images, status")
        .eq("id", id)
        .eq("status", "active")
        .maybeSingle();
      return data;
    },
    imagePath: (listing) => `/api/listings/${listing.id}/instagram-image`,
    captionFor: captionForListing,
  });
}

export async function autoPublishListingInstagram({ origin, listingId }) {
  try {
    await queueListingInstagram(listingId);
    return await publishQueuedListingInstagram({ origin, listingId, limit: 1 });
  } catch {
    // Aktivasi iklan tetap berhasil; antrean tersimpan untuk cron/retry admin.
    return [];
  }
}
