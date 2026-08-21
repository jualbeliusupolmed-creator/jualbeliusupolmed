// Integrasi Fonnte (WhatsApp gateway). Semua fungsi aman-gagal:
// jika token belum di-set / request error, hanya log, tidak melempar.

import { buildSlug } from "@/lib/slug";
import { formatWaForBaileys, formatWa } from "@/lib/constants";
import { getAdminClient } from "@/lib/supabaseAdmin";

const FONNTE_URL = "https://api.fonnte.com/send";

// Catat SEMUA kiriman bot ke chat pribadi di wa_conversations (role 'bot'),
// apa pun rutenya (webhook, OTP, unlock, notif). Krusial: webhook memakai catatan
// ini untuk membedakan echo kiriman bot vs balasan MANUAL owner (mode senyap
// otomatis) — kiriman yang tak tercatat bisa salah dikira balasan manual.
// Fire-and-forget: gagal insert tidak boleh mengganggu pengiriman.
function logBotSend(target, message, hasMedia) {
  try {
    const t = String(target || "");
    if (!t || t === "status@broadcast" || t.includes("@g.us") || t.includes("@newsletter")) return;
    const wa = formatWa(t) || t.split("@")[0];
    if (!wa) return;
    getAdminClient()
      .from("wa_conversations")
      .insert({
        wa,
        jid: t,
        role: "bot",
        message: String(message || "").slice(0, 2000),
        has_media: !!hasMedia,
      })
      .then(() => {}, () => {});
  } catch (_) {}
}

// Batas "masih berguna kalau terlambat". Pesan dengan masa berlaku di bawah
// ini (OTP: 300 detik) TIDAK pernah ditampung — kode lima menit yang dikirim
// ulang tiga jam kemudian bukan pertolongan, melainkan kebingungan.
const AMBANG_TAMPUNG_DETIK = 15 * 60;

/**
 * Simpan pesan yang gagal dikirim ke public.wa_outbox supaya bisa dikirim
 * ulang dari panel begitu bot tersambung lagi.
 *
 * Sebelum ini, kegagalan cuma mendarat di console.error milik pemanggil —
 * yaitu log Vercel, yang tidak dibaca siapa pun dan tidak punya tombol.
 * Iklannya tetap tayang, penjualnya tidak pernah tahu.
 *
 * Sengaja tidak pernah melempar: ini jaring pengaman, dan jaring pengaman
 * yang bisa menjatuhkan pemanggilnya lebih buruk daripada tidak ada.
 */
async function tampungGagal(target, message, fileUrl, ttlDetik, sebab, meta) {
  try {
    // Kiriman ulang dari panel sudah PUNYA barisnya sendiri di wa_outbox.
    // Tanpa penjaga ini, tiap kali tombol Kirim ditekan saat bot masih mati,
    // antreannya beranak — satu baris baru per penekanan, untuk pesan yang sama.
    if (meta?.jangan_tampung) return;
    if (ttlDetik && Number(ttlDetik) <= AMBANG_TAMPUNG_DETIK) {
      console.warn(`[wa_outbox] tidak ditampung (masa berlaku ${ttlDetik}s terlalu pendek)`);
      return;
    }
    const t = String(target || "");
    if (!t) return;
    // WA Status tetap TIDAK ditampung. Status berumur 24 jam dan sifatnya bonus
    // (postToGroup pun tidak menghitungnya sebagai keberhasilan); mengirim ulang
    // Status basi tidak menolong siapa pun.
    if (t === "status@broadcast") return;

    // Grup dan saluran DULU ikut ditolak di sini, dengan alasan "pengumuman basi
    // ke grup lebih merugikan daripada tidak terkirim". Alasan itu benar untuk
    // pengiriman OTOMATIS, tapi akibatnya kegagalan grup tidak meninggalkan
    // jejak sama sekali: kalau VPS mati saat iklan aktif, pengumumannya hilang
    // dan tidak ada satu layar pun yang bisa memberi tahu bahwa ia hilang.
    //
    // Sekarang ditampung, TAPI ditandai: /api/admin/outbox mengeluarkannya dari
    // "Kirim semua", jadi tidak ada pengumuman basi yang berangkat sendiri —
    // yang ada cuma baris yang kelihatan, lengkap dengan umurnya, dan seorang
    // manusia yang memutuskan masih pantas dikirim atau tidak.
    const grup = t.includes("@g.us");
    const saluran = t.includes("@newsletter");

    const { data, error } = await getAdminClient().from("wa_outbox").insert({
      target: t,
      message: String(message || ""),
      image_url: fileUrl || null,
      ttl_detik: ttlDetik ? Number(ttlDetik) : null,
      jenis: meta?.jenis || (grup ? "grup" : saluran ? "saluran" : null),
      listing_id: meta?.listingId || null,
      galat_terakhir: String(sebab || "").slice(0, 500),
    }).select("id").maybeSingle();
    if (error) throw error;
    console.warn(`[wa_outbox] ditampung untuk ${t} — ${sebab}`);
    return data?.id || null;
  } catch (e) {
    // Tabelnya belum ada (migrasi belum jalan) juga mendarat di sini. Berisik
    // di log, tapi tidak mematikan pengiriman apa pun.
    console.error("[wa_outbox] gagal menampung:", e?.message);
  }
}

/**
 * Tandai baris antrean sebagai sudah terkirim.
 *
 * Dipakai kalau jalur cadangan (Fonnte) BERHASIL setelah barisnya terlanjur
 * ditampung. Tanpa ini barisnya tetap "tertunda" selamanya, dan penekanan
 * tombol Kirim berikutnya mengirim pesan yang SUDAH sampai — pesan ganda ke
 * orang yang sama.
 */
async function tandaiTerkirim(id) {
  if (!id) return;
  try {
    await getAdminClient().from("wa_outbox").update({
      status: "terkirim",
      terkirim_at: new Date().toISOString(),
      galat_terakhir: "terkirim lewat jalur cadangan (Fonnte)",
    }).eq("id", id);
  } catch (e) {
    console.error("[wa_outbox] gagal menandai terkirim:", e?.message);
  }
}

// ttlDetik: berapa lama pesan ini masih berguna kalau terlambat. Bot memakainya
// untuk memutuskan antara menyimpan (notifikasi penjualan — terlambat masih jauh
// lebih baik daripada tidak sampai) dan menolak cepat (OTP — kode yang datang
// sejam kemudian cuma membingungkan, dan penolakan cepat membuka jalur cadangan
// di bawah). Kosong = pesan boleh menunggu selama bot menyimpannya.
async function send(target, message, fileUrl = null, ttlDetik = null, meta = null) {
  // Jangan kirim pesan kosong (teks kosong tanpa lampiran) — pernah muncul
  // gelembung kosong ke pelanggan.
  if (!fileUrl && (!message || !String(message).trim())) {
    console.warn("[sendWa] pesan kosong — dilewati");
    return { ok: false, skipped: true, reason: "empty" };
  }

  logBotSend(target, message, !!fileUrl);

  // Id baris wa_outbox kalau pesan ini sempat ditampung — dipakai di bawah untuk
  // menutup barisnya kalau jalur cadangan ternyata berhasil.
  let idTampungan = null;

  const baileysUrl = process.env.BAILEYS_API_URL;
  const baileysToken = (process.env.BAILEYS_API_TOKEN || "").replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

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
    const payload = { target: baileysTarget, message: message, url: fileUrl || undefined, ttlDetik: ttlDetik || undefined };

    console.log(`[sendWa] Sending to: ${finalUrl} | Target: ${target}`);

    // fetch() melempar kalau VPS-nya tidak menjawab sama sekali — mati, nginx
    // tumbang, DNS gagal. Sebelum ini lemparan itu keluar dari sendWa() dan
    // mendarat di `.catch(console.error)` milik pemanggil, jadi pesannya lenyap
    // tepat pada keadaan terburuk. Sekarang ia keadaan biasa yang ditampung.
    let res = null, json = {}, galat = null;
    try {
      res = await fetch(finalUrl, {
        method: "POST",
        headers: { "Authorization": baileysToken, "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      // Bukan res.json() polos: kalau bot mati, yang balik bisa HTML 502 dari
      // nginx, dan melempar di sini akan melewati jalur cadangan di bawah —
      // tepat pada keadaan yang jalur itu dibuat untuk menanganinya.
      json = await res.json().catch(() => ({}));
      console.log(`[sendWa] Response: ${res.status} | Body: ${JSON.stringify(json)}`);
      if (res.ok) return { ok: true, data: json };
      galat = `bot menolak (HTTP ${res.status})${json?.error ? ": " + json.error : ""}`;
    } catch (err) {
      galat = `bot tidak menjawab: ${err?.message || "gagal menghubungi"}`;
      console.error(`[sendWa] ${galat}`);
    }

    // Sampai di sini berarti pesannya TIDAK diterima siapa pun. Bot mengantre
    // sendiri pesan yang berhasil masuk dan menjawab ok=true saat itu juga,
    // jadi yang jatuh ke sini benar-benar tidak punya rumah.
    idTampungan = await tampungGagal(target, message, fileUrl, ttlDetik, galat, meta);

    console.warn(`[sendWa] ${galat} — mencoba jalur cadangan.`);
    if (!process.env.FONNTE_TOKEN) {
      return { ok: false, data: json, noFallback: true, ditampung: true, galat };
    }
  }

  // Fallback ke Fonnte (jika Baileys belum siap, atau barusan menolak)
  const token = process.env.FONNTE_TOKEN;
  if (!token || !target) {
    console.warn("[fonnte] token/target kosong — skip kirim WA");
    // Tanpa BAILEYS_API_URL DAN tanpa token cadangan, pesan ini tidak pernah
    // punya jalan keluar sama sekali. Dulu ia lenyap di sini juga.
    if (target) await tampungGagal(target, message, fileUrl, ttlDetik, "tidak ada jalur kirim yang tersedia", meta);
    return { ok: false, skipped: true, ditampung: !!target };
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
    if (res.ok) await tandaiTerkirim(idTampungan);
    return { ok: res.ok, data };
  } catch (err) {
    console.error("[fonnte] gagal kirim:", err?.message);
    return { ok: false, error: err?.message };
  }
}

const baseUrl = () =>
  (process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id").trim();

function rupiah(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

// ============================================================================
// FITUR YANG AKTIF:
// 1. sendWa (digunakan oleh OTP)
// 2. postToGroup (broadcast jualan baru)
// 3. postWantedToGroup (broadcast pencarian baru)
// ============================================================================

// ── Kata-kata notifikasi iklan, di satu tempat ──────────────────────────────
// Teksnya dipakai DUA jalur sekarang: bot yang mengirim sendiri, dan tombol
// "Kirim manual" di panel admin yang menyiapkan teks untuk ditempel orang.
// Kalau tiap jalur menyusun kalimatnya sendiri, keduanya akan pelan-pelan
// berbeda — dan yang manual dipakai justru saat bot mati, yaitu saat tidak ada
// siapa pun yang membandingkan.

/** URL halaman produk. */
export function urlProduk(listing) {
  return `${baseUrl()}/produk/${buildSlug(listing.title, listing.id)}`;
}

/** Pesan iklan untuk grup / status WhatsApp. */
export function pesanGrupIklan(listing) {
  const isRental = listing.type === "sewa";
  const priceStr = isRental && listing.rental_period
    ? `${rupiah(listing.price)}/${listing.rental_period}`
    : rupiah(listing.price);
  return (
    `${isRental ? "🔑 *[SEWA]*" : "🛒"} *${listing.title}* — ${priceStr}\n` +
    `🏷️ ${listing.category}\n` +
    `👉 ${urlProduk(listing)}`
  );
}

/** Pesan "iklanmu sudah tayang" untuk penjual. */
export function pesanPenjualTayang(listing) {
  const exp = listing.expires_at
    ? new Date(listing.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
    : null;
  return (
    `✅ *Iklan Kamu Sudah Tayang!* 🎉\n\n` +
    `📦 *${listing.title}*\n` +
    (exp ? `📅 Aktif hingga: *${exp}*\n` : "") +
    `🔑 Kode: *${listing.listing_code || "-"}*\n\n` +
    `Iklan sudah disebarkan ke grup WA marketplace!\n\n` +
    `👉 ${urlProduk(listing)}`
  );
}

/** Pesan pemberitahuan iklan baru untuk admin. */
export function pesanAdminIklan(listing) {
  return (
    `🆕 *Iklan Baru Tayang!*\n\n` +
    `📦 *${listing.title}*\n` +
    `💰 ${rupiah(listing.price)}\n` +
    `🏷️ ${listing.category || "-"}\n` +
    `👤 ${listing.seller_name || "-"} (${listing.seller_wa})\n` +
    `🔑 Kode: ${listing.listing_code || "-"}\n\n` +
    `👉 ${urlProduk(listing)}`
  );
}

/** Daftar tujuan grup: grup utama + grup tambahan, tanpa duplikat. */
export function daftarGrup(adminSettings) {
  const utama = adminSettings?.groupJid || process.env.FONNTE_WA_GROUP_ID || "";
  const extraStr = adminSettings?.extraGroups || process.env.BAILEYS_BROADCAST_GROUPS || "";
  const semua = [utama, ...extraStr.split(",")].map((g) => String(g || "").trim()).filter(Boolean);
  return [...new Set(semua)];
}

/** Nomor admin yang dipakai untuk notifikasi internal. */
export function nomorAdmin(overrideAdminWa) {
  const bersih = (val) => (val || "").replace(/[\u200B-\u200D\uFEFF]/g, "").trim();
  return bersih(process.env.ADMIN_WA) || bersih(process.env.SUPER_ADMIN_WA) || bersih(overrideAdminWa);
}

// Auto-post ke grup WA setelah bayar iklan jualan.
//
// Mengembalikan RINGKASAN, bukan undefined. Dulu fungsi ini tidak mengembalikan
// apa-apa sementara pemanggilnya di /api/admin/action memeriksa `broadcast?.ok` —
// jadi setiap kali admin menekan "Aktifkan", panel memajang "broadcast grup
// gagal, cek log server" walaupun pesannya sampai dengan selamat.
export async function postToGroup(listing, adminSettings) {
  const msg = pesanGrupIklan(listing);
  const gambar = listing.image_url || null;
  const tujuan = daftarGrup(adminSettings);

  const hasil = await Promise.all(
    tujuan.map((jid) =>
      send(jid, msg, gambar)
        .then((r) => ({ target: jid, ok: !!r?.ok, error: r?.galat || r?.error || null }))
        .catch((e) => ({ target: jid, ok: false, error: e?.message || "gagal" }))
    )
  );

  // Kirim WA Story (status@broadcast) — hanya via Baileys karena Fonnte tidak support.
  // Tidak ikut menentukan ok: Status itu bonus, bukan janji ke penjual.
  if (process.env.BAILEYS_API_URL) {
    await send("status@broadcast", msg, gambar).catch(() => {});
  }

  const terkirim = hasil.filter((h) => h.ok).length;
  return {
    ok: tujuan.length > 0 && terkirim === tujuan.length,
    skipped: tujuan.length === 0,
    terkirim,
    gagal: hasil.length - terkirim,
    rincian: hasil,
    error: tujuan.length === 0 ? "Tidak ada grup tujuan (groupJid/extraGroups kosong)"
      : hasil.filter((h) => !h.ok).map((h) => `${h.target}: ${h.error || "gagal"}`).join("; ") || null,
  };
}

/** Notifikasi ke penjual bahwa iklannya sudah tayang. */
export async function notifySellerListingLive(listing) {
  if (!listing?.seller_wa) return { ok: false, skipped: true, error: "penjual tanpa nomor WA" };
  return send(listing.seller_wa, pesanPenjualTayang(listing), null, null, {
    jenis: "iklan_tayang",
    listingId: listing.id,
  }).catch((e) => ({ ok: false, error: e?.message }));
}

// Auto-post ke grup WA ketika ada yang mencari barang (Papan Dicari) — ringkas
export async function postWantedToGroup(wanted) {
  const group = process.env.FONNTE_WA_GROUP_ID;
  const budgetStr = wanted.budget && wanted.budget > 0 ? `maks ${rupiah(wanted.budget)}` : "Budget nego";
  // Ajakan jual ditempel di sini, di sumbernya. Sebelumnya bot WhatsApp yang
  // menyisipkannya lewat pencocokan teks di pintu /send — rapuh, karena diam-diam
  // berhenti kalau kalimat di bawah berubah. Bot masih punya penambal itu sebagai
  // jaring pengaman dan ia mengecek suffix ini sebelum menambah, jadi JANGAN ubah
  // kata-katanya tanpa menyesuaikan DICARI_JUAL_SUFFIX di repo wa-bot-usu —
  // kalau tidak cocok, ajakannya tertulis dua kali.
  const msg =
    `🔍 *Dicari:* ${wanted.title} (${budgetStr})\n` +
    `Punya barangnya? 👉 ${baseUrl()}/dicari` +
    `, Atau kalau mau lebih cepat langsung jual di ${baseUrl()}/jual`;
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
  const adminWa = nomorAdmin(overrideAdminWa);
  if (!adminWa) return { ok: false, skipped: true, error: "ADMIN_WA belum di-set" };
  return send(adminWa, pesanAdminIklan(listing), listing.image_url || null, null, {
    jenis: "admin_iklan_baru",
    listingId: listing.id,
  }).catch((e) => ({ ok: false, error: e?.message }));
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
