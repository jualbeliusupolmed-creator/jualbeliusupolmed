import { findSellerProfileBySession } from "@/lib/seller-profile-identity";
import { getActiveCampuses, getCampusProvinceId, getSettings } from "@/lib/settings";

const FILTER_VALUE = /^[a-zA-Z0-9_-]+$/;

export async function loadMarketplaceRegion(supa, sessionIdentity) {
  if (!sessionIdentity) return { profile: null, province: null, university: null };

  const { data: profile, error: profileError } = await findSellerProfileBySession(
    supa,
    sessionIdentity,
    "wa, user_id, home_university_id, verified_university_id, affiliation_status, student_verified, campus, student_campus"
  );
  if (profileError) throw new Error("Acuan kampus akun belum dapat diperiksa.");

  return loadProfileMarketplaceRegion(supa, profile);
}

export async function loadSellerMarketplaceRegion(supa, sellerIdentity) {
  if (!sellerIdentity) return { profile: null, province: null, university: null };
  const { data: profile, error } = await findSellerProfileBySession(
    supa,
    sellerIdentity,
    "wa, phone_wa, user_id, home_university_id, verified_university_id, affiliation_status, student_verified, campus, student_campus"
  );
  if (error) throw new Error("Acuan kampus penjual belum dapat diperiksa.");
  return loadProfileMarketplaceRegion(supa, profile);
}

export async function loadListingSellerProvince(supa, listing) {
  if (listing?.seller_province_id) return listing.seller_province_id;
  if (listing?.seller_profiles) {
    const region = await loadProfileMarketplaceRegion(supa, listing.seller_profiles);
    if (region.province) return region.province;
  }
  if (!listing?.seller_wa) return null;
  const region = await loadSellerMarketplaceRegion(supa, listing.seller_wa);
  return region.province;
}

export async function loadProfileMarketplaceRegion(supa, profile) {
  let universityId = (profile?.affiliation_status === "verified_student" || profile?.student_verified) && profile?.verified_university_id
    ? profile.verified_university_id
    : profile?.home_university_id;
  const legacyCampusValue = profile?.campus || profile?.student_campus;
  if (!universityId && legacyCampusValue) {
    const settings = await getSettings();
    const legacyCampus = getActiveCampuses(settings).find((item) =>
      item.shortName.toLowerCase() === String(legacyCampusValue).trim().toLowerCase() ||
      String(item.id || "").trim().toLowerCase() === String(legacyCampusValue).trim().toLowerCase()
    );
    universityId = legacyCampus?.id || null;
  }
  if (!universityId) return { profile, province: null, university: null };

  const university = await loadUniversityProvince(supa, universityId);
  if (!university || !university.province_id) return { profile, province: null, university: null };

  return { profile, province: university.province_id, university };
}

export async function loadUniversityProvince(supa, universityId) {
  if (!universityId) return null;
  const { data, error } = await supa
    .from("universities")
    .select("id, code, name, province_id, status")
    .eq("id", universityId)
    .maybeSingle();
  if (error) throw new Error("Provinsi kampus akun belum dapat diperiksa.");
  return data || null;
}

export async function loadProvinceMarketplaceScope(supa, provinceId) {
  if (!provinceId) return { provinceId: null, universityIds: [], campusCodes: [] };

  const [{ data: universities, error }, settings] = await Promise.all([
    supa.from("universities")
      .select("id, code")
      .eq("province_id", provinceId)
      .eq("status", "active")
      .limit(1000),
    getSettings(),
  ]);
  if (error) throw new Error("Daftar kampus untuk provinsi akun belum dapat dimuat.");

  const universityIds = [...new Set((universities || []).map((item) => item.id).filter(Boolean))];
  const campusCodes = new Set((universities || []).map((item) => item.code));
  for (const campus of getActiveCampuses(settings)) {
    if (getCampusProvinceId(campus) === provinceId) campusCodes.add(campus.shortName);
  }

  return {
    provinceId,
    universities: (universities || []).map(({ id, code }) => ({ id, code })),
    universityIds,
    campusCodes: [...campusCodes].filter((value) => FILTER_VALUE.test(String(value || ""))),
  };
}

export async function loadSessionMarketplaceScope(supa, sessionIdentity) {
  if (!sessionIdentity) return { authenticated: false, profile: null, region: null, scope: null };
  const region = await loadMarketplaceRegion(supa, sessionIdentity);
  if (!region.province) return { authenticated: true, profile: region.profile, region, scope: null };
  const scope = await loadProvinceMarketplaceScope(supa, region.province);
  return { authenticated: true, profile: region.profile, region, scope };
}

export function isCampusInMarketplaceScope(campus, scope) {
  const value = String(campus || "").trim().toLowerCase();
  if (!value || value === "semua" || value === "all") return false;
  const keys = new Set([
    ...(scope?.campusCodes || []),
    ...(scope?.universityIds || []),
  ].map((key) => String(key || "").trim().toLowerCase()));
  return keys.has(value);
}

export function applyMarketplaceProvinceScope(query, scope) {
  if (scope?.provinceId) return query.eq("seller_province_id", scope.provinceId);
  return null;
}
