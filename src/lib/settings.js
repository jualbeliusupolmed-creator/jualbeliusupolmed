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
    listingDays: 14, // ADDED: configurable ad duration in days (was hardcoded)
    // tier fee setelah barang terjual; dievaluasi berurutan, `upto` = batas atas (eksklusif)
    soldTiers: [
      { upto: 50000, flat: 2000 },
      { upto: 100000, pct: 10 },
      { upto: null, pct: 5 },
    ],
  },
  contact: {
    marketplaceWa: process.env.NEXT_PUBLIC_MARKETPLACE_WA || "62895429126232",
    waGroupLink:
      process.env.NEXT_PUBLIC_WA_GROUP_LINK || "https://chat.whatsapp.com/DQMZK2qSgq2D0WvH7BlBSA",
    supportEmail: "admin@jualbeliusupolmed.web.id",
    supportPhone: "+62 895-4291-26232",
    supportAddress: "Jl. Dr. T. Mansur No. 9, Medan 20155",
  },
  site: {
    heroTitle: "Marketplace Mahasiswa USU & POLMED",
    heroSubtitle:
      "Jual-beli laptop, HP, buku, fashion, makanan, kos, hingga jasa. Aman, cepat, dibantu admin.",
    footerTagline:
      "Marketplace mahasiswa USU & POLMED. Jual-beli aman, dibantu admin.",
    logoUrl: "",
    faviconUrl: "",
    metaTitle: "Jual Beli USU Polmed — Marketplace Mahasiswa Medan",
    metaDescription:
      "Marketplace jual-beli khusus mahasiswa USU & POLMED Medan: laptop bekas, HP, buku kuliah, fashion, makanan, kos, dan jasa. Transaksi aman & COD di kampus, dibantu admin.",
    metaKeywords:
      "jual beli USU, marketplace mahasiswa Medan, laptop bekas USU, barang bekas mahasiswa POLMED, kos dekat USU, COD kampus USU, preloved mahasiswa Medan",
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
export function adFeeFrom(pricing, type) {
  return type === "poster" ? pricing.adPoster : pricing.adBarang;
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
