const PROVINCE_ID = "sumatera-utara";

function belongsToSumut(record, universityIds) {
  return String(record?.province_id || record?.provinces?.id || "").toLowerCase() === PROVINCE_ID ||
    String(record?.universities?.province_id || "").toLowerCase() === PROVINCE_ID ||
    (record?.scope_type === "province" && String(record?.scope_id || "").toLowerCase() === PROVINCE_ID) ||
    (record?.scope_type === "university" && universityIds.has(String(record?.scope_id || "").toLowerCase()));
}

export function summarizeSumutAccounts(socialAccounts = [], whatsappAccounts = [], scopeIds = []) {
  const universityIds = new Set(scopeIds.map((id) => String(id || "").toLowerCase()));
  const instagram = socialAccounts.filter((account) =>
    belongsToSumut(account, universityIds) && account.provider === "instagram" && account.status !== "inactive"
  );
  const whatsapp = whatsappAccounts.filter((account) =>
    belongsToSumut(account, universityIds) && ["whatsapp_channel", "whatsapp_group"].includes(account.provider) && account.status !== "inactive"
  );
  return {
    instagramTotal: instagram.length,
    instagramConnected: instagram.filter((account) => account.status === "connected" && account.has_access_token).length,
    whatsappTotal: whatsapp.length,
    whatsappLive: whatsapp.filter((account) => Boolean(account.liveName)).length,
  };
}

export function countSumutOwners(owners = [], scopeIds = []) {
  const universityIds = new Set(scopeIds.map((id) => String(id || "").toLowerCase()));
  return owners.filter((owner) => owner.status === "active" && (owner.scopes || []).some((scope) =>
    (scope.scope_type === "province" && String(scope.scope_id || "").toLowerCase() === PROVINCE_ID) ||
    (["campus", "university"].includes(scope.scope_type) && universityIds.has(String(scope.scope_id || "").toLowerCase()))
  )).length;
}
