import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/Icons";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Berita Kampus",
  description: "Artikel yang telah dipublikasikan di Kampus Kita.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Berita Kampus",
    description: "Artikel yang telah dipublikasikan di Kampus Kita.",
    url: "/blog",
    siteName: "Kampus Kita",
    locale: "id_ID",
    type: "website",
  },
};

function getExcerpt(article) {
  const source = article.excerpt || article.content_markdown || "";
  return source
    .replace(/#{1,6}\s/g, "")
    .replace(/[*_`~\[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function PublishedDate({ date }) {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;

  return (
    <time dateTime={date} className="text-xs text-slate-600 dark:text-slate-300">
      {new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(parsed)}
    </time>
  );
}

function ArticleImage({ article, priority = false }) {
  if (!article.image_url) return null;

  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-[#e8f4eb] dark:bg-[#173c2b]">
      <Image
        src={article.image_url}
        alt={article.title}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 60vw, 800px"
        className="object-cover"
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
      />
    </div>
  );
}

function ArticleByline({ article }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
      {article.author && (
        <span className="text-xs font-semibold text-[#134e35] dark:text-[#bef264]">
          {article.author}
        </span>
      )}
      <PublishedDate date={article.created_at} />
    </div>
  );
}

function ArticleCard({ article, featured = false }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#d9e8dc] bg-white dark:border-white/10 dark:bg-slate-900">
      {article.image_url && (
        <Link
          href={`/blog/${article.slug}`}
          aria-label={`Baca artikel: ${article.title}`}
          className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35]"
        >
          <ArticleImage article={article} priority={featured} />
        </Link>
      )}
      <div className={featured ? "p-5 sm:p-7" : "p-4"}>
        <h2 className={featured
          ? "text-xl font-extrabold leading-tight tracking-tight text-[#0a2e1f] dark:text-white sm:text-2xl"
          : "text-base font-bold leading-snug text-[#0a2e1f] dark:text-white"}
        >
          <Link
            href={`/blog/${article.slug}`}
            className="rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] hover:underline"
          >
            {article.title}
          </Link>
        </h2>
        <ArticleByline article={article} />
        {featured && getExcerpt(article) && (
          <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
            {getExcerpt(article)}
          </p>
        )}
      </div>
    </article>
  );
}

function BlogErrorState() {
  return (
    <section
      role="alert"
      className="mt-8 rounded-2xl border border-rose-300 bg-white p-6 dark:border-rose-800 dark:bg-slate-900"
    >
      <h2 className="font-bold text-slate-900 dark:text-white">Berita belum dapat dimuat</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
        Terjadi kendala saat mengambil artikel. Segarkan halaman untuk mencoba lagi.
      </p>
      <form action="/blog" method="get" className="mt-4">
        <button
          type="submit"
          className="inline-flex min-h-11 items-center rounded-xl bg-[#134e35] px-4 text-sm font-bold text-white hover:bg-[#0a2e1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:bg-[#bef264] dark:text-[#0a2e1f]"
        >
          Coba lagi
        </button>
      </form>
    </section>
  );
}

export default async function BlogPage() {
  const supabase = getAdminClient();
  const { data: articles, error } = await supabase
    .from("blogs")
    .select("id, title, slug, image_url, author, created_at, excerpt, content_markdown")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    console.error("[Blog] Gagal memuat artikel published.", { code: error.code });
  }

  const publishedArticles = articles || [];
  const remainingArticles = publishedArticles.slice(5);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:py-9">
      <header className="flex flex-col gap-4 border-b border-[#d9e8dc] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0a2e1f] dark:text-white sm:text-4xl">
            Berita Kampus
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Artikel yang telah dipublikasikan di Kampus Kita.
          </p>
        </div>
        <Link
          href="/dashboard?tab=blog"
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-xl border border-[#134e35] px-4 text-sm font-bold text-[#134e35] transition-colors hover:bg-[#f1f8f2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:border-[#bef264] dark:text-[#bef264] dark:hover:bg-[#173c2b]"
        >
          <Icon.Edit2 className="h-4 w-4" aria-hidden="true" />
          Ruang penulis
        </Link>
      </header>

      {error ? (
        <BlogErrorState />
      ) : publishedArticles.length === 0 ? (
        <section className="mt-8 rounded-2xl border border-[#d9e8dc] bg-white p-6 dark:border-white/10 dark:bg-slate-900">
          <h2 className="font-bold text-[#0a2e1f] dark:text-white">Belum ada artikel terbit</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Artikel akan muncul di halaman ini setelah dipublikasikan.
          </p>
          <Link
            href="/dashboard?tab=blog"
            className="mt-4 inline-flex min-h-11 items-center rounded-xl bg-[#134e35] px-4 text-sm font-bold text-white hover:bg-[#0a2e1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:bg-[#bef264] dark:text-[#0a2e1f]"
          >
            Buka ruang penulis
          </Link>
        </section>
      ) : (
        <>
          <section className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <ArticleCard article={publishedArticles[0]} featured />
            {publishedArticles.length > 1 && (
              <div>
                <h2 className="mb-3 text-base font-bold text-[#0a2e1f] dark:text-white">
                  Artikel terbaru
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  {publishedArticles.slice(1, 5).map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              </div>
            )}
          </section>

          {remainingArticles.length > 0 && (
            <section aria-labelledby="more-articles-heading" className="mt-9">
              <h2
                id="more-articles-heading"
                className="border-b border-[#d9e8dc] pb-3 text-lg font-extrabold text-[#0a2e1f] dark:border-white/10 dark:text-white"
              >
                Artikel lainnya
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {remainingArticles.map((article) => (
                  <ArticleCard key={article.id} article={article} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <aside className="mt-10 flex flex-col gap-3 border-t border-[#d9e8dc] pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-bold text-[#0a2e1f] dark:text-white">
            Mading dan Menfess
          </h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Kiriman komunitas tersedia di halaman Mading.
          </p>
        </div>
        <Link
          href="/mading"
          className="inline-flex min-h-11 w-fit items-center rounded-xl px-1 text-sm font-bold text-[#134e35] underline decoration-[#9ab9a3] underline-offset-4 hover:text-[#0a2e1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#134e35] dark:text-[#bef264]"
        >
          Buka Mading
        </Link>
      </aside>
    </div>
  );
}
