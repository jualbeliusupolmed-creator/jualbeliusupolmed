import { getAdminClient } from "@/lib/supabaseAdmin";
import { encodeSellerSlug } from "@/lib/sellerSlug";

export function toPublicListing(listing) {
  if (!listing || typeof listing !== "object") return listing;
  const { seller_wa: sellerWa, ...publicListing } = listing;
  if (publicListing.seller_profiles && typeof publicListing.seller_profiles === "object") {
    const { wa: _profileWa, ...publicProfile } = publicListing.seller_profiles;
    publicListing.seller_profiles = {
      ...publicProfile,
      slug: publicProfile.slug || encodeSellerSlug(_profileWa || sellerWa),
    };
  }
  return publicListing;
}

/**
 * Fetches listings and manually joins seller_profiles to avoid PostgREST foreign key errors.
 */
export async function fetchListingsWithProfiles(queryPromise) {
  const { data, error, count } = await queryPromise;
  if (error) throw error;
  
  const listings = data || [];
  const sellerWas = [...new Set(listings.map(l => l.seller_wa).filter(Boolean))];
  
  if (sellerWas.length > 0) {
    const supa = getAdminClient();
    const { data: profiles } = await supa
      .from("seller_profiles")
      .select("wa, slug, trusted_seller, distributor, subscription_tier, subscription_expires_at, student_verified, student_campus")
      .in("wa", sellerWas);
      
    const profileMap = new Map((profiles || []).map(p => [p.wa, p]));
    listings.forEach(l => {
      l.seller_profiles = profileMap.get(l.seller_wa) || null;
    });
  }
  
  return { data: listings.map(toPublicListing), count };
}

export async function fetchSingleListingWithProfile(queryPromise) {
  const { data, error } = await queryPromise;
  if (error) throw error;
  if (!data) return { data: null };
  
  if (data.seller_wa) {
    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("wa, slug, trusted_seller, distributor, subscription_tier, subscription_expires_at, student_verified, student_campus")
      .eq("wa", data.seller_wa)
      .maybeSingle();
      
    data.seller_profiles = profile || null;
  }
  
  return { data: toPublicListing(data) };
}
