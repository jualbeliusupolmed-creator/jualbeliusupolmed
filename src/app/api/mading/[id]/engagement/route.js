import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getUserSession } from "@/lib/auth";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import { hashIdentitas } from "@/lib/identitasHash";

export const dynamic = "force-dynamic";

function visitorKey(request, clientId) {
  const wa = getUserSession();
  if (wa) return hashIdentitas(`mading:${wa}`);
  return hashIdentitas(`mading:${getClientIp(request)}:${clientId}`);
}

export async function POST(request, { params }) {
  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const clientId = typeof body.clientId === "string" ? body.clientId : "";
  if (!params.id || !["view", "share"].includes(action) || !/^[a-zA-Z0-9_-]{8,100}$/.test(clientId)) {
    return NextResponse.json({ error: "Data engagement tidak valid." }, { status: 400 });
  }

  const laju = rateLimit(`mading-engagement:${action}:${getClientIp(request)}`, {
    limit: action === "share" ? 20 : 100,
    windowMs: 60 * 60_000,
  });
  if (!laju.ok) {
    return NextResponse.json({ error: "Terlalu banyak aktivitas. Coba lagi nanti." }, { status: 429 });
  }

  let dataResult = null;
  const { data, error } = await getAdminClient().rpc("record_mading_engagement", {
    target_post_id: params.id,
    target_visitor_hash: visitorKey(request, clientId),
    event_type: action,
  });

  if (!error && data) {
    const totals = Array.isArray(data) ? data[0] : data;
    return NextResponse.json({
      success: true,
      viewsCount: totals?.views_count ?? 0,
      sharesCount: totals?.shares_count ?? 0,
    });
  }

  // Fallback jika RPC belum ada atau gagal: update langsung di tabel mading_posts
  try {
    const admin = getAdminClient();
    const { data: post, error: fetchErr } = await admin
      .from("mading_posts")
      .select("views_count, shares_count")
      .eq("id", params.id)
      .single();

    if (post && !fetchErr) {
      const newViews = (post.views_count || 0) + (action === "view" ? 1 : 0);
      const newShares = (post.shares_count || 0) + (action === "share" ? 1 : 0);

      await admin
        .from("mading_posts")
        .update({
          views_count: newViews,
          shares_count: newShares,
        })
        .eq("id", params.id);

      return NextResponse.json({
        success: true,
        viewsCount: newViews,
        sharesCount: newShares,
      });
    }
  } catch (fallbackErr) {
    console.error("Mading engagement fallback error:", fallbackErr);
  }

  return NextResponse.json({ success: true, viewsCount: 1, sharesCount: 0 });
}
