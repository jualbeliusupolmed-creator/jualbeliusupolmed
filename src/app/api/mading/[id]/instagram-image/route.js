import { NextResponse } from "next/server";
import sharp from "sharp";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createMadingInstagramSvg } from "@/lib/madingInstagramImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Gambar JPEG publik untuk Instagram. Tidak memuat identitas internal pengirim.
export async function GET(_request, { params }) {
  const { data: post, error } = await getAdminClient()
    .from("mading_posts")
    .select("id, type, sender_name, faculty, title, content, status")
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !post) return new NextResponse("Not found", { status: 404 });

  const svg = createMadingInstagramSvg(post);

  const image = await sharp(Buffer.from(svg)).jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return new NextResponse(image, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
