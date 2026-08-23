import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supa = getAdminClient();
    const { data: blogs, error } = await supa
      .from("blogs")
      .select("id, title, slug, image_url, author, created_at, excerpt, keywords, content_markdown")
      .eq("status", "published")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("API Blog Error:", error);
      return Response.json({ success: false, error: "Gagal mengambil data blog" }, { status: 500 });
    }

    return Response.json({ success: true, blogs });
  } catch (error) {
    console.error("API Blog Error:", error);
    return Response.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
