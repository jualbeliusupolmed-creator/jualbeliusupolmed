import Link from "next/link";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Blog & Artikel - Jual Beli USU Polmed",
  description: "Kumpulan artikel, tips, dan trik seputar perkuliahan dan mahasiswa USU & POLMED.",
};

export default async function BlogList() {
  const supa = getAdminClient();
  const { data: blogs } = await supa
    .from("blogs")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight dark:text-white">Blog & Artikel</h1>
      <p className="mb-8 text-gray-500 dark:text-slate-400">
        Tips, trik, dan informasi penting untuk mahasiswa USU dan POLMED.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {(!blogs || blogs.length === 0) && (
          <p className="col-span-full text-center text-gray-500">Belum ada artikel.</p>
        )}
        {blogs?.map((blog) => (
          <Link
            key={blog.id}
            href={`/blog/${blog.slug}`}
            className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:border-primary hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            {blog.image_url ? (
              <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-slate-800">
                <img
                  src={blog.image_url}
                  alt={blog.title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ) : (
              <div className="relative h-48 w-full bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                <span className="text-gray-400">Jual Beli USU</span>
              </div>
            )}
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Artikel</p>
              <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-snug dark:text-white group-hover:text-primary transition-colors">
                {blog.title}
              </h2>
              <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                <span>{blog.author}</span>
                <span>{new Date(blog.created_at).toLocaleDateString("id-ID")}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

