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

  const { data, error } = await getAdminClient().rpc("record_mading_engagement", {
    target_post_id: params.id,
    target_visitor_hash: visitorKey(request, clientId),
    event_type: action,
  });

  if (error) {
    // Pattern ini mencakup: fungsi RPC belum ada, kolom belum ada (migration pending),
    // atau error "column reference ... is ambiguous" dari SQL yang bentrok kolom.
    if (/record_mading_engagement|shares_count|mading_post_engagements|ambiguous|views_count/i.test(error.message || "")) {
      // Kembalikan 409 (bukan 500) — ini bukan crash app, tapi migration DB belum dijalankan.
      return NextResponse.json({ error: "Fitur statistik Menfess belum diaktifkan." }, { status: 409 });
    }
    console.error("Mading engagement error:", error.message);
    return NextResponse.json({ error: "Gagal menyimpan aktivitas." }, { status: 500 });
  }

  const totals = Array.isArray(data) ? data[0] : data;
  return NextResponse.json({ success: true, viewsCount: totals?.views_count ?? 0, sharesCount: totals?.shares_count ?? 0 });
}
