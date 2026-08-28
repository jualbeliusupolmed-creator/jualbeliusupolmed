import { notFound, redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { buildSlug } from "@/lib/slug";
import { normalizeListingCode } from "@/lib/listingCode";

export const dynamic = "force-dynamic";

export default async function ListingCodePage({ params }) {
  const code = normalizeListingCode(params.code);
  if (!code) notFound();

  const supa = getAdminClient();
  const { data: listing } = await supa
    .from("listings")
    .select("id, title")
    .eq("listing_code", code)
    .maybeSingle();

  if (!listing) notFound();

  redirect(`/produk/${buildSlug(listing.title, listing.id)}`);
}
