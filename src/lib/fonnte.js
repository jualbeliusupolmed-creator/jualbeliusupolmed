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

// Notif ke penjual saat ada yang minat
export async function notifySellerInterest(listing, buyerWa) {
  const msg =
    `🔔 *Ada yang minat barangmu!*\n\n` +
    `📦 ${listing.title}\n` +
    `💰 ${rupiah(listing.price)}\n` +
    `📲 Calon pembeli: ${buyerWa || "(via website)"}\n` +
    `Segera balas ya 🙏\n— Jual Beli USU Polmed`;
  return send(listing.seller_wa, msg);
}

// Notif ke admin saat ada laporan iklan masuk
export async function notifyAdminReport(listing, report) {
  const admin = process.env.MARKETPLACE_WA;
  const msg =
    `🚩 *Laporan iklan baru*\n\n` +
    `📦 ${listing?.title || "(listing)"}\n` +
    `👤 Penjual: ${listing?.seller_wa || "-"}\n` +
    `⚠️ Alasan: ${report?.reason || "-"}\n` +
    (report?.detail ? `📝 ${report.detail}\n` : "") +
    `🔗 ${baseUrl()}/produk/${buildSlug(listing?.title, listing?.id)}\n` +
    `Cek panel admin untuk menindak.`;
  return send(admin, msg);
}

// Reminder perpanjang sebelum expired
export async function notifySellerExpiring(listing) {
  const msg =
    `⏰ *Iklanmu akan berakhir*\n\n` +
    `📦 ${listing.title}\n` +
    `Perpanjang (bump Rp1.000) di: ${baseUrl()}/dashboard\n` +
    `— Jual Beli USU Polmed`;
  return send(listing.seller_wa, msg);
}

export { send as sendWa };
