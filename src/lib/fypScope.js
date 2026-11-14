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
  // Client preferences must never grant a national feed to a student account.
  if (scope === "all") return false;

  if (scope === "campus" && ["", "semua", "all"].includes(normalize(campus))) return false;

  const sellerProfile = item.seller_profiles || item.product?.seller_profiles || null;
  const verified = sellerProfile?.affiliation_status === "verified_student" || sellerProfile?.student_verified;
  const sellerUniversity = normalize(
    (verified && sellerProfile?.verified_university_id) ||
    sellerProfile?.home_university_id ||
    item.seller_university_id ||
    item.product?.seller_university_id
  );

  if (scope === "province") {
    const itemProvince = normalize(item.seller_province_id || item.product?.seller_province_id);
    if (itemProvince) return itemProvince === normalize(provinceId);
    // Listing lama tanpa provinsi tersimpan hanya boleh masuk berdasarkan
    // profil penjual. Metadata target listing tidak menentukan asal penjual.
    if (!sellerUniversity) return false;
    const allowed = universityKeysForProvince(provinceId, campuses);
    return allowed.has(sellerUniversity);
  }

  if (scope === "custom") {
    const allowed = new Set((universities || []).map(normalize).filter(Boolean));
    return sellerUniversity ? allowed.has(sellerUniversity) : false;
  }

  const selected = normalize(campus);
  const selectedCampus = (campuses || []).find((entry) =>
    normalize(entry.id) === selected || normalize(entry.shortName) === selected
  );
  const profileCampus = normalize(sellerProfile?.campus || sellerProfile?.student_campus);
  return Boolean(selected && (
    sellerUniversity === selected ||
    (selectedCampus && sellerUniversity === normalize(selectedCampus.id)) ||
    profileCampus === selected
  ));
}

export function sortFypItems(items, preferredIds = []) {
  const order = new Map((preferredIds || []).map((id, index) => [String(id), index]));
  return [...(items || [])].sort((a, b) => {
    const aOrder = order.has(String(a.id)) ? order.get(String(a.id)) : Number.MAX_SAFE_INTEGER;
    const bOrder = order.has(String(b.id)) ? order.get(String(b.id)) : Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}
