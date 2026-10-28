export const SETTLEABLE_PAYMENT_TYPES = Object.freeze([
  "iklan",
  "bump",
  "featured",
  "autobump",
  "subscribe",
  "sold_fee",
  "renewal",
  "sponsored",
]);

export const ADMIN_PAYMENT_STATUSES = Object.freeze(["pending", "paid", "failed", "expired"]);

export function canSettleAdminPaymentType(type) {
  return SETTLEABLE_PAYMENT_TYPES.includes(type);
}
