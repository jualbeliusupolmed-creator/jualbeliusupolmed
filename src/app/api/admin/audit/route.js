import { NextResponse } from "next/server";
import { getAdminActor } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

const MODULES = new Set(["overview", "marketplace", "reports", "po", "users", "finance", "analytics", "content"]);
const ACTIONS = new Set(["read", "review", "manage"]);
const SETTINGS_KEYS = new Set(["site", "pricing", "areas", "campuses"]);

function safeMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return {};
  const safe = {};
  for (const key of ["campus", "from", "to", "type", "role"]) {
    const value = metadata[key];
    if (typeof value === "string" && value.length <= 80) safe[key] = value;
  }
  if (Array.isArray(metadata.keys)) safe.keys = metadata.keys.filter((key) => SETTINGS_KEYS.has(key)).slice(0, 20);
  if (metadata.permissions && typeof metadata.permissions === "object" && !Array.isArray(metadata.permissions)) {
    safe.permissions = Object.fromEntries(Object.entries(metadata.permissions)
      .filter(([module]) => MODULES.has(module) && Array.isArray(metadata.permissions[module]))
      .map(([module, grants]) => [module, [...new Set(grants.filter((grant) => ACTIONS.has(grant)))]]));
  }
  if (Array.isArray(metadata.scopes)) {
    safe.scopes = metadata.scopes.slice(0, 40).flatMap((scope) => {
      if (!scope || !["province", "campus"].includes(scope.scope_type)) return [];
      const scopeId = String(scope.scope_id || "").toLowerCase();
      return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scopeId) ? [{ type: scope.scope_type, id: scopeId }] : [];
    });
  }
  return safe;
}

function safeTarget(targetId) {
  const value = String(targetId || "");
  if (value === "settings") return value;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) return value.slice(0, 8);
  if (/^[0-9a-f]{64}$/i.test(value)) return value.slice(0, 12);
  return "—";
}

export async function GET(req) {
  const actor = await getAdminActor();
  if (actor?.role !== "superadmin") return NextResponse.json({ error: "Log audit hanya untuk superadmin." }, { status: 403 });
  const params = new URL(req.url).searchParams;
  const requestedOffset = Number.parseInt(params.get("offset") || "0", 10);
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? Math.min(requestedOffset, 1_000_000_000) : 0;
  const action = String(params.get("action") || "").trim().slice(0, 80);
  let query = getAdminClient().from("admin_audit_events")
    .select("id,actor_id,action,target_id,metadata,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + 99);
  if (action) query = query.ilike("action", "%" + action.replace(/[%_,]/g, " ") + "%");
  const { data, count, error } = await query;
  if (error) return NextResponse.json({ error: "Log audit belum dapat dimuat." }, { status: 503 });
  return NextResponse.json({
    items: (data || []).map((item) => ({
      id: item.id,
      actor: item.actor_id ? String(item.actor_id).slice(0, 8) : "—",
      action: item.action,
      target: safeTarget(item.target_id),
      metadata: safeMetadata(item.metadata),
      createdAt: item.created_at,
    })),
    total: count || 0,
    nextOffset: count > offset + (data || []).length ? offset + (data || []).length : null,
  });
}
