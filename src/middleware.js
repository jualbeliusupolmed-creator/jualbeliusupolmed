import { NextResponse } from "next/server";

export async function middleware(request) {
  // Hanya jalankan pada route API
  if (request.nextUrl.pathname.startsWith("/api/")) {
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
}

export const config = {
  matcher: ["/api/:path*"],
};
