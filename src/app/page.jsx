import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import { fetchListingsWithProfiles } from "@/lib/dbHelpers";
import { buildSlug } from "@/lib/slug";
import SuperAppHome from "./SuperAppHome";
import { skripJsonLd } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Jual Beli USU & Polmed — Kampus Hub",
  description:
    "Marketplace mahasiswa USU dan Polmed, info kampus, menfess, dan cari teman anonim. Super app untuk mahasiswa Medan.",
  keywords: ["jual beli USU", "jual beli Polmed", "menfess usu", "info kampus", "mahasiswa Medan", "cari teman", "marketplace mahasiswa"],
  alternates: { canonical: "/" },
  openGraph: {
    title: "Jual Beli USU & Polmed — Kampus Hub",
    description: "Marketplace mahasiswa USU dan Polmed, info kampus, menfess, dan cari teman anonim. Super app untuk mahasiswa Medan.",
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
      
    const { data } = await fetchListingsWithProfiles(query);

    // Cuplikan mading untuk beranda — POSTINGAN SUNGGUHAN. Dulu bagian ini
    // mockup hardcode, termasuk pengumuman karangan atas nama BEM KM USU;
    // barang karangan di halaman depan adalah jenis kebohongan yang audit
    // 22 Agu sudah bersihkan dari /lomba, jangan tumbuh lagi di sini.
    const { data: mading } = await supa
      .from("mading_posts")
      .select("id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, views_count, shares_count, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(15);

    return { listings: data || [], madingPosts: mading || [] };
  } catch (e) {
    return { listings: [], madingPosts: [] };
  }
}

export default async function HomePage() {
  const [{ listings, madingPosts }, settings] = await Promise.all([
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
        heroTitle={settings.site?.heroTitle === "Marketplace Mahasiswa USU & POLMED" ? "" : settings.site?.heroTitle}
        heroSubtitle={settings.site?.heroSubtitle?.includes("dibantu admin") ? "" : settings.site?.heroSubtitle}
      />
    </>
  );
}
