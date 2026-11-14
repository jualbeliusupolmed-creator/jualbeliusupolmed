import { Suspense } from "react";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";
import { buildSlug } from "@/lib/slug";
import JasaBrowser from "./JasaBrowser";
import { skripJsonLd } from "@/lib/jsonLd";
import { getSellerSessionAsync } from "@/lib/auth";
import { applyMarketplaceProvinceScope, loadSessionMarketplaceScope } from "@/lib/marketplaceRegion";

// Client service-role memakai fetch no-store agar data marketplace tidak basi.
// Tandai halaman dynamic supaya kontrak cache Next.js sesuai dengan implementasi.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Jasa Mahasiswa — Freelance, Desain & IT",
  description: "Temukan jasa dari mahasiswa lintas kampus: pekerjaan lepas, desain grafis, servis perangkat, hingga jasa angkut.",
  keywords: ["jasa mahasiswa", "pekerjaan lepas", "servis perangkat", "desain grafis", "freelance"],
  alternates: { canonical: "/jasa" },
  openGraph: {
    title: "Jasa Mahasiswa",
    description: "Marketplace jasa mahasiswa lintas kampus.",
    url: "/jasa",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
};

const PAGE_SIZE = 20;

const JASA_CATEGORIES = [
  { slug: "all", name: "Semua Jasa", icon: "briefcase" },
  { slug: "tugas-akademik", name: "Tugas & Akademik", icon: "book" },
  { slug: "desain-video", name: "Desain & Video", icon: "palette" },
  { slug: "service-it", name: "Service & IT", icon: "cpu" },
  { slug: "angkut-pindahan", name: "Angkut & Pindahan", icon: "truck" },
  { slug: "jastip", name: "Jastip", icon: "shopping-bag" },
  { slug: "fotografi-event", name: "Fotografi & Event", icon: "camera" },
  { slug: "lainnya", name: "Lainnya", icon: "more-horizontal" },
];

function applyViewerScope(query, marketplaceScope) {
  if (!marketplaceScope?.authenticated) return query;
  return marketplaceScope.scope ? applyMarketplaceProvinceScope(query, marketplaceScope.scope) : null;
}

async function getInitialData(marketplaceScope) {
  try {
    const supa = getAdminClient();
    let query = supa
      .from("listings")
      .select("*, seller_wa", { count: "exact" })
      .eq("status", "active")
      .eq("type", "jasa")
      .order("featured", { ascending: false, nullsFirst: false })
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .range(0, PAGE_SIZE - 1);
    query = applyViewerScope(query, marketplaceScope);
    if (!query) return { listings: [], total: 0 };
      
    const { data, count } = await fetchListingsWithProfiles(query);
    return { listings: data || [], total: count || 0 };
  } catch (e) {
    console.error("getInitialData (jasa):", e?.message);
    return { listings: [], total: 0 };
  }
}

async function getFeatured(marketplaceScope) {
  try {
    const supa = getAdminClient();
    let query = supa
      .from("listings")
      .select("id,title,price,image_url,seller_wa")
      .eq("status", "active")
      .eq("type", "jasa")
      .eq("featured", true)
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .limit(6);
    query = applyViewerScope(query, marketplaceScope);
    if (!query) return [];
      
    const { data } = await fetchListingsWithProfiles(query);
    return data || [];
  } catch {
    return [];
  }
}

async function getTrending(marketplaceScope) {
  try {
    const supa = getAdminClient();
    let query = supa
      .from("listings")
      .select("id,title,price,image_url,views,seller_wa")
      .eq("status", "active")
      .eq("type", "jasa")
      .gt("views", 0)
      .order("views", { ascending: false, nullsFirst: false })
      .limit(8);
    query = applyViewerScope(query, marketplaceScope);
    if (!query) return [];
      
    const { data } = await fetchListingsWithProfiles(query);
    return data || [];
  } catch {
    return [];
  }
}

export default async function JasaPage() {
  const sessionIdentity = await getSellerSessionAsync();
  const marketplaceScope = sessionIdentity
    ? await loadSessionMarketplaceScope(getAdminClient(), sessionIdentity).catch(() => ({ authenticated: true, scope: null }))
    : { authenticated: false, scope: null };
  const [{ listings, total }, featured, trending, settings] =
    await Promise.all([
      getInitialData(marketplaceScope),
      getFeatured(marketplaceScope),
      getTrending(marketplaceScope),
      getSettings(),
    ]);

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.kampuskita.my.id").trim();
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": listings.map((l, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "url": `${baseUrl}/produk/${buildSlug(l.title, l.id)}`
    }))
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(itemListJsonLd) }}
      />
      <Suspense fallback={<div className="py-20 text-center text-gray-400">Memuat...</div>}>
        <JasaBrowser
          initialListings={listings}
          initialTotal={total}
          featured={featured}
          trending={trending}
          categories={JASA_CATEGORIES}
          stats={null}
          heroTitle="Marketplace Jasa Kampus"
          heroSubtitle="Temukan berbagai Jasa Mahasiswa"
          layoutOrder={["hero", "featured", "main"]}
        />
      </Suspense>
    </>
  );
}
