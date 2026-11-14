import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, getAdminScopeFilter, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";
import {
  resolveOmnichannelTargets,
  createOmnichannelDistributionPlans,
  executeOmnichannelPublish,
} from "@/lib/omnichannelDistribution";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["pending", "active", "sold", "rejected", "suspended", "hidden", "all"]);

export async function GET(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "marketplace", "read")) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const mode = params.get("mode") === "wanted" ? "wanted" : "listings";
  const status = mode === "wanted"
    ? (new Set(["active", "pending", "resolved", "all"]).has(params.get("status")) ? params.get("status") : "active")
    : (STATUSES.has(params.get("status")) ? params.get("status") : "active");
  const q = String(params.get("q") || "").trim().slice(0, 80);
  const requestedOffset = Number.parseInt(params.get("offset") || "0", 10);
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? Math.min(requestedOffset, 1_000_000_000) : 0;
  const supa = getAdminClient();
  const scopeFilter = await getAdminScopeFilter(actor);

  function applyWantedScope(baseQuery) {
    if (scopeFilter.isAll) return baseQuery;
    if (scopeFilter.campusCodes?.length > 0) {
      const lower = scopeFilter.campusCodes.map((c) => c.toLowerCase());
      const uniIds = scopeFilter.universityIds || [];
      const allCodes = [...new Set([...scopeFilter.campusCodes, ...lower, ...uniIds])];
      return baseQuery.or(`campus.in.(${allCodes.join(",")}),university_id.in.(${allCodes.join(",")})`);
    }
    return baseQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  function applyListingScope(baseQuery) {
    if (scopeFilter.isAll) return baseQuery;
    if (scopeFilter.scopeType === "province" && scopeFilter.provinceId) {
      if (scopeFilter.campusCodes?.length > 0) {
        const lower = scopeFilter.campusCodes.map((c) => c.toLowerCase());
        const uniIds = scopeFilter.universityIds || [];
        const allCodes = [...new Set([...scopeFilter.campusCodes, ...lower, ...uniIds])];
        return baseQuery.or(`seller_province_id.eq.${scopeFilter.provinceId},campus.in.(${allCodes.join(",")}),university_id.in.(${allCodes.join(",")})`);
      }
      return baseQuery.eq("seller_province_id", scopeFilter.provinceId);
    }
    if (scopeFilter.campusCodes?.length > 0) {
      const lower = scopeFilter.campusCodes.map((c) => c.toLowerCase());
      const uniIds = scopeFilter.universityIds || [];
      const allCodes = [...new Set([...scopeFilter.campusCodes, ...lower, ...uniIds])];
      return baseQuery.or(`campus.in.(${allCodes.join(",")}),university_id.in.(${allCodes.join(",")})`);
    }
    return baseQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  if (mode === "wanted") {
    let wantedQuery = supa.from("wanted_listings")
      .select("id,buyer_name,title,description,budget,category,campus,university_id,area,status,created_at,buyer_wa,contact_wa", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + 99);
    if (status !== "all") wantedQuery = wantedQuery.eq("status", status);
    if (q) wantedQuery = wantedQuery.ilike("title", `%${q.replace(/[%_,]/g, " ")}%`);
    wantedQuery = applyWantedScope(wantedQuery);

    let countsQuery = supa.from("wanted_listings").select("status");
    countsQuery = applyWantedScope(countsQuery);

    const [{ data, count, error }, { data: statusRows }] = await Promise.all([
      wantedQuery,
      countsQuery,
    ]);
    if (error) return NextResponse.json({ error: "Daftar kebutuhan belum dapat dimuat." }, { status: 503 });

    const statusCounts = { all: (statusRows || []).length };
    for (const r of statusRows || []) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;

    const items = data || [];
    return NextResponse.json({ items, campuses: scopeFilter.campusCodes, scopeLabel: scopeFilter.label, mode, total: count || 0, statusCounts, nextOffset: count > offset + items.length ? offset + items.length : null });
  }

  let query = supa.from("listings")
    .select("id, slug, title, description, price, category, condition, stock, campus, university_id, area, image_url, images, status, seller_name, seller_wa, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + 99);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("title", `%${q.replace(/[%_,]/g, " ")}%`);
  query = applyListingScope(query);

  let countsQuery = supa.from("listings").select("status");
  countsQuery = applyListingScope(countsQuery);

  const [{ data, count, error }, { data: statusRows }] = await Promise.all([
    query,
    countsQuery,
  ]);
  if (error) return NextResponse.json({ error: "Data marketplace belum dapat dimuat." }, { status: 503 });

  const statusCounts = { all: (statusRows || []).length };
  for (const r of statusRows || []) statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;

  const items = data || [];
  return NextResponse.json({ items, campuses: scopeFilter.campusCodes, scopeLabel: scopeFilter.label, mode, total: count || 0, statusCounts, nextOffset: count > offset + items.length ? offset + items.length : null });
}

export async function PATCH(req) {
  const actor = await getAdminActor();
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "").trim().slice(0, 100);
  const action = body.action;
  if (body.entityType === "wanted") {
    if (!id || !["resolve", "remove"].includes(action)) return NextResponse.json({ error: "Aksi kebutuhan tidak valid." }, { status: 400 });
    if (!hasAdminPermission(actor, "marketplace", "manage")) return NextResponse.json({ error: "Izin pengelolaan marketplace tidak diberikan." }, { status: 403 });
    if (action === "remove" && actor?.role !== "superadmin") return NextResponse.json({ error: "Penghapusan kebutuhan hanya untuk superadmin." }, { status: 403 });
    const supa = getAdminClient();
    const campuses = await getAdminCampusScope(actor);
    if (actor?.role !== "superadmin" && !campuses.length) return NextResponse.json({ error: "Cakupan kampus belum ditetapkan." }, { status: 403 });
    let targetQuery = supa.from("wanted_listings").select("id,campus,university_id,status").eq("id", id);
    if (action === "resolve") targetQuery = targetQuery.in("status", ["active", "pending"]);
    if (actor?.role !== "superadmin") {
      const campusesLower = campuses.map((c) => c.toLowerCase());
      targetQuery = targetQuery.or(`campus.in.(${campuses.join(",")}),university_id.in.(${campusesLower.join(",")})`);
    }
    const { data: target, error: targetError } = await targetQuery.maybeSingle();
    if (targetError) return NextResponse.json({ error: "Kebutuhan belum dapat diperiksa." }, { status: 503 });
    if (!target) return NextResponse.json({ error: "Kebutuhan tidak ditemukan dalam cakupan atau statusnya sudah berubah." }, { status: 404 });
    const change = action === "resolve"
      ? await supa.from("wanted_listings").update({ status: "resolved" }).eq("id", id).in("status", ["active", "pending"]).select("id,status").maybeSingle()
      : await supa.from("wanted_listings").delete().eq("id", id).select("id").maybeSingle();
    if (change.error || !change.data) return NextResponse.json({ error: "Kebutuhan gagal diperbarui." }, { status: 409 });
    await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: `wanted_${action}`, target_id: id, metadata: { campus: target.campus || "" } });
    return NextResponse.json({ ok: true, item: change.data });
  }
  const reviewAction = ["approve", "reject"].includes(action);
  const manageAction = ["suspend", "restore"].includes(action);
  const vipAction = ["force_bump", "pin_fyp"].includes(action);
  const editAction = action === "edit";
  if (!id || (!reviewAction && !manageAction && !editAction && !vipAction)) return NextResponse.json({ error: "Aksi marketplace tidak valid." }, { status: 400 });
  if (reviewAction && !hasAdminPermission(actor, "marketplace", "review")) return NextResponse.json({ error: "Izin review tidak diberikan." }, { status: 403 });
  if ((manageAction || editAction || vipAction) && !hasAdminPermission(actor, "marketplace", "manage")) return NextResponse.json({ error: "Izin pengelolaan iklan tidak diberikan." }, { status: 403 });

  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ error: "Cakupan kampus belum ditetapkan." }, { status: 403 });

  let targetQuery = supa.from("listings").select("id, campus, university_id, status").eq("id", id);
  if (reviewAction) targetQuery = targetQuery.eq("status", "pending");
  if (action === "suspend") targetQuery = targetQuery.eq("status", "active");
  if (action === "restore") targetQuery = targetQuery.in("status", ["suspended", "hidden", "rejected"]);
  if (actor.role !== "superadmin") {
    const campusesLower = campuses.map((c) => c.toLowerCase());
    targetQuery = targetQuery.or(`campus.in.(${campuses.join(",")}),university_id.in.(${campusesLower.join(",")})`);
  }
  const { data: target, error: targetError } = await targetQuery.maybeSingle();
  if (targetError) return NextResponse.json({ error: "Data iklan belum dapat diperiksa." }, { status: 503 });
  if (!target) return NextResponse.json({ error: "Iklan tidak ditemukan dalam cakupan akun atau statusnya sudah berubah." }, { status: 404 });

  if (vipAction) {
    const nowIso = new Date().toISOString();
    const updates = action === "force_bump"
      ? { created_at: nowIso, updated_at: nowIso, status: "active" }
      : { is_featured: true, featured_until: new Date(Date.now() + 7 * 86400000).toISOString(), status: "active" };

    const { data: updated, error: vipErr } = await supa.from("listings").update(updates).eq("id", id).select("id, title, status").maybeSingle();
    if (vipErr) return NextResponse.json({ error: "Gagal menerapkan aksi VIP pada iklan." }, { status: 500 });

    await supa.from("admin_audit_events").insert({
      actor_id: actor.userId,
      action: action === "force_bump" ? "marketplace_vip_bump" : "marketplace_vip_pin_fyp",
      target_id: id,
      metadata: { action, campus: target.campus },
    }).catch(() => null);

    return NextResponse.json({ ok: true, item: updated, message: action === "force_bump" ? "Iklan berhasil di-bump ke posisi teratas!" : "Iklan disematkan ke FYP selama 7 hari!" });
  }

  if (editAction) {
    const updates = {};
    if (body.title !== undefined) updates.title = String(body.title).trim().slice(0, 150);
    if (body.price !== undefined) updates.price = Math.max(0, parseInt(body.price, 10) || 0);
    if (body.description !== undefined) updates.description = String(body.description).trim().slice(0, 3000);
    if (body.category !== undefined) updates.category = String(body.category).trim().slice(0, 60);
    if (body.condition !== undefined) updates.condition = body.condition === "Baru" ? "Baru" : "Bekas";
    if (body.stock !== undefined) updates.stock = Math.max(0, parseInt(body.stock, 10) || 0);
    if (body.area !== undefined) updates.area = String(body.area).trim().slice(0, 100);
    if (body.campus !== undefined) updates.campus = String(body.campus).trim().slice(0, 50);
    if (body.seller_name !== undefined) updates.seller_name = String(body.seller_name).trim().slice(0, 100);
    if (body.seller_wa !== undefined) updates.seller_wa = String(body.seller_wa).trim().replace(/\D/g, "").slice(0, 20);
    if (body.status !== undefined && ["active", "pending", "sold", "rejected", "suspended", "hidden"].includes(body.status)) {
      updates.status = body.status;
    }

    let updateQuery = supa.from("listings").update(updates).eq("id", id);
    if (actor.role !== "superadmin") {
      const campusesLower = campuses.map((c) => c.toLowerCase());
      updateQuery = updateQuery.or(`campus.in.(${campuses.join(",")}),university_id.in.(${campusesLower.join(",")})`);
    }
    const { data: updated, error: updateErr } = await updateQuery
      .select("id, slug, status, title, description, price, category, condition, campus, university_id, image_url, images, area, stock, seller_name, seller_wa")
      .maybeSingle();
    if (updateErr || !updated) {
      return NextResponse.json({ error: "Gagal memperbarui listing." }, { status: 409 });
    }
    await supa.from("admin_audit_events").insert({
      actor_id: actor.userId,
      action: "marketplace_edit",
      target_id: id,
      metadata: { updates, campus: target.campus }
    });
    return NextResponse.json({ ok: true, item: updated });
  }

  if (action === "approve") {
    const { data: unpaidPayments, error: paymentLookupError } = await supa
      .from("payments")
      .select("id")
      .eq("listing_id", id)
      .eq("type", "iklan")
      .eq("status", "pending")
      .limit(1);
    if (paymentLookupError) {
      return NextResponse.json({ error: "Status biaya tayang belum dapat diperiksa." }, { status: 503 });
    }
    if (unpaidPayments?.length) {
      return NextResponse.json({ error: "Iklan belum dapat disetujui karena biaya tayangnya belum lunas." }, { status: 409 });
    }
  }

  const reason = String(body.reason || "").trim().slice(0, 300);
  let change;
  if (action === "approve" || action === "restore") {
    const settings = await getSettings();
    const days = Math.max(1, Math.min(365, Number(settings?.pricing?.listingDays) || 14));
    change = {
      status: "active",
      moderated_at: new Date().toISOString(),
      moderated_by: actor.userId,
      moderation_reason: action === "approve" ? "Disetujui melalui workspace baru." : "Dipulihkan melalui workspace baru.",
      expires_at: new Date(Date.now() + days * 864e5).toISOString(),
    };
  } else if (action === "reject") {
    change = { status: "rejected", moderated_at: new Date().toISOString(), moderated_by: actor.userId, moderation_reason: reason || "Tidak memenuhi pedoman komunitas." };
  } else {
    change = { status: "suspended", moderated_at: new Date().toISOString(), moderated_by: actor.userId, moderation_reason: reason || "Ditangguhkan melalui workspace baru." };
  }
  let updateQuery = supa.from("listings").update(change).eq("id", id).eq("status", target.status);
  if (actor.role !== "superadmin") {
    const campusesLower = campuses.map((campus) => campus.toLowerCase());
    updateQuery = updateQuery.or(
      `campus.in.(${campuses.join(",")}),university_id.in.(${campusesLower.join(",")})`
    );
  }
  const { data: updated, error } = await updateQuery
    .select("id, status, title, description, price, category, condition, campus, university_id, image_url")
    .maybeSingle();
  if (error || !updated) return NextResponse.json({ error: "Iklan berubah saat diproses. Segarkan daftar lalu coba kembali." }, { status: 409 });

  await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: `marketplace_${action}`, target_id: id, metadata: { campus: target.campus } });

  // Distribusi otomatis ke Akun Instagram Kampus/Wilayah terkait saat iklan disetujui
  if (action === "approve") {
    try {
      const origin = req.headers.get("origin") || process.env.NEXT_PUBLIC_BASE_URL || "https://www.kampuskita.my.id";
      const { channels } = await resolveOmnichannelTargets(updated, { origin });
      const defaultPlans = (channels || [])
        .filter((c) => c.available && c.defaultSelected)
        .map((c) => ({
          channelType: c.channelType,
          socialAccountId: c.socialAccountId,
          targetDestination: c.targetDestination,
          caption: c.caption,
          publishNow: true,
        }));
      if (defaultPlans.length > 0) {
        const createdJobs = await createOmnichannelDistributionPlans(id, defaultPlans, {
          actorId: actor.userId,
        });
        for (const job of createdJobs) {
          executeOmnichannelPublish(job.id, { origin }).catch((err) => {
            console.warn(`[admin/marketplace] Background auto-publish job ${job.id} non-fatal:`, err?.message);
          });
        }
      }
    } catch (distErr) {
      console.warn("[admin/marketplace] Auto-distribution plan error (non-fatal):", distErr?.message);
    }
  }

  return NextResponse.json({ ok: true, item: updated });
}

export async function DELETE(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "marketplace", "manage")) {
    return NextResponse.json({ error: "Tidak berwenang menghapus iklan." }, { status: 403 });
  }
  const params = new URL(req.url).searchParams;
  const id = String(params.get("id") || "").trim().slice(0, 100);
  const entityType = params.get("entityType") || "listings";
  if (!id) return NextResponse.json({ error: "ID tidak valid." }, { status: 400 });

  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) {
    return NextResponse.json({ error: "Cakupan kampus belum ditetapkan." }, { status: 403 });
  }

  const table = entityType === "wanted" ? "wanted_listings" : "listings";
  let targetQuery = supa.from(table).select("id, campus, university_id").eq("id", id);
  if (actor.role !== "superadmin") {
    const campusesLower = campuses.map((c) => c.toLowerCase());
    targetQuery = targetQuery.or(`campus.in.(${campuses.join(",")}),university_id.in.(${campusesLower.join(",")})`);
  }
  const { data: target, error: targetError } = await targetQuery.maybeSingle();
  if (targetError || !target) {
    return NextResponse.json({ error: "Item tidak ditemukan dalam cakupan wewenang." }, { status: 404 });
  }

  const { error: delErr } = await supa.from(table).delete().eq("id", id);
  if (delErr) {
    return NextResponse.json({ error: "Gagal menghapus item dari basis data." }, { status: 409 });
  }

  await supa.from("admin_audit_events").insert({
    actor_id: actor.userId,
    action: `marketplace_delete_${table}`,
    target_id: id,
    metadata: { campus: target.campus || "" }
  });

  return NextResponse.json({ ok: true, deletedId: id });
}
