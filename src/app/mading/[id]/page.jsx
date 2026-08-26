import { notFound } from "next/navigation";
import { getAdminClient } from "@/lib/supabaseAdmin";
import MadingDetailClient from "./MadingDetailClient";
import { skripJsonLd } from "@/lib/jsonLd";

export const dynamic = "force-dynamic";
export const revalidate = 60;

async function getPost(id) {
  try {
    const supa = getAdminClient();
    const { data: post, error } = await supa
      .from("mading_posts")
      .select("id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, views_count, shares_count, created_at, status")
      .eq("id", id)
      .eq("status", "active")
      .maybeSingle();

    if (error || !post) return null;

    const { data: comments } = await supa
      .from("mading_comments")
      .select("id, post_id, parent_id, sender_name, faculty, content, is_op, created_at")
      .eq("post_id", id)
      .order("created_at", { ascending: true });

    return { ...post, initialComments: comments || [] };
  } catch (err) {
    console.error("getPost error:", err?.message);
    return null;
  }
}

export async function generateMetadata({ params }) {
  const post = await getPost(params.id);
  if (!post) {
    return {
      title: "Postingan Tidak Ditemukan — Mading USU POLMED",
      description: "Postingan mading atau menfess tidak ditemukan atau telah dihapus.",
    };
  }

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const titleText = post.title || (post.type === "info" ? "Info Kampus" : `Menfess dari ${post.sender_name} (${post.faculty})`);
  const rawSnippet = (post.content || "").replace(/\n+/g, " ").trim();
  const description = rawSnippet.slice(0, 160) + (rawSnippet.length > 160 ? "..." : "");
  const url = `${baseUrl}/mading/${post.id}`;
  const ogImageUrl = `${baseUrl}/api/mading/${post.id}/instagram-image?ratio=landscape`;

  return {
    title: `${titleText} — Mading & Menfess Kampus USU POLMED`,
    description,
    keywords: ["menfess usu", "menfess polmed", "mading kampus", post.faculty, post.type],
    alternates: { canonical: url },
    openGraph: {
      title: `${titleText} — Mading USU POLMED`,
      description,
      url,
      type: "article",
      locale: "id_ID",
      siteName: "Jual Beli & Komunitas Mahasiswa USU POLMED",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 675,
          alt: titleText,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${titleText} — Mading USU POLMED`,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function MadingDetailPage({ params }) {
  const post = await getPost(params.id);
  if (!post) notFound();

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const titleText = post.title || `Menfess dari ${post.sender_name} (${post.faculty})`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SocialMediaPosting",
    "headline": titleText,
    "articleBody": post.content,
    "datePublished": post.created_at,
    "author": {
      "@type": "Person",
      "name": post.sender_name || "Mahasiswa",
    },
    "interactionStatistic": [
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/LikeAction",
        "userInteractionCount": post.likes_count || 0,
      },
      {
        "@type": "InteractionCounter",
        "interactionType": "https://schema.org/CommentAction",
        "userInteractionCount": post.comments_count || 0,
      },
    ],
    "url": `${baseUrl}/mading/${post.id}`,
    "publisher": {
      "@type": "Organization",
      "name": "Jual Beli USU Polmed",
      "url": baseUrl,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: skripJsonLd(jsonLd) }}
      />
      <MadingDetailClient post={post} />
    </>
  );
}
