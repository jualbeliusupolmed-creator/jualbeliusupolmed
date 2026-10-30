const CART_KEY = "cart_items";
const LEGACY_FAVORITES_KEY = "favorites";

function readItems(key) {
  try {
    const items = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function getCartItems() {
  if (typeof window === "undefined") return [];
  try {
    const saved = localStorage.getItem(CART_KEY);
    if (saved !== null) return readItems(CART_KEY);

    const legacyItems = readItems(LEGACY_FAVORITES_KEY);
    if (legacyItems.length) {
      localStorage.setItem(CART_KEY, JSON.stringify(legacyItems));
    }
    return legacyItems;
  } catch {
    return [];
  }
}

export function isInCart(id) {
  return getCartItems().some((item) => item.id === id);
}

export function toggleCartItem(listing) {
  const items = getCartItems();
  const index = items.findIndex((item) => item.id === listing.id);
  const added = index < 0;

  if (added) {
    items.unshift({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      image_url: listing.image_url || null,
      category: listing.category,
      seller_name: listing.seller_name,
      stock: listing.stock,
      status: listing.status,
    });
  } else {
    items.splice(index, 1);
  }

  localStorage.setItem(CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart-changed"));
  return added;
}
