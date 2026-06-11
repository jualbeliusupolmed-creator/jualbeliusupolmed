import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!isAdmin()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  try {
    const body = await req.json();
    const { id, title, slug, content_markdown, image_url, status, author } = body;
    
    if (!title || !slug || !content_markdown) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const supa = getAdminClient();
    const payload = {
      title,
      slug,
      content_markdown,
      image_url: image_url || null,
      status: status || "draft",
      author: author || "Admin",
      updated_at: new Date().toISOString()
    };

    let result;
    if (id) {
      result = await supa.from("blogs").update(payload).eq("id", id);
    } else {
      result = await supa.from("blogs").insert(payload);
    }

    if (result.error) throw new Error(result.error.message);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
