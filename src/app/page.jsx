import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";
import { buildSlug } from "@/lib/slug";
import { fetchOpenPoBatches } from "@/lib/openPo";
import SuperAppHome from "./SuperAppHome";
import { skripJsonLd } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Jual Beli USU & Polmed — Kampus Hub",
  description:
    "Marketplace mahasiswa USU dan Polmed, info kampus, menfess, dan cari teman anonim. Pusat kampus untuk mahasiswa Medan.",
  keywords: ["jual beli USU", "jual beli Polmed", "menfess usu", "info kampus", "mahasiswa Medan", "cari teman", "marketplace mahasiswa"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Jual Beli USU & Polmed — Kampus Hub",
    description: "Marketplace mahasiswa USU dan Polmed, info kampus, menfess, dan cari teman anonim. Pusat kampus untuk mahasiswa Medan.",
    url: "/",
    siteName: "Jual Beli USU & Polmed",
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Jual Beli USU & Polmed — Kampus Hub",
    description: "Marketplace mahasiswa USU dan Polmed, info kampus, menfess, dan cari teman anonim.",
  },
};

const PAGE_SIZE = 20;

async function getInitialData() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("*, seller_wa")
      .eq("status", "active")
      .in("type", ["barang", "poster"])
      .order("featured", { ascending: false, nullsFirst: false })
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .range(0, PAGE_SIZE - 1);
      
    const [listingsResult, madingResult, poBatches] = await Promise.all([
      fetchListingsWithProfiles(query),
      supa
        .from("mading_posts")
        .select("id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, views_count, shares_count, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(15),
      fetchOpenPoBatches().catch(() => []),
    ]);

    return {
      listings: listingsResult?.data || [],
      madingPosts: madingResult?.data || [],
      poBatches: poBatches || [],
    };
  } catch (e) {
    return { listings: [], madingPosts: [], poBatches: [] };
  }
}

export default async function HomePage() {
  const [{ listings, madingPosts, poBatches }, settings] = await Promise.all([
    getInitialData(),
    getSettings(),
  ]);

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
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
      <SuperAppHome
        latestListings={listings}
        madingPosts={madingPosts}
        initialPoBatches={poBatches}
        heroTitle={settings.site?.heroTitle === "Marketplace Mahasiswa USU & POLMED" ? "" : settings.site?.heroTitle}
        heroSubtitle={settings.site?.heroSubtitle?.includes("dibantu admin") ? "" : settings.site?.heroSubtitle}
      />
    </>
  );
}
