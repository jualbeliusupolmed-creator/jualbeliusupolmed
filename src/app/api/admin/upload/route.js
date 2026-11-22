import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { jawabGalat } from "@/lib/jawabGalat";
import { uploadMedia } from "@/lib/mediaStorage";

export const dynamic = "force-dynamic";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export async function POST(req) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = (formData.get("bucket") || "uploads").replace(/[^a-z0-9_-]/gi, "-");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format file tidak didukung (JPEG/PNG/WebP/GIF)" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
    }

    const ext = file.type === "image/webp" ? "webp" : (file.type === "image/jpeg" || file.type === "image/jpg" ? "jpg" : file.type === "image/png" ? "png" : "gif");
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { url, provider } = await uploadMedia(Buffer.from(arrayBuffer), fileName, file.type);

    return NextResponse.json({ ok: true, url, provider });
  } catch (e) {
    return jawabGalat(e);
  }
}
