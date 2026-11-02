import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getNationalAnalyticsData } from "@/lib/nationalAnalytics";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics/national
 * Mengambil ringkasan analitik nasional, konversi saluran omnichannel, breakdown per provinsi & kampus,
 * health check integrasi sosial, serta roadmap 6 tahap peluncuran multi-provinsi.
 */
export async function GET() {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "analytics", "read") ||
    hasAdminPermission(actor, "organization", "read");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  try {
    const data = await getNationalAnalyticsData(actor);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    console.error("[GET /api/admin/analytics/national] Error:", err);
    return NextResponse.json({ error: "Gagal memuat analitik nasional: " + err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/analytics/national
 * Memperbarui status checklist rollout peluncuran multi-provinsi nasional (Superadmin/Province Admin).
 */
export async function POST(req) {
  const actor = await getAdminActor();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed =
    actor.role === "superadmin" ||
    hasAdminPermission(actor, "organization", "write");

  if (!allowed) {
    return NextResponse.json({ error: "Forbidden: Akses ditolak" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { action, provinceId, itemKey, value, status } = body;
  const supa = getAdminClient();

  try {
    if (action === "update_checklist") {
      if (!provinceId || !itemKey) {
        return NextResponse.json({ error: "Province ID dan itemKey wajib disertakan." }, { status: 400 });
      }

      const allowedFields = [
        "instagram_setup",
        "whatsapp_channel_setup",
        "admin_assigned",
        "first_university_verified",
        "dm_routing_tested",
        "channel_posting_tested",
        "bursa_transaction_tested",
      ];

      if (!allowedFields.includes(itemKey)) {
        return NextResponse.json({ error: "Field checklist tidak valid." }, { status: 400 });
      }

      const updateData = {
        [itemKey]: Boolean(value),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supa
        .from("provincial_rollout_checklists")
        .update(updateData)
        .eq("province_id", provinceId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, checklist: data });
    }

    if (action === "update_stage_status") {
      if (!provinceId || !status) {
        return NextResponse.json({ error: "Province ID dan status wajib disertakan." }, { status: 400 });
      }

      const updateData = {
        status,
        launched_at: status === "fully_launched" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supa
        .from("provincial_rollout_checklists")
        .update(updateData)
        .eq("province_id", provinceId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, checklist: data });
    }

    if (action === "mark_all_sop") {
      if (!provinceId) {
        return NextResponse.json({ error: "Province ID wajib disertakan." }, { status: 400 });
      }

      const markValue = Boolean(value);
      const updateData = {
        instagram_setup: markValue,
        whatsapp_channel_setup: markValue,
        admin_assigned: markValue,
        first_university_verified: markValue,
        dm_routing_tested: markValue,
        channel_posting_tested: markValue,
        bursa_transaction_tested: markValue,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supa
        .from("provincial_rollout_checklists")
        .update(updateData)
        .eq("province_id", provinceId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, checklist: data });
    }

    if (action === "update_notes") {
      if (!provinceId) {
        return NextResponse.json({ error: "Province ID wajib disertakan." }, { status: 400 });
      }

      const { data, error } = await supa
        .from("provincial_rollout_checklists")
        .update({ notes: body.notes || null, updated_at: new Date().toISOString() })
        .eq("province_id", provinceId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ ok: true, checklist: data });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/admin/analytics/national] Error:", err);
    return NextResponse.json({ error: "Gagal memperbarui status rollout: " + err.message }, { status: 500 });
  }
}

