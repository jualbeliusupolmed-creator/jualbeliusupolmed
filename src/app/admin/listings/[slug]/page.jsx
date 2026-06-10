import { notFound } from "next/navigation";
import Link from "next/link";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getShortIdFromSlug, isUUID, buildSlug } from "@/lib/slug";
import { rupiah } from "@/lib/fees";
import AdminLogin from "../../AdminLogin";
import AdminListingDetail from "./AdminListingDetail";

export const dynamic = "force-dynamic";

async function getData(slug) {
  const supa = getAdminClient();
  let listing = null;

  if (isUUID(slug)) {
    const { data } = await supa.from("listings").select("*").eq("id", slug).single();
    listing = data;
  } else {
    const shortId = getShortIdFromSlug(slug);
    if (!shortId) return null;
    const { data } = await supa
      .from("listings")
      .select("*")
      .ilike("id", `${shortId}%`)
      .limit(1)
      .single();
    listing = data;
  }

  if (!listing) return null;

  const [paymentsRes, reportsRes, ratingsRes, categoriesRes] = await Promise.all([
    supa.from("payments").select("*").eq("listing_id", listing.id).order("created_at", { ascending: false }),
    supa.from("reports").select("*").eq("listing_id", listing.id).order("created_at", { ascending: false }),
    supa.from("seller_ratings").select("*").eq("listing_id", listing.id).order("created_at", { ascending: false }),
    supa.from("categories").select("id, name, slug").order("sort_order", { ascending: true }),
  ]);

  return {
    listing,
    payments: paymentsRes.data || [],
    reports: reportsRes.data || [],
    ratings: ratingsRes.data || [],
    categories: categoriesRes.data || [],
  };
}

export async function generateMetadata({ params }) {
  if (!isAdmin()) return { title: "Admin" };
  const result = await getData(params.slug).catch(() => null);
  const title = result?.listing?.title || "Listing";
  return { title: `${title} — Admin Jual Beli USU` };
}

export default async function AdminListingPage({ params }) {
  if (!isAdmin()) return <AdminLogin />;

  const result = await getData(params.slug);
  if (!result) notFound();

  const { listing, payments, reports, ratings, categories } = result;

  // Canonical slug redirect handled client-side for admin — no redirect needed
  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* Breadcrumb */}
      <nav className="mb-4 flex items-center gap-1.5 text-sm text-gray-400">
        <Link href="/admin/overview" className="hover:text-gray-700 dark:hover:text-slate-200">Admin</Link>
        <span>/</span>
        <Link href="/admin/listings" className="hover:text-gray-700 dark:hover:text-slate-200">Listings</Link>
        <span>/</span>
        <span className="truncate text-gray-700 dark:text-slate-200">{listing.title}</span>
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
