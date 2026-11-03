import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission, getAdminCampusScope } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { canManageSocialScope } from "@/lib/socialAccountAccess";

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
    const parsedLimit = Number.parseInt(searchParams.get("limit") || "50", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 100)) : 50;
    const actionFilter = searchParams.get("action");
    const search = String(searchParams.get("q") || "").trim().slice(0, 80).replace(/[^\p{L}\p{N}\s@.-]/gu, " ");

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

    // Scope nasional superadmin menggunakan null; admin lain hanya menerima
    // log provinsi/kampus yang memiliki assignment eksplisit.
    if (actor.role !== "superadmin") {
      const [provinceIds, universityResult] = [
        (actor.scopes || []).filter((scope) => scope.scope_type === "province").map((scope) => String(scope.scope_id || "").toLowerCase()),
        await supa.from("universities").select("id,code,province_id"),
      ];
      if (universityResult.error) throw universityResult.error;
      const universityIds = (universityResult.data || []).filter((university) => canManageSocialScope(actor, {
        scope_type: "university",
        university_id: university.id,
        university_code: university.code,
        university_province_id: university.province_id,
      })).map((university) => university.id);
      const filters = [];
      if (provinceIds.length) filters.push(`province_id.in.(${provinceIds.join(",")})`);
      if (universityIds.length) filters.push(`university_id.in.(${universityIds.join(",")})`);
      if (!filters.length) return NextResponse.json({ ok: true, logs: [], total: 0, activeCampuses: [] });
      query = query.or(filters.join(","));
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

