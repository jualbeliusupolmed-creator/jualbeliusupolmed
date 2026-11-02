import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission, getAdminCampusScope } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/social/dm-logs
 * Mengambil log pesan DM masuk Instagram yang telah di-route ke Inbox
 * terisolasi berdasarkan cakupan wilayah/kampus admin yang aktif.
 */
export async function GET(req) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "social", "read") ||
    hasAdminPermission(actor, "content", "read");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  try {
    const supa = getAdminClient();
    const activeCampuses = await getAdminCampusScope(actor);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);
    const actionFilter = searchParams.get("action");
    const search = searchParams.get("q");

    let query = supa
      .from("instagram_dm_logs")
      .select(`
        id,
        recipient_account_id,
        sender_id,
        sender_username,
        province_id,
        university_id,
        direction,
        message_text,
        quick_reply_payload,
        action_taken,
        status,
        metadata,
        created_at,
        provinces(id, name),
        universities(id, code, name),
        listings(id, title, price, seller_name, campus)
      `, { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(limit);

    // Filter berdasarkan scope admin jika bukan "all"
    if (activeCampuses.length > 0 && !activeCampuses.includes("all")) {
      const universityCodes = activeCampuses.map((c) => c.toLowerCase());
      query = query.or(
        `university_id.in.(${universityCodes.join(",")}),provinces.name.ilike.%sumatera%`
      );
    }

    if (actionFilter && actionFilter !== "all") {
      query = query.eq("action_taken", actionFilter);
    }

    if (search) {
      query = query.or(`message_text.ilike.%${search}%,sender_id.ilike.%${search}%`);
    }

    const { data: logs, count, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      ok: true,
      logs: logs || [],
      total: count || 0,
      activeCampuses,
    });
  } catch (err) {
    console.error("[api/admin/social/dm-logs] GET Error:", err);
    return NextResponse.json(
      { error: "Gagal mengambil log DM Instagram.", details: err.message },
      { status: 500 }
    );
  }
}

