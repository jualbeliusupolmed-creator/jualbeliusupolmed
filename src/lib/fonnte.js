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

// ============================================================================
// FITUR YANG AKTIF:
// 1. sendWa (digunakan oleh OTP)
// 2. postToGroup (broadcast jualan baru)
// 3. postWantedToGroup (broadcast pencarian baru)
// ============================================================================

// Auto-post ke grup WA setelah bayar iklan jualan
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

// Auto-post ke grup WA ketika ada yang mencari barang (Papan Dicari)
export async function postWantedToGroup(wanted) {
  const group = process.env.FONNTE_WA_GROUP_ID;
  const msg =
    `🔍 *Ada yang mencari barang!*\n\n` +
    `*Dicari:* ${wanted.title}\n` +
    `*Kategori:* ${wanted.category}\n` +
    `*Anggaran:* Maks ${rupiah(wanted.max_budget)}\n\n` +
    `${wanted.description ? `*Detail:* ${wanted.description}\n\n` : ""}` +
    `Punya barangnya? Tawarkan langsung lewat website kita ya!\n` +
    `📲 Buka: ${baseUrl()}/dicari\n` +
    `— Papan Dicari USU Polmed`;
  return send(group, msg);
}

export { send as sendWa };

// ============================================================================
// FITUR YANG DINONAKTIFKAN (Untuk Hemat Kuota Fonnte)
// ============================================================================

export async function notifyAdminNewListing(listing) { return { ok: true, skipped: true }; }
export async function notifyWantedBuyers(listing) { return { ok: true, skipped: true }; }
export async function notifySellerInterest(listing, buyerWa) { return { ok: true, skipped: true }; }
export async function notifyAdminReport(listing, report) { return { ok: true, skipped: true }; }
export async function notifySellerExpiring(listing) { return { ok: true, skipped: true }; }
export async function notifySellerExpired(listing) { return { ok: true, skipped: true }; }
