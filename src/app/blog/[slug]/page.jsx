import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const supa = getAdminClient();
  const { data: blog } = await supa
    .from("blogs")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!blog) return { title: "Blog Not Found" };

  return {
    title: `${blog.title} - Jual Beli Medan`,
    description: blog.content_markdown?.substring(0, 150) + "...",
    openGraph: {
      title: blog.title,
      images: blog.image_url ? [blog.image_url] : [],
    },
  };
}

export default async function BlogPost({ params }) {
  const supa = getAdminClient();
  const { data: blog } = await supa
    .from("blogs")
    .select("*")
    .eq("slug", params.slug)
    .maybeSingle();

  if (!blog || blog.status !== "published") notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 pb-20">
      <Link href="/blog" className="mb-6 inline-flex items-center text-sm font-medium text-gray-500 hover:text-primary dark:text-slate-400">
        ← Kembali ke Blog
      </Link>

      <h1 className="mb-4 text-3xl font-extrabold leading-tight dark:text-white md:text-4xl">
        {blog.title}
      </h1>
      
      <div className="mb-8 flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400">
        <span className="font-semibold text-primary">{blog.author}</span>
        <span>•</span>
        <span>{new Date(blog.created_at).toLocaleDateString("id-ID", { year: 'numeric', month: 'long', day: 'numeric' })}</span>
      </div>

      {blog.image_url && (
        <div className="mb-10 overflow-hidden rounded-2xl bg-gray-100 shadow-md dark:bg-slate-800">
          <Image src={blog.image_url} alt={blog.title} width={800} height={400} className="h-full w-full object-cover max-h-[400px]" />
        </div>
      )}

      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto max-w-none">
        <ReactMarkdown>{blog.content_markdown || ""}</ReactMarkdown>
      </div>

      <hr className="my-10 border-gray-200 dark:border-slate-800" />

      {/* Call To Action Box */}
      <div className="rounded-2xl bg-primary/10 p-6 text-center dark:bg-primary/5">
        <h3 className="mb-2 text-xl font-bold dark:text-white">Mau Cari Barang Lain?</h3>
        <p className="mb-4 text-gray-600 dark:text-slate-300">
          Ribuan warga Medan sudah bergabung. Temukan barang idamanmu sekarang!
        </p>
        <Link href="/" className="btn-primary inline-flex px-8">
          Mulai Belanja
        </Link>
      </div>
    </article>
  );
}
