import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jawabGalat } from "@/lib/jawabGalat";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const isDownload = searchParams.get("download") === "1" || searchParams.get("dl") === "1";

  const { data: post, error } = await getAdminClient()
    .from("mading_posts")
    .select("id, type, sender_name, faculty, title, content, image_url, status")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !post) return new NextResponse("Not found", { status: 404 });

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
      <rect width="100%" height="100%" fill="#1a1a1a"/>
      <text x="540" y="600" font-family="sans-serif" font-size="40" fill="#ffffff" text-anchor="middle">${post.title || "Menfess"}</text>
      <text x="540" y="700" font-family="sans-serif" font-size="24" fill="#cccccc" text-anchor="middle">${post.content?.substring(0, 50) || ""}...</text>
    </svg>
  `;

  const headers = {
    "Content-Type": "image/svg+xml",
    "Cache-Control": "public, max-age=300, s-maxage=300",
  };

  if (isDownload) {
    headers["Content-Disposition"] = `attachment; filename="menfess-${id}.svg"`;
  }

  return new NextResponse(svg, { status: 200, headers });
}
