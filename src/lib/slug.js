/**
 * slug.js — URL slug helpers for product listings
 *
 * Format:  /produk/{title-slug}-{8-char-id}
 * Example: /produk/laptop-asus-vivobook-15-3f2a8c1e
 *
 * The short ID at the end ensures uniqueness even if titles are identical.
 * We can always extract the full UUID from DB by matching the 8-char prefix.
 */

/**
 * Build a URL-safe slug from a listing title + id.
 * @param {string} title - Listing title
 * @param {string} id    - Full UUID
 * @returns {string}     e.g. "laptop-asus-vivobook-15-3f2a8c1e"
 */
export function buildSlug(title, id) {
  const titlePart = String(title || "produk")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/[^a-z0-9\s-]/g, "")   // remove special chars
    .trim()
    .replace(/\s+/g, "-")           // spaces → hyphens
    .replace(/-+/g, "-")            // collapse multiple hyphens
    .slice(0, 60);                  // max 60 chars for title part

  const shortId = String(id || "").slice(0, 8);
  return `${titlePart}-${shortId}`;
}

/**
 * Extract the UUID short prefix (8 chars) from a slug.
 * The short ID is always the last hyphen-separated segment.
 * @param {string} slug  e.g. "laptop-asus-3f2a8c1e"
 * @returns {string}     e.g. "3f2a8c1e"
 */
export function getShortIdFromSlug(slug) {
  if (!slug) return "";
  const parts = slug.split("-");
  return parts[parts.length - 1] || "";
}

/**
 * Check if a param looks like a full UUID (legacy links).
 * Format: 8-4-4-4-12 hex chars
 */
export function isUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
