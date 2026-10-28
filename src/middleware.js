import { NextResponse } from "next/server";

// ── Subdomain mobile — ganti ke domain yang sudah live ──
const MOBILE_SUBDOMAIN = "https://m.jualbeliusupolmed.web.id";

// Regex User-Agent untuk mendeteksi perangkat mobile
const MOBILE_UA_REGEX =
  /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;

// Subdomain mobile dimatikan karena web ini sudah sepenuhnya responsif (single codebase)
const ENABLE_MOBILE_REDIRECT = false;

const ADMIN_WORKSPACE_PATHS = [
  "/admin/overview",
  "/admin/marketplace",
  "/admin/users",
  "/admin/finance",
  "/admin/analytics",
  "/admin/content",
  "/admin/settings",
  "/admin/audit",
  "/admin/reports",
  "/admin/po",
  "/admin/owners",
];
const ADMIN_WHATSAPP_PATHS = ["/admin/wabot", "/admin/antrean", "/admin/notifikasi", "/admin/broadcast", "/admin/broadcast_grup", "/admin/grouppost"];
const ADMIN_LEGACY_REDIRECTS = [
  ["/admin/approve-payment", "/admin/finance"],
  ["/admin/approve-unlock", "/admin/finance"],
  ["/admin/keuangan", "/admin/finance"],
  ["/admin/transaksi", "/admin/finance"],
  ["/admin/approve-toko", "/admin/marketplace?mode=stores"],
  ["/admin/toko", "/admin/marketplace?mode=stores"],
  ["/admin/profil_request", "/admin/users?view=profile-requests"],
  ["/admin/penjual", "/admin/users"],
  ["/admin/kontak_pembeli", "/admin/users"],
  ["/admin/blogs", "/admin/content"],
  ["/admin/listings", "/admin/marketplace"],
  ["/admin/moderasi", "/admin/marketplace"],
  ["/admin/dicari", "/admin/marketplace?mode=wanted"],
];

function matchesAdminPath(pathname, paths) {
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

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

    // Setiap handler admin memeriksa sesi bertanda tangan, status akun Auth,
    // izin modul, dan cakupan yang relevan. Middleware hanya menambahkan
    // header dasar dan tidak menganggap cookie yang hadir sebagai otorisasi.
    return res;
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    const isWorkspacePage = pathname === "/admin" || matchesAdminPath(pathname, ADMIN_WORKSPACE_PATHS);
    const isWhatsAppPage = matchesAdminPath(pathname, ADMIN_WHATSAPP_PATHS);
    if (!isWorkspacePage && !isWhatsAppPage) {
      const legacy = ADMIN_LEGACY_REDIRECTS.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
      const workspaceUrl = new URL(legacy?.[1] || "/admin/overview?panel=legacy-disabled", request.url);
      if (workspaceUrl.pathname === "/admin/finance") {
        const orderId = request.nextUrl.searchParams.get("orderId") || request.nextUrl.searchParams.get("payment_id");
        if (orderId) workspaceUrl.searchParams.set("orderId", orderId.slice(0, 120));
      }
      return NextResponse.redirect(workspaceUrl, { status: 307 });
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.delete("x-admin-path");
    requestHeaders.set("x-admin-path", pathname);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  return NextResponse.next();
}

export const config = {
  // Jalankan middleware di semua halaman (kecuali _next/static, dll sudah di-exclude oleh Next.js)
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/).*)",
  ],
};
