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
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

async function fetchSafeMadingPhoto(url) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").hostname;
    if (parsed.protocol !== "https:" || !supabaseHost || parsed.hostname !== supabaseHost) {
      return null;
    }
    const response = await fetch(parsed, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const contentLength = Number(response.headers.get("content-length") || 0);
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/") || contentLength > MAX_SOURCE_BYTES) {
      return null;
    }
    const source = Buffer.from(await response.arrayBuffer());
    if (source.length > MAX_SOURCE_BYTES) return null;
    const mask = Buffer.from(
      '<svg width="820" height="460"><rect width="820" height="460" rx="26" fill="white"/></svg>',
    );
    return sharp(source)
      .rotate()
      .resize(820, 460, { fit: "cover", position: "attention" })
      .composite([{ input: mask, blend: "dest-in" }])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

// Gambar JPEG publik untuk Instagram. Tidak memuat identitas internal pengirim.
export async function GET(_request, { params }) {
  const { data: post, error } = await getAdminClient()
    .from("mading_posts")
    .select("id, type, sender_name, faculty, title, content, image_url, status")
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !post) return new NextResponse("Not found", { status: 404 });

  const photo = await fetchSafeMadingPhoto(post.image_url);
  const renderPost = photo ? post : { ...post, image_url: null };
  const svg = createMadingInstagramSvg({ hasPhoto: Boolean(photo) });
  const textLayers = createMadingInstagramTextLayers(renderPost, {
    regularFontPath: REGULAR_FONT_PATH,
    semiboldFontPath: SEMIBOLD_FONT_PATH,
  });

  const image = await sharp(Buffer.from(svg))
    .composite([
      ...(photo ? [{ input: photo, left: 130, top: 245 }] : []),
      ...textLayers,
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  return new NextResponse(image, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}
