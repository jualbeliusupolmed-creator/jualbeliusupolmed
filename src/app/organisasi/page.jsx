import { getAdminClient } from "@/lib/supabaseAdmin";
import OrganisasiClient from "./OrganisasiClient";

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

const DEMO_ORGANISASI = [
  {
    id: "org-pema-usu",
    ukm_name: "PEMA USU (Pemerintahan Mahasiswa)",
    ukm_category: "bem_hima",
    ukm_category_label: "BEM & HIMA",
    campus: "USU",
    faculty: "Universitas",
    ukm_instagram: "pema.usu",
    photo_url: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=300&auto=format&fit=crop&q=80",
    bio: "Lembaga eksekutif tertinggi mahasiswa Universitas Sumatera Utara. Mewadahi aspirasi, advokasi, dan kolaborasi mahasiswa USU.",
    ukm_verified: true,
    created_at: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "org-bem-polmed",
    ukm_name: "BEM POLMED",
    ukm_category: "bem_hima",
    ukm_category_label: "BEM & HIMA",
    campus: "POLMED",
    faculty: "Politeknik",
    ukm_instagram: "bempolmed_official",
    photo_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=300&auto=format&fit=crop&q=80",
    bio: "Badan Eksekutif Mahasiswa Politeknik Negeri Medan. Bergerak untuk kemajuan dan kreativitas mahasiswa Polmed.",
    ukm_verified: true,
    created_at: "2026-01-02T00:00:00.000Z",
  },
  {
    id: "org-robotika-usu",
    ukm_name: "UKM Robotika USU",
    ukm_category: "riset_teknologi",
    ukm_category_label: "Riset & Teknologi",
    campus: "USU",
    faculty: "Fasilkom-TI / Teknik",
    ukm_instagram: "robotika_usu",
    photo_url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=300&auto=format&fit=crop&q=80",
    bio: "Unit Kegiatan Mahasiswa bidang riset otomasi, IoT, dan kontes robot nasional. Terbuka untuk seluruh mahasiswa USU.",
    ukm_verified: true,
    created_at: "2026-01-03T00:00:00.000Z",
  },
  {
    id: "org-teater-o",
    ukm_name: "Teater O USU",
    ukm_category: "seni_budaya",
    ukm_category_label: "Seni & Budaya",
    campus: "USU",
    faculty: "FIB / Universitas",
    ukm_instagram: "teatero_usu",
    photo_url: "https://images.unsplash.com/photo-1460723237483-7a6dc9d0b212?w=300&auto=format&fit=crop&q=80",
    bio: "Komunitas dan UKM seni peran, sastra, teater, dan pementasan seni budaya mahasiswa USU Medan.",
    ukm_verified: true,
    created_at: "2026-01-04T00:00:00.000Z",
  },
  {
    id: "org-pers-suara-usu",
    ukm_name: "Pers Mahasiswa Suara USU",
    ukm_category: "media_pers",
    ukm_category_label: "Pers & Media",
    campus: "USU",
    faculty: "Universitas",
    ukm_instagram: "suarausu",
    photo_url: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=300&auto=format&fit=crop&q=80",
    bio: "Lembaga Pers Mahasiswa independen Universitas Sumatera Utara. Menyajikan berita, liputan investigasi, dan opini kampus.",
    ukm_verified: true,
    created_at: "2026-01-05T00:00:00.000Z",
  },
  {
    id: "org-futsal-polmed",
    ukm_name: "UKM Olahraga & Futsal Polmed",
    ukm_category: "olahraga",
    ukm_category_label: "Olahraga",
    campus: "POLMED",
    faculty: "Politeknik",
    ukm_instagram: "futsal_polmed",
    photo_url: "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=300&auto=format&fit=crop&q=80",
    bio: "Pusat pembinaan bakat olahraga, futsal, basket, dan kejuaraan pekan olahraga mahasiswa Polmed Medan.",
    ukm_verified: true,
    created_at: "2026-01-06T00:00:00.000Z",
  },
];

async function getInitialOrganisasi() {
  try {
    const supa = getAdminClient();
    const { data: dbOrgs } = await supa
      .from("seller_profiles")
      .select("wa, name, bio, avatar_url, photo_url, campus, faculty, ukm_name, ukm_category, ukm_instagram, ukm_verified, created_at")
      .or("account_type.eq.ukm,ukm_verified.eq.true")
      .order("created_at", { ascending: false });

    let orgList = [];
    if (dbOrgs && dbOrgs.length > 0) {
      orgList = dbOrgs.map((org) => ({
        id: org.wa,
        ukm_name: org.ukm_name || org.name,
        ukm_category: org.ukm_category || "bem_hima",
        campus: org.campus || "USU",
        faculty: org.faculty || "Umum",
        ukm_instagram: org.ukm_instagram || "",
        photo_url: org.photo_url || org.avatar_url || "",
        bio: org.bio || "",
        ukm_verified: org.ukm_verified !== false,
        created_at: org.created_at,
      }));
    }

    const combined = [...orgList, ...DEMO_ORGANISASI];
    const uniqueMap = new Map();
    combined.forEach((o) => {
      const key = (o.ukm_name || "").toLowerCase();
      if (!uniqueMap.has(key)) uniqueMap.set(key, o);
    });

    return Array.from(uniqueMap.values());
  } catch (err) {
    console.error("getInitialOrganisasi error:", err?.message);
    return DEMO_ORGANISASI;
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
