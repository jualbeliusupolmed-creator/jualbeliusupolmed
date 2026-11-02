import { getAdminSession } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSettings, getActiveCampuses, getCampusProvinceId } from "@/lib/settings";

const SUPERADMIN_ID = () => String(process.env.SUPERADMIN_AUTH_USER_ID || "").toLowerCase();
const isMissingRoleAssignments = (error) => ["42P01", "PGRST205"].includes(error?.code);

export async function getAdminActor() {
  try {
    const session = getAdminSession();
    if (!session) return null;

    const admin = getAdminClient();
    const userId = session.sub.toLowerCase();
    const { data: authResult, error: authError } = await admin.auth.admin.getUserById(userId);
    const authUser = authResult?.user;
    if (authError || !authUser || (authUser.banned_until && new Date(authUser.banned_until) > new Date())) return null;

    const assignmentResult = await admin.from("admin_role_assignments")
      .select("role_code, province_id, university_id, status")
      .eq("user_id", userId)
      .eq("status", "active");
    if (assignmentResult.error && !isMissingRoleAssignments(assignmentResult.error)) return null;
    const assignments = assignmentResult.data || [];
    const assignmentScopes = assignments.map((assignment) => assignment.role_code === "province_admin"
      ? { scope_type: "province", scope_id: assignment.province_id }
      : { scope_type: "campus", scope_id: assignment.university_id });

    if (SUPERADMIN_ID() && userId === SUPERADMIN_ID()) {
      return {
        userId,
        email: authUser.email || "",
        label: authUser.user_metadata?.display_name || authUser.email || "Superadmin",
        role: "superadmin",
        roles: [{ role_code: "superadmin", province_id: null, university_id: null }, ...assignments],
        permissions: { "*": ["read", "manage", "review"] },
        scopes: assignmentScopes,
      };
    }

    const { data: membership, error: membershipError } = await admin
      .from("admin_memberships")
      .select("user_id, display_name, permissions, status")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();
    if (membershipError || !membership) return null;

    const { data: legacyScopes, error: scopesError } = await admin
      .from("admin_scope_grants")
      .select("scope_type, scope_id")
      .eq("user_id", userId);
    if (scopesError) return null;
    const scopes = isMissingRoleAssignments(assignmentResult.error) ? legacyScopes || [] : assignmentScopes;

    return {
      userId,
      email: authUser.email || "",
      label: membership.display_name || authUser.user_metadata?.display_name || authUser.email || "Owner",
      role: assignments.some((assignment) => assignment.role_code === "province_admin")
        ? "province_admin"
        : assignments.some((assignment) => assignment.role_code === "university_admin") ? "university_admin" : "owner",
      roles: assignments.length ? assignments : [{ role_code: "owner", province_id: null, university_id: null }],
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
  if (module === "admin_requests") return actor.roles?.some((role) => role.role_code === "province_admin") === true;
  const permissions = actor.permissions?.[module];
  if (Array.isArray(permissions)) return permissions.includes(action) || permissions.includes("manage");
  if (permissions && typeof permissions === "object") return permissions[action] === true || permissions.manage === true;
  return false;
}

export function resolveAdminCampusScope(scopes, campuses) {
  const granted = new Set();
  for (const scope of scopes || []) {
    if (scope.scope_type === "campus" || scope.scope_type === "university") {
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

  let activeScope = "all";
  try {
    const { cookies } = await import("next/headers");
    activeScope = cookies().get("kk_admin_active_scope")?.value || "all";
  } catch {
    activeScope = "all";
  }

  const settings = await getSettings();
  const allCampuses = getActiveCampuses(settings);

  if (actor.role === "superadmin" && (!activeScope || activeScope === "all")) {
    return null;
  }

  const permittedCampuses = actor.role === "superadmin"
    ? allCampuses.map((c) => c.shortName)
    : resolveAdminCampusScope(actor.scopes, allCampuses);

  if (activeScope && activeScope !== "all") {
    if (activeScope.startsWith("province:")) {
      const provinceId = activeScope.slice("province:".length).toLowerCase();
      const matched = allCampuses
        .filter((c) => getCampusProvinceId(c) === provinceId && (actor.role === "superadmin" || permittedCampuses.includes(c.shortName)))
        .map((c) => c.shortName);
      return matched.length ? matched : (actor.role === "superadmin" ? null : permittedCampuses);
    }

    if (activeScope.startsWith("campus:") || activeScope.startsWith("university:")) {
      const wanted = activeScope.split(":")[1].toLowerCase();
      const target = allCampuses.find(
        (c) => [c.id, c.shortName, c.name].some((v) => String(v || "").toLowerCase() === wanted)
      );
      if (target && (actor.role === "superadmin" || permittedCampuses.includes(target.shortName))) {
        return [target.shortName];
      }
    }
  }

  return actor.role === "superadmin" ? null : permittedCampuses;
}

export async function isActiveAdminSession() {
  return !!(await getAdminActor());
}
