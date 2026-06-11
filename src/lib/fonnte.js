// Integrasi Fonnte (WhatsApp gateway). Semua fungsi aman-gagal:
// jika token belum di-set / request error, hanya log, tidak melempar.

import { buildSlug } from "@/lib/slug";

const FONNTE_URL = "https://api.fonnte.com/send";

async function send(target, message) {
  const token = process.env.FONNTE_TOKEN;
  if (!token || !target) {
    console.warn("[fonnte] token/target kosong — skip kirim WA");
    return { ok: false, skipped: true };
  }
  try {
    const body = new URLSearchParams({ target: String(target), message });
    const res = await fetch(FONNTE_URL, {
      method: "POST",
      headers: { Authorization: token },
      body,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    console.error("[fonnte] gagal kirim:", err?.message);
    return { ok: false, error: err?.message };
  }
}

const baseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || "";

function rupiah(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// Notif ke admin saat ada listing baru tayang
export async function notifyAdminNewListing(listing) {
  const admin = process.env.MARKETPLACE_WA;
  const msg =
    `🆕 *Listing baru tayang!*\n\n` +
    `📦 ${listing.title}\n` +
    `💰 ${rupiah(listing.price)} | stok ${listing.stock}\n` +
    `🏷️ ${listing.category} (${listing.type})\n` +
    `👤 ${listing.seller_name} — ${listing.seller_wa}\n` +
    `🔗 ${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;
  return send(admin, msg);
}

// Auto-post ke grup WA setelah bayar
export async function postToGroup(listing) {
  const group = process.env.FONNTE_WA_GROUP_ID;
  const msg =
    `🛒 *${listing.title}*\n` +
    `💰 ${rupiah(listing.price)}\n` +
    `📦 Stok: ${listing.stock}\n` +
    `🏷️ ${listing.category}\n\n` +
    `${listing.description || ""}\n\n` +
    `👤 Penjual: ${listing.seller_name}\n` +
    `📲 Minat? buka: ${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}\n` +
    `— Jual Beli USU Polmed`;
  return send(group, msg);
}

// Matching Engine: Notif ke pembeli yang mencari barang serupa
import { getAdminClient } from "@/lib/supabaseAdmin";
export async function notifyWantedBuyers(listing) {
  try {
    const supa = getAdminClient();
    const { data: wantedList } = await supa
      .from("wanted_listings")
      .select("buyer_wa, title")
      .eq("status", "active")
      .eq("category", listing.category);
      
    if (!wantedList || wantedList.length === 0) return;

    for (const w of wantedList) {
      // Basic matching: if listing title contains some keywords from wanted title (optional)
      // For now we match based on category
      const msg = 
        `👋 Halo! Barang yang mungkin Anda cari di kategori *${listing.category}* baru saja diposting!\n\n` +
        `📦 *${listing.title}*\n💰 ${rupiah(listing.price)}\n\n` +
        `Cek selengkapnya di sini:\n${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}\n\n` +
        `— Sistem Jual Beli USU Polmed`;
      await send(w.buyer_wa, msg);
    }
  } catch (err) {
    console.error("[MatchingEngine] failed:", err?.message);
  }
}

// Notif ke penjual saat ada yang minat (Dinonaktifkan)
export async function notifySellerInterest(listing, buyerWa) {
  return { ok: true, skipped: true };
}

// Notif ke admin saat ada laporan iklan masuk (Dinonaktifkan)
export async function notifyAdminReport(listing, report) {
  return { ok: true, skipped: true };
}

// Reminder perpanjang sebelum expired (Dinonaktifkan)
export async function notifySellerExpiring(listing) {
  return { ok: true, skipped: true };
}

// Notifikasi bahwa iklan telah kedaluwarsa (Dinonaktifkan)
export async function notifySellerExpired(listing) {
  return { ok: true, skipped: true };
}

export { send as sendWa };
