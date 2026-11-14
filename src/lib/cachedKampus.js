/**
 * Client-side cached campus loader (Layer 4: Data Layer & Client State)
 * Mencegah multiple roundtrips ke /api/kampus saat berpindah halaman atau saat
 * Navbar, Home, dan Marketplace mount secara bersamaan.
 */

let kampusPromise = null;
let lastKampusFetch = 0;
const KAMPUS_CLIENT_CACHE_TTL = 120_000; // 2 menit

export async function fetchCampusesCached() {
  const now = Date.now();
  if (kampusPromise && (now - lastKampusFetch < KAMPUS_CLIENT_CACHE_TTL)) {
    return kampusPromise;
  }
  lastKampusFetch = now;
  kampusPromise = fetch("/api/kampus")
    .then((res) => (res.ok ? res.json() : null))
    .catch((err) => {
      kampusPromise = null;
      throw err;
    });
  return kampusPromise;
}

