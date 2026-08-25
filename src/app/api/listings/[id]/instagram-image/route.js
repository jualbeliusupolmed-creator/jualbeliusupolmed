import { NextResponse } from "next/server";
import path from "node:path";
import sharp from "sharp";
import { getAdminClient } from "@/lib/supabaseAdmin";
import {
  createListingInstagramBaseSvg,
  createListingInstagramOverlaySvg,
  createListingInstagramTextLayers,
} from "@/lib/listingInstagramImage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FONT_DIRECTORY = path.join(process.cwd(), "src", "assets", "fonts", "plus-jakarta-sans");
const REGULAR_FONT_PATH = path.join(FONT_DIRECTORY, "PlusJakartaSans-Regular.ttf");
const SEMIBOLD_FONT_PATH = path.join(FONT_DIRECTORY, "PlusJakartaSans-SemiBold.ttf");
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;

function firstPhoto(listing) {
  if (Array.isArray(listing.images)) {
    const galleryPhoto = listing.images.find((value) => typeof value === "string" && value);
    if (galleryPhoto) return galleryPhoto;
  }
  return listing.image_url || null;
}

async function fetchSafeListingPhoto(url) {
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
    return sharp(source)
      .rotate()
      .resize(1080, 720, { fit: "cover", position: "attention" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer();
  } catch {
    return null;
  }
}

// JPEG publik untuk Meta. Data privat penjual tidak pernah dirender.
export async function GET(_request, { params }) {
  const { data: listing, error } = await getAdminClient()
    .from("listings")
    .select("id, title, price, category, type, campus, area, image_url, images, status")
    .eq("id", params.id)
    .eq("status", "active")
    .maybeSingle();
  if (error || !listing) return new NextResponse("Not found", { status: 404 });

  const photo = await fetchSafeListingPhoto(firstPhoto(listing));
  const composites = [];
  if (photo) composites.push({ input: photo, left: 0, top: 0 });
  composites.push(
    { input: Buffer.from(createListingInstagramOverlaySvg(Boolean(photo))), left: 0, top: 0 },
    ...createListingInstagramTextLayers(listing, {
      regularFontPath: REGULAR_FONT_PATH,
      semiboldFontPath: SEMIBOLD_FONT_PATH,
    }),
  );

  const image = await sharp(Buffer.from(createListingInstagramBaseSvg()))
    .composite(composites)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  return new NextResponse(image, {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=300, s-maxage=300",
    },
  });
}

