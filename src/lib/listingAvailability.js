export function isListingAvailable(listing) {
  if (!listing || listing.status !== "active") return false;
  if (listing.stock === null || listing.stock === undefined || listing.stock === "") {
    return true;
  }

  const stock = Number(listing.stock);
  return Number.isFinite(stock) && stock > 0;
}
