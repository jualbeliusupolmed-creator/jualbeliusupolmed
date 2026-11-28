"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { appendUniqueMadingPosts } from "@/lib/madingPagination";

const CATEGORIES = ["Semua", "Kampus", "Prestasi", "Kegiatan", "Organisasi", "Pengumuman", "Tips & Edukasi"];

function formatDate(d) {
  if (!d) return "Baru saja";
  try {
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "Baru saja";
  }
}

function getPostHref(post) {
  if (post._kind === "blog" && post.slug) return `/blog/${post.slug}`;
  return `/mading/${post.id}`;
}

function getPostBadge(post) {
  if (post._kind === "blog") return "Berita";
  if (post.type === "info") return "Pengumuman";
  if (post.type === "event") return "Kegiatan";
  return "Menfess";
}

export default function MadingClient({
  initialPosts = [],
  initialHasMoreMading = false,
  initialHasMoreBlogs = false,
  initialError = "",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [sortBy, setSortBy] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(12);
  const [allPosts, setAllPosts] = useState(initialPosts);
  const [madingPage, setMadingPage] = useState(1);
  const [blogPage, setBlogPage] = useState(1);
  const [hasMoreMading, setHasMoreMading] = useState(initialHasMoreMading);
  const [hasMoreBlogs, setHasMoreBlogs] = useState(initialHasMoreBlogs);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = allPosts.filter((p) => {
      if (q) {
        const text = `${p.title || ""} ${p.content || ""} ${p.sender_name || ""} ${p.author_name || ""} ${p.faculty || ""}`.toLowerCase();
        if (!text.includes(q)) return false;
      }
      if (selectedCategory !== "Semua") {
        const badge = getPostBadge(p).toLowerCase();
        const cat = selectedCategory.toLowerCase();
        const hay = `${p.title || ""} ${p.content || ""} ${badge}`.toLowerCase();
        if (!hay.includes(cat)) return false;
      }
      return true;
    });

    if (sortBy === "popular") {
      list = [...list].sort((a, b) => Number(b.views_count || b.views || 0) - Number(a.views_count || a.views || 0));
    }
    return list;
  }, [allPosts, searchQuery, selectedCategory, sortBy]);

  const featuredPost = filtered[0] || null;
  const latestPosts = filtered.slice(1, 1 + visibleCount);
  const popularPosts = useMemo(
    () =>
      [...allPosts]
        .sort((a, b) => Number(b.views_count || b.views || 0) - Number(a.views_count || a.views || 0))
        .slice(0, 4),
    [allPosts]
  );
  const hasMoreData = hasMoreMading || hasMoreBlogs;
  const canRevealMore = filtered.length > visibleCount + 1;

  async function loadNextPage() {
    if (loadingMore || !hasMoreData) return;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const requests = [];
      if (hasMoreMading) {
        const nextPage = madingPage + 1;
        requests.push(
          fetch(`/api/mading?page=${nextPage}&limit=20`, { cache: "no-store" })
            .then(async (response) => {
              const result = await response.json().catch(() => ({}));
              if (!response.ok) throw new Error(result.error || "Postingan Mading berikutnya belum dapat dimuat.");
              if (!Array.isArray(result.posts)) throw new Error("Respons Mading tidak valid.");
              return { kind: "mading", result, nextPage };
            })
        );
      }
      if (hasMoreBlogs) {
        const nextPage = blogPage + 1;
        requests.push(
          fetch(`/api/blog?page=${nextPage}&limit=5`, { cache: "no-store" })
            .then(async (response) => {
              const result = await response.json().catch(() => ({}));
              if (!response.ok || result.success !== true) {
                throw new Error(result.error || "Artikel berikutnya belum dapat dimuat.");
              }
              if (!Array.isArray(result.blogs)) throw new Error("Respons artikel tidak valid.");
              return { kind: "blog", result, nextPage };
            })
        );
      }

      const pages = await Promise.all(requests);
      const newPosts = [];
      for (const page of pages) {
        if (page.kind === "mading") {
          newPosts.push(...page.result.posts.map((post) => ({ ...post, _kind: "mading" })));
          setMadingPage(page.nextPage);
          setHasMoreMading(Number(page.result.totalPages) > page.nextPage);
        } else {
          newPosts.push(
            ...page.result.blogs.map((blog) => ({
              ...blog,
              content: blog.content || blog.excerpt || blog.content_markdown || "",
              author_name: blog.author_name || blog.author || "Tim Redaksi",
              _kind: "blog",
            }))
          );
          setBlogPage(page.nextPage);
          setHasMoreBlogs(Number(page.result.totalPages) > page.nextPage);
        }
      }

      setAllPosts((current) => appendUniqueMadingPosts(current, newPosts));
    } catch (cause) {
      setLoadMoreError(cause instanceof Error ? cause.message : "Konten berikutnya belum dapat dimuat.");
    } finally {
      setLoadingMore(false);
    }
  }

  function showMore() {
    if (canRevealMore) {
      setVisibleCount((count) => count + 10);
      return;
    }
    void loadNextPage();
  }

  return (
    <div className="min-h-screen bg-[#f4faf5] lg:bg-[#ecfeee] dark:bg-[#0a1710] text-[#101f15] dark:text-[#ecfeee]">
      {initialError && (
        <p role="alert" className="mx-auto max-w-7xl px-4 sm:px-6 pt-3 text-xs text-rose-700">
          {initialError}
        </p>
      )}
      {!allPosts.length && !initialError && (
        <p className="mx-auto max-w-7xl px-4 sm:px-6 pt-3 text-xs text-[#707972]">
          Belum ada konten Mading atau artikel yang dipublikasikan.
        </p>
      )}
      {/* ==================== MOBILE VIEW (< lg) — 100% STITCH berita_kampus_kita_mobile ==================== */}
      <div className="lg:hidden max-w-md mx-auto pb-28">
        {/* Page Header Title & Campus Illustration */}
        <section className="px-5 pt-4 pb-2">
          <div className="flex items-start justify-between gap-2">
            <div className="max-w-[65%]">
              <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-tight">
                Berita <span className="text-[#134e35] dark:text-[#bef264]">Kampus Kita</span>
              </h1>
              <p className="text-xs text-gray-500 dark:text-[#99d3b2] mt-1.5 leading-relaxed">
                Informasi, kegiatan, prestasi, dan kabar terbaru seputar kampus.
              </p>
            </div>
            <Link
              href="/dashboard?tab=blog"
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-[#134e35] text-[#bef264] text-xs font-bold shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">edit_square</span>
              <span>Tulis</span>
            </Link>
          </div>

          <div className="mt-3 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berita, menfess, atau topik..."
              className="w-full rounded-2xl bg-white dark:bg-[#112218] pl-10 pr-4 py-2.5 text-xs border border-[#134e35]/10 outline-none focus:ring-2 focus:ring-[#134e35]"
            />
          </div>
        </section>

        {/* Horizontal Category Chips */}
        <section className="mt-2">
          <div className="flex items-center space-x-2 overflow-x-auto px-5 py-2 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs flex-shrink-0 active:scale-95 transition-all",
                    active
                      ? "font-semibold bg-[#134e35] text-white shadow-sm"
                      : "font-medium text-gray-700 dark:text-[#99d3b2] bg-white dark:bg-[#112218] border border-gray-200 dark:border-white/10"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Hero Featured News Card */}
        {featuredPost && (
          <section className="px-5 mt-3">
            <Link href={getPostHref(featuredPost)} className="block relative h-56 rounded-2xl overflow-hidden shadow-soft group">
              {featuredPost.image_url ? (
                <img
                  src={featuredPost.image_url}
                  alt={featuredPost.title || "Berita Kampus"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#134e35] to-[#003622]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
              <div className="absolute top-3.5 left-3.5">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-[#bef264] text-[#134e35]">
                  {getPostBadge(featuredPost)}
                </span>
              </div>
              <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white">
                <h2 className="text-base font-bold leading-snug line-clamp-2">
                  {featuredPost.title || featuredPost.content?.slice(0, 80)}
                </h2>
                <div className="flex items-center space-x-4 mt-2 text-[11px] text-gray-200">
                  <span>{formatDate(featuredPost.created_at)}</span>
                  <span>{featuredPost.views_count || featuredPost.views || 0} dibaca</span>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Berita Terbaru List */}
        <section className="px-5 mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">Berita Terbaru</h2>
            <button
              type="button"
              onClick={() => setSortBy((s) => (s === "newest" ? "popular" : "newest"))}
              className="flex items-center space-x-1 text-xs text-gray-500 font-medium hover:text-[#134e35]"
            >
              <span>
                Urutkan: <strong className="text-gray-800 dark:text-white font-semibold">{sortBy === "newest" ? "Terbaru" : "Populer"}</strong>
              </span>
              <span className="material-symbols-outlined text-[16px]">expand_more</span>
            </button>
          </div>

          <div className="space-y-3">
            {latestPosts.map((post) => (
              <Link
                key={`${post._kind}-${post.id}`}
                href={getPostHref(post)}
                className="p-2.5 bg-white dark:bg-[#112218] rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm flex space-x-3 items-center group"
              >
                <div className="relative w-28 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-[#e6f8e8]">
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.title || "Berita"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#134e35]">
                      <span className="material-symbols-outlined text-[24px]">article</span>
                    </div>
                  )}
                  <span className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-[#bef264] text-[#134e35] text-[9px] font-bold">
                    {getPostBadge(post)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug">
                    {post.title || post.content?.slice(0, 70)}
                  </h3>
                  <div className="flex items-center gap-3 mt-1.5 text-[10.5px] text-gray-500 dark:text-[#99d3b2]">
                    <span>{formatDate(post.created_at)}</span>
                    <span>• {post.views_count || post.views || 0}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {(canRevealMore || hasMoreData) && (
            <div className="mt-4 space-y-2">
              {loadMoreError && <p role="alert" className="text-center text-xs text-rose-700">{loadMoreError}</p>}
              <button
                type="button"
                onClick={showMore}
                disabled={loadingMore}
                className="w-full py-2.5 rounded-full bg-white border border-gray-200 text-xs font-bold text-[#134e35] flex items-center justify-center gap-1 disabled:opacity-60"
              >
                <span>{loadingMore ? "Memuat..." : "Lihat Berita Lainnya"}</span>
                {!loadingMore && <span className="material-symbols-outlined text-[15px]">arrow_forward</span>}
              </button>
            </div>
          )}
        </section>

        {/* Berita Populer */}
        <section className="px-5 mt-6">
          <div className="bg-[#e6f8e8] dark:bg-[#183022] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-orange-500 text-[18px]">local_fire_department</span>
              <h3 className="text-sm font-bold text-[#134e35] dark:text-white">Berita Populer</h3>
            </div>
            <div className="space-y-2.5">
              {popularPosts.slice(0, 3).map((post, i) => (
                <Link
                  key={`pop-${post.id}`}
                  href={getPostHref(post)}
                  className="bg-white dark:bg-[#112218] rounded-xl p-2.5 flex items-center gap-3 shadow-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-[#bef264] text-[#134e35] text-xs font-extrabold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-[#101f15] dark:text-white truncate">
                      {post.title || post.content?.slice(0, 60)}
                    </p>
                    <p className="text-[10px] text-slate-500">{post.views_count || post.views || 0} dibaca</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ==================== DESKTOP VIEW (lg+) — 100% STITCH berita / portal_berita ==================== */}
      <div className="hidden lg:block max-w-7xl mx-auto px-6 py-6 pb-16 space-y-6">
        {/* Header Card */}
        <div className="bg-white dark:bg-[#112218] rounded-3xl p-6 shadow-stitch-card flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#e6f8e8] text-[#003622] flex items-center justify-center">
              <span className="material-symbols-outlined text-[26px]">newspaper</span>
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-[#003622] dark:text-white tracking-tight">Berita Kampus</h1>
              <p className="text-xs text-[#404943] dark:text-[#99d3b2]">
                Informasi, kegiatan, dan cerita terbaru di lingkungan kampus.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative w-72">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#707972] text-[18px]">
                search
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari berita atau artikel..."
                className="w-full pl-10 pr-4 py-2.5 rounded-full bg-[#e6f8e8] dark:bg-[#183022] text-xs text-[#101f15] dark:text-white outline-none"
              />
            </div>
            <Link
              href="/dashboard?tab=blog"
              className="px-5 py-2.5 rounded-full bg-[#003622] hover:bg-[#134e35] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">edit_square</span>
              <span>Tulis Berita</span>
            </Link>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-bold transition-colors whitespace-nowrap",
                  active
                    ? "bg-[#003622] text-white"
                    : "bg-white dark:bg-[#112218] text-[#404943] dark:text-[#99d3b2] hover:bg-[#e6f8e8]"
                )}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Main 12-Col Grid */}
        <div className="grid grid-cols-12 gap-6 items-start">
          {/* Featured Hero (Col 1-5) */}
          <div className="col-span-5">
            {featuredPost && (
              <Link
                href={getPostHref(featuredPost)}
                className="block bg-white dark:bg-[#112218] rounded-3xl overflow-hidden shadow-stitch-card group"
              >
                <div className="relative h-64 bg-[#e6f8e8]">
                  {featuredPost.image_url ? (
                    <img
                      src={featuredPost.image_url}
                      alt={featuredPost.title || "Featured"}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#134e35] to-[#003622]" />
                  )}
                  <span className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-[#ceeb7a] text-[#161f00] text-xs font-bold">
                    {getPostBadge(featuredPost)}
                  </span>
                </div>
                <div className="p-5 space-y-2">
                  <h2 className="text-lg font-extrabold text-[#101f15] dark:text-white leading-snug group-hover:text-[#003622]">
                    {featuredPost.title || featuredPost.content?.slice(0, 90)}
                  </h2>
                  <p className="text-xs text-[#404943] dark:text-[#99d3b2] line-clamp-3 leading-relaxed">
                    {featuredPost.content}
                  </p>
                  <div className="pt-2 flex items-center gap-3 text-[11px] text-[#707972]">
                    <span>{formatDate(featuredPost.created_at)}</span>
                    <span>• {featuredPost.author_name || featuredPost.sender_name || "Tim Redaksi"}</span>
                  </div>
                </div>
              </Link>
            )}
          </div>

          {/* Middle List (Col 6-9) */}
          <div className="col-span-4 space-y-3.5">
            {latestPosts.slice(0, 4).map((post) => (
              <Link
                key={`desk-${post._kind}-${post.id}`}
                href={getPostHref(post)}
                className="bg-white dark:bg-[#112218] rounded-2xl p-3 shadow-stitch-card flex items-center gap-3.5 hover:shadow-md transition-all group"
              >
                <div className="w-24 h-20 rounded-xl overflow-hidden bg-[#e6f8e8] shrink-0">
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.title || "Berita"} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#134e35]">
                      <span className="material-symbols-outlined text-[24px]">article</span>
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-[#e6f8e8] text-[#003622] text-[10px] font-bold">
                    {getPostBadge(post)}
                  </span>
                  <h3 className="text-xs font-bold text-[#101f15] dark:text-white line-clamp-2 group-hover:text-[#003622]">
                    {post.title || post.content?.slice(0, 75)}
                  </h3>
                  <p className="text-[10px] text-[#707972]">{formatDate(post.created_at)}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Right Sidebar: Terbaru / Populer (Col 10-12) */}
          <aside className="col-span-3 bg-white dark:bg-[#112218] rounded-3xl p-5 shadow-stitch-card space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#101f15] dark:text-white">Terpopuler</h2>
              <span className="text-xs font-bold text-[#506600]">Semua</span>
            </div>
            <div className="space-y-3.5">
              {popularPosts.map((post, idx) => (
                <Link
                  key={`dpop-${post.id}`}
                  href={getPostHref(post)}
                  className="flex items-start gap-2.5 pb-3 border-b border-[#e6f8e8] last:border-0 last:pb-0 group"
                >
                  <span className="w-5 h-5 rounded-full bg-[#ceeb7a] text-[#161f00] text-[10px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-[#101f15] dark:text-white line-clamp-2 group-hover:text-[#003622]">
                      {post.title || post.content?.slice(0, 65)}
                    </h4>
                    <p className="text-[10px] text-[#707972] mt-1">{formatDate(post.created_at)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </aside>
        </div>

        {/* Full Archive Grid */}
        {latestPosts.length > 4 && (
          <div className="grid grid-cols-3 gap-5 pt-2">
            {latestPosts.slice(4).map((post) => (
              <Link
                key={`arch-${post._kind}-${post.id}`}
                href={getPostHref(post)}
                className="bg-white dark:bg-[#112218] rounded-2xl p-4 shadow-stitch-card space-y-2 hover:shadow-md transition-all"
              >
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#e6f8e8] text-[#003622] text-[10px] font-bold">
                  {getPostBadge(post)}
                </span>
                <h3 className="text-sm font-bold text-[#101f15] dark:text-white line-clamp-2">
                  {post.title || post.content?.slice(0, 80)}
                </h3>
                <p className="text-xs text-[#404943] dark:text-[#99d3b2] line-clamp-2">{post.content}</p>
                <p className="text-[10px] text-[#707972]">{formatDate(post.created_at)}</p>
              </Link>
            ))}
          </div>
        )}
        {(canRevealMore || hasMoreData) && (
          <div className="space-y-2 pt-2">
            {loadMoreError && <p role="alert" className="text-center text-xs text-rose-700">{loadMoreError}</p>}
            <button
              type="button"
              onClick={showMore}
              disabled={loadingMore}
              className="w-full px-5 py-3 rounded-full bg-white dark:bg-[#112218] border border-[#134e35]/15 text-[#003622] dark:text-white text-xs font-bold disabled:opacity-60"
            >
              {loadingMore ? "Memuat..." : "Muat berita lainnya"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
