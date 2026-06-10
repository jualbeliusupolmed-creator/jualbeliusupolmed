// Struktur biaya — sumber kebenaran tunggal (dipakai UI & server).

export const FEES = {
  iklan_barang: 2000,
  iklan_poster: 10000,
  bump: 1000,
  featured_min: 5000,
  featured_max: 10000,
};

// Biaya iklan saat submit (sebelum deal / biaya iklan)
export function adFee(type) {
  return type === "poster" ? FEES.iklan_poster : FEES.iklan_barang;
}

// Fee admin setelah barang TERJUAL (after sold)
//   < 50.000  => Rp 2.000
//   < 100.000 => 10%
//   >= 100.000 => 5%
export function soldFee(price) {
  const p = Number(price) || 0;
  if (p < 50000) return 2000;
  if (p < 100000) return Math.round(p * 0.1);
  return Math.round(p * 0.05);
}

export function featuredFee(days = 1, perDay = FEES.featured_min) {
  return Math.max(1, Number(days)) * perDay;
}

export function rupiah(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}
