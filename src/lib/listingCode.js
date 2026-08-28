export function buildListingCode(value) {
  const digits = String(value ?? "")
    .trim()
    .replace(/\D/g, "");
  return digits ? digits.slice(0, 12) : "";
}

export function normalizeListingCode(code) {
  return buildListingCode(code);
}

export function buildListingShortPath(code) {
  const normalized = normalizeListingCode(code);
  return normalized ? `/c/${normalized}` : "";
}

export function looksLikeListingCode(value) {
  const cleaned = buildListingCode(value);
  return /^\d{1,12}$/.test(cleaned);
}
