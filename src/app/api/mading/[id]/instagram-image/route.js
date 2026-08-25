import { NextResponse } from "next/server";
import path from "node:path";
import sharp from "sharp";
import { getAdminClient } from "@/lib/supabaseAdmin";
import {
  createMadingInstagramSvg,
  createMadingInstagramTextLayers,
} from "@/lib/madingInstagramImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FONT_DIRECTORY = path.join(
  process.cwd(),
  "src",
  "assets",
  "fonts",
  "plus-jakarta-sans",
);
const REGULAR_FONT_PATH = path.join(
  FONT_DIRECTORY,
  "PlusJakartaSans-Regular.ttf",
);
const SEMIBOLD_FONT_PATH = path.join(
  FONT_DIRECTORY,
  "PlusJakartaSans-SemiBold.ttf",
);

// Gambar JPEG publik untuk Instagram. Tidak memuat identitas internal pengirim.
export async function GET(_request, { params }) {
  const { data: post, error } = await getAdminClient()
    .from("mading_posts")
    .select("id, type, sender_name, faculty, title, content, status")
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !post) return new NextResponse("Not found", { status: 404 });

  const svg = createMadingInstagramSvg();
  const textLayers = createMadingInstagramTextLayers(post, {
    regularFontPath: REGULAR_FONT_PATH,
    semiboldFontPath: SEMIBOLD_FONT_PATH,
  });

  const image = await sharp(Buffer.from(svg))
    .composite(textLayers)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  return new NextResponse(image, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
