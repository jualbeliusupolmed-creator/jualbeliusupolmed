import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get("download") === "1";

  const { data: listing, error } = await getAdminClient()
    .from("listings")
    .select("id, title, price, category, type, campus, area, image_url, images, status")
    .eq("id", id)
    .in("status", ["active", "pending", "sold"])
    .maybeSingle();

  if (error || !listing) return new NextResponse("Not found", { status: 404 });

  // Cloudflare Pages tidak mendukung sharp. Kembalikan SVG sederhana sebagai placeholder.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <rect width="100%" height="100%" fill="#1a1a1a"/>
      <text x="540" y="675" font-family="sans-serif" font-size="48" fill="#ffffff" text-anchor="middle">${listing.title}</text>
      <text x="540" y="740" font-family="sans-serif" font-size="32" fill="#888888" text-anchor="middle">Rp ${Number(listing.price || 0).toLocaleString("id-ID")}</text>
    </svg>
  `;

  const headers = {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=300, s-maxage=300",
  };

  if (isDownload) {
    headers["Content-Disposition"] = `attachment; filename="poster-${listing.id}.svg"`;
  }

  return new NextResponse(svg, { headers });
}
