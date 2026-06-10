// Wishlist/Favorit berbasis localStorage (tanpa login). Menyimpan snapshot
// ringkas tiap listing supaya halaman /favorit bisa render tanpa fetch.
const KEY = "favorites";

export function getFavorites() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function isFavorite(id) {
  return getFavorites().some((f) => f.id === id);
}

// Mengembalikan true jika sekarang jadi favorit, false jika dihapus.
export function toggleFavorite(listing) {
  const favs = getFavorites();
  const i = favs.findIndex((f) => f.id === listing.id);
  let nowFav;
  if (i >= 0) {
    favs.splice(i, 1);
    nowFav = false;
  } else {
    favs.unshift({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      image_url: listing.image_url || null,
      category: listing.category,
      seller_name: listing.seller_name,
      stock: listing.stock,
      status: listing.status,
    });
    nowFav = true;
  }
  localStorage.setItem(KEY, JSON.stringify(favs));
  window.dispatchEvent(new Event("favorites-changed"));
  return nowFav;
}
