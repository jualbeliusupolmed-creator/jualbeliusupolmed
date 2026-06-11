import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rupiah } from "@/lib/fees";
import { buildSlug, getShortIdFromSlug, isUUID } from "@/lib/slug";
import MinatButton from "@/components/MinatButton";
import IGShareButton from "@/components/IGShareButton";
import ShareWAButton from "@/components/ShareWAButton";
import QRButton from "@/components/QRButton";
import CopyLinkButton from "@/components/CopyLinkButton";
import ProductGallery from "@/components/ProductGallery";
import ProductCard from "@/components/ProductCard";
import RatingWidget from "@/components/RatingWidget";
import ReportButton from "@/components/ReportButton";
import ViewTracker from "@/components/ViewTracker";
import FavoriteButton from "@/components/FavoriteButton";
import { Icon } from "@/components/Icons";

export const dynamic = "force-dynamic";

/**
 * Resolve a slug or legacy UUID → listing row.
 * Supports:
 *   - New format:  "laptop-asus-vivobook-3f2a8c1e"  (extracts 8-char prefix)
 *   - Legacy:      "3f2a8c1e-d9b4-4e7f-8b23-a1b2c3d4e5f6"  (full UUID)
 */
async function getData(slug) {
  try {
    const supa = getAdminClient();
    let listing = null;

    if (isUUID(slug)) {
      // Legacy full-UUID link — query directly
      const { data } = await supa
        .from("listings")
        .select("*")
        .eq("id", slug)
        .single();
      listing = data;
    } else {
      // New slug format — extract the 8-char short ID suffix
      const shortId = getShortIdFromSlug(slug);
      if (!shortId) return { listing: null, related: [] };

      // Fetch IDs, then find the one whose UUID starts with shortId
      const { data: rows } = await supa
        .from("listings")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(500);

      const matchedId = rows?.find((r) =>
        r.id.replace(/-/g, "").startsWith(shortId.replace(/-/g, ""))
      )?.id;

      if (!matchedId) return { listing: null, related: [] };

      const { data } = await supa
        .from("listings")
        .select("*")
        .eq("id", matchedId)
        .maybeSingle();
      listing = data;
    }

    if (!listing) return { listing: null, related: [] };

    const { data: related } = await supa
      .from("listings")
      .select("*")
      .eq("status", "active")
      .eq("category", listing.category)
      .neq("id", listing.id)
      .limit(4);

    return { listing, related: related || [] };
  } catch {
    return { listing: null, related: [] };
  }
}

// ── SEO: generateMetadata ────────────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { listing } = await getData(params.slug);
  if (!listing) {
    return { title: "Produk tidak ditemukan — Jual Beli USU Polmed" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const title = `${listing.title} — Jual Beli USU Polmed`;
  const description = listing.description
    ? listing.description.slice(0, 155)
    : `${listing.title} dijual ${rupiah(listing.price)} oleh ${listing.seller_name} di marketplace mahasiswa USU & POLMED.`;
  const imageUrl = listing.image_url || `${baseUrl}/og-default.png`;
  const canonicalSlug = buildSlug(listing.title, listing.id);
  const url = `${baseUrl}/produk/${canonicalSlug}`;

  return {
    title,
    description,
    openGraph: { title, description, url, type: "website", images: [{ url: imageUrl, width: 800, height: 800, alt: listing.title }] },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
    alternates: { canonical: url },
  };
}
// ────────────────────────────────────────────────────────────────────────────

export default async function ProdukPage({ params }) {
  const { listing, related } = await getData(params.slug);
  if (!listing) notFound();

  // If someone visits old UUID link, redirect to clean slug URL
  if (isUUID(params.slug)) {
    redirect(`/produk/${buildSlug(listing.title, listing.id)}`);
  }

  const sold = listing.status === "sold";
  const sellerWaEncoded = encodeURIComponent(listing.seller_wa || "");


  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <ViewTracker listingId={listing.id} />
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-400">
        <Link href="/" className="hover:text-primary">
          Beranda
        </Link>{" "}
        /{" "}
        <Link
          href={`/?cat=${listing.category}`}
          className="hover:text-primary"
        >
          {listing.category}
        </Link>
      </nav>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        {/* Galeri */}
        <div className="card overflow-hidden">
          <ProductGallery
            images={
              listing.images?.length
                ? listing.images
                : listing.image_url
                ? [listing.image_url]
                : []
            }
            title={listing.title}
          />
        </div>

        {/* Info */}
        <div>
          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-gray-100 text-gray-700 dark:bg-slate-900 dark:text-slate-350">
              {listing.category}
            </span>
            <span className="badge bg-primary/5 text-primary dark:bg-white/10 dark:text-white font-medium flex items-center gap-1">
              <Icon.MapPin className="h-3 w-3" /> {listing.campus === "Semua" ? "USU / POLMED" : listing.campus}
            </span>
            {listing.area && (
              <span className="badge bg-primary/5 text-primary dark:bg-white/10 dark:text-white font-medium flex items-center gap-1">
                <Icon.MapPin className="h-3 w-3" /> {listing.area}
              </span>
            )}
            {listing.featured && (
              <span className="badge bg-gray-900 text-white dark:bg-slate-100 dark:text-slate-900">Unggulan</span>
            )}
            {sold && (
              <span className="badge border border-gray-200 text-gray-500 dark:border-slate-800 dark:text-slate-500">
                Terjual
              </span>
            )}
          </div>

          <div className="mt-2 flex items-start justify-between gap-3">
            <h1 className="text-2xl font-extrabold">{listing.title}</h1>
            <FavoriteButton listing={listing} size="lg" className="shrink-0" />
          </div>
          <p className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
            {rupiah(listing.price)}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            Stok: {listing.stock}
            {listing.views > 0 && (
              <span className="ml-2 inline-flex items-center gap-1.5 align-middle">
                · <Icon.Eye className="h-3.5 w-3.5" /> Dilihat {listing.views}×
              </span>
            )}
          </p>

          {/* Card penjual — link ke halaman profil */}
          <Link
            href={`/penjual/${sellerWaEncoded}`}
            className="card mt-4 flex items-center gap-3 p-3 hover:border-primary/30 hover:shadow-md transition-shadow dark:border-slate-800 dark:bg-slate-900/40"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 font-bold text-primary dark:bg-white/10 dark:text-white">
              {listing.seller_name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-semibold dark:text-white">{listing.seller_name}</p>
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                Lihat semua iklan penjual →
              </p>
            </div>
          </Link>

          {/* Aksi */}
          <div className="mt-4 space-y-2">
            {!sold && <MinatButton listing={listing} />}
            <div className="grid grid-cols-2 gap-2">
              <ShareWAButton listing={listing} />
              <CopyLinkButton listing={listing} />
              <IGShareButton listing={listing} />
              <QRButton listing={listing} />
            </div>
          </div>

          {/* Deskripsi */}
          <div className="card mt-4 p-4">
            <h3 className="font-semibold">Deskripsi</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">
              {listing.description || "Tidak ada deskripsi."}
            </p>
          </div>

          {/* Rating widget — hanya tampil jika barang sudah sold */}
          <RatingWidget listing={listing} className="mt-4" />

          {/* Lapor iklan */}
          <ReportButton listing={listing} className="mt-4" />
        </div>
      </div>

      {/* Produk serupa */}
      {related.length > 0 && (
        <section className="mt-10">
          <h2 className="text-lg font-bold">Barang serupa</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} listing={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
