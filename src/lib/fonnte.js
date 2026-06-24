// Integrasi Fonnte (WhatsApp gateway). Semua fungsi aman-gagal:
// jika token belum di-set / request error, hanya log, tidak melempar.

import { buildSlug } from "@/lib/slug";
import { formatWaForBaileys } from "@/lib/constants";

const FONNTE_URL = "https://api.fonnte.com/send";

async function send(target, message, fileUrl = null) {
  const baileysUrl = process.env.BAILEYS_API_URL;
  const baileysToken = (process.env.BAILEYS_API_TOKEN || "jualbeliusu_rahasia").replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

  // Jika BAILEYS_API_URL diset di Vercel, kita tembak Baileys Railway
  if (baileysUrl) {
    // Bersihkan karakter aneh seperti BOM (\uFEFF) atau zero-width space
    const cleanUrl = baileysUrl.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    
    // Tambahkan "/send" di akhir URL
    const finalUrl = cleanUrl.endsWith('/send') ? cleanUrl : `${cleanUrl.replace(/\/$/, '')}/send`;

    // Jika target sudah full JID (ada @), teruskan apa adanya ke Railway.
    // Railway /send sudah menangani: @s.whatsapp.net, @lid, @g.us.
    const baileysTarget = target.includes('@') ? target : formatWaForBaileys(target);

    const payload = {
      target: baileysTarget,
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
  const isRental = listing.type === "sewa";
  const priceStr = isRental && listing.rental_period
    ? `${rupiah(listing.price)}/${listing.rental_period}`
    : rupiah(listing.price);
  const msg =
    `${isRental ? "🔑 *[SEWA]*" : "🛒"} *${listing.title}* — ${priceStr}\n` +
    `🏷️ ${listing.category}\n` +
    `👉 ${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;

  // Kirim ke grup utama (env FONNTE_WA_GROUP_ID)
  const main = group ? send(group, msg, listing.image_url || null) : Promise.resolve();

  // Kirim ke grup-grup tambahan dari env BAILEYS_BROADCAST_GROUPS (comma-separated JID)
  const extraGroups = (process.env.BAILEYS_BROADCAST_GROUPS || "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

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
export async function notifyCategorySubscribers(supa, listing) {
  try {
    const { data: subs } = await supa
      .from("category_subscriptions")
      .select("buyer_wa, buyer_name")
      .eq("category", listing.category)
      .or(`campus.eq.Semua,campus.eq.${listing.campus}`);

    if (!subs?.length) return;

    const url = `${baseUrl()}/produk/${(await import("@/lib/slug")).buildSlug(listing.title, listing.id)}`;
    
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
      
      // Berikan jeda 2 detik antar pesan agar tidak dianggap spam
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    console.error("[category-notify] error:", err?.message);
  }
}

// ============================================================================
// FITUR YANG DINONAKTIFKAN (Untuk Hemat Kuota Fonnte)
// ============================================================================

export async function notifyAdminNewListing(listing) { return { ok: true, skipped: true }; }
export async function notifyWantedBuyers(listing) { return { ok: true, skipped: true }; }
export async function notifySellerInterest(listing, buyerWa) { return { ok: true, skipped: true }; }
export async function notifyAdminReport(listing, report) { return { ok: true, skipped: true }; }

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
