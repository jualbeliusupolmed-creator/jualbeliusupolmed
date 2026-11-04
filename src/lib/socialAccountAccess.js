const normalize = (value) => String(value || "").trim().toLowerCase();

function assignedUniversity(actor, universityId, universityCode) {
  const acceptedIds = new Set([normalize(universityId), normalize(universityCode)].filter(Boolean));
  return (actor?.scopes || []).some((scope) =>
    ["campus", "university"].includes(normalize(scope.scope_type)) &&
    acceptedIds.has(normalize(scope.scope_id))
  );
}

function assignedProvince(actor, provinceId) {
  const wanted = normalize(provinceId);
  return Boolean(wanted) && (actor?.scopes || []).some((scope) =>
    normalize(scope.scope_type) === "province" && normalize(scope.scope_id) === wanted
  );
}

export function canManageSocialScope(actor, scope) {
  if (!actor || !scope) return false;
  if (actor.role === "superadmin") return true;

  if (scope.scope_type === "province") {
    return assignedProvince(actor, scope.province_id);
  }

  if (scope.scope_type === "university") {
    return assignedProvince(actor, scope.university_province_id) ||
      assignedUniversity(actor, scope.university_id, scope.university_code);
  }

  return false;
}

export function canManageSocialAccount(actor, account) {
  if (!actor || !account) return false;
  if (actor.role === "superadmin") return true;

  if (account.scope_type === "province") {
    return assignedProvince(actor, account.province_id);
  }

  if (account.scope_type === "university") {
    return assignedProvince(actor, account.universities?.province_id || account.university_province_id) ||
      assignedUniversity(actor, account.university_id, account.universities?.code || account.university_code);
  }

  return false;
}

export async function getSocialScope(supa, { provinceId, universityId } = {}) {
  if (Boolean(provinceId) === Boolean(universityId)) return null;

  if (provinceId) {
    const { data, error } = await supa.from("provinces")
      .select("id")
      .eq("id", normalize(provinceId))
      .maybeSingle();
    if (error || !data) return null;
    return { scope_type: "province", province_id: data.id };
  }

  const { data, error } = await supa.from("universities")
    .select("id,code,province_id")
    .eq("id", normalize(universityId))
    .maybeSingle();
  if (error || !data) return null;
  return {
    scope_type: "university",
    university_id: data.id,
    university_code: data.code,
    university_province_id: data.province_id,
  };
}

export async function getSocialAccount(supa, id) {
  if (!id) return { account: null, error: null };
  const { data, error } = await supa.from("organization_social_accounts")
    .select("id,provider,province_id,university_id,scope_type,scope_id,handle,external_account_id,status,last_checked_at,last_error_code,universities(id,code,province_id)")
    .eq("id", id)
    .maybeSingle();
  return { account: data || null, error };
}
