import Link from "next/link";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { PageHeader } from "@/components/admin/ui";
import AdminMadingTable from "./AdminMadingTable";

export const dynamic = "force-dynamic";

function angka(value) {
  return new Intl.NumberFormat("id-ID").format(value || 0);
}

export default async function AnalitikMadingPage({ searchParams }) {
  const q = String(searchParams?.q || "").trim();
  const supa = getAdminClient();
  let { data: posts, error } = await supa
    .from("mading_posts")
    .select("id, type, sender_name, faculty, title, content, image_url, views_count, shares_count, likes_count, comments_count, status, instagram_status, instagram_media_id, instagram_published_at, author_ip_hash, created_at")
    .order("created_at", { ascending: false })
    .limit(150);

  if (error && /instagram_status|instagram_media_id|instagram_published_at/i.test(error.message || "")) {
    ({ data: posts, error } = await supa
      .from("mading_posts")
      .select("id, type, sender_name, faculty, title, content, image_url, views_count, shares_count, likes_count, comments_count, status, author_ip_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(150));
  }

  let trafficReady = true;
  if (error && /shares_count/i.test(error.message || "")) {
    trafficReady = false;
    ({ data: posts, error } = await supa
      .from("mading_posts")
      .select("id, type, sender_name, faculty, title, content, image_url, likes_count, comments_count, status, instagram_status, instagram_media_id, instagram_published_at, author_ip_hash, created_at")
      .order("created_at", { ascending: false })
      .limit(150));
  }

  const rows = posts || [];
  const totals = rows.reduce((result, post) => ({
    posts: result.posts + 1,
    views: result.views + (post.views_count || 0),
    shares: result.shares + (post.shares_count || 0),
    comments: result.comments + (post.comments_count || 0),
  }), { posts: 0, views: 0, shares: 0, comments: 0 });

  // Resolve author WA and seller profiles
  const hashes = Array.from(new Set(rows.map((p) => p.author_ip_hash).filter(Boolean)));
  const waMap = {};
  const profileMap = {};

  if (hashes.length > 0) {
    const { data: identities } = await supa
      .from("chat_identity_wa")
      .select("user_hash, wa")
      .in("user_hash", hashes);

    (identities || []).forEach((i) => {
      if (i.user_hash && i.wa) waMap[i.user_hash] = i.wa;
    });

    const was = Array.from(new Set((identities || []).map((i) => i.wa).filter(Boolean)));
    if (was.length > 0) {
      const { data: profiles } = await supa
        .from("seller_profiles")
        .select("wa, name, anonymous_name, store_name, avatar_url")
        .in("wa", was);

      (profiles || []).forEach((pr) => {
        if (pr.wa) profileMap[pr.wa] = pr;
      });
    }
  }

  // Fetch report counts for each post
  const postIds = rows.map((p) => p.id);
  const reportCountMap = {};
  if (postIds.length > 0) {
    const { data: reportsData } = await supa
      .from("mading_reports")
      .select("post_id")
      .in("post_id", postIds);

    (reportsData || []).forEach((r) => {
      reportCountMap[r.post_id] = (reportCountMap[r.post_id] || 0) + 1;
    });
  }

  // Filter rows based on search keyword
  const filteredRows = rows.filter((post) => {
    if (!q) return true;
    const authorWa = post.author_ip_hash ? waMap[post.author_ip_hash] : "";
    const profile = authorWa ? profileMap[authorWa] : null;
    const searchTarget = [
      post.title,
      post.content,
      post.sender_name,
      post.faculty,
      post.status,
      post.type,
      authorWa,
      profile?.name,
      profile?.anonymous_name,
      profile?.store_name,
    ].filter(Boolean).join(" ").toLowerCase();

    return searchTarget.includes(q.toLowerCase());
  });

  return (
    <div className="animate-fade-in font-sans">
      <PageHeader title="Analitik &amp; Moderasi Menfess" description="Ringkasan traffic, isi kiriman, identitas pengirim, dan kontrol moderasi darurat." />

      {/* SEARCH BAR */}
      <form method="GET" action="/admin/mading" className="mb-5">
        <div className="relative flex items-center max-w-lg">
          <svg className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            name="q"
            defaultValue={q}
            placeholder="Cari isi menfess, judul, nama pengirim, no. WA, atau kampus..."
            className="w-full pl-10 pr-24 py-2.5 text-xs rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 focus:border-primary dark:focus:border-emerald-400 text-slate-900 dark:text-white outline-none shadow-xs transition-all placeholder:text-slate-400"
          />
          {q && (
            <Link
              href="/admin/mading"
              className="absolute right-14 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Reset
            </Link>
          )}
          <button
            type="submit"
            className="absolute right-1.5 px-3.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold hover:opacity-90 transition-opacity"
          >
            Cari
          </button>
        </div>
      </form>

      {!trafficReady && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          Penghitung view dan bagikan belum aktif di database. Jalankan migration terbaru terlebih dahulu.
        </div>
      )}

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Gagal memuat data Menfess.</div>
      ) : (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Postingan", totals.posts],
              ["Tayangan unik", totals.views],
              ["Dibagikan", totals.shares],
              ["Komentar", totals.comments],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{label}</p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{angka(value)}</p>
              </div>
            ))}
          </div>

          <AdminMadingTable
            posts={filteredRows}
            waMap={waMap}
            profileMap={profileMap}
            reportCountMap={reportCountMap}
            searchQuery={q}
          />
        </>
      )}
    </div>
  );
}
