import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getSellerSessionAsync } from "@/lib/auth";
import { jawabGalat } from "@/lib/jawabGalat";
import { uploadMedia } from "@/lib/mediaStorage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Allowed MIME types and their magic bytes (hex prefixes)
const ALLOWED_TYPES = {
  "image/jpeg": [
    [0xff, 0xd8, 0xff], // JPEG SOI marker
  ],
  "image/png": [
    [0x89, 0x50, 0x4e, 0x47], // PNG signature
  ],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46], // RIFF (followed by WEBP)
  ],
  "image/gif": [
    [0x47, 0x49, 0x46, 0x38], // GIF8
  ],
};

const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Validates file magic bytes to ensure it's actually an image.
 * Returns the detected MIME type or null if invalid.
 */
function validateMagicBytes(buffer) {
  const bytes = new Uint8Array(buffer);

  for (const [mime, signatures] of Object.entries(ALLOWED_TYPES)) {
    for (const sig of signatures) {
      if (sig.every((byte, i) => bytes[i] === byte)) {
        // Extra check for WebP: bytes 8-11 must be "WEBP"
        if (mime === "image/webp") {
          const webp = [0x57, 0x45, 0x42, 0x50];
          if (webp.every((byte, i) => bytes[8 + i] === byte)) {
            return mime;
          }
          continue;
        }
        return mime;
      }
    }
  }
  return null;
}

/**
 * POST /api/upload
 * Multipart form upload with server-side MIME validation.
 * Returns: { url: string }
 */
export async function POST(req) {
  const sessionWa = await getSellerSessionAsync();
  if (!sessionWa) {
    return NextResponse.json({ error: "Sesi tidak valid. Silakan login kembali." }, { status: 401 });
  }

  // Rate limit: 20 uploads per minute per akun WA, bukan per IP (melindungi WiFi asrama/kampus)
  const rl = rateLimit(`upload:${sessionWa}`, { limit: 20, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak upload. Coba lagi dalam ${rl.retryAfter} detik.` },
      { status: 429 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    // Check size
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File terlalu besar. Maksimal ${MAX_SIZE_BYTES / 1024 / 1024} MB.` },
        { status: 400 }
      );
    }

    // Read file buffer for magic byte validation
    const arrayBuffer = await file.arrayBuffer();
    const detectedMime = validateMagicBytes(arrayBuffer);

    if (!detectedMime) {
      return NextResponse.json(
        {
          error:
            "Format file tidak valid. Hanya gambar JPG, PNG, WebP, atau GIF yang diizinkan.",
        },
        { status: 400 }
      );
    }

    // Upload buffer as-is (Cloudflare Pages does not support sharp image processing)
    const detectedExtension = detectedMime === "image/webp" ? "webp" : (detectedMime === "image/jpeg" ? "jpg" : detectedMime === "image/png" ? "png" : "gif");
    const path = `listings/${Date.now()}-${Math.random().toString(36).slice(2)}.${detectedExtension}`;

    // Upload with retry logic for transient failures
    let uploadResult;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        uploadResult = await uploadMedia(Buffer.from(arrayBuffer), path, detectedMime);
        break;
      } catch (uploadErr) {
        console.error(`[api/upload] Upload attempt ${attempt} failed:`, uploadErr.message);
        if (attempt === 2) throw uploadErr;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    return NextResponse.json({ url: uploadResult.url, provider: uploadResult.provider });
  } catch (e) {
    return jawabGalat(e);
  }
}
