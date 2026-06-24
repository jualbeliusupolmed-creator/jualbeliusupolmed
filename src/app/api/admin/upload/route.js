import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

export async function POST(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = (formData.get("bucket") || "uploads").replace(/[^a-z0-9-_]/gi, "-");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "File tidak ditemukan" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Format file tidak didukung (JPEG/PNG/WebP/GIF)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length > MAX_SIZE) {
      return NextResponse.json({ error: "Ukuran file maksimal 5MB" }, { status: 400 });
    }

    const ext = file.type.split("/")[1]?.replace("jpeg", "jpg") || "jpg";
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const supa = getAdminClient();
    const { error: uploadError } = await supa.storage
      .from("listings")
      .upload(fileName, buffer, { contentType: file.type, upsert: false });

    if (uploadError) throw new Error(uploadError.message);

    const { data: { publicUrl } } = supa.storage.from("listings").getPublicUrl(fileName);

    return NextResponse.json({ ok: true, url: publicUrl });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
