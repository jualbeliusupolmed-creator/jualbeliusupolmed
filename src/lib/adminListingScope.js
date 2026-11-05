const SAFE_FILTER_VALUE = /^[a-zA-Z0-9_-]+$/;

function safeValues(values) {
  return [...new Set((values || [])
    .map((value) => String(value || "").trim())
    .filter((value) => SAFE_FILTER_VALUE.test(value)))];
}

export function buildListingScopeValues(campusNames, catalog = []) {
  if (campusNames === null) return null;
  const names = safeValues(campusNames);
  const nameSet = new Set(names.map((name) => name.toLowerCase()));
  const matched = (catalog || []).filter((campus) => nameSet.has(String(campus.shortName || "").toLowerCase()));
  const universityIds = safeValues(matched.flatMap((campus) => [campus.id, campus.shortName, String(campus.shortName || "").toLowerCase()]));
  return { campusNames: names, universityIds };
}

export function applyListingScope(query, scope) {
  if (scope === null) return query;
  if (!scope?.campusNames?.length && !scope?.universityIds?.length) return query.eq("id", "00000000-0000-0000-0000-000000000000");
  const clauses = [];
  if (scope.campusNames?.length) clauses.push(`campus.in.(${scope.campusNames.join(",")})`);
  if (scope.universityIds?.length) clauses.push(`university_id.in.(${scope.universityIds.join(",")})`);
  return query.or(clauses.join(","));
}
