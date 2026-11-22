import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";
import { buildSlug } from "@/lib/slug";
import { fetchOpenPoBatches } from "@/lib/openPo";
import SuperAppHome from "./SuperAppHome";
import { skripJsonLd } from "@/lib/jsonLd";
import { getSellerSessionAsync } from "@/lib/auth";
import { applyMarketplaceProvinceScope, loadSessionMarketplaceScope } from "@/lib/marketplaceRegion";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Kampus Kita: Ekosistem Digital Mahasiswa",
  description:
    "Ekosistem digital mahasiswa lintas kampus: marketplace preloved, open PO, suara menfess anonim, dan janjian COD aman.",
  keywords: [
    "Kampus Kita",
    "marketplace mahasiswa",
    "jual beli usu",
    "jual beli polmed",
    "jual beli kampus",
    "open PO mahasiswa",
    "menfess mahasiswa",
    "preloved mahasiswa",
    "barang bekas kampus",
    "wtb mahasiswa",
    "COD kampus"
  ],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Kampus Kita: Ekosistem Digital Mahasiswa",
    description: "Ekosistem digital mahasiswa lintas kampus: marketplace preloved, open PO, suara menfess anonim, dan janjian COD aman.",
    url: "/",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kampus Kita: Ekosistem Digital Mahasiswa",
    description: "Ekosistem digital mahasiswa lintas kampus dengan marketplace, open PO, mading, dan chat.",
  },
};

const PAGE_SIZE = 36;

async function getInitialData(sessionIdentity) {
  try {
    const supa = getAdminClient();
    let provinceId;
    let query = supa
      .from("listings")
      .select("id, listing_code, title, description, price, image_url, images, campus, area, category, type, status, featured, bumped_at, created_at, condition, seller_name, seller_wa, views, stock, rental_period")
      .eq("status", "active")
      .in("type", ["barang", "poster"])
      .order("featured", { ascending: false, nullsFirst: false })
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .range(0, PAGE_SIZE - 1);

    if (sessionIdentity) {
      const { scope, region } = await loadSessionMarketplaceScope(supa, sessionIdentity);
      if (!scope) return { listings: [], total: 0 };
      provinceId = region.province;
      query = applyMarketplaceProvinceScope(query, scope);
      if (!query) return { listings: [], total: 0 };
    }
      
    const [listingsResult, madingResult, poBatches] = await Promise.all([
      fetchListingsWithProfiles(query),
      supa
        .from("mading_posts")
        .select("id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, views_count, shares_count, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(15),
      fetchOpenPoBatches({ provinceId }).catch(() => []),
    ]);

    // Deduplikasi: database masih berisi iklan ganda (satu penjual mengiklankan
    // barang yang sama berulang). Hapus dulu sebelum dikirim ke client.
    const dedupedSellerTitle = new Set();
    const dedupedListings = (listingsResult?.data || []).filter((l) => {
      const seller = String(l.seller_wa || "").toLowerCase();
      const title = String(l.title || "").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!seller || !title) return true;
      const key = `${seller}:${title}`;
      if (dedupedSellerTitle.has(key)) return false;
      dedupedSellerTitle.add(key);
      return true;
    });

    return {
      listings: dedupedListings,
      madingPosts: madingResult?.data || [],
      poBatches: poBatches || [],
    };
  } catch (e) {
    return { listings: [], madingPosts: [], poBatches: [] };
  }
}

export default async function HomePage() {
  const sessionIdentity = await getSellerSessionAsync();
  const [{ listings, madingPosts, poBatches }, settings] = await Promise.all([
    getInitialData(sessionIdentity),
    getSettings(),
  ]);

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.kampuskita.my.id").trim();
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "numberOfItems": listings.length,
    "itemListElement": listings.map((l, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": l.title,
      "url": `${baseUrl}/produk/${buildSlug(l.title, l.id)}`,
      ...(l.image_url ? { "image": l.image_url } : {}),
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(itemListJsonLd) }}
      />
      <SuperAppHome
        latestListings={listings}
        madingPosts={madingPosts}
        initialPoBatches={poBatches}
        heroTitle={settings.site?.heroTitle}
        heroSubtitle={settings.site?.heroSubtitle?.includes("dibantu admin") ? "" : settings.site?.heroSubtitle}
      />
    </>
  );
}
