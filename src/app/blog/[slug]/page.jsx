import { notFound } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { DUMMY_BLOGS } from "@/lib/dummyBlogs";

export function generateMetadata({ params }) {
  const blog = DUMMY_BLOGS.find((b) => b.slug === params.slug);
  if (!blog) return { title: "Blog Not Found" };

  return {
    title: `${blog.title} - Jual Beli USU Polmed`,
    description: blog.content.substring(0, 150) + "...",
    openGraph: {
      title: blog.title,
      images: [blog.image_url],
    },
  };
}

export default function BlogPost({ params }) {
  const blog = DUMMY_BLOGS.find((b) => b.slug === params.slug);
  if (!blog) notFound();

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

      <div className="mb-10 overflow-hidden rounded-2xl bg-gray-100 shadow-md dark:bg-slate-800">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={blog.image_url} alt={blog.title} className="h-full w-full object-cover max-h-[400px]" />
      </div>

      <div className="prose prose-lg dark:prose-invert prose-primary mx-auto max-w-none">
        <ReactMarkdown>{blog.content}</ReactMarkdown>
      </div>

      <hr className="my-10 border-gray-200 dark:border-slate-800" />

      {/* Call To Action Box */}
      <div className="rounded-2xl bg-primary/10 p-6 text-center dark:bg-primary/5">
        <h3 className="mb-2 text-xl font-bold dark:text-white">Mau Cari Barang Lain?</h3>
        <p className="mb-4 text-gray-600 dark:text-slate-300">
          Ribuan mahasiswa USU dan POLMED sudah bergabung. Temukan barang idamanmu sekarang!
        </p>
        <Link href="/" className="btn-primary inline-flex px-8">
          Mulai Belanja
        </Link>
      </div>
    </article>
  );
}
