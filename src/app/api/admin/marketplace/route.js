import { NextResponse } from "next/server";
import { getAdminActor, getAdminCampusScope, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

const STATUSES = new Set(["pending", "active", "sold", "rejected", "suspended", "hidden", "all"]);

export async function GET(req) {
  const actor = await getAdminActor();
  if (!hasAdminPermission(actor, "marketplace", "read")) return NextResponse.json({ error: "Tidak berwenang." }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const mode = params.get("mode") === "wanted" ? "wanted" : "listings";
  const status = mode === "wanted"
    ? (new Set(["active", "pending", "resolved", "all"]).has(params.get("status")) ? params.get("status") : "active")
    : (STATUSES.has(params.get("status")) ? params.get("status") : "pending");
  const q = String(params.get("q") || "").trim().slice(0, 80);
  const requestedOffset = Number.parseInt(params.get("offset") || "0", 10);
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? Math.min(requestedOffset, 1_000_000_000) : 0;
  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ items: [], campuses: [], total: 0, nextOffset: null });

  if (mode === "wanted") {
    let wantedQuery = supa.from("wanted_listings")
      .select("id,buyer_name,title,description,budget,category,campus,area,status,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + 99);
    if (status !== "all") wantedQuery = wantedQuery.eq("status", status);
    if (q) wantedQuery = wantedQuery.ilike("title", `%${q.replace(/[%_,]/g, " ")}%`);
    if (actor.role !== "superadmin") wantedQuery = wantedQuery.in("campus", campuses);
    const { data, count, error } = await wantedQuery;
    if (error) return NextResponse.json({ error: "Daftar kebutuhan belum dapat dimuat." }, { status: 503 });
    const items = data || [];
    return NextResponse.json({ items, campuses, mode, total: count || 0, nextOffset: count > offset + items.length ? offset + items.length : null });
  }

  let query = supa.from("listings")
    .select("id, title, description, price, category, campus, area, image_url, status, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + 99);
  if (status !== "all") query = query.eq("status", status);
  if (q) query = query.ilike("title", `%${q.replace(/[%_,]/g, " ")}%`);
  if (actor.role !== "superadmin") query = query.in("campus", campuses);
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: "Data marketplace belum dapat dimuat." }, { status: 503 });
  const items = data || [];
  return NextResponse.json({ items, campuses, mode, total: count || 0, nextOffset: count > offset + items.length ? offset + items.length : null });
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
    let targetQuery = supa.from("wanted_listings").select("id,campus,status").eq("id", id);
    if (action === "resolve") targetQuery = targetQuery.in("status", ["active", "pending"]);
    if (actor?.role !== "superadmin") targetQuery = targetQuery.in("campus", campuses);
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
  if (!id || (!reviewAction && !manageAction)) return NextResponse.json({ error: "Aksi marketplace tidak valid." }, { status: 400 });
  if (reviewAction && !hasAdminPermission(actor, "marketplace", "review")) return NextResponse.json({ error: "Izin review tidak diberikan." }, { status: 403 });
  if (manageAction && !hasAdminPermission(actor, "marketplace", "manage")) return NextResponse.json({ error: "Izin pengelolaan iklan tidak diberikan." }, { status: 403 });

  const supa = getAdminClient();
  const campuses = await getAdminCampusScope(actor);
  if (actor.role !== "superadmin" && !campuses.length) return NextResponse.json({ error: "Cakupan kampus belum ditetapkan." }, { status: 403 });

  let targetQuery = supa.from("listings").select("id, campus, status").eq("id", id);
  if (reviewAction) targetQuery = targetQuery.eq("status", "pending");
  if (action === "suspend") targetQuery = targetQuery.eq("status", "active");
  if (action === "restore") targetQuery = targetQuery.in("status", ["suspended", "hidden", "rejected"]);
  if (actor.role !== "superadmin") targetQuery = targetQuery.in("campus", campuses);
  const { data: target, error: targetError } = await targetQuery.maybeSingle();
  if (targetError) return NextResponse.json({ error: "Data iklan belum dapat diperiksa." }, { status: 503 });
  if (!target) return NextResponse.json({ error: "Iklan tidak ditemukan dalam cakupan akun atau statusnya sudah berubah." }, { status: 404 });

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
  if (actor.role !== "superadmin") updateQuery = updateQuery.in("campus", campuses);
  const { data: updated, error } = await updateQuery.select("id, status").maybeSingle();
  if (error || !updated) return NextResponse.json({ error: "Iklan berubah saat diproses. Segarkan daftar lalu coba kembali." }, { status: 409 });

  await supa.from("admin_audit_events").insert({ actor_id: actor.userId, action: `marketplace_${action}`, target_id: id, metadata: { campus: target.campus } });
  return NextResponse.json({ ok: true, item: updated });
}
