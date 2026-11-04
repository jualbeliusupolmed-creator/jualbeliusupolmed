const normalize = (value) => String(value || "").trim().toLowerCase();

function universityKeysForProvince(provinceId, campuses) {
  const province = normalize(provinceId);
  return new Set((campuses || [])
    .filter((campus) => normalize(campus.provinceId || campus.province_id) === province)
    .flatMap((campus) => [campus.id, campus.shortName])
    .map(normalize)
    .filter(Boolean));
}

/** True when an item belongs to the user's selected FYP scope. */
export function itemMatchesFypScope(item, {
  scope = "campus",
  campus = "",
  provinceId = "",
  universities = [],
  campuses = [],
} = {}) {
  if (!item) return false;
  if (scope === "all") return true;

  if (scope === "campus" && ["", "semua", "all"].includes(normalize(campus))) return true;

  const itemCampus = normalize(item.campus || item.product?.campus);
  const itemUniversity = normalize(item.university_id || item.product?.university_id);
  const profileUniversity = normalize(item.seller_profiles?.home_university_id);
  const keys = [itemCampus, itemUniversity, profileUniversity].filter(Boolean);

  // Explicitly national listings can appear in any regional feed. Missing
  // campus metadata is not considered national: it must not leak across scopes.
  if (itemCampus === "semua") return true;

  if (scope === "province") {
    const allowed = universityKeysForProvince(provinceId, campuses);
    return keys.some((key) => allowed.has(key));
  }

  if (scope === "custom") {
    const allowed = new Set((universities || []).map(normalize).filter(Boolean));
    return keys.some((key) => allowed.has(key));
  }

  const selected = normalize(campus);
  return Boolean(selected && keys.includes(selected));
}

export function sortFypItems(items, preferredIds = []) {
  const order = new Map((preferredIds || []).map((id, index) => [String(id), index]));
  return [...(items || [])].sort((a, b) => {
    const aOrder = order.has(String(a.id)) ? order.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
    const bOrder = order.has(String(b.id)) ? order.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}
