import Link from "next/link";
import Image from "next/image";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const revalidate = 3600;

export const metadata = {
  title: "Blog & Artikel Tips Jual Beli — Jual Beli USU Polmed",
  description: "Tips jual beli mahasiswa, panduan pasang iklan, dan informasi seputar kampus USU & Polmed Medan.",
  keywords: ["blog jual beli", "tips mahasiswa USU", "tips belanja online Medan", "panduan iklan kampus", "artikel Polmed"],
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog & Artikel — Jual Beli USU Polmed",
    description: "Tips jual beli mahasiswa, panduan pasang iklan, dan informasi seputar kampus.",
    url: "/blog",
    type: "website",
  },
};

function stripMd(text = "", max = 100) {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_`~\[\]()]/g, "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, max);
}

export default async function BlogList() {
  const supa = getAdminClient();
  const { data: blogs } = await supa
    .from("blogs")
    .select("id, title, slug, image_url, author, created_at, excerpt, keywords, content_markdown")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-20">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight dark:text-white md:text-4xl">Blog & Artikel</h1>
        <p className="mt-3 text-gray-500 dark:text-slate-400">
          Tips, panduan, dan informasi penting untuk warga USU & Polmed.
        </p>
      </div>

      {(!blogs || blogs.length === 0) && (
        <div className="py-20 text-center text-gray-400">
          <p className="text-5xl mb-4">✍️</p>
          <p>Belum ada artikel diterbitkan.</p>
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {blogs?.map((blog) => {
          const excerpt = blog.excerpt || stripMd(blog.content_markdown, 100);
          return (
            <Link
              key={blog.id}
              href={`/blog/${blog.slug}`}
              className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:border-primary/50 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              {/* Cover image */}
              <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-slate-800 flex-shrink-0">
                {blog.image_url ? (
                  <Image
                    src={blog.image_url}
                    alt={blog.title}
                    fill
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="text-3xl text-gray-300 dark:text-slate-700">📝</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">Artikel</p>
                <h2 className="mt-2 line-clamp-2 flex-1 text-base font-bold leading-snug transition-colors group-hover:text-primary dark:text-white">
                  {blog.title}
                </h2>
                {excerpt && (
                  <p className="mt-2 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">{excerpt}</p>
                )}
                <div className="mt-4 flex items-center justify-between text-xs text-gray-400 dark:text-slate-500">
                  <span>{blog.author}</span>
                  <time dateTime={blog.created_at}>
                    {new Date(blog.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </time>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
