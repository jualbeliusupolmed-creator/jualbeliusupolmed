// Integrasi Fonnte (WhatsApp gateway). Semua fungsi aman-gagal:
// jika token belum di-set / request error, hanya log, tidak melempar.

import { buildSlug } from "@/lib/slug";

const FONNTE_URL = "https://api.fonnte.com/send";

async function send(target, message, fileUrl = null) {
  const baileysUrl = process.env.BAILEYS_API_URL;
  const baileysToken = process.env.BAILEYS_API_TOKEN || "jualbeliusu_rahasia";

  // Jika BAILEYS_API_URL diset di Vercel, kita tembak Baileys Railway
  if (baileysUrl) {
    // Bersihkan karakter aneh seperti BOM (\uFEFF) atau zero-width space
    const cleanUrl = baileysUrl.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    
    // Tambahkan "/send" di akhir URL
    const finalUrl = cleanUrl.endsWith('/send') ? cleanUrl : `${cleanUrl.replace(/\/$/, '')}/send`;

    const payload = {
      target: target,
      message: message,
      url: fileUrl || undefined
    };

    console.log(`[sendWa] Sending to: ${finalUrl} | Target: ${target}`);

    const res = await fetch(finalUrl, {
      method: "POST",
      headers: {
        "Authorization": baileysToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });
    
    const json = await res.json();
    console.log(`[sendWa] Response: ${res.status} | Body: ${JSON.stringify(json)}`);
    return { ok: res.ok, data: json };
  }

  // Fallback ke Fonnte (jika Baileys belum siap)
  const token = process.env.FONNTE_TOKEN;
  if (!token || !target) {
    console.warn("[fonnte] token/target kosong — skip kirim WA");
    return { ok: false, skipped: true };
  }
  try {
    const fd = new FormData();
    fd.append("target", target);
    fd.append("message", message);
    if (fileUrl) {
      fd.append("url", fileUrl);
    }

    const res = await fetch(FONNTE_URL, {
      method: "POST",
      headers: { Authorization: token },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data };
  } catch (err) {
    console.error("[fonnte] gagal kirim:", err?.message);
    return { ok: false, error: err?.message };
  }
}

const baseUrl = () =>
  (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbelimedan.web.id").trim();

function rupiah(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// ============================================================================
// FITUR YANG AKTIF:
// 1. sendWa (digunakan oleh OTP)
// 2. postToGroup (broadcast jualan baru)
// 3. postWantedToGroup (broadcast pencarian baru)
// ============================================================================

// Auto-post ke grup WA setelah bayar iklan jualan — ringkas agar tidak menyemak
export async function postToGroup(listing) {
  const group = process.env.FONNTE_WA_GROUP_ID;
  const msg =
    `🛒 *${listing.title}* — ${rupiah(listing.price)}\n` +
    `🏷️ ${listing.category}\n` +
    `👉 ${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;
  return send(group, msg);
}

// Auto-post ke grup WA ketika ada yang mencari barang (Papan Dicari) — ringkas
export async function postWantedToGroup(wanted) {
  const group = process.env.FONNTE_WA_GROUP_ID;
  const budgetStr = wanted.budget && wanted.budget > 0 ? `maks ${rupiah(wanted.budget)}` : "Budget nego";
  const msg =
    `🔍 *Dicari:* ${wanted.title} (${budgetStr})\n` +
    `Punya barangnya? 👉 ${baseUrl()}/dicari`;
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
