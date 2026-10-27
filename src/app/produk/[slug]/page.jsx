import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rupiah } from "@/lib/fees";
import { formatWa } from "@/lib/constants";
import { buildSlug, getShortIdFromSlug, isUUID } from "@/lib/slug";
import { fetchSingleListingWithProfile, fetchListingsWithProfiles } from "@/lib/dbHelpers";
import MinatButton from "@/components/MinatButton";
import OfferButton from "@/components/OfferButton";
import ShareModal from "@/components/ShareModal";
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
import OwnerFastActions from "@/components/OwnerFastActions";
import { Icon } from "@/components/Icons";
import { skripJsonLd } from "@/lib/jsonLd";
import { buildListingShortPath, looksLikeListingCode, normalizeListingCode } from "@/lib/listingCode";
import { formatListingSpecs } from "@/lib/listingSpecs";
import ProductDetailInteractive from "@/components/ProductDetailInteractive";
import { checkProhibitedListing } from "@/lib/profanity";
import { evaluateModerationRules } from "@/lib/moderationRules";
import { encodeSellerSlug } from "@/lib/sellerSlug";

export const revalidate = 300; // ISR 5 menit

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
    } else if (looksLikeListingCode(slug)) {
      const code = normalizeListingCode(slug);
      const query = supa
        .from("listings")
        .select("*, seller_wa")
        .eq("listing_code", code)
        .maybeSingle();
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

    const minPrice = listing.price ? Math.floor(listing.price * 0.5) : 0;
    const maxPrice = listing.price ? Math.ceil(listing.price * 2.0) : 0;

    let queryRelated = supa
      .from("listings")
      .select("*, seller_wa")
      .eq("status", "active")
      .eq("category", listing.category)
      .neq("id", listing.id)
      .limit(10);

    if (listing.price > 0) {
      queryRelated = queryRelated.gte("price", minPrice).lte("price", maxPrice);
    } else {
      queryRelated = queryRelated.eq("price", 0);
    }
    
    const { data: rawRelated } = await fetchListingsWithProfiles(queryRelated);
    const related = (rawRelated || []).filter((r) => {
      const mod = evaluateModerationRules({
        title: r.title,
        description: r.description,
        category: r.category,
        price: r.price,
      });
      return mod.action === "allow" && !checkProhibitedListing(r.title, r.description).prohibited;
    }).slice(0, 4);

    return { listing, related };
  } catch (err) {
    console.error("getData error:", err);
    return { listing: null, related: [] };
  }
}

// ── SEO: generateMetadata ────────────────────────────────────────────────────
export async function generateMetadata({ params }) {
  const { listing } = await getData(params.slug);
  if (!listing) {
    return { title: "Produk tidak ditemukan" };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Jual Beli USU Polmed";
  const condLabel = listing.condition === "new" ? "Baru" : listing.condition === "used" ? "Bekas" : null;
  const isRental = listing.type === "sewa";
  const priceLabel = isRental && listing.rental_period
    ? `${rupiah(listing.price)}/${listing.rental_period}`
    : rupiah(listing.price);
  const title = `${listing.title} — ${priceLabel}${condLabel ? ` (${condLabel})` : ""}`;
  const descBase = listing.description ? listing.description.slice(0, 120).replace(/[\s—\-–]+$/, "").trim() : null;
  const description = descBase
    ? `${descBase} — ${priceLabel}. COD area USU & Polmed Medan.`
    : `${listing.title}${condLabel ? ` kondisi ${condLabel}` : ""} dijual ${priceLabel} oleh ${listing.seller_name || "Mahasiswa"} di ${siteName}. COD kampus USU & Polmed, transaksi aman dibantu admin.`;
  const canonicalSlug = buildSlug(listing.title, listing.id);
  const url = `${baseUrl}/produk/${canonicalSlug}`;

  const ogParams = new URLSearchParams({
    title: listing.title,
    price: String(listing.price || ""),
    seller: listing.seller_name || "",
    category: listing.category || "",
    type: listing.type || "jual",
    ...(listing.image_url ? { image: listing.image_url } : {}),
  });
  const ogImageUrl = `${baseUrl}/api/og?${ogParams.toString()}`;

  const keywords = [
    listing.title, listing.category, listing.seller_name,
    condLabel, listing.listing_code ? `kode ${listing.listing_code}` : null,
    "jual beli USU", "jual beli Polmed", "marketplace kampus Medan",
    "Universitas Sumatera Utara", "Politeknik Negeri Medan",
    "COD Medan", "preloved mahasiswa",
  ].filter(Boolean);

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName,
      locale: "id_ID",
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: listing.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImageUrl] },
    alternates: { canonical: url },
  };
}
// ────────────────────────────────────────────────────────────────────────────

export default async function ProdukPage({ params }) {
  const { listing, related } = await getData(params.slug);
  if (!listing) notFound();

  // If someone visits old UUID link or numeric listing code, redirect to clean canonical slug URL
  if (isUUID(params.slug) || looksLikeListingCode(params.slug)) {
    redirect(`/produk/${buildSlug(listing.title, listing.id)}`);
  }

  const sold = listing.status === "sold";
  const shortPath = buildListingShortPath(listing.listing_code);
  const listingSpecs = formatListingSpecs(listing.category, listing.specs);
  // URL profil penjual: utamakan username/slug resmi penjual
  const sellerUsername = listing.seller_profiles?.slug || encodeSellerSlug(listing.seller_wa);

  // JSON-LD Product + BreadcrumbList — agar listing bisa muncul sebagai
  // rich result (harga, ketersediaan) di Google.
  const baseUrl =
    (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Jual Beli USU Polmed";
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
    sku: listing.listing_code ? String(listing.listing_code) : listing.id?.slice(0, 8),
    brand: { "@type": "Organization", name: siteName },
    offers: {
      "@type": "Offer",
      url: productUrl,
      price: listing.price,
      priceCurrency: "IDR",
      itemCondition: listing.condition === "new"
        ? "https://schema.org/NewCondition"
        : "https://schema.org/UsedCondition",
      availability: sold
        ? "https://schema.org/SoldOut"
        : "https://schema.org/InStock",
      priceValidUntil: listing.expires_at
        ? new Date(listing.expires_at).toISOString().split("T")[0]
        : new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      seller: {
        "@type": "Person",
        name: listing.seller_name,
        identifier: listing.seller_wa,
      },
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
    <div className="mx-auto max-w-5xl px-4 py-6 pb-24 md:pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(breadcrumbJsonLd) }}
      />
      <ViewTracker listingId={listing.id} />
      <RecentlyViewedSaver listing={listing} slug={params.slug} />
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 min-w-0 text-[13px] text-[#6e6e73] dark:text-slate-400">
        <Link href="/" className="hover:text-primary shrink-0">Beranda</Link>
        <span className="shrink-0">/</span>
        <Link href={`/?cat=${listing.category}`} className="hover:text-primary shrink-0">
          {listing.category}
        </Link>
        <span className="shrink-0">/</span>
        <span className="truncate text-gray-500">{listing.title}</span>
      </nav>

      {/* 12-Column Grid Matching 12.html blueprint */}
      <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        <ProductDetailInteractive
          listing={listing}
          listingSpecs={listingSpecs}
          sellerUsername={sellerUsername}
          sold={sold}
          gallery={
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
          }
        />
      </div>

      {/* Produk serupa */}
      {related.length > 0 && (
        <section className="mt-12 mb-20 md:mb-6">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            {listing.type === "jasa"
              ? "Jasa Serupa di Kampus"
              : "Rekomendasi Barang Sejenis (USU • POLMED)"}
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-2.5 xs:gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {related.map((r) => (
              <ProductCard key={r.id} listing={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
