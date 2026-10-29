import { formatWa } from "@/lib/constants";
import { hashIdentitas } from "@/lib/identitasHash";

export async function findSellerProfileBySession(supa, sessionIdentity, columns) {
  const identifier = String(sessionIdentity || "").trim();
  if (!identifier) return { data: null, error: null };
  const phone = formatWa(identifier);
  const filter = phone
    ? `wa.eq.${phone},phone_wa.eq.${phone}`
    : `wa.eq.${identifier}`;
  const result = await supa.from("seller_profiles").select(columns).or(filter).maybeSingle();
  if (result.error || result.data || phone) return result;

  const { data: alias, error: aliasError } = await supa
    .from("seller_profile_aliases")
    .select("canonical_wa")
    .eq("alias_wa", identifier)
    .maybeSingle();
  if (aliasError || !alias) return { data: null, error: aliasError || null };
  return supa.from("seller_profiles").select(columns).eq("wa", alias.canonical_wa).maybeSingle();
}

export async function findSellerProfileByPhone(supa, phone, columns) {
  const normalized = formatWa(phone);
  if (!normalized) return { data: null, error: null };
  return supa
    .from("seller_profiles")
    .select(columns)
    .or(`wa.eq.${normalized},phone_wa.eq.${normalized}`)
    .maybeSingle();
}

export async function mergeSellerProfiles(supa, sourceWa, canonicalWa) {
  const { error } = await supa.rpc("merge_seller_profiles", {
    p_source_wa: sourceWa,
    p_canonical_wa: canonicalWa,
    p_source_teman_id: hashIdentitas(sourceWa),
    p_canonical_teman_id: hashIdentitas(canonicalWa),
  });
  if (error) {
    return {
      error,
      message: error.message || "Profil belum dapat digabungkan.",
    };
  }
  return { error: null, message: null };
}
