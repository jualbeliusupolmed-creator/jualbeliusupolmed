import { getAdminClient } from "@/lib/supabaseAdmin";
import OrganisasiClient from "./OrganisasiClient";
import { bentukOrganisasi, gabungDenganContoh, ORGANISASI_CONTOH } from "@/lib/organisasiDemo";

export const dynamic = "force-dynamic";
export const revalidate = 120;

export const metadata = {
  title: "Direktori UKM, BEM & Organisasi Kampus — USU & POLMED",
  description: "Eksplorasi daftar BEM, HIMA, dan Unit Kegiatan Mahasiswa (UKM) resmi di Universitas Sumatera Utara (USU) & Politeknik Negeri Medan (POLMED). Info oprec dan kegiatan kampus.",
  keywords: ["ukm usu", "ukm polmed", "bem usu", "bem polmed", "hima usu", "organisasi mahasiswa medan", "oprec ukm usu"],
  alternates: { canonical: "/organisasi" },
  openGraph: {
    title: "Direktori UKM, BEM & Organisasi Kampus — USU & POLMED",
    description: "Temukan BEM, HIMA, dan Unit Kegiatan Mahasiswa (UKM) resmi di USU & POLMED. Info open recruitment dan kegiatan kepanitiaan.",
    url: "/organisasi",
    type: "website",
    locale: "id_ID",
    siteName: "Jual Beli & Komunitas Mahasiswa USU POLMED",
  },
  twitter: {
    card: "summary_large_image",
    title: "Direktori UKM, BEM & Organisasi Kampus — USU & POLMED",
    description: "Temukan BEM, HIMA, dan Unit Kegiatan Mahasiswa (UKM) resmi di USU & POLMED.",
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

    const orgList = (dbOrgs || []).map(bentukOrganisasi);
    return gabungDenganContoh(orgList);
  } catch (err) {
    console.error("getInitialOrganisasi error:", err?.message);
    return ORGANISASI_CONTOH;
  }
}

export default async function DirektoriOrganisasiPage() {
  const initialOrganisasi = await getInitialOrganisasi();
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Direktori UKM & Organisasi Kampus USU POLMED",
    "description": "Daftar resmi Unit Kegiatan Mahasiswa, BEM, dan HIMA di USU & POLMED.",
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd).replace(/</g, "\\u003c") }}
      />
      <OrganisasiClient initialOrganisasi={initialOrganisasi} />
    </>
  );
}
