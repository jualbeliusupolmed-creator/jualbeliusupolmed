import { getAdminSession } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, getActiveCampuses, getCampusProvinceId } from "@/lib/settings";

const SUPERADMIN_ID = () => String(process.env.SUPERADMIN_AUTH_USER_ID || "").toLowerCase();

export async function getAdminActor() {
  try {
    const session = getAdminSession();
    if (!session) return null;

    const admin = getAdminClient();
    const userId = session.sub.toLowerCase();
    const { data: authResult, error: authError } = await admin.auth.admin.getUserById(userId);
    const authUser = authResult?.user;
    if (authError || !authUser || (authUser.banned_until && new Date(authUser.banned_until) > new Date())) return null;

    if (SUPERADMIN_ID() && userId === SUPERADMIN_ID()) {
      return {
        userId,
        email: authUser.email || "",
        label: authUser.user_metadata?.display_name || authUser.email || "Superadmin",
        role: "superadmin",
        permissions: { "*": ["read", "manage", "review"] },
        scopes: [],
      };
    }

    const { data: membership, error: membershipError } = await admin
      .from("admin_memberships")
      .select("user_id, display_name, permissions, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError || !membership) return null;

    const { data: scopes, error: scopesError } = await admin
      .from("admin_scope_grants")
      .select("scope_type, scope_id")
      .eq("user_id", userId);
    if (scopesError) return null;

    return {
      userId,
      email: authUser.email || "",
      label: membership.display_name || authUser.user_metadata?.display_name || authUser.email || "Owner",
      role: "owner",
      permissions: membership.permissions && typeof membership.permissions === "object" ? membership.permissions : {},
      scopes: scopes || [],
    };
  } catch (error) {
    console.error("[admin-access] Failed to resolve admin actor.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return null;
  }
}

export function hasAdminPermission(actor, module, action = "read") {
  if (!actor) return false;
  if (actor.role === "superadmin") return true;
  const permissions = actor.permissions?.[module];
  if (Array.isArray(permissions)) return permissions.includes(action) || permissions.includes("manage");
  if (permissions && typeof permissions === "object") return permissions[action] === true || permissions.manage === true;
  return false;
}

export function resolveAdminCampusScope(scopes, campuses) {
  const granted = new Set();
  for (const scope of scopes || []) {
    if (scope.scope_type === "campus") {
      const wanted = String(scope.scope_id || "").toLowerCase();
      for (const campus of campuses || []) {
        if ([campus.id, campus.shortName, campus.name].some((value) => String(value || "").toLowerCase() === wanted)) {
          granted.add(campus.shortName);
        }
      }
    }
    if (scope.scope_type === "province") {
      const wanted = String(scope.scope_id || "").toLowerCase();
      for (const campus of campuses || []) {
        if (getCampusProvinceId(campus) === wanted) granted.add(campus.shortName);
      }
    }
  }
  return [...granted];
}

export async function authorizeAdmin(module, action = "read") {
  const actor = await getAdminActor();
  return actor && hasAdminPermission(actor, module, action) ? { actor, ok: true } : { actor: null, ok: false };
}

export async function getAdminCampusScope(actor) {
  if (!actor) return [];
  if (actor.role === "superadmin") return null;

  const settings = await getSettings();
  return resolveAdminCampusScope(actor.scopes, getActiveCampuses(settings));
}

export async function isActiveAdminSession() {
  return !!(await getAdminActor());
}
