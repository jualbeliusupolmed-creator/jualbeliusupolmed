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

    const isSuperadminEmail = String(authUser.email || "").toLowerCase() === "jualbeliusupolmed@gmail.com";
    const hasSuperadminRole = assignments.some((assignment) => assignment.role_code === "superadmin");
    const isEnvSuperadmin = Boolean(SUPERADMIN_ID()) && userId === SUPERADMIN_ID();
    const isSuperadmin = isSuperadminEmail || hasSuperadminRole || isEnvSuperadmin;

    if (isSuperadmin) {
      return {
        userId,
        email: authUser.email || "",
        label: authUser.user_metadata?.display_name || authUser.email || "Superadmin",
        role: "superadmin",
        roles: [
          { role_code: "superadmin", province_id: null, university_id: null },
          ...assignments.filter((assignment) => assignment.role_code !== "superadmin"),
        ],
        permissions: { "*": ["read", "manage", "review"] },
        scopes: assignmentScopes.length ? assignmentScopes : [{ scope_type: "province", scope_id: "sumatera-utara" }],
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

export const PROVINCE_ADMIN_MODULES = [
  "overview",
  "marketplace",
  "users",
  "reports",
  "po",
  "finance",
  "analytics",
  "content",
  "whatsapp",
  "social",
  "distribution",
  "organization",
  "admin_requests",
];

export const UNIVERSITY_ADMIN_MODULES = [
  "overview",
  "marketplace",
  "users",
  "reports",
  "content",
  "social",
];

export function hasAdminPermission(actor, module, action = "read") {
  if (!actor) return false;
  if (actor.role === "superadmin") return true;
  if (actor.roles?.some((role) => role.role_code === "superadmin")) return true;

  // Standar Otoritas Admin Provinsi Nasional:
  // Semua admin provinsi otomatis memegang otoritas operasional, analitik, komunikasi & struktur wilayah untuk provinsinya
  if (actor.roles?.some((role) => role.role_code === "province_admin")) {
    if (PROVINCE_ADMIN_MODULES.includes(module)) return true;
  }

  // Standar Otoritas Admin Kampus / Universitas:
  if (actor.roles?.some((role) => role.role_code === "university_admin")) {
    if (UNIVERSITY_ADMIN_MODULES.includes(module)) return true;
  }

  if (module === "admin_requests") return actor.roles?.some((role) => role.role_code === "province_admin") === true;
  if (module === "organization") {
    return (
      actor.roles?.some((role) => role.role_code === "province_admin") === true ||
      Boolean(actor.permissions?.organization)
    );
  }
  if (module === "social") {
    return (
      actor.role === "superadmin" ||
      actor.roles?.some((role) => ["province_admin", "university_admin"].includes(role.role_code)) === true ||
      Boolean(actor.permissions?.social || actor.permissions?.content)
    );
  }
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

export async function getAdminScopeFilter(actor) {
  if (!actor) {
    return { isAll: true, scopeType: "all", provinceId: null, campusCodes: [], universityIds: [], label: "Semua Kampus" };
  }

  let activeScope = "all";
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    activeScope = cookieStore.get("kk_admin_active_scope")?.value || "all";
  } catch {
    activeScope = "all";
  }

  const isSuper = actor.role === "superadmin" || actor.roles?.some((r) => r.role_code === "superadmin");
  if (isSuper && (!activeScope || activeScope === "all")) {
    return { isAll: true, scopeType: "all", provinceId: null, campusCodes: [], universityIds: [], label: "Semua Kampus (Nasional)" };
  }

  // Ambil daftar provinsi & universitas langsung dari database relasional
  let provinces = [];
  let universities = [];
  try {
    const { getAdminClient } = await import("@/lib/supabaseAdmin");
    const admin = getAdminClient();
    const [provRes, uniRes] = await Promise.all([
      admin.from("provinces").select("id, name, status").eq("status", "active"),
      admin.from("universities").select("id, code, name, province_id, status").eq("status", "active"),
    ]);
    if (!provRes.error && provRes.data?.length) provinces = provRes.data;
    if (!uniRes.error && uniRes.data?.length) universities = uniRes.data;
  } catch {
    // fallback
  }

  if (!provinces.length || !universities.length) {
    const settings = await getSettings();
    const campuses = getActiveCampuses(settings);
    universities = campuses.map((c) => ({
      id: c.id || c.shortName.toLowerCase(),
      code: c.shortName,
      name: c.name,
      province_id: c.provinceId || "sumatera-utara",
    }));
    provinces = [{ id: "sumatera-utara", name: "Sumatera Utara" }];
  }

  if (activeScope && activeScope.startsWith("province:")) {
    const provinceId = activeScope.slice("province:".length).toLowerCase();
    const prov = provinces.find((p) => p.id.toLowerCase() === provinceId);
    const provinceUnis = universities.filter((u) => (u.province_id || "").toLowerCase() === provinceId);
    const campusCodes = provinceUnis.map((u) => u.code).filter(Boolean);
    const universityIds = provinceUnis.map((u) => u.id).filter(Boolean);
    return {
      isAll: false,
      scopeType: "province",
      provinceId,
      provinceName: prov?.name || provinceId.toUpperCase(),
      campusCodes,
      universityIds,
      label: `Provinsi ${prov?.name || provinceId.toUpperCase()}`,
    };
  }

  if (activeScope && (activeScope.startsWith("campus:") || activeScope.startsWith("university:"))) {
    const targetUni = activeScope.split(":")[1].toLowerCase();
    const uni = universities.find(
      (u) => (u.id || "").toLowerCase() === targetUni || (u.code || "").toLowerCase() === targetUni
    );
    return {
      isAll: false,
      scopeType: "campus",
      provinceId: uni?.province_id || null,
      campusCodes: uni?.code ? [uni.code] : [],
      universityIds: uni?.id ? [uni.id] : [targetUni],
      label: uni?.code || uni?.name || targetUni.toUpperCase(),
    };
  }

  // Jika bukan superadmin, hitung cakupan dari penugasan (actor.scopes)
  if (!isSuper) {
    const permittedCampusCodes = [];
    const permittedUniIds = [];
    let provinceId = null;

    for (const scope of actor.scopes || []) {
      if (scope.scope_type === "province") {
        provinceId = String(scope.scope_id || "").toLowerCase();
        const provinceUnis = universities.filter((u) => (u.province_id || "").toLowerCase() === provinceId);
        provinceUnis.forEach((u) => {
          if (u.code) permittedCampusCodes.push(u.code);
          if (u.id) permittedUniIds.push(u.id);
        });
      } else if (scope.scope_type === "campus" || scope.scope_type === "university") {
        const id = String(scope.scope_id || "").toLowerCase();
        const uni = universities.find((u) => (u.id || "").toLowerCase() === id || (u.code || "").toLowerCase() === id);
        if (uni?.code) permittedCampusCodes.push(uni.code);
        if (uni?.id) permittedUniIds.push(uni.id);
      }
    }

    return {
      isAll: false,
      scopeType: provinceId ? "province" : "campus",
      provinceId,
      campusCodes: [...new Set(permittedCampusCodes)],
      universityIds: [...new Set(permittedUniIds)],
      label: "Cakupan Ditugaskan",
    };
  }

  return { isAll: true, scopeType: "all", provinceId: null, campusCodes: [], universityIds: [], label: "Semua Kampus (Nasional)" };
}

export async function getAdminCampusScope(actor) {
  const filter = await getAdminScopeFilter(actor);
  if (filter.isAll) return null;
  if (filter.campusCodes.length > 0) return filter.campusCodes;
  return ["__NONE__"];
}

export async function isActiveAdminSession() {
  return !!(await getAdminActor());
}
