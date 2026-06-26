// Logika fee bagi hasil distributor

export const DEFAULT_FEE_RULES = [
  {
    id: "entry",
    label: "Laptop Entry/Bekas (Rp 2–5 Juta)",
    minPrice: 2_000_000,
    maxPrice: 5_000_000,
    type: "flat",
    amount: 125_000,
  },
  {
    id: "mid",
    label: "Laptop Mid-Tier (Rp 6–10 Juta)",
    minPrice: 6_000_000,
    maxPrice: 10_000_000,
    type: "pct",
    amount: 6.5,
  },
  {
    id: "premium",
    label: "Laptop Premium/Gaming (>Rp 12 Juta)",
    minPrice: 12_000_000,
    maxPrice: null,
    type: "pct",
    amount: 5,
  },
];

// Ambil fee rules dari settings DB, fallback ke default
export async function getDistributorSettings(supa) {
  try {
    const { data } = await supa
      .from("settings")
      .select("value")
      .eq("key", "distributor")
      .maybeSingle();
    return {
      rules: data?.value?.rules ?? DEFAULT_FEE_RULES,
      autoAddPrice: data?.value?.autoAddPrice !== false,
      digestEnabled: data?.value?.digestEnabled !== false,
    };
  } catch {
    return { rules: DEFAULT_FEE_RULES, autoAddPrice: true, digestEnabled: true };
  }
}

// Hitung fee bagi hasil berdasarkan harga dan rules
export function calcDistributorFee(price, rules = DEFAULT_FEE_RULES) {
  const p = Number(price) || 0;
  for (const rule of rules) {
    const min = rule.minPrice ?? 0;
    const max = rule.maxPrice ?? Infinity;
    if (p >= min && p <= max) {
      if (rule.type === "flat") return Math.round(rule.amount);
      if (rule.type === "pct") return Math.round(p * rule.amount / 100);
    }
  }
  return 0;
}

// Harga efektif = harga + fee (jika autoAddPrice aktif)
export function effectivePrice(price, fee, autoAddPrice) {
  if (!autoAddPrice) return Number(price) || 0;
  return (Number(price) || 0) + (Number(fee) || 0);
}

// Cek apakah penjual adalah distributor
export async function isDistributor(supa, seller_wa) {
  const { data } = await supa
    .from("seller_profiles")
    .select("distributor")
    .eq("wa", seller_wa)
    .maybeSingle();
  return !!data?.distributor;
}

// Ambil kategori distributor
export async function getDistributorCategories(supa, seller_wa) {
  const { data } = await supa
    .from("distributor_categories")
    .select("category")
    .eq("seller_wa", seller_wa);
  return (data || []).map((r) => r.category);
}
