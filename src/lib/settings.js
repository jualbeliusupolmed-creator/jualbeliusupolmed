// Konfigurasi situs yang bisa diubah dari admin (DB-backed).
// Semua pembacaan fail-safe: jika tabel/DB belum ada, pakai DEFAULT_SETTINGS.
import { getAdminClient } from "@/lib/supabaseAdmin";
// Perhitungan biayanya tinggal di lib/fees.js — berkas murni tanpa impor, jadi
// komponen klien boleh memakainya tanpa menyeret kode server ke bundel peramban.
// Dulu rumus yang sama ditulis dua kali (di sini dan di sana) dengan angka yang
// tidak selalu sama; yang menagih cuma yang di sini, jadi layar dan tagihan bisa
// diam-diam berbeda. Sekarang satu definisi, dipakai dua-duanya.
import { TARIF_BAWAAN, angkaSetelan, adFeeFrom, soldFeeFrom, featuredRateFrom } from "@/lib/fees";
import { DEFAULT_INVITE_CODE } from "@/lib/organisasi";

export { angkaSetelan, adFeeFrom, soldFeeFrom, featuredRateFrom };

export const DEFAULT_SETTINGS = {
  pricing: {
    adBarang: 2000,
    adPoster: 10000,
    bump: 1000,
    featuredPerDay: 5000,
    featuredMaxPerDay: 10000,
    listingDays: 14,
    renewalFee: 2000,
    // Paket Penjual Pro. Dulu angkanya cuma hidup di dalam
    // api/payments/subscribe/route.js — sumber harga keempat, tidak terlihat
    // dari panel admin dan tidak terbaca halaman Daftar Harga.
    proMonthly: 49000,
    dicariFreeLimt: 3,
    // tier biaya iklan berdasarkan harga barang; dievaluasi berurutan, `upto` = batas atas (eksklusif)
    adTiers: TARIF_BAWAAN.adTiers,
    // Penjual yang sudah punya halaman toko (/toko/<slug>) memasang iklan
    // GRATIS. Keputusan pemilik, 21 Agustus 2026: toko adalah cara orang
    // berjualan serius di sini, dan menagih biaya tayang untuk tiap barang
    // membuat toko yang isinya banyak justru paling mahal.
    //
    // Sadari akibatnya sebelum mengubah: membuat toko itu gratis dan terbuka,
    // jadi selama ini bernilai true, praktis SEMUA iklan gratis. Yang tersisa
    // sebagai pemasukan adalah fee barang terjual, Featured, dan Sponsored.
    // Setel false di sini (atau lewat panel Pengaturan) untuk mengembalikan
    // biaya tayang seperti semula.
    tokoGratis: true,
    // tier fee setelah barang terjual; dievaluasi berurutan, `upto` = batas atas (eksklusif)
    soldTiers: TARIF_BAWAAN.soldTiers,
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
    // Kosong = hero beranda memakai judul rancangannya sendiri (tiga baris,
    // dua warna kampus). Diisi lewat panel admin kalau mau judul lain.
    heroTitle: "",
    heroSubtitle: "",
    footerTagline:
      "Marketplace mahasiswa USU & Polmed. Jual-beli aman, dibantu admin.",
    logoUrl: "",
    faviconUrl: "",
    metaTitle: "Jual Beli USU & Polmed — Marketplace Mahasiswa Medan",
    metaDescription:
      "Marketplace jual-beli mahasiswa USU dan Polmed: laptop bekas, HP, buku, fashion, makanan, kos, dan jasa. Transaksi aman & COD di sekitar kampus, dibantu admin.",
    metaKeywords:
      "jual beli USU, jual beli Polmed, marketplace mahasiswa Medan, laptop bekas USU, barang bekas mahasiswa Polmed, kos dekat USU, COD kampus",
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
  // Turunkan iklan yang tenggatnya lewat, otomatis lewat cron harian.
  //
  // Bawaannya MATI, dan itu bukan kehati-hatian berlebihan. Sampai 26 Agustus
  // 2026 tidak ada iklan yang pernah kedaluwarsa sama sekali — /api/cron/expire
  // mengirim reminder tapi tidak pernah menurunkan apa pun. Menyalakan ini
  // begitu kodenya mendarat berarti 20 iklan hilang dalam satu malam dari layar
  // penjual yang sudah dua bulan melihatnya tayang. Nyalakan setelah tunggakan
  // itu diberesi lewat tombol di panel, bukan sebelumnya.
  autoExpire: false,

  // Kode undangan organisasi. Panel admin sudah lama menulis kunci ini dan
  // membuatkan tautan undangan dari nilainya; sejak 26 Agustus 2026
  // /api/organisasi/daftar benar-benar membacanya.
  ukmInviteCode: DEFAULT_INVITE_CODE,

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
    greeting: "Halo! 👋\n\nPerintah bot diawali tanda titik ( *.* ), contoh: *.MENU*\n\n• *.JUAL* — Pasang iklan\n• *.CARI [nama barang]* — Cari barang\n• *.PERPANJANG* — Perpanjang iklan\n• *.UPGRADE* — Upgrade iklan\n• *.SAYA* — Profil & statistik saya\n• *.MENU* — Lihat semua perintah lengkap\n\nSetelah *.JUAL*, kirim *Foto + Deskripsi + Harga* untuk pasang iklan.\n\nMau ngobrol dengan admin (manusia)? Ketik *ADMIN* tanpa titik.\n\n🌐 Website: jualbeliusupolmed.web.id",
    triggers: "jual,wts,wtb,cari,beli,dicari,admin,min,mimin,perpanjang,upgrade,dijual,ready",
    min_price_digits: 4,
  },
  popupAd: {
    enabled: false,
    title: "Promo & Event Spesial",
    imageUrl: "",
    targetUrl: "",
    buttonText: "Lihat Sekarang",
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

