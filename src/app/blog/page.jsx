import Link from "next/link";
import { DUMMY_BLOGS } from "@/lib/dummyBlogs";

export const metadata = {
  title: "Blog & Artikel - Jual Beli USU Polmed",
  description: "Kumpulan artikel, tips, dan trik seputar perkuliahan dan mahasiswa USU & POLMED.",
};

export default function BlogList() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-2 text-3xl font-extrabold tracking-tight dark:text-white">Blog & Artikel</h1>
      <p className="mb-8 text-gray-500 dark:text-slate-400">
        Tips, trik, dan informasi penting untuk mahasiswa USU dan POLMED.
      </p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {DUMMY_BLOGS.map((blog) => (
          <Link
            key={blog.id}
            href={`/blog/${blog.slug}`}
            className="group block overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:border-primary hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-slate-800">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blog.image_url}
                alt={blog.title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">Tips & Trik</p>
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
