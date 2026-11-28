import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const isPaginated = searchParams.has("page") || searchParams.has("limit");
    const requestedPage = Number.parseInt(searchParams.get("page") || "1", 10);
    const requestedLimit = Number.parseInt(searchParams.get("limit") || "20", 10);
    const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isSafeInteger(requestedLimit)
      ? Math.min(50, Math.max(1, requestedLimit))
      : 20;
    const supa = getAdminClient();
    let query = supa
      .from("blogs")
      .select("id, title, slug, image_url, author, created_at, excerpt, keywords, content_markdown, views", isPaginated ? { count: "exact" } : undefined)
      .eq("status", "published")
      .order("created_at", { ascending: false });
    if (isPaginated) {
      const offset = (page - 1) * limit;
      query = query.range(offset, offset + limit - 1);
    }

    const { data: blogs, count, error } = await query;

    if (error) {
      console.error("API Blog Error:", error);
      return Response.json({ success: false, error: "Gagal mengambil data blog" }, { status: 500 });
    }

    return Response.json({
      success: true,
      blogs,
      ...(isPaginated && {
        page,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      }),
    });
  } catch (error) {
    console.error("API Blog Error:", error);
    return Response.json({ success: false, error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
