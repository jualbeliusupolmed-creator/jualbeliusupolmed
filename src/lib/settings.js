// Konfigurasi situs yang bisa diubah dari admin (DB-backed).
// Semua pembacaan fail-safe: jika tabel/DB belum ada, pakai DEFAULT_SETTINGS.
import { getAdminClient } from "@/lib/supabaseAdmin";

export const DEFAULT_SETTINGS = {
  pricing: {
    adBarang: 2000,
    adPoster: 10000,
    bump: 1000,
    featuredPerDay: 5000,
    featuredMaxPerDay: 10000,
    listingDays: 14,
    renewalFee: 2000,
    // tier fee setelah barang terjual; dievaluasi berurutan, `upto` = batas atas (eksklusif)
    soldTiers: [
      { upto: 50000, flat: 0 },
      { upto: 100000, pct: 10 },
      { upto: null, pct: 5 },
    ],
  },
  contact: {
    marketplaceWa: process.env.NEXT_PUBLIC_MARKETPLACE_WA || "62895429126232",
    waGroupLink:
      process.env.NEXT_PUBLIC_WA_GROUP_LINK || "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
    supportEmail: "admin@jualbelimedan.web.id",
    supportPhone: "+62 895-4291-26232",
    supportAddress: "Jl. Dr. T. Mansur No. 9, Medan 20155",
  },
  site: {
    heroTitle: "Marketplace Kota Medan",
    heroSubtitle:
      "Jual-beli laptop, HP, buku, fashion, makanan, kos, hingga jasa. Aman, cepat, dibantu admin.",
    footerTagline:
      "Marketplace Kota Medan. Jual-beli aman, dibantu admin.",
    logoUrl: "",
    faviconUrl: "",
    metaTitle: "Jual Beli Medan — Marketplace Kota Medan",
    metaDescription:
      "Marketplace jual-beli untuk warga Medan: laptop bekas, HP, buku, fashion, makanan, kos, dan jasa. Transaksi aman & COD di area yang disepakati, dibantu admin.",
    metaKeywords:
      "jual beli Medan, Marketplace Kota Medan, laptop bekas Medan, barang bekas warga, kos di Medan, COD Medan, preloved warga Medan",
  },
  ai_config: {
    model: "gemini-2.5-flash",
    memory: "Pasar target adalah mahasiswa USU dan Polmed di Kota Medan. Pembayaran bisa pakai QRIS atau bayar tunai (COD). Kategori yang tersedia: Elektronik, Fashion, Kendaraan, Properti, Buku, Makanan, Jasa, Lainnya.",
    personality: "Kamu adalah asisten marketplace yang profesional tapi santai. Gunakan bahasa Indonesia sehari-hari, sopan, sedikit gaul (seperti pakai kata 'Kak' atau 'Agan'). Selalu berikan semangat untuk cepat berjualan.",
  },
  bot: {
    paused_users: [],
  },
};

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Baca semua settings dari DB, merge dengan default (shallow per-key).
export async function getSettings() {
  try {
    const supa = getAdminClient();
    const { data } = await supa.from("settings").select("key, value");
    const merged = clone(DEFAULT_SETTINGS);
    for (const row of data || []) {
      if (merged[row.key] && typeof merged[row.key] === "object") {
        merged[row.key] = { ...merged[row.key], ...row.value };
      } else {
        merged[row.key] = row.value;
      }
    }
    return merged;
  } catch {
    return clone(DEFAULT_SETTINGS);
  }
}

// ── Helper perhitungan biaya (server-side, sumber kebenaran) ─────────────────
export function adFeeFrom(pricing, type, price = 0) {
  if (type === "poster") return pricing.adPoster || 10000;
  const p = Number(price) || 0;
  if (p < 50000) return 2000;
  if (p < 100000) return 3000;
  if (p < 500000) return 5000;
  if (p < 1000000) return 7000;
  return Math.round(p * 0.01);
}

// Mengecek apakah penjual memiliki tagihan komisi penjualan (sold_fee) yang belum lunas
export async function hasUnpaidSoldFees(supa, sellerWa) {
  const { data: listings } = await supa
    .from("listings")
    .select("id")
    .eq("seller_wa", sellerWa);
  
  if (!listings || listings.length === 0) return false;
  
  const listingIds = listings.map((l) => l.id);
  
  const { count } = await supa
    .from("payments")
    .select("id", { count: "exact", head: true })
    .in("listing_id", listingIds)
    .eq("type", "sold_fee")
    .eq("status", "pending");
    
  return (count || 0) > 0;
}

// Returns listing expiry date based on configurable duration from settings
export function listingExpiresAt(pricing) {
  const days = Math.max(1, Number(pricing?.listingDays) || 14);
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

export function soldFeeFrom(pricing, price) {
  const p = Number(price) || 0;
  for (const t of pricing.soldTiers || []) {
    if (t.upto == null || p < t.upto) {
      return t.flat != null ? t.flat : Math.round((p * t.pct) / 100);
    }
  }
  return 0;
}

export function featuredRateFrom(pricing, perDayReq) {
  const min = pricing.featuredPerDay;
  const max = pricing.featuredMaxPerDay || min;
  if (perDayReq == null) return min;
  return Math.min(max, Math.max(min, Number(perDayReq) || min));
}
