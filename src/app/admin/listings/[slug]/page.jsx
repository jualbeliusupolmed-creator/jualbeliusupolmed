import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getShortIdFromSlug, isUUID } from "@/lib/slug";
import AdminLogin from "../../AdminLogin";
import AdminListingDetail from "./AdminListingDetail";

export const dynamic = "force-dynamic";

/**
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
 * Given shortId = "4357d5e0" (first 8 hex chars),
 * we fetch ALL listings (capped 500) and find the one whose id starts with shortId.
 * This is safe-reliable and avoids PostgREST cast issues.
 */
async function getData(slug) {
  try {
    const supa = getAdminClient();

    // 1. Find the listing
    let listing = null;

    if (isUUID(slug)) {
      // Legacy: full UUID in URL
      const { data } = await supa
        .from("listings")
        .select("*")
        .eq("id", slug)
        .maybeSingle();
      listing = data;
    } else {
      const shortId = getShortIdFromSlug(slug);
      if (!shortId || shortId.length < 4) return null;

      // Gunakan pencarian range (gte & lte) pada UUID agar tidak terlimit 500 data
      const minId = `${shortId.padEnd(8, '0')}-0000-0000-0000-000000000000`;
      const maxId = `${shortId.padEnd(8, 'f')}-ffff-ffff-ffff-ffffffffffff`;

      const { data: rows } = await supa
        .from("listings")
        .select("id")
        .gte("id", minId)
        .lte("id", maxId)
        .limit(10);

      const matchedId = rows?.find((r) =>
        r.id.replace(/-/g, "").startsWith(shortId.replace(/-/g, ""))
      )?.id;

      if (!matchedId) return null;

      const { data } = await supa
        .from("listings")
        .select("*")
        .eq("id", matchedId)
        .maybeSingle();
      listing = data;
    }

    if (!listing) return null;

    // 2. Fetch related data in parallel
    const [paymentsRes, reportsRes, ratingsRes, categoriesRes] =
      await Promise.all([
        supa
          .from("payments")
          .select("*")
          .eq("listing_id", listing.id)
          .order("created_at", { ascending: false }),
        supa
          .from("reports")
          .select("*")
          .eq("listing_id", listing.id)
          .order("created_at", { ascending: false }),
        supa
          .from("seller_ratings")
          .select("*")
          .eq("listing_id", listing.id)
          .order("created_at", { ascending: false }),
        supa
          .from("categories")
          .select("id, name, slug")
          .order("sort_order", { ascending: true }),
      ]);

    return {
      listing,
      payments: paymentsRes.data || [],
      reports: reportsRes.data || [],
      ratings: ratingsRes.data || [],
      categories: categoriesRes.data || [],
    };
  } catch (err) {
    console.error("[admin/listings/[slug]] getData error:", err?.message);
    return null;
  }
}

export async function generateMetadata({ params }) {
  if (!isAdmin()) return { title: "Admin" };
  const result = await getData(params.slug);
  const title = result?.listing?.title || "Listing";
  return { title: `${title} — Admin Jual Beli USU` };
}

export default async function AdminListingPage({ params }) {
  if (!isAdmin()) return <AdminLogin />;

  const result = await getData(params.slug);
  if (!result) notFound();

  const { listing, payments, reports, ratings, categories } = result;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/admin/overview" className="hover:text-gray-700 dark:hover:text-slate-200">
          Admin
        </Link>
        <span>/</span>
        <Link href="/admin/listings" className="hover:text-gray-700 dark:hover:text-slate-200">
          Listings
        </Link>
        <span>/</span>
        <span className="truncate text-gray-700 dark:text-slate-200">
          {listing.title}
        </span>
      </nav>

      <AdminListingDetail
        listing={listing}
        payments={payments}
        reports={reports}
        ratings={ratings}
        categories={categories}
      />
    </div>
  );
}
