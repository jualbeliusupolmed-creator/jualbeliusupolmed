/**
 * WhatsApp notification helper via Fonnte API.
 * Setup: Add FONNTE_TOKEN to your environment variables.
 * Get token at: https://fonnte.com/
 *
 * Usage:
 *   import { sendWaNotification } from "@/lib/waNotif";
 *   await sendWaNotification({ to: "628xxx", message: "Hello!" });
 */

const FONNTE_URL = "https://api.fonnte.com/send";

/**
 * Send a WhatsApp message via Fonnte API.
 * @param {Object} opts
 * @param {string} opts.to   - Phone number in 628xxx format (without +)
 * @param {string} opts.message - Message text (supports line breaks \n)
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
export async function sendWaNotification({ to, message }) {
  const token = process.env.FONNTE_TOKEN;
  if (!token) {
    // If Fonnte is not configured, log a warning and silently skip
    console.warn(
      "[waNotif] FONNTE_TOKEN not set. WhatsApp notification skipped. " +
        "Set FONNTE_TOKEN in your env to enable WA notifications."
    );
    return { ok: false, error: "FONNTE_TOKEN not configured" };
  }

  if (!to || !message) {
    return { ok: false, error: "Missing required parameters: to, message" };
  }

  // Normalize phone number (remove leading + or 0)
  const normalizedTo = to.startsWith("+") ? to.slice(1) : to;

  try {
    const res = await fetch(FONNTE_URL, {
      method: "POST",
      headers: {
        Authorization: token,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        target: normalizedTo,
        message,
        countryCode: "62", // Indonesia
      }).toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.status === false) {
      console.error("[waNotif] Fonnte API error:", data);
      return { ok: false, error: data.reason || "Fonnte API failed" };
    }

    return { ok: true };
  } catch (err) {
    console.error("[waNotif] Network error:", err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Notify seller that their listing is now active.
 * Called by admin after activating a listing.
 */
export async function notifyListingActivated({ sellerWa, sellerName, listingTitle, listingUrl }) {
  const message =
    `✅ *Iklan Kamu Sudah Aktif!*\n\n` +
    `Halo ${sellerName || "Kak"}! 🎉\n\n` +
    `Iklan *"${listingTitle}"* kamu sudah aktif dan bisa dilihat oleh pembeli.\n\n` +
    `🔗 Lihat iklan:\n${listingUrl}\n\n` +
    `Tips: Bagikan link di atas ke grup WA atau media sosialmu untuk hasil maksimal!\n\n` +
    `_— Tim Jual Beli USU Polmed_`;

  return sendWaNotification({ to: sellerWa, message });
}

/**
 * Notify seller when their listing is about to expire (e.g., 2 days before).
 */
export async function notifyListingExpiringSoon({ sellerWa, sellerName, listingTitle, expiresAt, dashboardUrl }) {
  const daysLeft = Math.ceil((new Date(expiresAt) - Date.now()) / (1000 * 60 * 60 * 24));
  const message =
    `⏰ *Iklan Hampir Habis Masa Tayang*\n\n` +
    `Halo ${sellerName || "Kak"}!\n\n` +
    `Iklan *"${listingTitle}"* akan berakhir dalam *${daysLeft} hari*.\n\n` +
    `Perpanjang iklanmu sekarang agar tetap terlihat oleh pembeli:\n${dashboardUrl}\n\n` +
    `_— Tim Jual Beli USU Polmed_`;

  return sendWaNotification({ to: sellerWa, message });
}
