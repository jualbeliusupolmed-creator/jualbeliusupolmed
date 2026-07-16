// Integrasi Fonnte (WhatsApp gateway). Semua fungsi aman-gagal:
// jika token belum di-set / request error, hanya log, tidak melempar.

import { buildSlug } from "@/lib/slug";
import { formatWaForBaileys } from "@/lib/constants";

const FONNTE_URL = "https://api.fonnte.com/send";

async function send(target, message, fileUrl = null) {
  // Jangan kirim pesan kosong (teks kosong tanpa lampiran) — pernah muncul
  // gelembung kosong ke pelanggan.
  if (!fileUrl && (!message || !String(message).trim())) {
    console.warn("[sendWa] pesan kosong — dilewati");
    return { ok: false, skipped: true, reason: "empty" };
  }

  const baileysUrl = process.env.BAILEYS_API_URL;
  const baileysToken = (process.env.BAILEYS_API_TOKEN || "jualbeliusu_rahasia").replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

  // Jika BAILEYS_API_URL diset di Vercel, kita tembak Baileys Railway
  if (baileysUrl) {
    const cleanUrl = baileysUrl.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    const baseUrl = cleanUrl.replace(/\/(send|story)\/?$/, '').replace(/\/$/, '');

    // status@broadcast harus pakai /story \u2014 endpoint khusus WA Status
    if (target === "status@broadcast") {
      const storyUrl = `${baseUrl}/story`;
      const payload = { text: message, url: fileUrl || undefined };
      console.log(`[sendWa] Posting story to: ${storyUrl}`);
      const res = await fetch(storyUrl, {
        method: "POST",
        headers: { "Authorization": baileysToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      console.log(`[sendWa] Story response: ${res.status} | ${JSON.stringify(json)}`);
      return { ok: res.ok, data: json };
    }

    const finalUrl = `${baseUrl}/send`;
    const baileysTarget = target.includes('@') ? target : formatWaForBaileys(target);
    const payload = { target: baileysTarget, message: message, url: fileUrl || undefined };

    console.log(`[sendWa] Sending to: ${finalUrl} | Target: ${target}`);
    const res = await fetch(finalUrl, {
      method: "POST",
      headers: { "Authorization": baileysToken, "Content-Type": "application/json" },
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
export async function postToGroup(listing, adminSettings) {
  const group = adminSettings?.groupJid || process.env.FONNTE_WA_GROUP_ID;
  const isRental = listing.type === "sewa";
  const priceStr = isRental && listing.rental_period
    ? `${rupiah(listing.price)}/${listing.rental_period}`
    : rupiah(listing.price);
  const msg =
    `${isRental ? "🔑 *[SEWA]*" : "🛒"} *${listing.title}* — ${priceStr}\n` +
    `🏷️ ${listing.category}\n` +
    `👉 ${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;

  // Kirim ke grup utama
  const main = group ? send(group, msg, listing.image_url || null) : Promise.resolve();

  // Kirim ke grup-grup tambahan (dari settings DB atau env)
  const extraStr = adminSettings?.extraGroups || process.env.BAILEYS_BROADCAST_GROUPS || "";
  const extraGroups = extraStr.split(",").map((g) => g.trim()).filter(Boolean);

  const extras = extraGroups.map((jid) =>
    send(jid, msg, listing.image_url || null).catch(() => {})
  );

  // Kirim WA Story (status@broadcast) — hanya via Baileys karena Fonnte tidak support
  const story = process.env.BAILEYS_API_URL
    ? send("status@broadcast", msg, listing.image_url || null).catch(() => {})
    : Promise.resolve();

  await Promise.all([main, ...extras, story]);
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

// Notifikasi ke pembeli di wanted_listings bahwa ada iklan baru yang cocok
export async function notifyWantedMatch(buyer_wa, buyer_name, listing) {
  const url = `${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;
  const msg =
    `🎉 *Hei ${buyer_name}!*\n\n` +
    `Ada iklan baru yang mungkin cocok dengan yang kamu cari:\n\n` +
    `📦 *${listing.title}*\n` +
    `💰 ${rupiah(listing.price)}\n` +
    `🏷️ ${listing.category}\n\n` +
    `👉 Lihat sekarang: ${url}`;
  return send(buyer_wa, msg).catch(() => ({ ok: false }));
}

// Notifikasi ke penjual bahwa langganan PRO-nya aktif
export async function notifySellerProActivated(seller_wa, seller_name, expiresAt) {
  const expStr = new Date(expiresAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  const msg =
    `🌟 *Selamat! Paket Pro Aktif!*\n\n` +
    `Hei ${seller_name || "Penjual"},\n` +
    `Langganan *Penjual Pro* kamu sudah aktif hingga *${expStr}*.\n\n` +
    `Keuntungan Pro:\n` +
    `✅ Iklan standar GRATIS (0 Rp)\n` +
    `✅ Pasang iklan tanpa batas\n` +
    `✅ Badge ⭐ PRO di profil & kartu iklan\n\n` +
    `Selamat berjualan! 🚀`;
  return send(seller_wa, msg).catch(() => ({ ok: false }));
}

// Notifikasi ke penjual: ada tawaran harga baru
export async function notifySellerNewOffer(seller_wa, seller_name, listingWithOffer) {
  const { title, offer } = listingWithOffer;
  const url = `${baseUrl()}/dashboard`;
  const waLink = offer.buyer_wa.startsWith("0") ? "62" + offer.buyer_wa.slice(1) : offer.buyer_wa;
  const shortId = offer.id.split('-')[0]; // Ambil 8 karakter pertama UUID

  const msg =
    `💰 *Tawaran Harga Baru!*\n\n` +
    `Hei ${seller_name || "Penjual"},\n` +
    `*${offer.buyer_name}* menawar *${rupiah(offer.offer_price)}* untuk iklanmu:\n\n` +
    `📦 _${title}_\n` +
    (offer.message ? `💬 "${offer.message}"\n\n` : "\n") +
    `📞 Hubungi pembeli: wa.me/${waLink}\n\n` +
    `*CARA MENJAWAB:*\n` +
    `Balas pesan ini dengan perintah:\n` +
    `✅ *TERIMA ${shortId}*\n` +
    `❌ *TOLAK ${shortId}*`;
  return send(seller_wa, msg).catch(() => ({ ok: false }));
}

// Notifikasi ke pembeli: hasil tawaran (diterima/ditolak)
export async function notifyBuyerOfferResult(buyer_wa, buyer_name, { listing_title, offer_price, seller_wa, accepted }) {
  const sellerLink = seller_wa
    ? `wa.me/${seller_wa.startsWith("0") ? "62" + seller_wa.slice(1) : seller_wa}`
    : null;
  const msg = accepted
    ? `🎉 *Tawaran Diterima!*\n\n` +
      `Hei ${buyer_name},\n` +
      `Tawaranmu *${rupiah(offer_price)}* untuk:\n📦 _${listing_title}_\n\n` +
      `*DITERIMA* oleh penjual! 🙌\n\n` +
      (sellerLink ? `Hubungi penjual sekarang:\n${sellerLink}` : "")
    : `😔 *Tawaran Ditolak*\n\n` +
      `Hei ${buyer_name},\n` +
      `Sayang sekali, tawaranmu *${rupiah(offer_price)}* untuk:\n📦 _${listing_title}_\n\n` +
      `tidak bisa diterima penjual. Coba cari barang lain di ${baseUrl()}`;
  return send(buyer_wa, msg).catch(() => ({ ok: false }));
}

// Notifikasi ke subscriber kategori: ada iklan baru
// Cooldown 6 jam per buyer per kategori — mencegah banjir notif
export async function notifyCategorySubscribers(supa, listing) {
  try {
    const cooldownMs = 6 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - cooldownMs).toISOString();

    const { data: subs } = await supa
      .from("category_subscriptions")
      .select("id, buyer_wa, buyer_name, last_notified_at")
      .eq("category", listing.category)
      .or(`campus.eq.Semua,campus.eq.${listing.campus}`)
      .or(`last_notified_at.is.null,last_notified_at.lt.${cutoff}`);

    if (!subs?.length) return;

    const url = `${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;

    for (const s of subs) {
      await send(
        s.buyer_wa,
        `🔔 *Iklan baru di kategori ${listing.category}!*\n\n` +
        `Hei ${s.buyer_name || "kamu"},\n` +
        `Ada iklan baru yang mungkin menarik:\n\n` +
        `📦 *${listing.title}*\n` +
        `💰 ${rupiah(listing.price)}\n` +
        `📍 ${listing.campus === "Semua" ? "Medan" : listing.campus}\n\n` +
        `👉 ${url}\n\n` +
        `_Balas STOP untuk berhenti notifikasi._`
      ).catch(() => {});

      // Update timestamp cooldown
      await supa.from("category_subscriptions")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", s.id).catch(() => {});

      // Jeda 2 detik antar pesan
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    console.error("[category-notify] error:", err?.message);
  }
}

export async function notifyAdminNewListing(listing, overrideAdminWa) {
  const cleanEnv = (val) => (val || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  const adminWa = cleanEnv(process.env.ADMIN_WA) || cleanEnv(process.env.SUPER_ADMIN_WA) || overrideAdminWa;
  if (!adminWa) return { ok: false, skipped: true };
  const url = `${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;
  const msg =
    `🆕 *Iklan Baru Tayang!*\n\n` +
    `📦 *${listing.title}*\n` +
    `💰 ${rupiah(listing.price)}\n` +
    `🏷️ ${listing.category || "-"}\n` +
    `👤 ${listing.seller_name || "-"} (${listing.seller_wa})\n` +
    `🔑 Kode: ${listing.listing_code || "-"}\n\n` +
    `👉 ${url}`;
  return send(adminWa, msg, listing.image_url || null).catch(() => ({ ok: false }));
}

// Notifikasi H-3 sebelum masa iklan berakhir
export async function notifySellerExpiring(listing) {
  if (!listing.seller_wa) return { ok: false };
  const url = `${baseUrl()}/dashboard`;
  const renewUrl = `${baseUrl()}/dashboard`;
  const msg =
    `⚠️ *Iklan mau habis masa aktifnya!*\n\n` +
    `Hei ${listing.seller_name || "Penjual"},\n` +
    `Iklanmu *"${listing.title}"* akan habis dalam *3 hari lagi*.\n\n` +
    `Perpanjang sekarang agar iklan tetap tayang:\n` +
    `👉 ${renewUrl}\n\n` +
    `_Jangan sampai iklanmu hilang dari pencarian!_`;
  return send(listing.seller_wa, msg).catch(() => ({ ok: false }));
}

// Notifikasi saat iklan sudah expired
export async function notifySellerExpired(listing) {
  if (!listing.seller_wa) return { ok: false };
  const msg =
    `❌ *Iklan kamu sudah tidak tayang*\n\n` +
    `Hei ${listing.seller_name || "Penjual"},\n` +
    `Iklan *"${listing.title}"* sudah tidak aktif.\n\n` +
    `Perpanjang atau pasang iklan baru di:\n` +
    `👉 ${baseUrl()}/dashboard`;
  return send(listing.seller_wa, msg).catch(() => ({ ok: false }));
}
