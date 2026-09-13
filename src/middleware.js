import { NextResponse } from "next/server";

// ── Subdomain mobile — ganti ke domain yang sudah live ──
const MOBILE_SUBDOMAIN = "https://m.jualbeliusupolmed.web.id";

// Regex User-Agent untuk mendeteksi perangkat mobile
const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

// Aktifkan redirect mobile ke true jika subdomain m. sudah dikonfigurasi di Vercel
// Sekarang masih false agar tidak menyebabkan redirect loop sebelum subdomain aktif
const ENABLE_MOBILE_REDIRECT = true;

export async function middleware(request) {
  const { pathname, hostname } = request.nextUrl;

  // ── Redirect Mobile ke m.jualbeliusupolmed.web.id ──
  // Syarat aktif: ENABLE_MOBILE_REDIRECT = true DAN subdomain m. sudah dikonfigurasi
  if (
    ENABLE_MOBILE_REDIRECT &&
    // Hanya untuk www atau bare domain (bukan sudah di m.)
    !hostname.startsWith("m.") &&
    // Hanya halaman biasa, bukan API, asset statis, atau bot crawler
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.startsWith("/icons/") &&
    !pathname.startsWith("/images/") &&
    pathname !== "/manifest.json" &&
    pathname !== "/sw.js" &&
    pathname !== "/robots.txt" &&
    pathname !== "/sitemap.xml"
  ) {
    const userAgent = request.headers.get("user-agent") || "";
    const isMobile = MOBILE_UA_REGEX.test(userAgent);

    if (isMobile) {
      // 307 = Temporary Redirect (tidak merusak SEO desktop)
      const mobileUrl = `${MOBILE_SUBDOMAIN}${pathname}${request.nextUrl.search}`;
      return NextResponse.redirect(mobileUrl, { status: 307 });
    }
  }

  // ── Header keamanan untuk semua API routes ──
  if (pathname.startsWith("/api/")) {
    const res = NextResponse.next();

    // Keamanan dasar untuk semua API routes
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("X-Frame-Options", "DENY");
    res.headers.set("X-XSS-Protection", "1; mode=block");

    // Opsional: Tambahkan logika IP Rate Limiting di sini jika ada adapter yang ringan,
    // misalnya menyimpan IP ke edge config/Supabase. Karena kita tidak menggunakan Redis,
    // kita asumsikan Vercel WAF atau Supabase API gateway akan menangani rate limit global.

    // Otorisasi admin dilakukan oleh setiap handler melalui isAdmin(), yang
    // memverifikasi tanda tangan dan expiry token. Middleware hanya menangani
    // header lintas API agar tidak ada pemeriksaan cookie yang tampak aman
    // tetapi hanya mengecek keberadaannya.
    return res;
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan middleware di semua halaman (kecuali _next/static, dll sudah di-exclude oleh Next.js)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/).*)",
  ],
};
