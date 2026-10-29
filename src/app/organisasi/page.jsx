import { getAdminClient } from "@/lib/supabaseAdmin";
import OrganisasiClient from "./OrganisasiClient";
import { bentukOrganisasi } from "@/lib/organisasiDemo";
import { skripJsonLd } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 120;

export const metadata = {
  title: "Direktori UKM, BEM & Organisasi Kampus",
  description: "Jelajahi organisasi mahasiswa, UKM, informasi open recruitment, dan kegiatan kampus dari berbagai perguruan tinggi.",
  keywords: ["ukm kampus", "bem mahasiswa", "hima", "organisasi mahasiswa", "oprec ukm"],
  alternates: { canonical: "/organisasi" },
  openGraph: {
    title: "Direktori UKM, BEM & Organisasi Kampus",
    description: "Temukan organisasi mahasiswa, informasi open recruitment, dan kegiatan kepanitiaan dari berbagai kampus.",
    url: "/organisasi",
    type: "website",
    locale: "id_ID",
    siteName: "Kampus Kita",
  },
  twitter: {
    card: "summary_large_image",
    title: "Direktori UKM, BEM & Organisasi Kampus",
    description: "Temukan organisasi mahasiswa dan kegiatan kampus dari berbagai perguruan tinggi.",
  },
};


async function getInitialOrganisasi() {
  try {
    const supa = getAdminClient();
    const { data: dbOrgs } = await supa
      .from("seller_profiles")
      .select("wa, name, bio, avatar_url, campus, faculty, ukm_name, ukm_category, ukm_instagram, ukm_verified, created_at")
      .or("account_type.eq.ukm,ukm_verified.eq.true")
      .order("created_at", { ascending: false });

    return (dbOrgs || [])
      .map(bentukOrganisasi)
      .filter((org) => org.ukm_category !== "Platform");
  } catch (err) {
    console.error("getInitialOrganisasi error:", err?.message);
    return [];
  }
}

export default async function DirektoriOrganisasiPage() {
  const initialOrganisasi = await getInitialOrganisasi();
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Direktori UKM & Organisasi Kampus",
    "description": "Daftar organisasi mahasiswa dari berbagai perguruan tinggi.",
    "itemListElement": initialOrganisasi.map((org, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": org.ukm_name,
      "url": `${baseUrl}/organisasi`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(itemListJsonLd) }}
      />
      <OrganisasiClient initialOrganisasi={initialOrganisasi} />
    </>
  );
}
