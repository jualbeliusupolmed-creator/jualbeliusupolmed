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
    dicariFreeLimt: 3,
    // tier biaya iklan berdasarkan harga barang; dievaluasi berurutan, `upto` = batas atas (eksklusif)
    adTiers: [
      { upto: 50000, flat: 2000 },
      { upto: 100000, flat: 3000 },
      { upto: 500000, flat: 5000 },
      { upto: 1000000, flat: 7000 },
      { upto: null, pct: 1 },
    ],
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
    model: "gemini-2.0-flash",
    memory: "Pasar target adalah mahasiswa USU dan Polmed di Kota Medan. Pembayaran bisa pakai QRIS atau bayar tunai (COD). Kategori yang tersedia: Elektronik, Fashion, Kendaraan, Properti, Buku, Makanan, Jasa, Lainnya.",
    personality: "Kamu adalah asisten marketplace yang profesional tapi santai. Gunakan bahasa Indonesia sehari-hari, sopan, sedikit gaul (seperti pakai kata 'Kak' atau 'Agan'). Selalu berikan semangat untuk cepat berjualan.",
  },
  admin: {
    adminWa: process.env.ADMIN_WA || process.env.SUPER_ADMIN_WA || "",
    groupJid: process.env.GROUP_JID || "",
    extraGroups: process.env.BAILEYS_BROADCAST_GROUPS || "",
    qrisUrl: process.env.QRIS_URL || "",
    fonnteFirst: false,
  },
  payment: {
    mode: "auto", // "auto" = QiosPay/callback aktif; "manual" = upload struk saja
  },
  bot: {
    paused_users: [],
    webhookUrl: "",
    contextExpiryMinutes: 30,
    contextMaxHistory: 5,
    otpExpiryMinutes: 10,
    otpMaxAttempts: 3,
  },
  messages: {
    reminderH3: "Halo Kak! Iklan *{{title}}* milik Anda akan berakhir dalam *3 hari lagi*. Segera perpanjang agar iklan tetap aktif! 🔄\n\n👉 Balas *PERPANJANG* untuk memperpanjang.",
    reminderH1: "⚠️ Halo Kak! Iklan *{{title}}* milik Anda akan berakhir *besok*! Segera perpanjang sekarang!\n\n👉 Balas *PERPANJANG*.",
    qrisInstruction: "Silakan scan QRIS di bawah ini untuk membayar. Setelah bayar, kirimkan foto struk ke bot ini ya! 📸",
    listingActive: "✅ Iklan *{{title}}* telah aktif dan bisa dilihat di marketplace! Semoga cepat laku ya Kak! 🎉\n\n🌐 {{url}}",
    notifNewListing: "📢 *Iklan Baru!*\n\n*{{title}}*\nHarga: {{price}}\nPenjual: {{seller}}\n\n{{url}}",
  },
  areas: [
    "Medan Baru",
    "Medan Selayang",
    "Medan Petisah",
    "Medan Polonia",
    "Medan Tuntungan",
    "Medan Johor",
    "Medan Amplas",
    "Medan Denai",
    "Medan Area",
    "Medan Kota",
    "Medan Maimun",
    "Medan Sunggal",
    "Medan Helvetia",
    "Medan Perjuangan",
    "Medan Tembung",
    "Binjai",
    "Deli Serdang",
    "Kampus USU",
    "Kampus Polmed",
    "Semua Area",
  ],
  bot_keywords: {
    enabled: true,
    greeting_enabled: false,
    greeting: "Halo! 👋\n\nKetik salah satu perintah berikut:\n• *JUAL* — Pasang iklan\n• *CARI [nama barang]* — Cari barang\n• *PERPANJANG* — Perpanjang iklan\n• *UPGRADE* — Upgrade iklan\n• *SAYA* — Profil & statistik saya\n• *MENU* — Lihat semua perintah lengkap\n• *ADMIN* — Hubungi admin\n\nAtau langsung kirim *Foto + Deskripsi + Harga* untuk pasang iklan!\n\n🌐 Website: jualbeliusupolmed.web.id",
    triggers: "jual,wts,wtb,cari,beli,dicari,admin,min,mimin,perpanjang,upgrade,dijual,ready",
    min_price_digits: 4,
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
      if (Array.isArray(row.value) || Array.isArray(merged[row.key])) {
        // Arrays (e.g. areas) are replaced entirely, not merged
        merged[row.key] = row.value;
      } else if (merged[row.key] && typeof merged[row.key] === "object") {
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
  const tiers = pricing.adTiers || DEFAULT_SETTINGS.pricing.adTiers;
  for (const t of tiers) {
    if (t.upto == null || p < t.upto) {
      return t.flat != null ? t.flat : Math.round((p * (t.pct || 0)) / 100);
    }
  }
  return 2000;
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
