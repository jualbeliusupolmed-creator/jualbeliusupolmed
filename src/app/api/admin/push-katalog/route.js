import { getAdminClient } from "@/lib/supabaseAdmin";
import { queueListingInstagram } from "@/lib/listingInstagram";
import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supa = getAdminClient();
  const { data: listings } = await supa
    .from("listings")
    .select("id")
    .eq("status", "active");

  const results = [];
  for (const listing of listings || []) {
    try {
      await queueListingInstagram(listing.id, { supa });
      results.push(`Queued: ${listing.id}`);
    } catch (err) {
      results.push(`Skipped ${listing.id}: ${err.message}`);
    }
  }

  return NextResponse.json({ queued: results.length, results });
}
