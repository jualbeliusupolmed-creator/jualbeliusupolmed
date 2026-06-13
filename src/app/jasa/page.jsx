import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";
import { buildSlug } from "@/lib/slug";
import JasaBrowser from "./JasaBrowser";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Jasa Mahasiswa USU Polmed — Joki, Desain, IT",
  description: "Temukan jasa dari mahasiswa USU & POLMED. Mulai dari joki tugas, desain grafis, service laptop, hingga jasa angkut barang.",
  keywords: ["jasa mahasiswa", "joki tugas usu", "service laptop polmed", "desain grafis medan", "jasa angkut medan", "freelance mahasiswa"],
  alternates: { canonical: "/jasa" },
  openGraph: {
    title: "Jasa Mahasiswa USU Polmed",
    description: "Marketplace jasa khusus mahasiswa USU & POLMED.",
    url: "/jasa",
    siteName: "Jual Beli USU Polmed",
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

async function getInitialData() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("*, seller_wa", { count: "exact" })
      .eq("status", "active")
      .eq("type", "jasa")
      .order("featured", { ascending: false, nullsFirst: false })
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .range(0, PAGE_SIZE - 1);
      
    const { data, count } = await fetchListingsWithProfiles(query);
    return { listings: data || [], total: count || 0 };
  } catch (e) {
    console.error("getInitialData (jasa):", e?.message);
    return { listings: [], total: 0 };
  }
}

async function getFeatured() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("id,title,price,image_url,seller_wa")
      .eq("status", "active")
      .eq("type", "jasa")
      .eq("featured", true)
      .order("bumped_at", { ascending: false, nullsFirst: false })
      .limit(6);
      
    const { data } = await fetchListingsWithProfiles(query);
    return data || [];
  } catch {
    return [];
  }
}

async function getTrending() {
  try {
    const supa = getAdminClient();
    const query = supa
      .from("listings")
      .select("id,title,price,image_url,views,seller_wa")
      .eq("status", "active")
      .eq("type", "jasa")
      .gt("views", 0)
      .order("views", { ascending: false, nullsFirst: false })
      .limit(8);
      
    const { data } = await fetchListingsWithProfiles(query);
    return data || [];
  } catch {
    return [];
  }
}

export default async function JasaPage() {
  const [{ listings, total }, featured, trending, settings] =
    await Promise.all([
      getInitialData(),
      getFeatured(),
      getTrending(),
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <JasaBrowser
        initialListings={listings}
        initialTotal={total}
        featured={featured}
        trending={trending}
        categories={JASA_CATEGORIES}
        stats={null}
        heroTitle="Marketplace Jasa Kampus"
        heroSubtitle="Temukan berbagai jasa mahasiswa"
        layoutOrder={["hero", "featured", "main"]}
      />
    </>
  );
}
