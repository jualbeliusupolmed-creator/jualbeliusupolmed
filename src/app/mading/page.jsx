import { getAdminClient } from "@/lib/supabaseAdmin";
import MadingClient from "./MadingClient";
import { skripJsonLd } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 60; // ISR revalidate 60 detik

export const metadata = {
  title: "Mading & Menfess Kampus — Suara Mahasiswa USU & POLMED",
  description: "Mading digital mahasiswa USU & POLMED. Bagikan curhat, info seputar kampus, cari barang hilang, dan dengarkan suara kampus secara anonim, aman, dan real-time.",
  keywords: ["menfess usu", "menfess polmed", "mading kampus", "suara mahasiswa", "info usu", "info polmed"],
  alternates: { canonical: "/mading" },
  openGraph: {
    title: "Mading & Menfess Kampus — USU & POLMED",
    description: "Ruang curhat & mading digital mahasiswa USU & POLMED. Baca curhatan terpanas dan info kampus terbaru.",
    url: "/mading",
    type: "website",
    locale: "id_ID",
    siteName: "Jual Beli & Komunitas Mahasiswa USU POLMED",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mading & Menfess Kampus — USU & POLMED",
    description: "Ruang curhat & mading digital mahasiswa USU & POLMED. Baca curhatan terpanas dan info kampus terbaru.",
  },
};

async function getInitialMadingPosts() {
  try {
    const supa = getAdminClient();
    const [resMading, resBlog] = await Promise.all([
      supa
        .from("mading_posts")
        .select("id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, views_count, shares_count, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20),
      supa
        .from("blogs")
        .select("id, title, slug, content, image_url, author_name, views, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const madingItems = (resMading.data || []).map((p) => ({ ...p, _kind: "mading" }));
    const blogItems = (resBlog.data || []).map((b) => ({ ...b, _kind: "blog" }));

    return [...madingItems, ...blogItems].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  } catch (err) {
    console.error("getInitialMadingPosts error:", err?.message);
    return [];
  }
}

export default async function MadingPage() {
  const initialPosts = await getInitialMadingPosts();
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Mading & Menfess Mahasiswa USU & POLMED",
    "description": "Daftar postingan terbaru mading digital dan menfess mahasiswa USU & POLMED.",
    "itemListElement": initialPosts.slice(0, 10).map((post, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": post.title || (post.content ? post.content.slice(0, 50) + "..." : "Menfess"),
      "url": `${baseUrl}/mading`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(itemListJsonLd) }}
      />
      <MadingClient initialPosts={initialPosts} />
    </>
  );
}
