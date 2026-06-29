import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';
// export const revalidate = 60; // ISR 1 menit

async function getBlog(slug) {
  const supa = getAdminClient();
  const { data } = await supa
    .from("blogs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }) {
  const blog = await getBlog(params.slug);
  if (!blog) return { title: "Artikel tidak ditemukan" };

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Jual Beli USU Polmed";
  const url = `${baseUrl}/blog/${blog.slug}`;

  // Excerpt: gunakan excerpt field jika ada, else strip markdown dan potong
  const rawExcerpt = blog.excerpt ||
    (blog.content_markdown || "")
      .replace(/#{1,6}\s/g, "")
      .replace(/[*_`~\[\]()]/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 155);
  const description = rawExcerpt || `Baca artikel "${blog.title}" di ${siteName}.`;
  const keywords = blog.keywords ? blog.keywords.split(",").map(k => k.trim()) : ["blog USU", "artikel polmed", blog.title];

  // Dynamic OG image via /api/og
  const ogParams = new URLSearchParams({ title: blog.title, type: "blog", ...(blog.image_url ? { image: blog.image_url } : {}) });
  const ogImageUrl = blog.image_url || `${baseUrl}/api/og?${ogParams.toString()}`;

  return {
    title: `${blog.title} — ${siteName}`,
    description,
    keywords,
    authors: [{ name: blog.author || siteName }],
    alternates: { canonical: url },
    openGraph: {
      title: blog.title,
      description,
      url,
      type: "article",
      siteName,
      locale: "id_ID",
      publishedTime: blog.created_at,
      modifiedTime: blog.updated_at || blog.created_at,
      authors: [blog.author || siteName],
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: blog.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: blog.title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function BlogPost({ params }) {
  const blog = await getBlog(params.slug);
  if (!blog || blog.status !== "published") notFound();

  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || "Jual Beli USU Polmed";
  const url = `${baseUrl}/blog/${blog.slug}`;
  const rawExcerpt = blog.excerpt ||
    (blog.content_markdown || "")
      .replace(/#{1,6}\s/g, "")
      .replace(/[*_`~\[\]()]/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 155);

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": blog.title,
    "description": rawExcerpt,
    "author": { "@type": "Person", "name": blog.author || siteName },
    "publisher": {
      "@type": "Organization",
      "name": siteName,
      "url": baseUrl,
    },
    "datePublished": blog.created_at,
    "dateModified": blog.updated_at || blog.created_at,
    "url": url,
    ...(blog.image_url && { "image": { "@type": "ImageObject", "url": blog.image_url, "width": 800, "height": 400 } }),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Beranda", "item": baseUrl },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${baseUrl}/blog` },
      { "@type": "ListItem", "position": 3, "name": blog.title, "item": url },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />

      {/* Breadcrumb */}
      <nav className="mb-6 flex items-center gap-2 text-sm text-gray-400">
        <Link href="/" className="hover:text-primary">Beranda</Link>
        <span>/</span>
        <Link href="/blog" className="hover:text-primary">Blog</Link>
        <span>/</span>
        <span className="text-gray-600 dark:text-slate-400 line-clamp-1">{blog.title}</span>
      </nav>

      <h1 className="mb-4 text-3xl font-extrabold leading-tight dark:text-white md:text-4xl">
        {blog.title}
      </h1>

      <div className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400">
        <span className="font-semibold text-primary">{blog.author}</span>
        <span>•</span>
        <time dateTime={blog.created_at}>
          {new Date(blog.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" })}
        </time>
        {blog.updated_at && blog.updated_at !== blog.created_at && (
          <>
            <span>•</span>
            <span>Diperbarui {new Date(blog.updated_at).toLocaleDateString("id-ID", { month: "short", day: "numeric", year: "numeric" })}</span>
          </>
        )}
      </div>

      {blog.image_url && (
        <div className="mb-10 overflow-hidden rounded-2xl bg-gray-100 shadow-md dark:bg-slate-800">
          <Image src={blog.image_url} alt={blog.title} width={800} height={400} className="h-full w-full object-cover max-h-[400px]" priority />
        </div>
      )}

      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto max-w-none prose-headings:font-extrabold prose-a:text-primary">
        <ReactMarkdown>{blog.content_markdown || ""}</ReactMarkdown>
      </div>

      {/* Tags */}
      {blog.keywords && (
        <div className="mt-8 flex flex-wrap gap-2">
          {blog.keywords.split(",").map((tag) => (
            <span key={tag.trim()} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-slate-800 dark:text-slate-400">
              #{tag.trim()}
            </span>
          ))}
        </div>
      )}

      <hr className="my-10 border-gray-200 dark:border-slate-800" />

      {/* CTA */}
      <div className="rounded-2xl bg-primary/10 p-6 text-center dark:bg-primary/5">
        <h3 className="mb-2 text-xl font-bold dark:text-white">Mau Jual atau Cari Barang?</h3>
        <p className="mb-4 text-gray-600 dark:text-slate-300">
          Bergabung dengan ribuan warga USU & Polmed yang sudah berjualan di sini.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/" className="btn-primary inline-flex px-6">Mulai Belanja</Link>
          <Link href="/jual" className="btn-outline inline-flex px-6">Pasang Iklan</Link>
        </div>
      </div>
    </article>
  );
}
