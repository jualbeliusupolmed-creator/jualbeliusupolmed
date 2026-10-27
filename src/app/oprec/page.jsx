import { getAdminClient } from "@/lib/supabaseAdmin";
import OprecClient from "./OprecClient";
import { skripJsonLd } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Pusat Open Recruitment & Kepanitiaan Kampus",
  description: "Daftar lowongan open recruitment panitia, volunteer, staf organisasi, dan anggota UKM kampus. Daftar online langsung dalam hitungan detik.",
  keywords: ["oprec kampus", "oprec panitia", "lowongan kepanitiaan", "volunteer mahasiswa", "kepanitiaan mahasiswa"],
  alternates: { canonical: "/oprec" },
  openGraph: {
    title: "Pusat Open Recruitment & Kepanitiaan Kampus",
    description: "Temukan dan daftar lowongan kepanitiaan acara, staf organisasi, dan keanggotaan UKM kampus.",
    url: "/oprec",
    type: "website",
    locale: "id_ID",
    siteName: "Kampus Kita",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pusat Open Recruitment & Kepanitiaan Kampus",
    description: "Temukan dan daftar lowongan kepanitiaan acara, staf organisasi, dan keanggotaan UKM kampus.",
  },
};

async function getInitialOprecs() {
  try {
    const supa = getAdminClient();
    const { data: oprecs, error } = await supa
      .from("oprec_events")
      .select("id, ukm_name, ukm_wa, title, description, campus, faculty, banner_url, divisions, wa_group_link, deadline, status, submissions_count, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error || !oprecs || oprecs.length === 0) {
      return [];
    }

    return oprecs;
  } catch (err) {
    console.error("getInitialOprecs error:", err?.message);
    return [];
  }
}

export default async function OprecPage() {
  const initialOprecs = await getInitialOprecs();
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Open Recruitment Kepanitiaan & UKM Kampus",
    "description": "Daftar rekrutmen panitia acara, volunteer, dan staf organisasi mahasiswa.",
    "itemListElement": initialOprecs.map((op, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": `${op.title} — ${op.ukm_name}`,
      "url": `${baseUrl}/oprec`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(itemListJsonLd) }}
      />
      <OprecClient initialOprecs={initialOprecs} />
    </>
  );
}
