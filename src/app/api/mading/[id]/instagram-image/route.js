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

async function fetchSafeMadingPhoto(url, ratio = "portrait") {
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

    const isLandscape = ratio === "landscape";
    const isStory = ratio === "story" || ratio === "9:16";

    const width = isLandscape ? 500 : isStory ? 860 : 820;
    const height = isLandscape ? 230 : isStory ? 580 : 460;
    const radius = isLandscape ? 16 : isStory ? 28 : 26;

    const mask = Buffer.from(
      `<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${radius}" fill="white"/></svg>`,
    );
    return sharp(source)
      .rotate()
      .resize(width, height, { fit: "cover", position: "attention" })
      .composite([{ input: mask, blend: "dest-in" }])
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

// Gambar JPEG publik untuk Menfess & Instagram. Mendukung rasio Portrait 4:5 (1080x1350) & Story 9:16 (1080x1920)
export async function GET(request, { params }) {
  const { searchParams } = new URL(request.url);
  const rawRatio = searchParams.get("ratio") || "portrait";
  const ratio = rawRatio === "story" || rawRatio === "9:16" ? "story" : rawRatio === "landscape" ? "landscape" : "portrait";
  const isDownload = searchParams.get("download") === "1" || searchParams.get("dl") === "1";

  const { data: post, error } = await getAdminClient()
    .from("mading_posts")
    .select("id, type, sender_name, faculty, title, content, image_url, status")
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();

  if (error || !post) return new NextResponse("Not found", { status: 404 });

  const photo = await fetchSafeMadingPhoto(post.image_url, ratio);
  const renderPost = photo ? post : { ...post, image_url: null };
  const svg = createMadingInstagramSvg({ hasPhoto: Boolean(photo), ratio });
  const textLayers = createMadingInstagramTextLayers(renderPost, {
    regularFontPath: REGULAR_FONT_PATH,
    semiboldFontPath: SEMIBOLD_FONT_PATH,
  }, ratio);

  const isLandscape = ratio === "landscape";
  const isStory = ratio === "story";
  const photoLeft = isLandscape ? 350 : isStory ? 110 : 130;
  const photoTop = isLandscape ? 90 : isStory ? 320 : 245;

  const image = await sharp(Buffer.from(svg))
    .composite([
      ...(photo ? [{ input: photo, left: photoLeft, top: photoTop }] : []),
      ...textLayers,
    ])
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const headers = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=300, s-maxage=300",
  };

  if (isDownload) {
    const filename = `menfess-usu-${params.id}-${ratio === "story" ? "9-16" : ratio === "portrait" ? "1080x1350" : ratio}.jpg`;
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  }

  return new NextResponse(image, { status: 200, headers });
}
