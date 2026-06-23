import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rupiah } from "@/lib/fees";
import { buildSlug, getShortIdFromSlug, isUUID } from "@/lib/slug";
import { fetchSingleListingWithProfile, fetchListingsWithProfiles } from "@/lib/dbHelpers";
import MinatButton from "@/components/MinatButton";
import OfferButton from "@/components/OfferButton";
import IGShareButton from "@/components/IGShareButton";
import ShareWAButton from "@/components/ShareWAButton";
import QRButton from "@/components/QRButton";
import CopyLinkButton from "@/components/CopyLinkButton";
import NativeShareButton from "@/components/NativeShareButton";
import ProductGallery from "@/components/ProductGallery";
import ProductCard from "@/components/ProductCard";
import RatingWidget from "@/components/RatingWidget";
import ReportButton from "@/components/ReportButton";
import ViewTracker from "@/components/ViewTracker";
import RecentlyViewedSaver from "@/components/RecentlyViewedSaver";
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
      const query = supa
        .from("listings")
        .select("*, seller_wa")
        .eq("id", slug)
        .single();
      const { data } = await fetchSingleListingWithProfile(query);
      listing = data;
    } else {
      // New slug format — extract the 8-char short ID suffix
      const shortId = getShortIdFromSlug(slug);
      if (!shortId || shortId.length < 4) return { listing: null, related: [] };

      // LIKE/ILIKE tidak bisa langsung di kolom uuid (PostgREST cast error),
      // jadi kita gunakan pencarian range (gte & lte) pada UUID.
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

      if (!matchedId) return { listing: null, related: [] };

      const query = supa
        .from("listings")
        .select("*, seller_wa")
        .eq("id", matchedId)
        .maybeSingle();
      const { data } = await fetchSingleListingWithProfile(query);
      listing = data;
    }

    if (!listing) return { listing: null, related: [] };

    const queryRelated = supa
      .from("listings")
      .select("*, seller_wa")
      .eq("status", "active")
      .eq("category", listing.category)
      .neq("id", listing.id)
      .limit(4);
    
    const { data: related } = await fetchListingsWithProfiles(queryRelated);

    return { listing, related: related || [] };
  } catch {
    return { listing: null, related: [] };
  }
}

// ── SEO: generateMetadata ────────────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { listing } = await getData(params.slug);
  if (!listing) {
    return { title: "Produk tidak ditemukan" };
  }

  const baseUrl =
    (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbelimedan.web.id").trim();
  const title = `${listing.title} — ${rupiah(listing.price)}`;
  const description = listing.description
    ? listing.description.slice(0, 155)
    : `${listing.title} dijual ${rupiah(listing.price)} oleh ${listing.seller_name} di Marketplace Kota Medan. COD di area yang disepakati, transaksi dibantu admin.`;
  const imageUrl = listing.image_url || `${baseUrl}/icons/icon-512x512.png`;
  const canonicalSlug = buildSlug(listing.title, listing.id);
  const url = `${baseUrl}/produk/${canonicalSlug}`;

  return {
    title,
    description,
    openGraph: { title, description, url, type: "website", siteName: "Jual Beli Medan", locale: "id_ID", images: [{ url: imageUrl, width: 800, height: 800, alt: listing.title }] },
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

  // JSON-LD Product + BreadcrumbList — agar listing bisa muncul sebagai
  // rich result (harga, ketersediaan) di Google.
  const baseUrl =
    (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbelimedan.web.id").trim();
  const productUrl = `${baseUrl}/produk/${buildSlug(listing.title, listing.id)}`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description || listing.title,
    image: listing.images?.length
      ? listing.images
      : listing.image_url
      ? [listing.image_url]
      : undefined,
    category: listing.category,
    offers: {
      "@type": "Offer",
      url: productUrl,
      price: listing.price,
      priceCurrency: "IDR",
      itemCondition: "https://schema.org/UsedCondition",
      availability: sold
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      seller: { "@type": "Person", name: listing.seller_name },
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: baseUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: listing.category,
        item: `${baseUrl}/?cat=${encodeURIComponent(listing.category)}`,
      },
      { "@type": "ListItem", position: 3, name: listing.title, item: productUrl },
    ],
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ViewTracker listingId={listing.id} />
      <RecentlyViewedSaver listing={listing} slug={params.slug} />
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
              <Icon.MapPin className="h-3 w-3" /> {listing.campus === "Semua" ? "Medan" : listing.campus}
            </span>
            {listing.area && (
              <span className="badge bg-primary/5 text-primary dark:bg-white/10 dark:text-white font-medium flex items-center gap-1">
                <Icon.MapPin className="h-3 w-3" /> {listing.type === "jasa" ? listing.area : listing.area}
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
            {listing.type === "jasa" && <span className="text-xl text-gray-500 font-medium">Mulai dari </span>}
            {rupiah(listing.price)}
          </p>
          <p className="mt-1 text-sm text-gray-400">
            {listing.type !== "jasa" && <span>Stok: {listing.stock}</span>}
            {listing.views > 0 && (
              <span className="ml-2 inline-flex items-center gap-1.5 align-middle text-orange-500 font-medium bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-md">
                · <Icon.Eye className="h-3.5 w-3.5" /> Sedang dilihat {Math.max(1, Math.floor(listing.views / 5) + 1)} orang lainnya
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
                {listing.seller_profiles?.trusted_seller && (
                  <span className="inline-flex items-center justify-center rounded-full bg-blue-100 p-0.5 text-blue-500" title="Penjual Terpercaya">
                    <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
                Lihat semua iklan penjual →
              </p>
            </div>
          </Link>

          {/* Aksi */}
          <div className="mt-4 space-y-2">
            {!sold && <MinatButton listing={listing} />}
            {!sold && <OfferButton listing={listing} />}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="col-span-2 block md:hidden">
                <NativeShareButton listing={listing} />
              </div>
              <div className="hidden md:block">
                <ShareWAButton listing={listing} />
              </div>
              <div className="hidden md:block">
                <IGShareButton listing={listing} />
              </div>
              <div className="col-span-1 md:col-span-1">
                <CopyLinkButton listing={listing} />
              </div>
              <div className="col-span-1 md:col-span-1">
                <QRButton listing={listing} />
              </div>
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
        <section className="mt-10 mb-20 md:mb-0">
          <h2 className="text-lg font-bold">{listing.type === "jasa" ? "Jasa serupa" : "Barang serupa"}</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} listing={r} />
            ))}
          </div>
        </section>
      )}

      {/* Mobile Floating Action Bar (Sticky CTA) */}
      {!sold && (
        <div className="fixed bottom-[64px] left-0 right-0 z-30 md:hidden bg-white/90 backdrop-blur-md border-t border-gray-100 p-3 shadow-[0_-4px_10px_-1px_rgba(0,0,0,0.05)] dark:bg-slate-950/90 dark:border-slate-900 pb-safe">
          <MinatButton listing={listing} className="w-full shadow-lg shadow-wa/20" />
        </div>
      )}
    </div>
  );
}

