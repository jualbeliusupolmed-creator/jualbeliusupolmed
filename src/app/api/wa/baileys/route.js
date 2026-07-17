import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { parseListingFromText, verifyReceiptImage, processGeneralChat, parseWantedFromText, checkReceiverName } from "@/lib/gemini";
import { sendWa as _sendWaBase, postToGroup, notifyAdminNewListing, notifyWantedMatch, notifyCategorySubscribers, notifyBuyerOfferResult, postWantedToGroup, notifySellerNewOffer } from "@/lib/fonnte";
import { formatWa } from "@/lib/constants";
import { getSettings, adFeeFrom } from "@/lib/settings";
import { postToFacebook, postToInstagram } from "@/lib/meta";
import { buildSlug } from "@/lib/slug";
import { rateLimit } from "@/lib/rateLimit";
import { handleAdminCmd } from "@/lib/bot/adminHandlers";
import { migrateLidToPhone } from "@/lib/lidMigrate";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// ── Logging percakapan ke Supabase (riwayat chat panel admin + audit lanjutan) ──
// Menggantikan messageLog in-memory bot yang hilang tiap restart & tak simpan balasan.
function convoWa(target) {
  const w = formatWa(target);
  return w || String(target || "").split("@")[0];
}
async function logConvo(target, role, message, hasMedia = false) {
  try {
    if (!message && !hasMedia) return;
    const wa = convoWa(target);
    if (!wa) return;
    await getAdminClient().from("wa_conversations").insert({
      wa,
      jid: String(target || ""),
      role,
      message: (message || "").slice(0, 2000),
      has_media: !!hasMedia,
    });
  } catch (_) {}
}
// Balasan bot otomatis tercatat di dalam sendWa fonnte.js (logBotSend) — berlaku
// untuk semua rute, bukan cuma webhook ini. Jangan log ganda di sini.
const sendWa = _sendWaBase;

// Kata yang BUKAN nama orang tapi sering nyangkut jadi nama (tangkapan bot lama /
// pushName aneh). Jangan pernah menyapa orang dengan kata-kata ini.
const NAME_STOPWORDS = new Set([
  "min", "mimin", "admin", "bang", "bg", "kak", "ka", "dek", "mas", "mbak", "pak", "bu",
  "bro", "sis", "cuy", "coy", "iya", "ya", "yaw", "yah", "ok", "oke", "okey", "okay",
  "sip", "siap", "gas", "woi", "woy", "wey", "weh", "oi", "halo", "hai", "haii", "hallo",
  "helo", "hello", "ntar", "nanti", "tar", "besok", "test", "tes", "info", "misi",
  "permisi", "punten", "p", "pagi", "siang", "sore", "malam", "assalamualaikum",
]);
function cleanFirstName(raw) {
  const fn = (String(raw || "").trim().split(/\s+/)[0] || "").replace(/[^\p{L}'-]/gu, "");
  if (fn.length < 2 || fn.length > 20) return "";
  if (NAME_STOPWORDS.has(fn.toLowerCase())) return "";
  return fn;
}

// Cek apakah bot baru saja mengirim pesan persis sama ke nomor ini — dipakai untuk
// mencegah template (greeting/menu) terkirim beruntun dalam waktu berdekatan.
async function wasSentRecently(supa, wa, text, minutes = 10) {
  try {
    const { count } = await supa
      .from("wa_conversations")
      .select("id", { count: "exact", head: true })
      .eq("wa", wa)
      .eq("role", "bot")
      .eq("message", String(text || "").slice(0, 2000))
      .gte("created_at", new Date(Date.now() - minutes * 60 * 1000).toISOString());
    return (count || 0) > 0;
  } catch (_) {
    return false;
  }
}

// Cek apakah nomor WA termasuk admin
// Baca dari ADMIN_WA (bisa koma) + SUPER_ADMIN_WA sebagai var terpisah
function isAdminWa(wa) {
  const to62 = n => (n || "").replace(/\D/g, "").replace(/^0/, "62");
  const raw = [process.env.ADMIN_WA || "", process.env.SUPER_ADMIN_WA || ""].join(",");
  const admins = raw.split(",").map(a => to62(a.trim())).filter(Boolean);
  return admins.length > 0 && admins.includes(to62(wa));
}

function getQrisUrl() {
  return `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/qris.png`;
}

// Parse harga dari teks Indonesia: "90rb"/"90 ribu"/"1.5jt"/"150000"/"150.000".
// Angka polos < 1000 tanpa satuan dianggap ribuan (konvensi harga pasar: "90" = 90rb).
function parsePriceId(text) {
  const s = String(text || "").toLowerCase();
  const m = s.match(/(\d[\d.,]*)\s*(jt|juta|m|rb|ribu|k)?/);
  if (!m) return 0;
  const unit = m[2] || "";
  if (/jt|juta|m/.test(unit)) {
    // Di konteks juta, titik/koma = desimal ("1.5jt" = 1,5 juta), bukan pemisah ribuan.
    const n = parseFloat(m[1].replace(",", ".")) || 0;
    return Math.round(n * 1_000_000);
  }
  let n = parseInt(m[1].replace(/[.,]/g, ""), 10) || 0;
  if (/rb|ribu|k/.test(unit)) n *= 1000;
  else if (n > 0 && n < 1000) n *= 1000; // "90" → 90.000
  return n;
}

async function processImageWithWatermark(fBuf) {
  try {
    const metadata = await sharp(fBuf).metadata();
    const width = metadata.width || 800;
    const height = metadata.height || 800;
    
    const svgOverlay = `
      <svg width="${width}" height="${height}">
        <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" 
              font-size="${Math.max(width * 0.05, 20)}px" font-family="Arial, sans-serif" 
              fill="rgba(255,255,255,0.7)" stroke="rgba(0,0,0,0.5)" stroke-width="2" font-weight="bold" 
              transform="rotate(-30, ${width/2}, ${height/2})">
          JUAL BELI USU
        </text>
      </svg>
    `;

    return await sharp(fBuf)
      .composite([{ input: Buffer.from(svgOverlay), blend: 'over' }])
      .webp({ quality: 80 })
      .toBuffer();
  } catch (err) {
    console.error("[watermark] error:", err);
    return await sharp(fBuf).webp({ quality: 80 }).toBuffer();
  }
}

async function notifyMatchingWanted(supa, listing) {
  try {
    const cooldownMs = 6 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - cooldownMs).toISOString();

    const { data: matches } = await supa
      .from("wanted_listings")
      .select("id, buyer_wa, buyer_name, title, last_notified_at")
      .eq("category", listing.category)
      .eq("status", "active")
      .or(`last_notified_at.is.null,last_notified_at.lt.${cutoff}`)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!matches || matches.length === 0) return;

    for (const w of matches) {
      await notifyWantedMatch(w.buyer_wa, w.buyer_name, listing).catch(() => {});
      await supa.from("wanted_listings")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", w.id).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    console.error("[wanted-match-baileys] error:", err?.message);
  }
}

export async function POST(req) {
  try {
    const authHeader = (req.headers.get("authorization") || "").trim();
    const expectedToken = (process.env.BAILEYS_API_TOKEN || "").replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (!expectedToken) {
      console.error("[baileys-webhook] BAILEYS_API_TOKEN belum di-set \u2014 tolak semua (fail-closed).");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 503 });
    }
    if (authHeader !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
    }

    const formData = await req.formData();

    // Rate limit: max 20 pesan/menit per nomor WA (cegah flood/spam)
    const rlKey = `baileys:${formData.get("sender") || "unknown"}`;
    const rl = rateLimit(rlKey, { limit: 20, windowMs: 60_000 });
    if (!rl.ok) {
      console.warn(`[rate-limit] ${rlKey} \u2014 melebihi batas, retry setelah ${rl.retryAfter}s`);
      // Auto-pause: hitung berapa kali kena rate limit dalam 5 menit
      const floodKey = `flood:${formData.get("sender") || "unknown"}`;
      const flood = rateLimit(floodKey, { limit: 3, windowMs: 5 * 60_000 });
      if (!flood.ok) {
        // Sudah 3x kena rate limit dalam 5 menit \u2192 auto-pause nomor ini
        const floodWa = formatWa(formData.get("sender") || "");
        if (floodWa) {
          try {
            const supa = getAdminClient();
            const { data: cfg } = await supa.from("settings").select("value").eq("key", "bot").maybeSingle();
            const paused = cfg?.value?.paused_users || [];
            if (!paused.includes(floodWa)) {
              await supa.from("settings").upsert({ key: "bot", value: { ...(cfg?.value || {}), paused_users: [...paused, floodWa] } });
              console.warn(`[auto-pause] ${floodWa} ditambahkan ke paused_users karena flood`);
            }
          } catch {}
        }
      }
      return NextResponse.json({ ok: true, ignored: true, reason: "rate_limited" });
    }
    const senderJid = formData.get("sender");
    let message = formData.get("message") || "";
    const profileNameFromBot = (formData.get("profile_name") || "").trim().slice(0, 50);
    const files = formData.getAll("file");
    const file = files[0] || null;

    let isForcedAd = false;
    const fromMe = formData.get("fromMe") === "true" || formData.get("isBot") === "true" || formData.get("is_bot") === "true";

    if (fromMe) {
      if (message.trim().startsWith("#")) {
        isForcedAd = true;
        message = message.trim().substring(1).trim();
      } else {
        // Balasan MANUAL owner (HP/WA Web) — jangan diproses bot, tapi JANGAN dibuang:
        // ini sinyal terkuat bahwa percakapan sedang ditangani manusia. Catat sebagai
        // role 'admin' → dasar mode senyap otomatis (ownerActive) + riwayat lengkap
        // di panel Kontrol Chat.
        try {
          const waKey = convoWa(senderJid);
          const manualMedia = formData.get("manual_media") === "1";
          if (waKey) {
            const supaFm = getAdminClient();
            // Bedakan ketikan manual vs ECHO balasan bot sendiri (bot versi lama
            // meneruskan keduanya sebagai fromMe): balasan bot selalu sudah tercatat
            // role 'bot' sesaat sebelumnya dengan teks persis sama.
            let isBotEcho = false;
            if ((message || "").trim()) {
              isBotEcho = await wasSentRecently(supaFm, waKey, message, 10);
            } else if (!file && !manualMedia) {
              // Tanpa teks & tanpa media: tak bisa dipastikan manual → jangan catat.
              isBotEcho = true;
            }
            if (!isBotEcho) {
              await supaFm.from("wa_conversations").insert({
                wa: waKey,
                jid: String(senderJid || ""),
                role: "admin",
                message: (message || "").slice(0, 2000),
                has_media: !!file || manualMedia,
              });
            }
          }
        } catch (_) {}
        return NextResponse.json({ ok: true, ignored: true, reason: "admin_reply" });
      }
    } else if (message.trim().startsWith("#")) {
      isForcedAd = true;
      message = message.trim().substring(1).trim();
    }
    let conversationHistory = [];
    try {
      const rawContext = formData.get("context");
      if (rawContext) conversationHistory = JSON.parse(rawContext);
    } catch (_) {}

    // ── Pesan dari grup marketplace → simpan ke group_posts, tidak balas ──
    const source = formData.get("source");
    const groupJid = formData.get("group_jid");
    if (source === "group" && groupJid) {
      const supa = getAdminClient();
      const msgText = message?.trim();
      if (msgText || file) {
        let imageUrl = null;
        if (file) {
          try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const webpBuf = await sharp(buffer).webp({ quality: 80 }).toBuffer();
            const fileName = `group/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
            await supa.storage.from("listings").upload(fileName, webpBuf, { contentType: "image/webp", upsert: false });
            const { data: { publicUrl } } = supa.storage.from("listings").getPublicUrl(fileName);
            imageUrl = publicUrl;
          } catch (_) {}
        }
        await supa.from("group_posts").upsert({
          sender_wa: formatWa(senderJid) || senderJid,
          message: msgText || "",
          image_url: imageUrl,
          group_jid: groupJid,
        }).catch(() => {});
      }
      return NextResponse.json({ ok: true, state: "group_post_indexed" });
    }

    if (!senderJid || senderJid.includes("-") || senderJid.includes("@g.us") || senderJid === "status@broadcast") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    // Identitas user = NOMOR asli. Bot sudah me-resolve @lid → nomor sebelum sampai sini
    // (remoteJidAlt / kontak / getPNForLID). Kalau langka-langka masih @lid (belum ke-resolve),
    // pakai bagian numerik sbg placeholder SEMENTARA — tak ditampilkan sebagai nomor ke user
    // (lihat guard di blok SAYA), dan otomatis dimigrasi begitu nomornya ketahuan.
    if (senderJid.includes("@lid")) {
      console.log(`[baileys-webhook] @lid belum ter-resolve: ${senderJid} (fromMe=${fromMe})`);
    }

    const normalizedWa = senderJid.includes("@lid")
      ? senderJid.split("@")[0]  // placeholder sementara — delivery tetap ke raw JID via Baileys
      : formatWa(senderJid);
    if (!normalizedWa) {
      console.warn(`[baileys-webhook] JID tidak valid / bukan nomor Indonesia: ${senderJid}`);
      return NextResponse.json({ ok: true, ignored: true, reason: "invalid_number" });
    }

    // Bot baru saja mengetahui nomor asli dari sebuah LID → migrasi data lama (LID → nomor)
    // sekali, sebelum query apa pun, supaya identitas konsisten & tak ada "double".
    const prevLid = (formData.get("prev_lid") || "").replace(/\D/g, "");
    if (prevLid && !senderJid.includes("@lid") && prevLid !== normalizedWa) {
      await migrateLidToPhone(getAdminClient(), prevLid, normalizedWa).catch(() => {});
    }

    // Catat pesan masuk dari user untuk riwayat chat admin & audit.
    logConvo(senderJid, "user", message, !!file);

    const settings = await getSettings();
    if (!isAdminWa(normalizedWa) && settings?.bot?.paused_users?.includes(normalizedWa)) {
      return NextResponse.json({ ok: true, ignored: true, reason: "human_handoff" });
    }

    const supa = getAdminClient();

    // ── Deteksi "owner lagi turun tangan" ────────────────────────────────────
    // Ada balasan manual (role 'admin') ke kontak ini dalam 6 jam terakhir →
    // bot senyap otomatis (gerbang di bawah, setelah pending payment dihitung).
    // Timer 6 jam otomatis mundur tiap owner balas manual lagi. Dari audit chat:
    // 24/24 pesan template bot mendarat justru saat owner sedang balas manual.
    const OWNER_ACTIVE_MS = 6 * 60 * 60 * 1000;
    let ownerActive = false;
    if (!isAdminWa(normalizedWa)) {
      try {
        const { count: manualCount } = await supa
          .from("wa_conversations")
          .select("id", { count: "exact", head: true })
          .eq("wa", normalizedWa)
          .eq("role", "admin")
          .gte("created_at", new Date(Date.now() - OWNER_ACTIVE_MS).toISOString());
        ownerActive = (manualCount || 0) > 0;
      } catch (_) {}
    }

    // 1. Cek apakah ada pembayaran PENDING untuk user ini
    const { data: pendingPayments } = await supa
      .from("payments")
      .select("*, listings!inner(id, title, seller_wa)")
      .eq("status", "pending")
      .eq("listings.seller_wa", normalizedWa)
      .order("created_at", { ascending: false })
      .limit(1);

    const pendingPayment = pendingPayments?.[0];

    // 1b. Cek pending payment untuk wanted listing (listing_id null, dikecualikan !inner di atas)
    let pendingWantedPayment = null;
    if (!pendingPayment) {
      const { data: pendingWanted } = await supa
        .from("wanted_listings")
        .select("id, title")
        .eq("buyer_wa", normalizedWa)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1);
      if (pendingWanted?.length > 0) {
        const w = pendingWanted[0];
        const { data: wPays } = await supa
          .from("payments")
          .select("id, amount, type, midtrans_order_id, meta")
          .eq("status", "pending")
          .eq("type", "wanted")
          .order("created_at", { ascending: false })
          .limit(10);
        // Match via meta.wanted_id (lebih reliable dari listing_code yg tidak ada di wanted_listings)
        const wPay = wPays?.find(p => p.meta?.wanted_id === w.id);
        if (wPay) pendingWantedPayment = { ...wPay, wanted: w };
      }
    }

    // Admin commands bypass semua flow payment
    const adminCmds = ["STATS", "PAUSE", "RESUME", "BROADCAST", "APPROVE", "REJECT", "SETUJUI", "TOLAK", "SETMODE"];
    const isAdminCommand = !file && isAdminWa(normalizedWa) &&
      adminCmds.some(cmd => {
        const t = (message || "").toUpperCase().trim();
        return t === cmd || t.startsWith(cmd + " ");
      });

    // Seller boleh kirim TAWAR BIAYA meski ada pending payment — jangan block
    const isTawarBiaya = !file && (message || "").toUpperCase().trim().startsWith("TAWAR BIAYA ");

    // ── MODE SENYAP OTOMATIS ─────────────────────────────────────────────────
    // Owner sedang menangani chat ini secara manual → bot TIDAK BOLEH menyela
    // (tidak ada greeting, menu, tagihan, AI, atau iklan-baru dari foto).
    // Yang tetap dilayani: perintah bot eksplisit, kiriman struk untuk pembayaran
    // yang sudah berjalan, dan takeover '#'. Pesan masuk tetap tercatat (logConvo).
    if (ownerActive && !isForcedAd && !isAdminCommand) {
      const tCmd = (message || "").toLowerCase().trim();
      const explicitCmd =
        ["menu", "jual", "wts", "dijual", "ready", "saya", "iklanku", "perpanjang", "upgrade", "batal", "cancel"].includes(tCmd) ||
        tCmd.startsWith("cari ") || tCmd.startsWith("nama ") || isTawarBiaya;
      const isReceiptFlow = !!file && (pendingPayment || pendingWantedPayment);
      // User sedang di alur pasang-iklan (sudah ketik JUAL → draft aktif) → JANGAN
      // bisukan foto/teks lanjutannya. Tanpa ini, "JUAL → kirim foto" mati di tengah
      // (foto iklan-baru bukan perintah & bukan struk, jadi kena senyap).
      let inListingFlow = false;
      try {
        const { count: draftCount } = await supa
          .from("wa_listing_drafts")
          .select("wa", { count: "exact", head: true })
          .eq("wa", normalizedWa)
          .gte("updated_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());
        inListingFlow = (draftCount || 0) > 0;
      } catch (_) {}
      if (!explicitCmd && !isReceiptFlow && !inListingFlow) {
        return NextResponse.json({ ok: true, ignored: true, reason: "owner_active_silent" });
      }
    }

    // ==========================================
    // STATE 2: Menunggu Bukti Transfer (Struk)
    // ==========================================
    if (pendingPayment && !isAdminCommand && !isTawarBiaya) {
      if (!file) {
        if (message && message.toLowerCase().trim() === "batal") {
          await supa.from("payments").delete().eq("id", pendingPayment.id);
          // Hapus listing hanya jika pembayaran untuk iklan baru (bukan renewal/upgrade)
          if (pendingPayment.type === "iklan") {
            await supa.from("listings").delete().eq("id", pendingPayment.listings.id);
          }
          await sendWa(senderJid, "🗑️ Tagihan sebelumnya telah dibatalkan. Anda sekarang bisa melanjutkan.");
          return NextResponse.json({ ok: true, state: "payment_cancelled" });
        }

        const qrisUrl = getQrisUrl();
        const typeLabel = pendingPayment.type === "renewal" ? "Perpanjang Iklan"
          : pendingPayment.type === "featured" ? "Featured Iklan"
          : pendingPayment.type === "autobump" ? "AutoBump Iklan"
          : "Biaya Tayang Iklan";
        const reminderMsg =
          `⚠️ *Tagihan Belum Lunas*\n\n` +
          `📌 ${typeLabel}: *${pendingPayment.listings.title}*\n` +
          `💳 Nominal: *Rp ${pendingPayment.amount.toLocaleString("id-ID")}*\n\n` +
          `Scan QRIS di bawah dan transfer nominal di atas.\n\n` +
          `Setelah transfer, kirim *screenshot struk* ke sini.\n\n` +
          `_(Ketik *BATAL* untuk batalkan tagihan)_`;
        await sendWa(senderJid, reminderMsg, qrisUrl);
        return NextResponse.json({ ok: true, state: "waiting_receipt_no_image" });
      }

      await sendWa(senderJid, "⏳ Bentar ya, lagi dicek…");

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "image/jpeg";
        const extractedData = await verifyReceiptImage(buffer, mimeType);

        if (!extractedData.is_struk_valid) {
          await sendWa(senderJid, "Hmm, ini kayaknya bukan struk transfer deh kak 🙏 Coba kirim ulang foto struknya yg jelas ya.");
          return NextResponse.json({ ok: true, state: "invalid_receipt_image" });
        }

        const recvIkl = checkReceiverName(extractedData.penerima);
        if (!recvIkl.ok) {
          await sendWa(senderJid, `❌ ${recvIkl.reason}\nPastikan transfer ke rekening resmi Jual Beli USU/Polmed ya kak 🙏`);
          return NextResponse.json({ ok: true, state: "receiver_mismatch" });
        }

        const nominalRcpt = Number(extractedData.nominal);
        if (!Number.isFinite(nominalRcpt) || nominalRcpt < Number(pendingPayment.amount)) {
          await sendWa(senderJid,
            `❌ *Nominal Kurang / Tak Terbaca*\n\n` +
            `Nominal di struk: *Rp ${Number.isFinite(nominalRcpt) ? nominalRcpt.toLocaleString("id-ID") : "?"}*\n` +
            `Tagihan: *Rp ${Number(pendingPayment.amount).toLocaleString("id-ID")}*\n\n` +
            `Transfer kurang atau angkanya tak terbaca. Kirim ulang struk yang jelas ya kak.`
          );
          return NextResponse.json({ ok: true, state: "invalid_amount" });
        }

        // Anti daur-ulang: tolak nomor referensi struk yang sudah pernah dipakai.
        const refIdRcpt = String(extractedData.ref_id || "").trim();
        if (refIdRcpt) {
          const { data: dupR } = await supa.from("payments").select("id").eq("status", "paid").eq("meta->>receipt_ref", refIdRcpt).limit(1);
          if (dupR && dupR.length > 0) {
            await sendWa(senderJid, "Struk ini kayaknya udah pernah dipakai kak 🙏 Kirim struk transfer yang baru ya.");
            return NextResponse.json({ ok: true, state: "receipt_reused" });
          }
        }

        // VERIFIKASI BERHASIL — klaim ATOMIK (hanya kalau masih pending, cegah double).
        const { data: claimedRcpt } = await supa.from("payments")
          .update({ status: "paid", meta: { ...(pendingPayment.meta || {}), receipt_ref: refIdRcpt || null } })
          .eq("id", pendingPayment.id).eq("status", "pending").select("id").maybeSingle();
        if (!claimedRcpt) return NextResponse.json({ ok: true, state: "already_paid" });

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";

        // Handle berbeda tergantung tipe payment
        if (pendingPayment.type === "renewal") {
          const renewDays = pendingPayment.meta?.renew_days || 14;
          const newExpiry = new Date(Date.now() + renewDays * 24 * 60 * 60 * 1000).toISOString();
          await supa.from("listings")
            .update({ status: "active", expires_at: newExpiry, bumped_at: new Date().toISOString() })
            .eq("id", pendingPayment.listings.id);
          const expDate = new Date(newExpiry).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
          await sendWa(senderJid,
            `🎉 *Perpanjang Berhasil!*\n\n` +
            `Iklan *"${pendingPayment.listings.title}"* sudah aktif kembali.\n` +
            `📅 Aktif hingga: *${expDate}*\n\n` +
            `Cek di: ${baseUrl}/dashboard`
          );
          return NextResponse.json({ ok: true, state: "renewal_verified" });

        } else if (pendingPayment.type === "featured") {
          const days = pendingPayment.meta?.days || 1;
          const featuredUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
          await supa.from("listings").update({ featured: true, featured_until: featuredUntil }).eq("id", pendingPayment.listings.id);
          await sendWa(senderJid,
            `⭐ *Featured Aktif!*\n\n` +
            `Iklan *"${pendingPayment.listings.title}"* sekarang tampil sebagai Featured selama *${days} hari*.\n\n` +
            `Cek di: ${baseUrl}/dashboard`
          );
          return NextResponse.json({ ok: true, state: "featured_activated" });

        } else if (pendingPayment.type === "autobump") {
          const days = pendingPayment.meta?.days || 7;
          const autoBumpUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
          await supa.from("listings").update({ auto_bump_until: autoBumpUntil }).eq("id", pendingPayment.listings.id);
          await sendWa(senderJid,
            `🔄 *AutoBump Aktif!*\n\n` +
            `Iklan *"${pendingPayment.listings.title}"* akan otomatis disundul setiap hari selama *${days} hari*.\n\n` +
            `Cek di: ${baseUrl}/dashboard`
          );
          return NextResponse.json({ ok: true, state: "autobump_activated" });

        } else if (pendingPayment.type === "bulk_iklan") {
          const listingIds = pendingPayment.meta?.listing_ids || [pendingPayment.listings.id];
          
          const { data: updatedListings } = await supa
            .from("listings")
            .update({ status: "active", bumped_at: new Date().toISOString() })
            .in("id", listingIds)
            .select();

          if (updatedListings && updatedListings.length > 0) {
            let confirmMsg = `🎉 *PEMBAYARAN BERHASIL!*\n\n` +
              `Struk *Rp ${pendingPayment.amount.toLocaleString("id-ID")}* udah aku cek, aman 👍\n\n` +
              `Iklan berikut sudah tayang dan disebarkan ke Grup WA! 🚀\n\n`;

            for (const l of updatedListings) {
              confirmMsg += `- *${l.title}*\n`;
            }
            await sendWa(senderJid, confirmMsg);

            const to62 = n => (n || "").replace(/\D/g, "").replace(/^0/, "62");
            const rawAdmins = [process.env.ADMIN_WA || "", process.env.SUPER_ADMIN_WA || ""].join(",");
            const adminNumbers = [...new Set(rawAdmins.split(",").map(a => to62(a.trim())).filter(Boolean))];
            
            for (const l of updatedListings) {
              const productSlug = buildSlug(l.title, l.id);
              const shareMsg = `🛒 *${l.title}* — Rp ${Number(l.price).toLocaleString("id-ID")}\n` +
                `🏷️ ${l.category}\n` +
                `👉 ${baseUrl}/produk/${productSlug}\n\n` +
                `_Klik & bagikan link iklanmu ke teman-teman!_ 📤`;
                
              await new Promise(r => setTimeout(r, 1500));
              await sendWa(senderJid, shareMsg);

              for (const adminNum of adminNumbers) {
                await sendWa(adminNum, `📢 *Iklan Baru Tayang*\n\n${shareMsg}`).catch(() => {});
              }

              await Promise.all([
                postToGroup(l, settings?.admin),
                notifyMatchingWanted(supa, l),
                notifyCategorySubscribers(supa, l),
              ].map(p => p.catch(() => {})));
            }
          }
          return NextResponse.json({ ok: true, state: "receipt_verified_bulk" });

        } else {
          // Default: pembayaran iklan baru
          const { data: updatedListing } = await supa
            .from("listings")
            .update({ status: "active", bumped_at: new Date().toISOString() })
            .eq("id", pendingPayment.listings.id)
            .select()
            .single();

          if (updatedListing) {
            const productSlug = buildSlug(updatedListing.title, updatedListing.id);
            const productUrl = `${baseUrl}/produk/${productSlug}`;

            const confirmMsg = `🎉 *PEMBAYARAN BERHASIL!*\n\n` +
              `Struk *Rp ${pendingPayment.amount.toLocaleString("id-ID")}* udah aku cek, aman 👍\n\n` +
              `Iklan *"${updatedListing.title}"* sudah tayang dan disebarkan ke Grup WA! 🚀`;

            const shareMsg = `🛒 *${updatedListing.title}* — Rp ${Number(updatedListing.price).toLocaleString("id-ID")}\n` +
              `🏷️ ${updatedListing.category}\n` +
              `👉 ${productUrl}\n\n` +
              `_Klik & bagikan link iklanmu ke teman-teman!_ 📤`;

            await sendWa(senderJid, confirmMsg);
            await new Promise(r => setTimeout(r, 1500));
            await sendWa(senderJid, shareMsg);

            // Send notification to superadmins
            const to62 = n => (n || "").replace(/\D/g, "").replace(/^0/, "62");
            const rawAdmins = [process.env.ADMIN_WA || "", process.env.SUPER_ADMIN_WA || ""].join(",");
            const adminNumbers = [...new Set(rawAdmins.split(",").map(a => to62(a.trim())).filter(Boolean))];
            
            for (const adminNum of adminNumbers) {
              await sendWa(adminNum, `📢 *Iklan Baru Tayang*\n\n${shareMsg}`).catch(() => {});
            }

            await Promise.all([
              postToGroup(updatedListing, settings?.admin),
              notifyMatchingWanted(supa, updatedListing),
              notifyCategorySubscribers(supa, updatedListing),
            ].map(p => p.catch(() => {})));
          }
          return NextResponse.json({ ok: true, state: "receipt_verified" });
        }

      } catch (err) {
        console.error("AI Receipt Error via Baileys:", err);
        await sendWa(senderJid, "❌ Terjadi kendala saat membaca struk: " + err.message);
        return NextResponse.json({ ok: true, error: err.message });
      }
    }

    // ==========================================
    // STATE 2b: Pembayaran Wanted Listing Pending
    // ==========================================
    if (pendingWantedPayment && !isAdminCommand) {
      const qrisUrl = getQrisUrl();
      if (!file) {
        if (message && message.toLowerCase().trim() === "batal") {
          await supa.from("payments").delete().eq("id", pendingWantedPayment.id);
          await supa.from("wanted_listings").delete().eq("id", pendingWantedPayment.wanted.id);
          await sendWa(senderJid, "🗑️ Tagihan dan permintaan dicari telah dibatalkan.");
          return NextResponse.json({ ok: true, state: "wanted_payment_cancelled" });
        }
        await sendWa(senderJid,
          `⚠️ *Tagihan Belum Lunas*\n\n` +
          `🔍 Posting Dicari: *${pendingWantedPayment.wanted.title}*\n` +
          `💳 Nominal: *Rp ${Number(pendingWantedPayment.amount).toLocaleString("id-ID")}*\n\n` +
          `Scan QRIS di bawah dan transfer nominal di atas.\n` +
          `Setelah transfer, kirim *screenshot struk* ke sini.\n\n` +
          `_(Ketik *BATAL* untuk batalkan)_`,
          qrisUrl
        );
        return NextResponse.json({ ok: true, state: "wanted_waiting_receipt" });
      }

      await sendWa(senderJid, "⏳ Bentar ya, lagi dicek…");
      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const extractedData = await verifyReceiptImage(buffer, file.type || "image/jpeg");
        if (!extractedData.is_struk_valid) {
          await sendWa(senderJid, "Ini bukan struk transfer ya kak 🙏 Coba kirim ulang yg jelas.");
          return NextResponse.json({ ok: true, state: "wanted_invalid_receipt" });
        }
        const recvW = checkReceiverName(extractedData.penerima);
        if (!recvW.ok) {
          await sendWa(senderJid, `❌ ${recvW.reason}\nPastikan transfer ke rekening resmi Jual Beli USU/Polmed ya kak 🙏`);
          return NextResponse.json({ ok: true, state: "wanted_receiver_mismatch" });
        }
        const nominalW = Number(extractedData.nominal);
        if (!Number.isFinite(nominalW) || nominalW < Number(pendingWantedPayment.amount)) {
          await sendWa(senderJid,
            `❌ *Nominal Kurang / Tak Terbaca*\n\nNominal di struk: *Rp ${Number.isFinite(nominalW) ? nominalW.toLocaleString("id-ID") : "?"}*\n` +
            `Tagihan: *Rp ${Number(pendingWantedPayment.amount).toLocaleString("id-ID")}*\n\nTransfer kurang atau tak terbaca. Kirim ulang struk yang jelas ya kak.`
          );
          return NextResponse.json({ ok: true, state: "wanted_invalid_amount" });
        }
        // Anti daur-ulang + klaim atomik.
        const refIdW = String(extractedData.ref_id || "").trim();
        if (refIdW) {
          const { data: dupW } = await supa.from("payments").select("id").eq("status", "paid").eq("meta->>receipt_ref", refIdW).limit(1);
          if (dupW && dupW.length > 0) {
            await sendWa(senderJid, "Struk ini kayaknya udah pernah dipakai kak 🙏 Kirim struk yang baru ya.");
            return NextResponse.json({ ok: true, state: "wanted_receipt_reused" });
          }
        }
        const { data: claimedW } = await supa.from("payments")
          .update({ status: "paid", meta: { ...(pendingWantedPayment.meta || {}), receipt_ref: refIdW || null } })
          .eq("id", pendingWantedPayment.id).eq("status", "pending").select("id").maybeSingle();
        if (!claimedW) return NextResponse.json({ ok: true, state: "already_paid" });
        await supa.from("wanted_listings").update({ status: "active" }).eq("id", pendingWantedPayment.wanted.id);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
        const confirmMsg =
          `🎉 *Pembayaran Berhasil!*\n\n` +
          `🔍 Permintaan *"${pendingWantedPayment.wanted.title}"* sekarang aktif tayang.\n\n` +
          `Cek di: ${baseUrl}/dicari`;
        await sendWa(senderJid, confirmMsg);
        const { data: activeWanted } = await supa.from("wanted_listings").select("*").eq("id", pendingWantedPayment.wanted.id).single();
        if (activeWanted) await postWantedToGroup(activeWanted).catch(() => {});
        return NextResponse.json({ ok: true, state: "wanted_payment_verified" });
      } catch (err) {
        console.error("Wanted receipt error:", err);
        await sendWa(senderJid, "❌ Terjadi kendala saat membaca struk: " + err.message);
        return NextResponse.json({ ok: true, error: err.message });
      }
    }

    // ==========================================
    // STATE 3: TERIMA / TOLAK Nego In-App
    // ==========================================
    if (message && !file && !isForcedAd) {
      const textMsg = message.toUpperCase().trim();
      if (textMsg.startsWith("TERIMA ") || textMsg.startsWith("TOLAK ")) {
        const parts = textMsg.split(" ");
        const action = parts[0]; // TERIMA / TOLAK
        const shortId = parts[1]; // listing_code numerik

        if (shortId && parseInt(shortId) > 0) {
          const { data: offers } = await supa
            .from("price_offers")
            .select("*, listings(title, seller_wa, seller_name)")
            .eq("listing_code", parseInt(shortId))
            .eq("status", "pending");

          if (offers && offers.length > 0) {
            const offer = offers[0];
            // Pastikan penjual sesuai
            if (offer.listings.seller_wa === normalizedWa) {
              const newStatus = action === "TERIMA" ? "accepted" : "rejected";
              await supa.from("price_offers").update({ status: newStatus }).eq("id", offer.id);

              if (action === "TERIMA") {
                await sendWa(senderJid, `✅ Oke, kamu *TERIMA* tawaran Rp ${offer.offer_price.toLocaleString("id-ID")} buat *${offer.listings.title}*.\n\n📞 Langsung hubungi pembelinya ya buat janjian COD:\nwa.me/${offer.buyer_wa}`);
              } else {
                await sendWa(senderJid, `❌ Oke, kamu *TOLAK* tawaran Rp ${offer.offer_price.toLocaleString("id-ID")} buat *${offer.listings.title}*.`);
              }

              // Notif ke pembeli
              await notifyBuyerOfferResult(offer.buyer_wa, offer.buyer_name, {
                listing_title: offer.listings.title,
                offer_price: offer.offer_price,
                seller_wa: action === "TERIMA" ? offer.listings.seller_wa : null,
                accepted: action === "TERIMA"
              });

              return NextResponse.json({ ok: true, state: "offer_responded" });
            }
          }
        }
      } else if (textMsg === "STOP") {
        const { error } = await supa
          .from("category_subscriptions")
          .delete()
          .eq("buyer_wa", normalizedWa);

        if (!error) {
          await sendWa(senderJid, "✅ Oke, kamu udah *berhenti langganan* notif kategori. Aku nggak bakal kirim notif itu lagi ya kak.");
        } else {
          await sendWa(senderJid, "Waduh, ada kendala pas proses berhenti langganannya kak. Coba lagi ya.");
        }
        return NextResponse.json({ ok: true, state: "unsubscribed" });

      // ==========================================
      // PERPANJANG — Perpanjang masa iklan via WA
      // ==========================================
      } else if (textMsg === "PERPANJANG") {
        const { data: myListings } = await supa
          .from("listings")
          .select("id, title, status, expires_at")
          .eq("seller_wa", normalizedWa)
          .in("status", ["active", "expired"])
          .order("expires_at", { ascending: true })
          .limit(5);

        if (!myListings || myListings.length === 0) {
          await sendWa(senderJid, "📭 Anda tidak memiliki iklan aktif atau expired yang bisa diperpanjang.\n\nKirim foto + deskripsi barang untuk pasang iklan baru!");
          return NextResponse.json({ ok: true, state: "perpanjang_no_listings" });
        }

        let listMsg = `📋 *Iklan Anda:*\n\n`;
        myListings.forEach((l, i) => {
          const exp = l.expires_at ? new Date(l.expires_at).toLocaleDateString("id-ID") : "—";
          const statusLabel = l.status === "expired" ? "❌ Expired" : "✅ Aktif";
          listMsg += `${i + 1}. *${l.title}*\n   ${statusLabel} | Berakhir: ${exp}\n   Kode: \`${l.listing_code}\`\n\n`;
        });
        listMsg += `Balas: *PERPANJANG [kode]* untuk perpanjang iklan.\nContoh: PERPANJANG ${myListings[0].listing_code}`;
        await sendWa(senderJid, listMsg);
        return NextResponse.json({ ok: true, state: "perpanjang_list_sent" });

      } else if (textMsg.startsWith("PERPANJANG ") && textMsg.split(" ").length === 2) {
        const shortId = textMsg.split(" ")[1];
        const { data: listings } = await supa
          .from("listings")
          .select("id, title, expires_at, status")
          .eq("listing_code", parseInt(shortId))
          .eq("seller_wa", normalizedWa)
          .in("status", ["active", "expired"]);

        if (!listings || listings.length === 0) {
          await sendWa(senderJid, `Iklan kode *${shortId}* nggak ketemu atau bukan punya kamu kak.\n\nKetik *PERPANJANG* buat liat daftar iklanmu ya.`);
          return NextResponse.json({ ok: true, state: "perpanjang_not_found" });
        }

        const listing = listings[0];
        const renewalSettings = await getSettings();
        const renewDays = Number(renewalSettings.pricing?.listingDays) || 14;
        const renewFee = Number(renewalSettings.pricing?.renewalFee) || 2000;
        const totalAmount = renewFee;
        const orderId = `RENEW-${listing.listing_code}-${Date.now()}`;

        await supa.from("payments").insert({
          listing_id: listing.id,
          type: "renewal",
          amount: totalAmount,
          status: "pending",
          midtrans_order_id: orderId,
          meta: { renew_days: renewDays },
        });

        const qrisUrl = getQrisUrl();
        const renewMsg =
          `🔄 *Perpanjang Iklan*\n\n` +
          `📦 *${listing.title}*\n` +
          `📅 Perpanjang +${renewDays} hari\n` +
          `💳 Biaya: *Rp ${totalAmount.toLocaleString("id-ID")}*\n\n` +
          `Scan QRIS di bawah dan transfer nominal di atas.\n` +
          `Setelah transfer, kirim *screenshot struk* ke sini.`;
        await sendWa(senderJid, renewMsg, qrisUrl);
        return NextResponse.json({ ok: true, state: "perpanjang_payment_created" });

      // ==========================================
      // UPGRADE — Upgrade iklan (featured/autobump)
      // ==========================================
      } else if (textMsg === "UPGRADE") {
        const upgradeMenu =
          `⭐ *Menu Upgrade Iklan*\n\n` +
          `Pilih layanan upgrade:\n\n` +
          `1️⃣ *FEATURED* (Rp 5.000/hari)\n   Iklan muncul di bagian atas & ditandai ⭐\n\n` +
          `2️⃣ *AUTOBUMP* (Rp 15.000/7 hari)\n   Iklan otomatis disundul setiap hari\n\n` +
          `Cara pakai: ketik *UPGRADE FEATURED* atau *UPGRADE AUTOBUMP*\n` +
          `lalu ikuti instruksi selanjutnya.`;
        await sendWa(senderJid, upgradeMenu);
        return NextResponse.json({ ok: true, state: "upgrade_menu_sent" });

      } else if (textMsg.startsWith("UPGRADE FEATURED") || textMsg.startsWith("UPGRADE AUTOBUMP")) {
        const upgradeType = textMsg.startsWith("UPGRADE FEATURED") ? "featured" : "autobump";
        const { data: myListings } = await supa
          .from("listings")
          .select("id, title")
          .eq("seller_wa", normalizedWa)
          .eq("status", "active")
          .order("bumped_at", { ascending: false })
          .limit(5);

        if (!myListings || myListings.length === 0) {
          await sendWa(senderJid, "📭 Anda tidak memiliki iklan aktif yang bisa di-upgrade.");
          return NextResponse.json({ ok: true, state: "upgrade_no_listings" });
        }

        let listMsg = `⭐ *Pilih Iklan untuk di-${upgradeType === "featured" ? "Featured" : "AutoBump"}:*\n\n`;
        myListings.forEach((l, i) => {
          listMsg += `${i + 1}. *${l.title}*\n   Kode: \`${l.listing_code}\`\n\n`;
        });
        const exampleCmd = upgradeType === "featured" ? `UPGRADE FEATURED ${myListings[0].listing_code} 3` : `UPGRADE AUTOBUMP ${myListings[0].listing_code}`;
        listMsg += upgradeType === "featured"
          ? `Balas: *UPGRADE FEATURED [kode] [hari]*\nContoh: ${exampleCmd}`
          : `Balas: *UPGRADE AUTOBUMP [kode]*\nContoh: ${exampleCmd}`;
        await sendWa(senderJid, listMsg);
        return NextResponse.json({ ok: true, state: "upgrade_list_sent" });

      // ==========================================
      // IKLANKU — Lihat daftar iklan saya
      // ==========================================
      } else if (textMsg === "IKLANKU") {
        const { data: myListings } = await supa
          .from("listings")
          .select("id, listing_code, title, status, expires_at, price, featured, featured_until, auto_bump_until")
          .eq("seller_wa", normalizedWa)
          .not("status", "in", '("deleted")')
          .order("created_at", { ascending: false })
          .limit(8);

        if (!myListings || myListings.length === 0) {
          const noListMsg = "📭 Kamu belum punya iklan.\n\nKirim *foto + deskripsi barang* untuk pasang iklan baru!";
          await sendWa(senderJid, noListMsg);
          return NextResponse.json({ ok: true, state: "iklanku_empty", bot_reply: noListMsg });
        }

        const baseUrlIklanku = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
        let listMsg = `📋 *Iklanmu (${myListings.length})*\n\n`;
        myListings.forEach((l, i) => {
          const emo = l.status === "active" ? "✅" : l.status === "sold" ? "🎉" : l.status === "deletion_pending" ? "🗑️" : "⏳";
          const label = l.status === "active" ? "Aktif" : l.status === "sold" ? "Terjual" : l.status === "deletion_pending" ? "Nunggu hapus" : "Pending";
          const exp = l.expires_at ? new Date(l.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-";
          const shortId = l.listing_code;
          const now = new Date();
          const isFeatured = l.featured && l.featured_until && new Date(l.featured_until) > now;
          const isAutoBump = l.auto_bump_until && new Date(l.auto_bump_until) > now;
          const upgradeBadge = isFeatured ? ` ⭐` : isAutoBump ? ` 🔄` : "";
          listMsg += `${i + 1}. *${l.title}*  \`${shortId}\`${upgradeBadge}\n`;
          listMsg += `    ${emo} ${label} · Rp ${Number(l.price).toLocaleString("id-ID")} · s/d ${exp}\n\n`;
        });
        listMsg += `_Perpanjang: *PERPANJANG [kode]*  ·  Terjual: *HAPUS LAKU [kode]*_`;
        await sendWa(senderJid, listMsg);
        return NextResponse.json({ ok: true, state: "iklanku_sent", bot_reply: listMsg });

      // ==========================================
      // HAPUS — Hapus iklan via WA
      // ==========================================
      } else if (textMsg === "HAPUS") {
        const { data: hapusList } = await supa
          .from("listings")
          .select("id, title, status, expires_at")
          .eq("seller_wa", normalizedWa)
          .in("status", ["active", "expired", "pending"])
          .order("created_at", { ascending: false })
          .limit(5);

        if (!hapusList || hapusList.length === 0) {
          await sendWa(senderJid, "📭 Tidak ada iklan yang bisa dihapus.\n\nKetik *IKLANKU* untuk lihat semua iklan.");
          return NextResponse.json({ ok: true, state: "hapus_empty" });
        }

        let hapusMsg = `🗑️ *Pilih iklan yang mau dihapus:*\n\n`;
        hapusList.forEach((l, i) => {
          hapusMsg += `${i + 1}. *${l.title}*\n   Kode: \`${l.listing_code}\`\n\n`;
        });
        hapusMsg +=
          `Balas dengan:\n` +
          `✅ *HAPUS LAKU [kode]* — barang sudah terjual\n` +
          `⏳ *HAPUS GALAKU [kode]* — barang tidak laku (butuh konfirmasi admin)`;
        await sendWa(senderJid, hapusMsg);
        return NextResponse.json({ ok: true, state: "hapus_menu" });

      } else if (textMsg.startsWith("HAPUS ")) {
        const hapusParts = textMsg.split(" ");
        const hapusSubCmd = hapusParts[1]; // LAKU / GALAKU / [kode langsung]

        if (hapusSubCmd === "LAKU" && hapusParts[2]) {
          const shortId = hapusParts[2];
          const { data: hapusListings } = await supa
            .from("listings")
            .select("id, title, status")
            .eq("listing_code", parseInt(shortId))
            .eq("seller_wa", normalizedWa)
            .in("status", ["active", "expired", "pending"]);

          if (!hapusListings || hapusListings.length === 0) {
            await sendWa(senderJid, `❌ Iklan kode *${shortId}* tidak ditemukan atau bukan milik kamu.\n\nKetik *IKLANKU* untuk lihat daftar iklan.`);
            return NextResponse.json({ ok: true, state: "hapus_not_found" });
          }

          const hapusListing = hapusListings[0];
          await supa.from("listings").update({ status: "sold" }).eq("id", hapusListing.id);
          const soldMsg =
            `🎉 *Selamat! Barang Terjual!*\n\n` +
            `📦 *${hapusListing.title}* sudah ditandai sebagai *terjual*.\n\n` +
            `Terima kasih telah berjualan di Jual Beli USU! 🙌\n` +
            `Pasang iklan baru kapan saja ya!`;
          await sendWa(senderJid, soldMsg);
          return NextResponse.json({ ok: true, state: "hapus_sold", bot_reply: soldMsg });

        } else if (hapusSubCmd === "GALAKU" && hapusParts[2]) {
          const shortId = hapusParts[2];
          const { data: hapusListings } = await supa
            .from("listings")
            .select("id, title, status")
            .eq("listing_code", parseInt(shortId))
            .eq("seller_wa", normalizedWa)
            .in("status", ["active", "expired", "pending"]);

          if (!hapusListings || hapusListings.length === 0) {
            await sendWa(senderJid, `❌ Iklan kode *${shortId}* tidak ditemukan atau bukan milik kamu.\n\nKetik *IKLANKU* untuk lihat daftar iklan.`);
            return NextResponse.json({ ok: true, state: "hapus_not_found" });
          }

          const hapusListing = hapusListings[0];
          await supa.from("listings").update({ status: "deletion_pending" }).eq("id", hapusListing.id);

          const adminNumbers = (process.env.ADMIN_WA || "").split(",").map(a => a.trim()).filter(Boolean);
          if (adminNumbers.length > 0) {
            const adminMsg =
              `🗑️ *Permintaan Hapus Iklan*\n\n` +
              `Penjual: ${normalizedWa}\n` +
              `Iklan: *${hapusListing.title}*\n` +
              `Alasan: Barang tidak laku\n\n` +
              `✅ Setuju → ketik: *APPROVE ${hapusListing.listing_code}*\n` +
              `❌ Tolak → ketik: *REJECT ${hapusListing.listing_code}*`;
            for (const adminNum of adminNumbers) {
              await sendWa(adminNum, adminMsg).catch(() => {});
            }
          }

          const galakuMsg =
            `✅ *Permintaan Terkirim ke Admin*\n\n` +
            `Iklan *"${hapusListing.title}"* menunggu konfirmasi admin.\n\n` +
            `Admin akan menghubungi dalam 1×24 jam. Iklan masih tayang sampai admin konfirmasi.`;
          await sendWa(senderJid, galakuMsg);
          return NextResponse.json({ ok: true, state: "hapus_galaku_requested", bot_reply: galakuMsg });

        } else if (hapusSubCmd && parseInt(hapusSubCmd) > 0) {
          // HAPUS [kode] langsung → tanya alasan
          const shortId = hapusSubCmd;
          const { data: hapusListings } = await supa
            .from("listings")
            .select("id, title, status")
            .eq("listing_code", parseInt(shortId))
            .eq("seller_wa", normalizedWa)
            .in("status", ["active", "expired", "pending"]);

          if (!hapusListings || hapusListings.length === 0) {
            await sendWa(senderJid, `❌ Iklan kode *${shortId}* tidak ditemukan atau bukan milik kamu.\n\nKetik *IKLANKU* untuk lihat daftar iklan.`);
            return NextResponse.json({ ok: true, state: "hapus_not_found" });
          }

          const hapusListing = hapusListings[0];
          const alasanMsg =
            `🗑️ *Hapus Iklan: ${hapusListing.title}*\n\n` +
            `Pilih alasan:\n\n` +
            `✅ *HAPUS LAKU ${shortId}*\n` +
            `   Barang sudah terjual (langsung hapus, gratis)\n\n` +
            `⏳ *HAPUS GALAKU ${shortId}*\n` +
            `   Barang tidak laku (minta konfirmasi admin)`;
          await sendWa(senderJid, alasanMsg);
          return NextResponse.json({ ok: true, state: "hapus_reason_asked" });
        }

      // ==========================================
      // APPROVE / REJECT — Admin konfirmasi hapus
      // ==========================================
      } else if (textMsg.startsWith("POST IG ") && textMsg.split(" ").length === 3) {
        if (!isAdminWa(normalizedWa)) {
          return NextResponse.json({ ok: true, ignored: true });
        }
        
        const shortId = textMsg.split(" ")[2];
        const { data: listingData } = await supa
          .from("listings")
          .select("*")
          .eq("listing_code", parseInt(shortId))
          .maybeSingle();

        if (!listingData) {
          await sendWa(senderJid, `❌ Iklan dengan kode *${shortId}* tidak ditemukan.`);
          return NextResponse.json({ ok: true });
        }

        const settings = await getSettings().catch(() => null);
        const metaCfg = settings?.meta;
        if (!metaCfg?.accessToken || (!metaCfg?.fbPageId && !metaCfg?.igUserId)) {
          await sendWa(senderJid, `❌ Pengaturan Meta belum lengkap. Isi Token dan Page ID di panel admin.`);
          return NextResponse.json({ ok: true });
        }

        await sendWa(senderJid, `⏳ Sedang memproses posting iklan *${shortId}* ke Meta (IG & FB)...`);

        const priceText = listingData.price > 0 ? `Rp ${listingData.price.toLocaleString("id-ID")}` : "GRATIS";
        const caption = `${listingData.title}\n\nHarga: ${priceText}\nKondisi: ${listingData.stock > 1 ? "Tersedia" : "Terbatas"}\nLokasi: ${listingData.campus} - ${listingData.area || "-"}\n\n${listingData.description || ""}\n\n👉 Pesan sekarang via WA (Cek di website)\n\n#JualBeliUSU #BarangBekas #AnakUSU`;
        
        const imgUrl = (listingData.images && listingData.images[0]) || `https://jualbeliusu.com/api/og?id=${listingData.id}`;
        
        let results = [];
        if (metaCfg.fbPageId) {
          try {
            await postToFacebook(metaCfg.fbPageId, metaCfg.accessToken, imgUrl, caption);
            results.push("Facebook ✅");
          } catch (e) {
            results.push(`Facebook ❌ (${e.message})`);
          }
        }
        if (metaCfg.igUserId) {
          try {
            await postToInstagram(metaCfg.igUserId, metaCfg.accessToken, imgUrl, caption);
            results.push("Instagram ✅");
          } catch (e) {
            results.push(`Instagram ❌ (${e.message})`);
          }
        }
        await sendWa(senderJid, `🎉 Hasil Meta Auto-Post:\n\n${results.join("\n")}`);
        return NextResponse.json({ ok: true });

      } else if (textMsg.startsWith("APPROVE ") || textMsg.startsWith("REJECT ")) {
        if (!isAdminWa(normalizedWa)) {
          return NextResponse.json({ ok: true, ignored: true });
        }

        const isApprove = textMsg.startsWith("APPROVE ");
        const approveShortId = textMsg.split(" ")[1];
        const { data: pendingListings } = await supa
          .from("listings")
          .select("id, title, seller_wa, seller_name")
          .eq("listing_code", parseInt(approveShortId))
          .eq("status", "deletion_pending");

        if (!pendingListings || pendingListings.length === 0) {
          await sendWa(senderJid, `❌ Tidak ada permintaan hapus untuk kode *${approveShortId}*.`);
          return NextResponse.json({ ok: true, state: "admin_action_not_found" });
        }

        const pendingListing = pendingListings[0];
        if (isApprove) {
          await supa.from("listings").update({ status: "deleted" }).eq("id", pendingListing.id);
          await sendWa(senderJid, `✅ Iklan *${pendingListing.title}* berhasil dihapus.`);
          await sendWa(pendingListing.seller_wa,
            `✅ *Iklan Kamu Dihapus*\n\nIklan *"${pendingListing.title}"* sudah dihapus oleh admin.\nTerima kasih!`
          ).catch(() => {});
        } else {
          await supa.from("listings").update({ status: "active" }).eq("id", pendingListing.id);
          await sendWa(senderJid, `❌ Permintaan hapus *${pendingListing.title}* ditolak, iklan dikembalikan aktif.`);
          await sendWa(pendingListing.seller_wa,
            `❌ *Permintaan Hapus Ditolak*\n\nAdmin tidak menyetujui penghapusan iklan *"${pendingListing.title}"*. Iklan kamu tetap tayang.\n\nHubungi admin jika ada pertanyaan.`
          ).catch(() => {});
        }
        return NextResponse.json({ ok: true, state: isApprove ? "admin_approved" : "admin_rejected" });

      } else if (textMsg.match(/^UPGRADE FEATURED (\d+) (\d+)$/i) || textMsg.match(/^UPGRADE AUTOBUMP (\d+)$/i)) {
        const isFeatured = textMsg.startsWith("UPGRADE FEATURED");
        const parts = textMsg.split(" ");
        const shortId = parts[2];
        const days = isFeatured ? Math.min(30, Math.max(1, parseInt(parts[3]) || 1)) : 7;

        const { data: listings } = await supa
          .from("listings")
          .select("id, title")
          .eq("listing_code", parseInt(shortId))
          .eq("seller_wa", normalizedWa)
          .eq("status", "active");

        if (!listings || listings.length === 0) {
          await sendWa(senderJid, `❌ Iklan dengan kode *${shortId}* tidak ditemukan.\n\nKetik *UPGRADE* untuk melihat menu upgrade.`);
          return NextResponse.json({ ok: true, state: "upgrade_not_found" });
        }

        const listing = listings[0];
        const upgradeSettings = await getSettings();
        const feePerDay = isFeatured
          ? (Number(upgradeSettings.pricing?.featuredPerDay) || 5000)
          : (Number(upgradeSettings.pricing?.bump) * 7 || 15000);
        const baseFee = isFeatured ? feePerDay * days : feePerDay;
        const totalAmount = baseFee;
        const upgradeTypeKey = isFeatured ? "featured" : "autobump";
        const orderId = `UPGRADE-${upgradeTypeKey.toUpperCase()}-${listing.listing_code}-${Date.now()}`;

        await supa.from("payments").insert({
          listing_id: listing.id,
          type: upgradeTypeKey,
          amount: totalAmount,
          status: "pending",
          midtrans_order_id: orderId,
          meta: { days },
        });

        const qrisUrl = getQrisUrl();
        const upgradeMsg = isFeatured
          ? `⭐ *Featured ${days} Hari*\n\n📦 *${listing.title}*\n💳 Biaya: *Rp ${totalAmount.toLocaleString("id-ID")}*\n\nScan QRIS di bawah dan transfer nominal di atas.\nSetelah transfer, kirim *screenshot struk* ke sini.`
          : `🔄 *AutoBump 7 Hari*\n\n📦 *${listing.title}*\n💳 Biaya: *Rp ${totalAmount.toLocaleString("id-ID")}*\n\nScan QRIS di bawah dan transfer nominal di atas.\nSetelah transfer, kirim *screenshot struk* ke sini.`;
        await sendWa(senderJid, upgradeMsg, qrisUrl);
        return NextResponse.json({ ok: true, state: "upgrade_payment_created" });

      // ==========================================
      // BUMP — Sundul iklan ke atas
      // ==========================================
      } else if (textMsg === "BUMP") {
        const { data: bumpList } = await supa
          .from("listings")
          .select("id, title, bumped_at")
          .eq("seller_wa", normalizedWa)
          .eq("status", "active")
          .order("bumped_at", { ascending: true })
          .limit(5);

        if (!bumpList || bumpList.length === 0) {
          await sendWa(senderJid, "📭 Tidak ada iklan aktif yang bisa di-bump.\n\nKetik *IKLANKU* untuk cek status iklan.");
          return NextResponse.json({ ok: true, state: "bump_empty" });
        }

        const bumpSettings = await getSettings();
        const bumpFee = Number(bumpSettings.pricing?.bump) || 2000;
        let bumpListMsg = `🔼 *Pilih Iklan untuk di-Bump:*\n\n`;
        bumpList.forEach((l, i) => {
          const bumpedAt = l.bumped_at ? new Date(l.bumped_at).toLocaleDateString("id-ID") : "-";
          bumpListMsg += `${i + 1}. *${l.title}*\n   Terakhir sundul: ${bumpedAt}\n   Kode: \`${l.listing_code}\`\n\n`;
        });
        bumpListMsg += `Biaya bump: *Rp ${bumpFee.toLocaleString("id-ID")}* per iklan\n\nBalas: *BUMP [kode]*`;
        await sendWa(senderJid, bumpListMsg);
        return NextResponse.json({ ok: true, state: "bump_menu" });

      } else if (textMsg.startsWith("BUMP ") && textMsg.split(" ").length === 2) {
        const bumpShortId = textMsg.split(" ")[1];
        const { data: bumpListings } = await supa
          .from("listings")
          .select("id, title")
          .eq("listing_code", parseInt(bumpShortId))
          .eq("seller_wa", normalizedWa)
          .eq("status", "active");

        if (!bumpListings || bumpListings.length === 0) {
          await sendWa(senderJid, `❌ Iklan kode *${bumpShortId}* tidak ditemukan.\n\nKetik *IKLANKU* untuk lihat daftar iklan.`);
          return NextResponse.json({ ok: true, state: "bump_not_found" });
        }

        const bumpListing = bumpListings[0];

        // Cek free_bumps dari referral sebelum buat tagihan
        const { data: bumpProfile } = await supa.from("seller_profiles").select("free_bumps").eq("wa", normalizedWa).maybeSingle();
        const freeBumpsLeft = bumpProfile?.free_bumps || 0;

        if (freeBumpsLeft > 0) {
          await supa.from("listings").update({ bumped_at: new Date().toISOString() }).eq("id", bumpListing.id);
          await supa.from("seller_profiles").update({ free_bumps: freeBumpsLeft - 1 }).eq("wa", normalizedWa);
          const freeBumpMsg =
            `🎉 *Bump Gratis Digunakan!*\n\n` +
            `📦 *${bumpListing.title}* berhasil dinaikkan ke atas.\n` +
            `🎁 Sisa bump gratis: *${freeBumpsLeft - 1}*\n\n` +
            `_Bump gratis didapat dari referral. Ajak teman pakai kode referralmu!_`;
          await sendWa(senderJid, freeBumpMsg);
          return NextResponse.json({ ok: true, state: "bump_free_used", bot_reply: freeBumpMsg });
        }

        const bumpSettings = await getSettings();
        const bumpFee = Number(bumpSettings.pricing?.bump) || 2000;
        const bumpTotal = bumpFee;
        const bumpOrderId = `BUMP-${bumpListing.listing_code}-${Date.now()}`;

        await supa.from("payments").insert({
          listing_id: bumpListing.id,
          type: "bump",
          amount: bumpTotal,
          status: "pending",
          midtrans_order_id: bumpOrderId,
        });

        const bumpQris = getQrisUrl();
        const bumpMsg =
          `🔼 *Bump Iklan*\n\n` +
          `📦 *${bumpListing.title}*\n` +
          `💳 Biaya: *Rp ${bumpTotal.toLocaleString("id-ID")}*\n\n` +
          `Scan QRIS di bawah dan transfer nominal di atas.\n` +
          `Setelah transfer, kirim *screenshot struk* ke sini.`;
        await sendWa(senderJid, bumpMsg, bumpQris);
        return NextResponse.json({ ok: true, state: "bump_payment_created" });

      // ==========================================
      // EDIT — Edit harga / deskripsi iklan
      // ==========================================
      } else if (textMsg === "EDIT") {
        await sendWa(senderJid,
          `✏️ *Edit Iklan*\n\n` +
          `Format perintah:\n\n` +
          `• *EDIT [kode] HARGA [nominal]*\n  Contoh: EDIT abc12345 HARGA 150000\n\n` +
          `• *EDIT [kode] DESC [deskripsi baru]*\n  Contoh: EDIT abc12345 DESC Laptop mulus, baterai bagus\n\n` +
          `Ketik *IKLANKU* untuk lihat kode iklan kamu.`
        );
        return NextResponse.json({ ok: true, state: "edit_help" });

      } else if (textMsg.startsWith("EDIT ")) {
        const editParts = message.trim().split(/\s+/); // pakai message asli untuk preserve case
        const editShortId = editParts[1];
        const editSubCmd = (editParts[2] || "").toUpperCase();

        const { data: editListings } = await supa
          .from("listings")
          .select("id, title, price, description")
          .eq("listing_code", parseInt((editShortId || "")))
          .eq("seller_wa", normalizedWa)
          .eq("status", "active");

        if (!editListings || editListings.length === 0) {
          await sendWa(senderJid, `❌ Iklan kode *${editShortId}* tidak ditemukan atau bukan milik kamu.\n\nKetik *IKLANKU* untuk lihat daftar iklan.`);
          return NextResponse.json({ ok: true, state: "edit_not_found" });
        }

        const editListing = editListings[0];

        if (editSubCmd === "HARGA") {
          const newPrice = parseInt(editParts[3]);
          if (!newPrice || newPrice < 0) {
            await sendWa(senderJid, `❌ Harga tidak valid. Contoh: *EDIT ${editShortId} HARGA 150000*`);
            return NextResponse.json({ ok: true, state: "edit_invalid_price" });
          }
          const oldPrice = Number(editListing.price);
          await supa.from("listings").update({ price: newPrice }).eq("id", editListing.id);
          const editHargaMsg = `✅ *Harga diperbarui!*\n\n📦 *${editListing.title}*\n💰 Harga baru: *Rp ${newPrice.toLocaleString("id-ID")}*`;
          await sendWa(senderJid, editHargaMsg);

          // Notif buyer yang pernah tawar jika harga turun
          if (newPrice < oldPrice) {
            const { data: prevOffers } = await supa
              .from("price_offers")
              .select("buyer_wa, buyer_name")
              .eq("listing_id", editListing.id)
              .eq("status", "pending");
            const uniqueBuyers = [...new Map((prevOffers || []).filter(b => b.buyer_wa).map(b => [b.buyer_wa, b])).values()];
            const dropAmount = oldPrice - newPrice;
            for (const buyer of uniqueBuyers) {
              const dropMsg =
                `📉 *Harga Turun!*\n\n` +
                `Iklan *"${editListing.title}"* yang pernah kamu tawar baru saja turun harga:\n\n` +
                `~~Rp ${oldPrice.toLocaleString("id-ID")}~~ → *Rp ${newPrice.toLocaleString("id-ID")}*\n` +
                `Hemat *Rp ${dropAmount.toLocaleString("id-ID")}*\n\n` +
                `Hubungi penjual sekarang sebelum kehabisan!`;
              await sendWa(formatWa(buyer.buyer_wa), dropMsg).catch(() => {});
              await new Promise(r => setTimeout(r, 1000));
            }
          }

          return NextResponse.json({ ok: true, state: "edit_price_updated", bot_reply: editHargaMsg });

        } else if (editSubCmd === "DESC") {
          const newDesc = editParts.slice(3).join(" ").trim();
          if (!newDesc) {
            await sendWa(senderJid, `❌ Deskripsi kosong. Contoh: *EDIT ${editShortId} DESC Laptop mulus, baterai bagus*`);
            return NextResponse.json({ ok: true, state: "edit_invalid_desc" });
          }
          await supa.from("listings").update({ description: newDesc }).eq("id", editListing.id);
          const editDescMsg = `✅ *Deskripsi diperbarui!*\n\n📦 *${editListing.title}*\n📝 "${newDesc.slice(0, 100)}${newDesc.length > 100 ? "..." : ""}"`;
          await sendWa(senderJid, editDescMsg);
          return NextResponse.json({ ok: true, state: "edit_desc_updated", bot_reply: editDescMsg });

        } else {
          await sendWa(senderJid,
            `✏️ *Edit Iklan: ${editListing.title}*\n\n` +
            `💰 Harga saat ini: Rp ${Number(editListing.price).toLocaleString("id-ID")}\n\n` +
            `Pilih yang mau diedit:\n` +
            `• *EDIT ${editShortId} HARGA [nominal baru]*\n` +
            `• *EDIT ${editShortId} DESC [deskripsi baru]*`
          );
          return NextResponse.json({ ok: true, state: "edit_choose" });
        }

      // ==========================================
      // SHARE — Dapatkan link iklan siap share
      // ==========================================
      } else if (textMsg.startsWith("SHARE ") && textMsg.split(" ").length === 2) {
        const shareShortId = textMsg.split(" ")[1];
        const { data: shareListings } = await supa
          .from("listings")
          .select("id, title, price, category, condition, seller_wa")
          .eq("listing_code", parseInt(shareShortId))
          .in("status", ["active", "pending"]);

        if (!shareListings || shareListings.length === 0) {
          await sendWa(senderJid, `❌ Iklan kode *${shareShortId}* tidak ditemukan.`);
          return NextResponse.json({ ok: true, state: "share_not_found" });
        }

        const shareListing = shareListings[0];
        const shareBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
        const shareSlug = buildSlug(shareListing.title, shareListing.id);
        const condLabel = shareListing.condition === "new" ? "✨ Baru" : "Bekas";
        const shareMsg =
          `🔗 *Link Iklan Siap Share:*\n\n` +
          `📦 *${shareListing.title}*\n` +
          `💰 Rp ${Number(shareListing.price).toLocaleString("id-ID")} · ${condLabel}\n` +
          `🏷️ ${shareListing.category}\n\n` +
          `👉 ${shareBaseUrl}/produk/${shareSlug}\n\n` +
          `_Salin link di atas dan bagikan ke grup atau teman!_`;
        await sendWa(senderJid, shareMsg);
        return NextResponse.json({ ok: true, state: "share_sent", bot_reply: shareMsg });

      // ==========================================
      // TAGIH — Kirim ulang QRIS pending
      // ==========================================
      } else if (textMsg === "TAGIH") {
        const { data: tagihPayments } = await supa
          .from("payments")
          .select("*, listings!inner(id, title, seller_wa)")
          .eq("status", "pending")
          .eq("listings.seller_wa", normalizedWa)
          .order("created_at", { ascending: false })
          .limit(1);

        const tagihPayment = tagihPayments?.[0];
        if (!tagihPayment) {
          await sendWa(senderJid, "✅ Tidak ada tagihan yang menunggu pembayaran.\n\nKetik *IKLANKU* untuk cek status iklan.");
          return NextResponse.json({ ok: true, state: "tagih_none" });
        }

        const tagihQris = getQrisUrl();
        const typeLabel = tagihPayment.type === "renewal" ? "Perpanjang Iklan"
          : tagihPayment.type === "featured" ? "Featured"
          : tagihPayment.type === "autobump" ? "AutoBump"
          : tagihPayment.type === "bump" ? "Bump"
          : "Biaya Iklan";
        const tagihMsg =
          `🔔 *Tagihan Belum Lunas*\n\n` +
          `📌 ${typeLabel}: *${tagihPayment.listings.title}*\n` +
          `💳 Nominal: *Rp ${Number(tagihPayment.amount).toLocaleString("id-ID")}*\n\n` +
          `Scan QRIS di bawah dan transfer nominal di atas.\n` +
          `Setelah transfer, kirim *screenshot struk* ke sini.\n\n` +
          `_(Ketik *BATAL* untuk batalkan tagihan)_`;
        await sendWa(senderJid, tagihMsg, tagihQris);
        return NextResponse.json({ ok: true, state: "tagih_sent" });

      // ==========================================
      // BATAL — Batalkan tagihan QRIS yang pending
      // ==========================================
      } else if (textMsg === "BATAL") {
        const { data: batalPayments } = await supa
          .from("payments")
          .select("id, type, amount, listing_id, listings!inner(id, title, status, seller_wa)")
          .eq("status", "pending")
          .eq("listings.seller_wa", normalizedWa)
          .order("created_at", { ascending: false })
          .limit(1);

        const batalPayment = batalPayments?.[0];
        if (!batalPayment) {
          await sendWa(senderJid, "✅ Tidak ada tagihan aktif yang bisa dibatalkan.\n\nKetik *IKLANKU* untuk cek status iklan.");
          return NextResponse.json({ ok: true, state: "batal_none" });
        }

        await supa.from("payments").update({ status: "expired" }).eq("id", batalPayment.id);

        if (batalPayment.type === "iklan" && batalPayment.listings.status === "pending") {
          await supa.from("listings").update({ status: "deleted" }).eq("id", batalPayment.listing_id);
        }

        const bLabel = batalPayment.type === "renewal" ? "Perpanjang Iklan"
          : batalPayment.type === "featured" ? "Featured"
          : batalPayment.type === "autobump" ? "AutoBump"
          : batalPayment.type === "bump" ? "Bump"
          : "Iklan";
        await sendWa(senderJid,
          `✅ *Tagihan Dibatalkan*\n\n` +
          `Tagihan *${bLabel}: ${batalPayment.listings.title}* berhasil dibatalkan.\n\n` +
          `Ketik *TAGIH* kalau mau bayar lagi, atau *IKLANKU* buat liat iklanmu.`
        );
        return NextResponse.json({ ok: true, state: "batal_ok" });

      // ==========================================
      // NAMA — Ajukan permintaan ganti nama (butuh persetujuan admin)
      // ==========================================
      } else if (textMsg.startsWith("NAMA ")) {
        const newName = message.replace(/^NAMA\s+/i, "").trim().slice(0, 50);
        if (!newName || newName.length < 2) {
          await sendWa(senderJid, "❌ Nama terlalu pendek.\n\nContoh: *NAMA Budi Santoso*");
          return NextResponse.json({ ok: true, state: "nama_invalid" });
        }

        // Cek sudah ada pending request
        const { data: existingReq } = await supa
          .from("profile_change_requests")
          .select("id")
          .eq("seller_wa", normalizedWa)
          .eq("field", "name")
          .eq("status", "pending")
          .maybeSingle();

        if (existingReq) {
          await sendWa(senderJid, "⏳ Permintaan ganti nama sebelumnya masih menunggu persetujuan admin. Tunggu sebentar ya.");
          return NextResponse.json({ ok: true, state: "nama_request_already_pending" });
        }

        // Ambil nama saat ini
        const { data: currProfile } = await supa
          .from("seller_profiles")
          .select("name")
          .eq("wa", normalizedWa)
          .maybeSingle();

        // Simpan request
        await supa.from("profile_change_requests").insert({
          seller_wa: normalizedWa,
          field: "name",
          current_value: currProfile?.name ?? null,
          requested_value: newName,
          status: "pending",
          requested_via: "wa",
        });

        // Notifikasi admin
        const adminWaEnv = process.env.ADMIN_WA || process.env.SUPER_ADMIN_WA;
        if (adminWaEnv) {
          const adminTarget = adminWaEnv.split(",")[0].trim();
          const adminJid = adminTarget.replace(/\D/g, "") + "@s.whatsapp.net";
          await sendWa(adminJid,
            `📝 *Permintaan Ganti Nama Profil*\n\n` +
            `No. WA: ${normalizedWa}\n` +
            `Nama lama: _${currProfile?.name || "(belum ada)"}_ \n` +
            `Nama baru: *${newName}*\n\n` +
            `Balas:\n` +
            `✅ *SETUJUI NAMA ${normalizedWa}*\n` +
            `❌ *TOLAK NAMA ${normalizedWa}*\n\n` +
            `Atau kelola di /admin/profil_request`
          ).catch(() => {});
        }

        const namaMsg = `⏳ *Permintaan ganti nama dikirim!*\n\n📛 Nama baru: *${newName}*\n\nAdmin akan meninjau dan menyetujui perubahan ini. Anda akan dapat notifikasi setelah diproses.`;
        await sendWa(senderJid, namaMsg);
        return NextResponse.json({ ok: true, state: "nama_request_submitted", bot_reply: namaMsg });

      // ==========================================
      // LANGGANAN — Subscribe notif kategori baru
      // ==========================================
      } else if (textMsg === "LANGGANAN") {
        const { data: activeCats } = await supa
          .from("listings")
          .select("category")
          .eq("status", "active")
          .not("category", "is", null);
        const uniqueCats = [...new Set((activeCats || []).map(c => c.category).filter(Boolean))].sort();

        const { data: mySubscriptions } = await supa
          .from("category_subscriptions")
          .select("category")
          .eq("buyer_wa", normalizedWa);
        const mySubs = (mySubscriptions || []).map(s => s.category);

        let langgananMsg = `🔔 *Langganan Notifikasi Kategori*\n\n`;
        langgananMsg += `Kategori tersedia:\n`;
        uniqueCats.forEach((c, i) => {
          const subscribed = mySubs.includes(c) ? " ✅" : "";
          langgananMsg += `${i + 1}. ${c}${subscribed}\n`;
        });
        langgananMsg +=
          `\n✅ = sudah berlangganan\n\n` +
          `Balas: *LANGGANAN [nama kategori]*\n` +
          `Contoh: LANGGANAN Elektronik\n\n` +
          `Berhenti: *STOP*`;
        await sendWa(senderJid, langgananMsg);
        return NextResponse.json({ ok: true, state: "langganan_menu" });

      } else if (textMsg.startsWith("LANGGANAN ")) {
        const kategori = message.replace(/^LANGGANAN\s+/i, "").trim();
        if (!kategori) {
          await sendWa(senderJid, "❌ Format: *LANGGANAN [kategori]*\nContoh: LANGGANAN Elektronik");
          return NextResponse.json({ ok: true, state: "langganan_invalid" });
        }

        const { data: existingSub } = await supa
          .from("category_subscriptions")
          .select("id")
          .eq("buyer_wa", normalizedWa)
          .ilike("category", kategori)
          .maybeSingle();

        if (existingSub) {
          await sendWa(senderJid, `✅ Kamu sudah berlangganan kategori *${kategori}*.\n\nKetik *STOP* untuk berhenti notifikasi.`);
          return NextResponse.json({ ok: true, state: "langganan_already" });
        }

        const { data: subProfile } = await supa.from("seller_profiles").select("name").eq("wa", normalizedWa).maybeSingle();
        const subName = subProfile?.name || "Pengguna WA";

        await supa.from("category_subscriptions").insert({
          buyer_wa: normalizedWa,
          buyer_name: subName,
          category: kategori,
          campus: "Semua",
        });

        const subMsg =
          `✅ *Berhasil Langganan!*\n\n` +
          `Kamu akan dapat notifikasi tiap ada iklan baru di kategori:\n` +
          `🏷️ *${kategori}*\n\n` +
          `Ketik *LANGGANAN* untuk lihat semua langganan.\n` +
          `Ketik *STOP* untuk berhenti semua notifikasi.`;
        await sendWa(senderJid, subMsg);
        return NextResponse.json({ ok: true, state: "langganan_success", bot_reply: subMsg });

      // ==========================================
      // TANYA [kode] [pesan] — relay pesan buyer ke seller tanpa buka nomor
      // ==========================================
      } else if (textMsg.startsWith("TANYA ")) {
        const tanyaParts = message.trim().split(/\s+/);
        const tanyaKode = tanyaParts[1];
        const tanyaPesan = tanyaParts.slice(2).join(" ").trim();

        if (!tanyaKode || !tanyaPesan) {
          await sendWa(senderJid,
            `❌ Format salah.\n\nGunakan: *TANYA [kode iklan] [pesan kamu]*\n\nContoh:\n*TANYA USU123 Kak masih ada? Bisa COD di Padang Bulan?*`
          );
        } else {
          const { data: tanyaListing } = await supa
            .from("listings")
            .select("id, title, seller_wa, seller_name, listing_code, status")
            .or(`listing_code.ilike.%${tanyaKode}%,id.ilike.${tanyaKode}%`)
            .eq("status", "active")
            .maybeSingle();

          if (!tanyaListing) {
            await sendWa(senderJid, `❌ Iklan *${tanyaKode}* tidak ditemukan atau sudah tidak aktif.`);
          } else if (tanyaListing.seller_wa === normalizedWa) {
            await sendWa(senderJid, `❌ Kamu tidak bisa mengirim pesan ke iklanmu sendiri.`);
          } else {
            const { data: buyerProfile } = await supa
              .from("seller_profiles")
              .select("name")
              .eq("wa", normalizedWa)
              .maybeSingle();
            const buyerName = buyerProfile?.name || "Calon Pembeli";
            const buyerWaForSeller = normalizedWa.startsWith("0") ? "62" + normalizedWa.slice(1) : normalizedWa;

            const sellerMsg =
              `💬 *Pesan untuk Iklanmu*\n\n` +
              `📦 *${tanyaListing.title}*\n\n` +
              `${buyerName} bertanya:\n"${tanyaPesan}"\n\n` +
              `Balas langsung: wa.me/${buyerWaForSeller}`;

            const sellerJid = formatWaForBaileys(tanyaListing.seller_wa) + "@s.whatsapp.net";
            await sendWa(sellerJid, sellerMsg).catch(() => {});

            await sendWa(senderJid,
              `✅ Pesanmu sudah dikirim ke penjual *${tanyaListing.seller_name || "Penjual"}*.\n\n` +
              `Tunggu ya, mereka akan menghubungimu langsung di WA kalau tertarik.`
            );
          }
        }

      // ==========================================
      // TAWAR — Tawar harga listing
      // ==========================================
      } else if (textMsg.startsWith("TAWAR ") && !textMsg.startsWith("TAWAR BIAYA ")) {
        const tawarParts = message.trim().split(/\s+/);
        const tawarShortId = tawarParts[1];
        const tawarHarga = parseInt(tawarParts[2]);
        const tawarPesan = tawarParts.slice(3).join(" ").trim();

        if (!tawarShortId || !tawarHarga || tawarHarga <= 0) {
          await sendWa(senderJid,
            `💬 *Cara Tawar Harga:*\n\n` +
            `Format: *TAWAR [kode] [harga] [pesan opsional]*\n\n` +
            `Contoh:\nTAWAR abc12345 150000\nTAWAR abc12345 150000 Boleh nego kak?\n\n` +
            `Ketik kode iklan dari halaman web atau minta ke penjual.`
          );
          return NextResponse.json({ ok: true, state: "tawar_help" });
        }

        const { data: tawarListings } = await supa
          .from("listings")
          .select("id, title, price, seller_wa, seller_name")
          .eq("listing_code", parseInt(tawarShortId))
          .eq("status", "active");

        if (!tawarListings || tawarListings.length === 0) {
          await sendWa(senderJid, `❌ Iklan kode *${tawarShortId}* tidak ditemukan atau sudah tidak aktif.`);
          return NextResponse.json({ ok: true, state: "tawar_not_found" });
        }

        const tawarListing = tawarListings[0];
        if (tawarListing.seller_wa === normalizedWa) {
          await sendWa(senderJid, "❌ Tidak bisa menawar iklan milik sendiri.");
          return NextResponse.json({ ok: true, state: "tawar_own_listing" });
        }

        if (tawarHarga >= tawarListing.price) {
          await sendWa(senderJid, `❌ Harga tawaran (Rp ${tawarHarga.toLocaleString("id-ID")}) harus lebih rendah dari harga iklan (Rp ${Number(tawarListing.price).toLocaleString("id-ID")}).`);
          return NextResponse.json({ ok: true, state: "tawar_too_high" });
        }

        const { data: tawarProfile } = await supa.from("seller_profiles").select("name").eq("wa", normalizedWa).maybeSingle();
        const buyerName = tawarProfile?.name || "Pengguna WA";

        const { data: newOffer } = await supa.from("price_offers").insert({
          listing_id: tawarListing.id,
          buyer_wa: normalizedWa,
          buyer_name: buyerName,
          offer_price: tawarHarga,
          message: tawarPesan || null,
          status: "pending",
        }).select().single();

        if (newOffer) {
          await notifySellerNewOffer(tawarListing.seller_wa, tawarListing.seller_name, {
            title: tawarListing.title,
            offer: {
              id: newOffer.id,
              buyer_wa: normalizedWa,
              buyer_name: buyerName,
              offer_price: tawarHarga,
              message: tawarPesan,
            },
          }).catch(() => {});
        }

        const tawarMsg =
          `✅ *Tawaran Terkirim!*\n\n` +
          `📦 *${tawarListing.title}*\n` +
          `💰 Harga asli: Rp ${Number(tawarListing.price).toLocaleString("id-ID")}\n` +
          `🤝 Tawaranmu: *Rp ${tawarHarga.toLocaleString("id-ID")}*\n\n` +
          `Tunggu respon penjual ya. Penjual bisa TERIMA atau TOLAK tawaranmu.`;
        await sendWa(senderJid, tawarMsg);
        return NextResponse.json({ ok: true, state: "tawar_sent", bot_reply: tawarMsg });

      // ==========================================
      // IKLAN [kode] — Lihat detail iklan tertentu
      // ==========================================
      } else if (textMsg.startsWith("IKLAN ") && textMsg.split(" ").length === 2) {
        const iklanShortId = textMsg.split(" ")[1];
        const { data: iklanResults } = await supa
          .from("listings")
          .select("id, title, price, description, category, condition, campus, seller_wa, seller_name, image_url")
          .eq("listing_code", parseInt(iklanShortId))
          .eq("status", "active");

        if (!iklanResults || iklanResults.length === 0) {
          await sendWa(senderJid, `❌ Iklan kode *${iklanShortId}* tidak ditemukan atau sudah tidak aktif.`);
          return NextResponse.json({ ok: true, state: "iklan_not_found" });
        }

        const iklanDetail = iklanResults[0];
        const iklanBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
        const iklanSlug = buildSlug(iklanDetail.title, iklanDetail.id);
        const condLbl = iklanDetail.condition === "new" ? "✨ Baru" : "Bekas";
        const campusLbl = iklanDetail.campus && iklanDetail.campus !== "Semua" ? iklanDetail.campus : "Medan";
        const iklanMsg =
          `📦 *${iklanDetail.title}*\n\n` +
          `💰 Harga: *Rp ${Number(iklanDetail.price).toLocaleString("id-ID")}*\n` +
          `🏷️ ${iklanDetail.category} · ${condLbl}\n` +
          `📍 ${campusLbl}\n\n` +
          `📝 ${(iklanDetail.description || "").slice(0, 200)}${(iklanDetail.description?.length || 0) > 200 ? "..." : ""}\n\n` +
          `👤 Penjual: ${iklanDetail.seller_name || "Anonim"}\n` +
          `📲 WA: wa.me/${iklanDetail.seller_wa}\n\n` +
          `🔗 ${iklanBaseUrl}/produk/${iklanSlug}\n\n` +
          `_Untuk tawar harga: TAWAR ${iklanShortId} [harga]_`;
        await sendWa(senderJid, iklanMsg, iklanDetail.image_url || undefined);
        return NextResponse.json({ ok: true, state: "iklan_detail_sent", bot_reply: iklanMsg });

      // ==========================================
      // ADMIN COMMANDS — didelegasikan ke adminHandlers
      // ==========================================
      // TAWAR BIAYA [kode] [nominal] — Seller nego biaya iklan ke admin
      // ==========================================
      } else if (textMsg.startsWith("TAWAR BIAYA ")) {
        const tbParts = textMsg.split(/\s+/);
        const tbKode = tbParts[2];
        const tbNominal = parseInt(tbParts[3]);

        if (!tbKode || !tbNominal || tbNominal < 0) {
          await sendWa(senderJid,
            `❌ Format: *TAWAR BIAYA [kode iklan] [nominal tawaran]*\n\nContoh:\n*TAWAR BIAYA 1018 1000*\n\n_(Masukkan 0 untuk minta gratis)_`
          );
          return NextResponse.json({ ok: true, state: "tawar_biaya_help" });
        }

        const { data: tbListing } = await supa
          .from("listings")
          .select("id, title, listing_code, seller_wa, fee_offer_status")
          .eq("listing_code", parseInt(tbKode))
          .eq("seller_wa", normalizedWa)
          .in("status", ["pending", "active"])
          .maybeSingle();

        if (!tbListing) {
          await sendWa(senderJid, `❌ Iklan kode *${tbKode}* tidak ditemukan atau bukan milikmu.`);
          return NextResponse.json({ ok: true, state: "tawar_biaya_not_found" });
        }

        if (tbListing.fee_offer_status === "pending") {
          await sendWa(senderJid, `⏳ Tawaranmu untuk iklan *${tbListing.title}* sudah dikirim dan masih menunggu persetujuan admin.`);
          return NextResponse.json({ ok: true, state: "tawar_biaya_already_pending" });
        }

        await supa.from("listings").update({ fee_offer: tbNominal, fee_offer_status: "pending" }).eq("id", tbListing.id);

        // Notif ke semua admin
        const adminNumbers = [process.env.ADMIN_WA, process.env.SUPER_ADMIN_WA].filter(Boolean);
        const { data: tbPayment } = await supa.from("payments").select("amount").eq("listing_id", tbListing.id).eq("status", "pending").maybeSingle();
        const currentFee = tbPayment?.amount || 0;
        const tbAdminMsg =
          `💬 *Tawaran Biaya Iklan*\n\n` +
          `📦 *${tbListing.title}*\n` +
          `🔑 Kode: *${tbKode}*\n` +
          `📱 Penjual: wa.me/${normalizedWa}\n` +
          `💳 Biaya normal: *Rp ${Number(currentFee).toLocaleString("id-ID")}*\n` +
          `🤝 Tawaran: *Rp ${tbNominal.toLocaleString("id-ID")}*\n\n` +
          `Setuju? Balas:\n` +
          `✅ *SETUJUI TAWAR BIAYA ${tbKode}*\n` +
          `❌ *TOLAK TAWAR BIAYA ${tbKode}*`;
        for (const adminNum of adminNumbers) {
          await sendWa(adminNum, tbAdminMsg).catch(() => {});
        }

        await sendWa(senderJid,
          `✅ *Tawaranmu terkirim!*\n\n` +
          `📦 *${tbListing.title}*\n` +
          `🤝 Kamu menawar biaya iklan: *Rp ${tbNominal.toLocaleString("id-ID")}*\n\n` +
          `Tunggu konfirmasi dari admin ya. Jika disetujui, kamu akan dapat tagihan baru.`
        );
        return NextResponse.json({ ok: true, state: "tawar_biaya_sent" });

      // ==========================================
      } else if (isAdminWa(normalizedWa) && (
        textMsg === "STATS" ||
        textMsg.startsWith("SETUJUI NAMA ") ||
        textMsg.startsWith("TOLAK NAMA ") ||
        textMsg.startsWith("SETUJUI TAWAR BIAYA ") ||
        textMsg.startsWith("TOLAK TAWAR BIAYA ") ||
        textMsg.startsWith("SETMODE") ||
        textMsg.startsWith("BROADCAST SETMODE ") ||
        textMsg.startsWith("PAUSE ") ||
        textMsg.startsWith("RESUME ") ||
        (textMsg.startsWith("BROADCAST ") && !textMsg.startsWith("BROADCAST SETMODE"))
      )) {
        const adminRes = await handleAdminCmd({ textMsg, message, senderJid, normalizedWa, supa, sendWa, getSettings, isAdminWa });
        if (adminRes) return adminRes;

      // ==========================================
      // CEK — Ringkasan semua iklanku (views + sisa hari)
      // ==========================================
      } else if (textMsg === "CEK") {
        const { data: myAllListings } = await supa
          .from("listings")
          .select("id, listing_code, title, status, views, expires_at, featured_until, auto_bump_until")
          .eq("seller_wa", normalizedWa)
          .not("status", "in", '("deleted")')
          .order("created_at", { ascending: false })
          .limit(20);

        if (!myAllListings?.length) {
          await sendWa(senderJid, `📋 Kamu belum punya iklan.\n\nKirim *foto + deskripsi* untuk pasang iklan baru!`);
          return NextResponse.json({ ok: true, state: "cek_all_empty" });
        }

        const cekNowAll = new Date();
        const cekLines = myAllListings.map((l) => {
          const kode = l.listing_code || l.id.slice(0, 8);
          const sEmo = { active: "✅", pending: "⏳", expired: "❌", sold: "🏷️", suspended: "⛔", deletion_pending: "🗑️" }[l.status] || "❓";
          const daysLeft = l.expires_at ? Math.ceil((new Date(l.expires_at) - cekNowAll) / 864e5) : null;
          const sisaHari = daysLeft !== null ? (daysLeft > 0 ? `${daysLeft}h` : "expired") : "—";
          const isFt = l.featured_until && new Date(l.featured_until) > cekNowAll;
          const isAb = l.auto_bump_until && new Date(l.auto_bump_until) > cekNowAll;
          const upgStr = [isFt && "⭐FT", isAb && "🔄AB"].filter(Boolean).join(" ");
          return `${sEmo} *${l.title.slice(0, 28)}*\n   📌${kode} · 👁${l.views || 0} · ⏱${sisaHari}${upgStr ? " · " + upgStr : ""}`;
        });

        await sendWa(senderJid,
          `📋 *Semua Iklanku (${myAllListings.length})*\n\n` +
          cekLines.join("\n\n") +
          `\n\n_Ketik *CEK [kode]* untuk detail iklan tertentu_`
        );
        return NextResponse.json({ ok: true, state: "cek_all" });

      // ==========================================
      // CEK [kode] — Cek status & views iklan
      // ==========================================
      } else if (textMsg.startsWith("CEK ") && textMsg.split(" ").length === 2) {
        const cekId = textMsg.split(" ")[1].toLowerCase();
        const { data: cekListings } = await supa
          .from("listings")
          .select("id, title, status, price, views, expires_at, bumped_at, category, featured, featured_until, auto_bump_until")
          .eq("seller_wa", normalizedWa)
          .eq("listing_code", parseInt(cekId))
          .limit(1);

        if (!cekListings || cekListings.length === 0) {
          await sendWa(senderJid, `❌ Iklan kode *${cekId}* tidak ditemukan atau bukan milik kamu.\n\nKetik *IKLANKU* untuk lihat daftar iklan.`);
          return NextResponse.json({ ok: true, state: "cek_not_found" });
        }

        const cek = cekListings[0];
        const cekExpDate = cek.expires_at
          ? new Date(cek.expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })
          : "—";
        const cekSisaHari = cek.expires_at
          ? Math.ceil((new Date(cek.expires_at) - new Date()) / 86400000)
          : null;
        const cekBumpDate = cek.bumped_at
          ? new Date(cek.bumped_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
          : "Belum pernah";
        const statusEmoji = { active: "✅", pending: "⏳", sold: "🎉", expired: "❌", suspended: "⛔", deletion_pending: "🗑️" }[cek.status] || "❓";
        const cekBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";

        const cekNow = new Date();
        const cekFeatured = cek.featured && cek.featured_until && new Date(cek.featured_until) > cekNow;
        const cekAutoBump = cek.auto_bump_until && new Date(cek.auto_bump_until) > cekNow;
        const cekFeaturedUntil = cekFeatured ? new Date(cek.featured_until).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : null;
        const cekAutoBumpUntil = cekAutoBump ? new Date(cek.auto_bump_until).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : null;

        await sendWa(senderJid,
          `📊 *Status Iklan*\n\n` +
          `📌 *${cek.title}*\n` +
          `💰 Harga: Rp ${Number(cek.price).toLocaleString("id-ID")}\n` +
          `${statusEmoji} Status: *${cek.status}*\n` +
          `👁️ Views: *${cek.views || 0}×*\n` +
          `📅 Aktif s/d: *${cekExpDate}*${cekSisaHari !== null ? ` _(${cekSisaHari} hari lagi)_` : ""}\n` +
          `⬆️ Terakhir bump: *${cekBumpDate}*\n` +
          (cekFeatured ? `⭐ Featured aktif s/d: *${cekFeaturedUntil}*\n` : ``) +
          (cekAutoBump ? `🔄 AutoBump aktif s/d: *${cekAutoBumpUntil}*\n` : ``) +
          `\n🔗 ${cekBaseUrl}/produk/${buildSlug(cek.title, cek.id)}\n\n` +
          `Perintah lain:\n` +
          `• *BUMP ${cekId}* — naikkan posisi\n` +
          `• *PERPANJANG ${cekId}* — perpanjang masa aktif\n` +
          `• *UPGRADE ${cekId}* — featured / autobump`
        );
        return NextResponse.json({ ok: true, state: "cek_done" });

      // ==========================================
      // TAWARAN — Lihat semua tawaran masuk
      // ==========================================
      } else if (textMsg === "TAWARAN") {
        const { data: tawaranList } = await supa
          .from("price_offers")
          .select("id, offer_price, message, buyer_name, buyer_wa, created_at, listings!inner(id, title, seller_wa)")
          .eq("listings.seller_wa", normalizedWa)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(10);

        if (!tawaranList || tawaranList.length === 0) {
          await sendWa(senderJid, "📭 Belum ada tawaran masuk yang menunggu respons.\n\nSaat ada yang menawar iklanmu, kamu langsung dapat notifikasi.");
          return NextResponse.json({ ok: true, state: "tawaran_empty" });
        }

        let tawaranMsg = `💬 *Tawaran Masuk (${tawaranList.length})*\n\n`;
        tawaranList.forEach((t, i) => {
          tawaranMsg += `${i + 1}. *${t.listings?.title}*\n`;
          tawaranMsg += `   👤 ${t.buyer_name || "Anonim"} (wa.me/${(t.buyer_wa || "").replace(/\D/g, "")})\n`;
          tawaranMsg += `   💵 Rp ${Number(t.offer_price).toLocaleString("id-ID")}\n`;
          if (t.message) tawaranMsg += `   💬 "${t.message}"\n`;
          tawaranMsg += "\n";
        });
        tawaranMsg += `_Hubungi pembeli langsung via link WA di atas untuk negosiasi._`;
        await sendWa(senderJid, tawaranMsg);
        return NextResponse.json({ ok: true, state: "tawaran_listed", count: tawaranList.length });

      // ==========================================
      // SAYA — Lihat profil & statistik diri sendiri
      // ==========================================
      } else if (textMsg === "SAYA") {
        // Ambil listing IDs dulu, baru query price_offers (subquery tidak support di Supabase JS)
        const { data: myListingIds } = await supa
          .from("listings").select("id").eq("seller_wa", normalizedWa);
        const listingIds = (myListingIds || []).map(l => l.id);

        const [profileRes, activeRes, soldRes, ratingRes, offerRes] = await Promise.all([
          supa.from("seller_profiles").select("name, bio, trusted_seller, subscription_tier, free_bumps, referral_code").eq("wa", normalizedWa).maybeSingle(),
          supa.from("listings").select("id", { count: "exact", head: true }).eq("seller_wa", normalizedWa).eq("status", "active"),
          supa.from("listings").select("id", { count: "exact", head: true }).eq("seller_wa", normalizedWa).eq("status", "sold"),
          supa.from("seller_ratings").select("rating").eq("seller_wa", normalizedWa),
          listingIds.length > 0
            ? supa.from("price_offers").select("id", { count: "exact", head: true }).in("listing_id", listingIds).eq("status", "pending")
            : Promise.resolve({ count: 0 }),
        ]);

        const sayaProfile = profileRes.data;
        const aktifCount = activeRes.count || 0;
        const terjualCount = soldRes.count || 0;
        const sayaRatings = ratingRes.data || [];
        const pendingOffers = offerRes.count || 0;
        const freeBumps = sayaProfile?.free_bumps || 0;
        const refCode = sayaProfile?.referral_code || null;
        const avgRating = sayaRatings.length > 0
          ? (sayaRatings.reduce((s, r) => s + r.rating, 0) / sayaRatings.length).toFixed(1)
          : null;
        const tierLabel = { free: "Free", pro: "⭐ PRO" }[sayaProfile?.subscription_tier] || "Free";
        const sayaBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
        // Nomor asli sebagai identitas. formatWa() menolak placeholder LID (return ""),
        // jadi nomor & link profil HANYA muncul kalau memang nomor HP valid — user tak
        // pernah lihat angka JID/LID.
        const sayaPhone = formatWa(normalizedWa);

        await sendWa(senderJid,
          `👤 *${sayaProfile?.name || "Belum diatur"}*  ·  ${tierLabel}` +
          (sayaProfile?.trusted_seller ? `  ☑️ _Terpercaya_` : ``) + `\n\n` +
          (sayaPhone ? `📱 Nomor: *${sayaPhone}*\n` : ``) +
          `📦 Iklan aktif: *${aktifCount}*\n` +
          `✅ Terjual: *${terjualCount}×*\n` +
          (avgRating ? `⭐ Rating: *${avgRating}/5* (${sayaRatings.length} ulasan)\n` : ``) +
          (pendingOffers > 0 ? `💬 Ada *${pendingOffers}* tawaran masuk — ketik *TAWARAN*\n` : ``) +
          (freeBumps > 0 ? `🎁 Bump gratis: *${freeBumps}* — ketik *BUMP [kode]*\n` : ``) +
          (refCode ? `🎁 Kode referral: *${refCode}* — ketik *REFERRAL*\n` : ``) +
          (sayaPhone ? `\n🔗 Profil kamu:\n${sayaBaseUrl}/penjual/${sayaPhone}\n` : ``) +
          `\n_Ketik *MENU* buat liat semua yang bisa aku bantu ya kak._`
        );
        return NextResponse.json({ ok: true, state: "saya_done" });

      // ==========================================
      // REFERRAL — Kode referral & saldo bump gratis
      // ==========================================
      } else if (textMsg === "REFERRAL") {
        const { data: refProfile } = await supa
          .from("seller_profiles")
          .select("name, referral_code, free_bumps")
          .eq("wa", normalizedWa)
          .maybeSingle();

        let refCode = refProfile?.referral_code;
        if (!refCode) {
          refCode = normalizedWa.slice(-4) + Math.random().toString(36).slice(2, 6).toUpperCase();
          await supa.from("seller_profiles")
            .upsert({ wa: normalizedWa, referral_code: refCode }, { onConflict: "wa" });
        }

        const freeBumpsRef = refProfile?.free_bumps || 0;
        const refBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";
        const refMsg =
          `🎯 *Kode Referral Kamu*\n\n` +
          `🔑 Kode: *${refCode}*\n` +
          `🎁 Bump gratis tersisa: *${freeBumpsRef}*\n\n` +
          `*Cara kerja:*\n` +
          `Ajak teman daftar & pasang iklan pertama dengan kode referralmu.\n` +
          `Setiap teman yang berhasil → kamu dapat *1 Bump Gratis*!\n\n` +
          `📲 Share link ini:\n` +
          `${refBaseUrl}?ref=${refCode}\n\n` +
          `_Ketik *BUMP [kode iklan]* untuk pakai bump gratis._`;
        await sendWa(senderJid, refMsg);
        return NextResponse.json({ ok: true, state: "referral_shown", bot_reply: refMsg });

      // ==========================================
      // RIWAYAT — Riwayat 10 transaksi terakhir
      // ==========================================
      } else if (textMsg === "RIWAYAT") {
        const { data: myListIds } = await supa
          .from("listings").select("id").eq("seller_wa", normalizedWa)
          .in("status", ["active", "expired", "sold", "pending"]);
        const myIds = (myListIds || []).map(l => l.id);

        // Query paralel: payment dari listing milik user + wanted payment milik user
        const [listingPaysRes, wantedPaysRes] = await Promise.all([
          myIds.length > 0
            ? supa.from("payments")
                .select("id, type, amount, status, created_at, listings(title)")
                .in("listing_id", myIds)
                .order("created_at", { ascending: false })
                .limit(8)
            : Promise.resolve({ data: [] }),
          supa.from("payments")
            .select("id, type, amount, status, created_at, meta")
            .eq("type", "wanted")
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        const myWantedPays = (wantedPaysRes.data || []).filter(p => p.meta?.buyer_wa === normalizedWa);
        const allPays = [
          ...(listingPaysRes.data || []),
          ...myWantedPays,
        ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10);

        if (allPays.length === 0) {
          await sendWa(senderJid, "📋 Belum ada riwayat transaksi.\n\nPasang iklan pertamamu dengan kirim foto+teks!");
          return NextResponse.json({ ok: true, state: "riwayat_empty" });
        }

        const typeLabel = { iklan: "Pasang Iklan", bump: "Bump", renewal: "Perpanjang", featured: "Featured", autobump: "AutoBump", wanted: "Dicari", sponsored: "Sponsored" };
        const statusLabel = { paid: "✅ Lunas", pending: "⏳ Pending", expired: "❌ Expired", failed: "❌ Gagal" };
        let riwayatMsg = `📋 *Riwayat Transaksi*\n\n`;
        allPays.forEach((p, i) => {
          const tgl = new Date(p.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
          const judul = p.listings?.title ? `_${p.listings.title.slice(0, 25)}_` : (p.type === "wanted" ? "_Posting Dicari_" : "");
          riwayatMsg += `${i + 1}. *${typeLabel[p.type] || p.type}* ${judul}\n`;
          riwayatMsg += `   💳 Rp ${Number(p.amount).toLocaleString("id-ID")} · ${statusLabel[p.status] || p.status} · ${tgl}\n\n`;
        });
        await sendWa(senderJid, riwayatMsg.trim());
        return NextResponse.json({ ok: true, state: "riwayat_shown" });

      // ==========================================
      // PENAWARAN SAYA — Tawaran yang pernah dikirim sebagai pembeli
      // ==========================================
      } else if (textMsg === "PENAWARAN SAYA") {
        const { data: myOffers } = await supa
          .from("price_offers")
          .select("id, offer_price, message, status, created_at, listings(listing_code, title, seller_wa, seller_name)")
          .eq("buyer_wa", normalizedWa)
          .order("created_at", { ascending: false })
          .limit(10);

        if (!myOffers || myOffers.length === 0) {
          await sendWa(senderJid, "💬 Kamu belum pernah mengirim tawaran.\n\nGunakan *TAWAR [kode] [harga]* untuk menawar harga iklan.");
          return NextResponse.json({ ok: true, state: "my_offers_empty" });
        }

        const offerStatusLabel = { pending: "⏳ Menunggu", accepted: "✅ Diterima", rejected: "❌ Ditolak" };
        let offersMsg = `💬 *Tawaran yang Kamu Kirim*\n\n`;
        myOffers.forEach((o, i) => {
          const tgl = new Date(o.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
          offersMsg += `${i + 1}. *${o.listings?.title?.slice(0, 30) || "Iklan"}*\n`;
          offersMsg += `   💵 Rp ${Number(o.offer_price).toLocaleString("id-ID")} · ${offerStatusLabel[o.status] || o.status} · ${tgl}\n`;
          if (o.status === "accepted") {
            offersMsg += `   📞 Hubungi penjual: wa.me/${(o.listings?.seller_wa || "").replace(/\D/g, "")}\n`;
          }
          offersMsg += `\n`;
        });
        await sendWa(senderJid, offersMsg.trim());
        return NextResponse.json({ ok: true, state: "my_offers_shown" });

      // ==========================================
      // MENU / HELP / BANTUAN — Daftar perintah
      // ==========================================
      } else if (textMsg === "MENU" || textMsg === "HELP" || textMsg === "BANTUAN") {
        let menuStr = `📋 *Menu Jual Beli USU*\n_Semua yang bisa aku bantu:_\n\n` +
          `🛒 *IKLAN*\n` +
          `• Kirim foto+teks → Pasang iklan baru\n` +
          `• *IKLANKU* → Semua iklan saya\n` +
          `• *CEK* → Semua iklan (views & sisa hari)\n` +
          `• *CEK [kode]* → Detail satu iklan\n` +
          `• *BUMP [kode]* → Naikkan ke atas\n` +
          `• *UPGRADE [kode]* → Featured / AutoBump\n` +
          `• *AKTIFKAN [kode]* → Aktifkan iklan expired\n` +
          `• *PERPANJANG [kode]* → Perpanjang masa aktif\n` +
          `• *EDIT [kode] HARGA [nominal]* → Ubah harga\n` +
          `• *EDIT [kode] DESC [teks]* → Ubah deskripsi\n` +
          `• *FOTO [kode]* + foto → Tambah foto\n` +
          `• *HAPUS LAKU [kode]* → Tandai terjual\n` +
          `• *HAPUS GALAKU [kode]* → Minta hapus ke admin\n` +
          `\n💬 *TRANSAKSI*\n` +
          `• *TANYA [kode] [pesan]* → Tanya penjual (nomor aman)\n` +
          `• *TAWARAN* → Lihat tawaran masuk\n` +
          `• *TAWAR [kode] [harga]* → Tawar harga\n` +
          `• *TAGIH* → Kirim ulang QRIS\n` +
          `• *BATAL* → Batalkan tagihan QRIS pending\n` +
          `• *SHARE [kode]* → Link iklan siap share\n` +
          `\n🔍 *CARI & LANGGANAN*\n` +
          `• *CARI [barang]* → Posting pencarian\n` +
          `• *LANGGANAN [kategori]* → Notif kategori baru\n` +
          `• *STOP* → Berhenti semua notifikasi\n` +
          `• *IKLAN [kode]* → Lihat detail iklan\n` +
          `\n👤 *PROFIL & RIWAYAT*\n` +
          `• *SAYA* → Profil & statistik saya\n` +
          `• *NAMA [nama baru]* → Ajukan ganti nama profil\n` +
          `• *REFERRAL* → Kode referral & bump gratis\n` +
          `• *RIWAYAT* → 10 transaksi terakhir\n` +
          `• *PENAWARAN SAYA* → Tawaran yang kamu kirim\n` +
          `• *LAPOR [kode] [alasan]* → Laporkan iklan\n`;
          
        if (isAdminWa(normalizedWa)) {
          menuStr += `\n👑 *MENU ADMIN*\n` +
            `• *SETMODE AUTO* → Bot membalas pesan otomatis\n` +
            `• *SETMODE MANUAL* → Matikan bot (mode manual)\n` +
            `• *STATS* → Lihat statistik pendapatan & user\n` +
            `• *PAUSE [nomor]* → Hentikan bot untuk 1 user\n` +
            `• *RESUME [nomor]* → Nyalakan kembali bot untuk user\n` +
            `• *BROADCAST [pesan]* → Pesan massal ke semua penjual\n` +
            `• *APPROVE / REJECT [kode]* → Konfirmasi hapus iklan\n` +
            `• *SETUJUI / TOLAK NAMA [nomor]* → Konfirmasi ganti nama\n` +
            `• *SETUJUI / TOLAK TAWAR BIAYA [kode]* → Nego biaya pasang iklan\n`;
        }

        await sendWa(senderJid, menuStr);
        return NextResponse.json({ ok: true, state: "menu_shown" });

      // ==========================================
      // LAPOR [kode] [alasan] — Laporkan iklan
      // ==========================================
      } else if (textMsg.startsWith("LAPOR ")) {
        const laporParts = message.trim().split(/\s+/);
        if (laporParts.length < 3) {
          await sendWa(senderJid,
            `❌ Format: *LAPOR [kode] [alasan]*\n\n` +
            `Contoh:\n` +
            `LAPOR abc12345 Penjual tidak responsif\n` +
            `LAPOR abc12345 Harga tidak sesuai foto`
          );
          return NextResponse.json({ ok: true, state: "lapor_invalid" });
        }

        const laporId = laporParts[1].toLowerCase();
        const laporAlasan = laporParts.slice(2).join(" ").trim();

        const { data: laporListings } = await supa
          .from("listings")
          .select("id, title, seller_wa")
          .eq("listing_code", parseInt(laporId))
          .eq("status", "active")
          .limit(1);

        if (!laporListings || laporListings.length === 0) {
          await sendWa(senderJid, `❌ Iklan kode *${laporId}* tidak ditemukan.\n\nPastikan kode benar dan iklan masih aktif.`);
          return NextResponse.json({ ok: true, state: "lapor_not_found" });
        }

        if (laporListings[0].seller_wa === normalizedWa) {
          await sendWa(senderJid, "❌ Tidak bisa melaporkan iklan sendiri.");
          return NextResponse.json({ ok: true, state: "lapor_self" });
        }

        await supa.from("reports").insert({
          listing_id: laporListings[0].id,
          reporter_wa: normalizedWa,
          reason: laporAlasan,
          status: "open",
        });

        await sendWa(senderJid,
          `✅ *Laporan Diterima*\n\n` +
          `Terima kasih! Laporan untuk iklan *"${laporListings[0].title}"* sudah diterima dan akan ditinjau admin dalam 1×24 jam.\n\n` +
          `Alasan: _${laporAlasan}_`
        );
        return NextResponse.json({ ok: true, state: "lapor_done" });

      // ==========================================
      // AKTIFKAN [kode] — Reaktifkan iklan expired/suspended
      // ==========================================
      } else if (textMsg.startsWith("AKTIFKAN ") && textMsg.split(" ").length === 2) {
        const aktifId = textMsg.split(" ")[1].toLowerCase();
        const { data: aktifListings } = await supa
          .from("listings")
          .select("id, title, status")
          .eq("seller_wa", normalizedWa)
          .eq("listing_code", parseInt(aktifId))
          .limit(1);

        if (!aktifListings || aktifListings.length === 0) {
          await sendWa(senderJid, `❌ Iklan kode *${aktifId}* tidak ditemukan.\n\nKetik *IKLANKU* untuk lihat daftar iklan.`);
          return NextResponse.json({ ok: true, state: "aktifkan_not_found" });
        }

        const aktifListing = aktifListings[0];

        if (aktifListing.status === "active") {
          await sendWa(senderJid, `✅ Iklan *"${aktifListing.title}"* sudah aktif.\n\nKetik *CEK ${aktifId}* untuk lihat status lengkapnya.`);
          return NextResponse.json({ ok: true, state: "aktifkan_already_active" });
        }

        if (aktifListing.status === "suspended") {
          await sendWa(senderJid, `⛔ Iklan *"${aktifListing.title}"* sedang disuspend oleh admin.\n\nHubungi admin untuk informasi lebih lanjut.`);
          return NextResponse.json({ ok: true, state: "aktifkan_suspended" });
        }

        if (aktifListing.status === "deletion_pending") {
          await sendWa(senderJid, `🗑️ Iklan *"${aktifListing.title}"* sedang menunggu konfirmasi penghapusan.\n\nHubungi admin untuk membatalkan penghapusan.`);
          return NextResponse.json({ ok: true, state: "aktifkan_deletion_pending" });
        }

        if (!["expired", "sold"].includes(aktifListing.status)) {
          await sendWa(senderJid, `❌ Iklan ini tidak bisa diaktifkan (status: ${aktifListing.status}).\n\nKetik *IKLANKU* untuk lihat semua iklan.`);
          return NextResponse.json({ ok: true, state: "aktifkan_invalid_status" });
        }

        // expired → arahkan ke PERPANJANG yang sudah punya flow lengkap (bayar, dll)
        await sendWa(senderJid,
          `📋 *Aktifkan Kembali Iklan*\n\n` +
          `Iklan *"${aktifListing.title}"* berstatus *${aktifListing.status}*.\n\n` +
          `Untuk mengaktifkan kembali, gunakan:\n\n` +
          `*PERPANJANG ${aktifId}*\n\n` +
          `_Iklan akan aktif kembali setelah proses selesai._`
        );
        return NextResponse.json({ ok: true, state: "aktifkan_redirect_perpanjang" });
      }
    }

    // ==========================================
    // PEMANDU PASANG IKLAN (draft) — kumpulkan info sepotong-sepotong
    // ==========================================
    // Sampai di sini semua perintah lain (cari, perpanjang, dll) sudah ditangani &
    // return. Draft mengingat teks yang penjual ketik (nama/harga/keterangan) sampai
    // foto datang; saat foto tiba, teks digabung & iklan dibuat lewat alur normal di
    // bawah. Foto WAJIB (alur pembuatan butuh gambar). Urutan bebas / boleh sekaligus.
    {
      const draftMsgL = (message || "").toLowerCase().trim();
      const { data: waDraft } = await supa
        .from("wa_listing_drafts")
        .select("text_parts")
        .eq("wa", normalizedWa)
        .gte("updated_at", new Date(Date.now() - 60 * 60 * 1000).toISOString())
        .maybeSingle();

      if (waDraft) {
        // ── RESUME: iklan sudah dibuat tapi MENUNGGU HARGA (dikirim tanpa harga) ──
        // Draft menyimpan JSON {awaitingPriceFor: listingId}. Balasan berupa angka =
        // harga → set harga + tagih. Jangan pernah posting Rp 0 tanpa tanya harga.
        let awaitingPriceFor = null;
        try {
          const parsedDraft = JSON.parse(waDraft.text_parts || "{}");
          if (parsedDraft && parsedDraft.awaitingPriceFor) awaitingPriceFor = parsedDraft.awaitingPriceFor;
        } catch (_) {}
        if (awaitingPriceFor) {
          if (draftMsgL === "batal" || draftMsgL === "cancel") {
            await supa.from("wa_listing_drafts").delete().eq("wa", normalizedWa);
            await supa.from("listings").delete().eq("id", awaitingPriceFor).eq("seller_wa", normalizedWa).eq("status", "pending");
            await sendWa(senderJid, "🗑️ Oke, dibatalkan. Ketik *JUAL* lagi kapan pun ya!");
            return NextResponse.json({ ok: true, state: "await_price_cancelled" });
          }
          const price = parsePriceId(message);
          if (!price || price <= 0) {
            await sendWa(senderJid, "Hmm, harganya belum kebaca kak 🙏 Ketik *angka harganya* aja ya, contoh: *90rb* atau *150000*.\n\n_(Ketik *BATAL* kalau ga jadi)_");
            return NextResponse.json({ ok: true, state: "await_price_retry" });
          }
          const { data: pl } = await supa
            .from("listings")
            .update({ price })
            .eq("id", awaitingPriceFor).eq("seller_wa", normalizedWa)
            .select("id, title, listing_code, price").single();
          await supa.from("wa_listing_drafts").delete().eq("wa", normalizedWa);
          if (!pl) {
            await sendWa(senderJid, "Waduh, iklannya nggak ketemu kak. Ketik *JUAL* untuk mulai lagi ya.");
            return NextResponse.json({ ok: true, state: "await_price_gone" });
          }
          const setng = await getSettings();
          const fee = adFeeFrom(setng.pricing, "barang", price);
          const orderId = `IKLAN-WA-${pl.listing_code}-${Date.now()}`;
          await supa.from("payments").insert({
            listing_id: pl.id, type: "iklan", amount: fee, status: "pending",
            midtrans_order_id: orderId, meta: { final_amount: fee },
          });
          await sendWa(senderJid,
            `✅ *Harga diset: Rp ${price.toLocaleString("id-ID")}*\n📦 *${pl.title}* (Kode: *${pl.listing_code}*)\n\n` +
            `Biar tayang, scan QRIS di bawah & transfer:\n💳 *Rp ${fee.toLocaleString("id-ID")}*\n\n` +
            `Kalau udah transfer, kirim *screenshot struk*nya ke sini ya.\n\n` +
            `_(Biaya terasa berat? Ketik *TAWAR BIAYA ${pl.listing_code} [nominal]* untuk menawar ke admin)_`,
            getQrisUrl()
          );
          return NextResponse.json({ ok: true, state: "price_set_pending_payment" });
        }

        if (draftMsgL === "batal" || draftMsgL === "cancel") {
          await supa.from("wa_listing_drafts").delete().eq("wa", normalizedWa);
          await sendWa(senderJid, "🗑️ Oke, pasang iklan dibatalkan. Ketik *JUAL* lagi kapan pun kamu siap ya!");
          return NextResponse.json({ ok: true, state: "draft_cancelled" });
        }
        if (file) {
          // Foto datang → gabung teks draft ke pesan ini, hapus draft, lalu biarkan
          // mengalir ke blok "Iklan Baru" di bawah (pakai kode pembuatan yang sama).
          message = `${waDraft.text_parts || ""}\n${message || ""}`.trim();
          await supa.from("wa_listing_drafts").delete().eq("wa", normalizedWa);
        } else if (message) {
          // PENTING: perintah TIDAK boleh ditelan draft jadi teks iklan. Dulu ini biang
          // loop — user ketik "JUAL" ulang saat draft aktif → dianggap teks → bot minta
          // foto lagi tanpa henti, iklan tak pernah jadi.
          // "JUAL/WTS/dst" saat draft aktif = cukup ingatkan kirim foto (teks lama aman).
          if (["jual", "wts", "dijual", "ready"].includes(draftMsgL)) {
            const hasP = /\d{4,}|\d+\s*(rb|ribu|k|jt|juta)/i.test(waDraft.text_parts || "");
            await sendWa(senderJid, `📸 Tinggal *foto barang*nya nih kak — kirim fotonya ya${hasP ? "" : " (sebutkan juga *harganya* kalau belum)"}. Teks yang tadi sudah kucatat kok.\n\n_(Ketik *BATAL* kalau ga jadi)_`);
            return NextResponse.json({ ok: true, state: "draft_awaiting_photo" });
          }
          // Perintah lain (MENU/SAYA/IKLANKU/DICARI/LAPOR/TAWAR/PERPANJANG/dst) → biarkan
          // lewat ke handler perintah di bawah; draft tetap tersimpan agar bisa dilanjutkan.
          const isCommand =
            ["menu", "saya", "iklanku", "admin", "perpanjang", "upgrade", "min", "mimin"].includes(draftMsgL) ||
            /^(dicari|wtb|cari|lapor|tawar|hapus|nama|edit|setmode|approve|reject|setuju|tolak|broadcast|stats|pause|resume)\b/i.test(draftMsgL);
          if (!isCommand) {
            // Teks iklan biasa → tumpuk teks, minta yang masih kurang.
            const newText = `${waDraft.text_parts || ""}\n${message}`.trim().slice(0, 1500);
            await supa.from("wa_listing_drafts").upsert({ wa: normalizedWa, text_parts: newText, updated_at: new Date().toISOString() });
            const hasPrice = /\d{4,}|\d+\s*(rb|ribu|k|jt|juta)/i.test(newText);
            const askPrice = hasPrice ? "" : " Sebutkan juga *harganya* ya.";
            await sendWa(senderJid, `Sip, dicatat! 📸 Sekarang kirim *foto barang*nya dong (boleh beberapa).${askPrice}\n\n_(Ketik *BATAL* kalau ga jadi)_`);
            return NextResponse.json({ ok: true, state: "draft_collecting" });
          }
          // isCommand → jatuh ke handler di bawah (draft tak diutak-atik).
        }
      }
    }

    // ==========================================
    // STATE 1: Iklan Baru
    // ==========================================
    if (!message && !file) return NextResponse.json({ ok: true, ignored: true });

    if (message && !file) {
      const msgLower = message.toLowerCase().trim();

      // ── Keyword-first mode ──────────────────────────────────────────────────
      // Hanya proses AI jika pesan mengandung kata kunci marketplace atau angka harga.
      // Pesan sapaan biasa (tanpa keyword) → balas dengan menu singkat saja.
      const kwConfig = settings.bot_keywords || {};
      if (kwConfig.enabled !== false) {
        const triggerList = (kwConfig.triggers || "jual,dijual,wts,wtb,cari,dicari,beli,dibeli,admin,min,mimin,perpanjang,upgrade")
          .split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
        const minDigits = Number(kwConfig.min_price_digits) || 4;
        const hasNumber = new RegExp(`\\d{${minDigits},}`).test(message);
        // Cocokkan per KATA UTUH, bukan substring — "min" tidak boleh kena "minat"/
        // "minggu", "beli" tidak boleh kena "sembelit". Substring bikin bot nyela
        // obrolan manusia yang kebetulan mengandung potongan keyword.
        const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const hasTrigger = triggerList.some((kw) =>
          new RegExp(`(^|[^\\p{L}\\p{N}])${escRe(kw)}($|[^\\p{L}\\p{N}])`, "iu").test(msgLower)
        );

        if (!hasTrigger && !hasNumber) {
          // Kontak BARU (pertama kali chat) → sapa hangat SEKALI SEUMUR HIDUP.
          // Kontak lama tanpa keyword → tetap diam (hindari spam menu).
          try {
            const { count: priorMsgs } = await supa
              .from("wa_conversations")
              .select("id", { count: "exact", head: true })
              .eq("wa", normalizedWa)
              .eq("role", "user");
            // Pernah disapa sebelumnya? (greeting selalu tercatat role 'bot' berawalan
            // "Haii") → jangan pernah ulangi, walau hitungan pesan user masih rendah
            // (identitas LID vs nomor bisa bikin hitungan reset — jangan andalkan itu).
            const { count: greetedBefore } = await supa
              .from("wa_conversations")
              .select("id", { count: "exact", head: true })
              .eq("wa", normalizedWa)
              .eq("role", "bot")
              .like("message", "Haii%");
            if ((priorMsgs || 0) <= 1 && !(greetedBefore || 0)) {
              const fn = cleanFirstName(profileNameFromBot);
              const halo = `Haii${fn ? " " + fn : ""}! 👋 Aku admin *Jual Beli USU/Polmed*. Mau *jual* atau *cari* barang? Ketik *MENU* buat liat semua yang bisa aku bantu ya 😊`;
              await sendWa(senderJid, halo);
              return NextResponse.json({ ok: true, state: "greeting_first_contact", bot_reply: halo });
            }
          } catch (_) {}

          // Tidak ada keyword & bukan kontak baru → bot diam (kecuali greeting_enabled).
          if (kwConfig.greeting_enabled) {
            const greetingMsg = kwConfig.greeting || "Halo! 👋 Ada yang bisa dibantu?";
            if (await wasSentRecently(supa, normalizedWa, greetingMsg, 10)) {
              return NextResponse.json({ ok: true, ignored: true, reason: "greeting_dedup" });
            }
            await sendWa(senderJid, greetingMsg);
            return NextResponse.json({ ok: true, state: "greeting_only", bot_reply: greetingMsg });
          }
          return NextResponse.json({ ok: true, state: "ignored_no_keyword" });
        }
      }

      // "admin" / "min" / "mimin" → sapaan ke bot, balas dengan menu
      if (msgLower === "admin" || msgLower === "min" || msgLower === "mimin" || msgLower === "halo admin" || msgLower === "hai min") {
        const fnGreet = cleanFirstName(profileNameFromBot);
        let greetingMsg = kwConfig.greeting || `Haii${fnGreet ? " " + fnGreet : " kak"}! 👋 Mau *jual* atau *cari* barang?\nKetik *MENU* buat liat semua yg bisa aku bantu, atau *ADMIN* kalau mau ngobrol langsung ya 😊`;
        
        if (isAdminWa(normalizedWa)) {
          greetingMsg = `👑 *Halo SuperAdmin!*\n\nBerikut daftar perintah khusus Admin yang bisa Anda gunakan:\n\n` +
            `• *SETMODE AUTO* → Bot membalas pesan otomatis\n` +
            `• *SETMODE MANUAL* → Matikan bot (semua pesan diteruskan ke admin)\n` +
            `• *STATS* → Lihat statistik pendapatan & user\n` +
            `• *PAUSE [nomor]* → Hentikan bot untuk 1 user\n` +
            `• *RESUME [nomor]* → Nyalakan kembali bot untuk user\n` +
            `• *BROADCAST [pesan]* → Pesan massal ke semua penjual\n` +
            `• *APPROVE / REJECT [kode]* → Konfirmasi hapus iklan\n` +
            `• *SETUJUI / TOLAK NAMA [nomor]* → Konfirmasi ganti nama\n` +
            `• *SETUJUI / TOLAK TAWAR BIAYA [kode]* → Nego biaya pasang iklan\n\n` +
            `Untuk melihat menu pelanggan, ketik *MENU*.`;
        }

        // Anti-beruntun: greeting yang sama baru saja terkirim (≤10 mnt) → diam.
        // "min" sering dipakai memanggil admin MANUSIA berulang kali; bot cukup
        // menjawab sekali, sisanya biar manusia.
        if (!isAdminWa(normalizedWa) && (await wasSentRecently(supa, normalizedWa, greetingMsg, 10))) {
          return NextResponse.json({ ok: true, ignored: true, reason: "greeting_dedup" });
        }

        await sendWa(senderJid, greetingMsg);
        return NextResponse.json({ ok: true, state: "admin_greeting", bot_reply: greetingMsg });
      }

      // Jika instruksi standar untuk pasang iklan dari command khusus, tetap layani dengan cepat
      if (msgLower === "jual" || msgLower === "wts" || msgLower === "dijual" || msgLower === "ready") {
         // Mulai draft "pemandu" — user boleh kirim info bertahap, bot nuntun sampai lengkap.
         await supa.from("wa_listing_drafts").upsert({ wa: normalizedWa, text_parts: "", updated_at: new Date().toISOString() });
         await sendWa(senderJid, "📸 Siap bantu pasang iklan!\n\nKirim *foto barang* + tulis *nama, harga, & keterangan* — boleh sekaligus dalam 1 pesan, atau satu-satu (aku tuntun kok).\n\nContoh: _Tumbler Enak, 50rb, warna hitam masih mulus_\n\n_(Ketik *BATAL* kalau ga jadi)_");
         return NextResponse.json({ ok: true, state: "draft_started" });
      }

      // ── Command DICARI: post wanted listing ke web + grup dari WA ──────────
      if (msgLower.startsWith("dicari ") || msgLower.startsWith("wtb ") || msgLower.startsWith("cari beli ") || msgLower.startsWith("cari ")) {
        const rawText = message.replace(/^(dicari|wtb|cari beli|cari)\s+/i, "").trim();
        if (!rawText) {
          await sendWa(senderJid, "📝 Format: *DICARI [deskripsi barang yang dicari]*\n\nContoh:\n_DICARI laptop bekas budget 3jt area USU_");
          return NextResponse.json({ ok: true, state: "dicari_help" });
        }

        await sendWa(senderJid, "Oke bentar ya kak, aku proses dulu…");

        const parsed = await parseWantedFromText(rawText).catch(() => null);
        if (!parsed?.title) {
          await sendWa(senderJid, "❌ Gagal membaca deskripsi. Coba tulis lebih jelas, contoh:\n_DICARI laptop bekas budget 3jt area USU_");
          return NextResponse.json({ ok: true, state: "dicari_parse_failed" });
        }

        // Ambil nama dari seller_profile jika ada
        const { data: sellerProfile } = await supa.from("seller_profiles").select("name").eq("wa", normalizedWa).maybeSingle();
        const buyerName = sellerProfile?.name || `Pengguna WA`;

        // Cek jumlah posting sebelumnya (N pertama gratis, sesuai settings)
        const { count: pastCount } = await supa
          .from("wanted_listings")
          .select("id", { count: "exact", head: true })
          .eq("buyer_wa", normalizedWa);
        const dicariFreeLimt = Number(settings?.pricing?.dicariFreeLimt) || 3;
        const isFree = (pastCount || 0) < dicariFreeLimt;

        const { data: wanted, error: wErr } = await supa.from("wanted_listings").insert({
          buyer_name: buyerName,
          buyer_wa: normalizedWa,
          title: parsed.title,
          description: parsed.description || rawText,
          budget: parsed.budget || 0,
          category: parsed.category || "Lainnya",
          campus: ["USU", "POLMED", "Semua"].includes(parsed.campus) ? parsed.campus : "Semua",
          area: "Sekitar Kampus",
          status: isFree ? "active" : "pending",
        }).select().single();

        if (wErr) {
          await sendWa(senderJid, "❌ Gagal menyimpan. Coba lagi nanti.");
          return NextResponse.json({ ok: true, state: "dicari_db_error" });
        }

        const budgetStr = parsed.budget > 0 ? `\n💵 Budget: Rp ${Number(parsed.budget).toLocaleString("id-ID")}` : "";
        const campusStr = parsed.campus ? `\n📍 Area: ${parsed.campus}` : "";
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";

        if (isFree) {
          await postWantedToGroup(wanted).catch(() => {});
          const confirmMsg =
            `✅ *Udah aku post ya kak!*\n\n` +
            `🔍 *${parsed.title}*\n` +
            `🏷️ ${parsed.category}${budgetStr}${campusStr}\n\n` +
            `Sudah tayang di: ${baseUrl}/dicari\n` +
            `Dan sudah dibroadcast ke grup WA. Tunggu penjual hubungi kamu ya! 😊\n\n` +
            `_(Sisa gratis: ${2 - (pastCount || 0)} posting lagi)_`;
          await sendWa(senderJid, confirmMsg);
          return NextResponse.json({ ok: true, state: "dicari_posted", bot_reply: confirmMsg });
        } else {
          // Berbayar: generate QRIS
          const orderId = `WNT-${wanted.id.slice(0, 8)}-${Date.now()}`;
          await supa.from("payments").insert({
            listing_id: null,
            type: "wanted",
            amount: 1000,
            status: "pending",
            midtrans_order_id: orderId,
            meta: { wanted_id: wanted.id, buyer_wa: normalizedWa },
          }).catch(() => {});
          const qrisUrl = getQrisUrl();
          const payMsg =
            `📋 *Posting Dicari ke-${(pastCount || 0) + 1}*\n\n` +
            `🔍 *${parsed.title}*\n` +
            `🏷️ ${parsed.category}${budgetStr}${campusStr}\n\n` +
            `Posting ke-4 dan seterusnya dikenakan biaya *Rp 1.000*.\n` +
            `Scan QRIS di bawah untuk bayar, lalu kirim struk.`;
          await sendWa(senderJid, payMsg, qrisUrl);
          return NextResponse.json({ ok: true, state: "dicari_payment_required", bot_reply: payMsg });
        }
      }

      // --- DYNAMIC AI CHAT & SEARCH & HANDOFF ---
      try {
        const aiConfig = settings.ai_config || {};
        const aiRes = await processGeneralChat(message, aiConfig, conversationHistory);
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";

        if (aiRes.intent === "search" && aiRes.keywords) {
          await sendWa(senderJid, aiRes.reply_message || "🔍 Sedang mencari data...");

          // Query dengan title OR description, + filter kategori jika AI berhasil ekstrak
          let query = supa
            .from("listings")
            .select("id, title, price, seller_wa, condition, campus, sponsored_until, bumped_at")
            .eq("status", "active")
            .or(`title.ilike.%${aiRes.keywords}%,description.ilike.%${aiRes.keywords}%`);

          if (aiRes.category && aiRes.category !== "Lainnya") {
            query = query.eq("category", aiRes.category);
          }

          const { data: results } = await query
            .order("sponsored_until", { ascending: false, nullsFirst: false })
            .order("bumped_at", { ascending: false, nullsFirst: false })
            .limit(5);

          // Fallback tanpa filter kategori jika hasil kosong
          let finalResults = results || [];
          if (finalResults.length === 0) {
            const { data: fallbackResults } = await supa
              .from("listings")
              .select("id, title, price, seller_wa, condition, campus, sponsored_until, bumped_at")
              .eq("status", "active")
              .or(`title.ilike.%${aiRes.keywords}%,description.ilike.%${aiRes.keywords}%`)
              .order("bumped_at", { ascending: false, nullsFirst: false })
              .limit(5);
            finalResults = fallbackResults || [];
          }

          // Cari juga dari postingan grup WA
          const { data: groupResults } = await supa
            .from("group_posts")
            .select("id, sender_wa, message, created_at")
            .ilike("message", `%${aiRes.keywords}%`)
            .order("created_at", { ascending: false })
            .limit(3);

          // Cari dari halaman /dicari (wanted_listings) — orang yg lagi cari barang ini
          const { data: wantedResults } = await supa
            .from("wanted_listings")
            .select("id, buyer_name, buyer_wa, title, budget, campus")
            .eq("status", "active")
            .or(`title.ilike.%${aiRes.keywords}%,description.ilike.%${aiRes.keywords}%`)
            .order("created_at", { ascending: false })
            .limit(3);

          let reply = `🔍 *Hasil Pencarian: ${aiRes.keywords}*\n\n`;
          let count = 0;

          if (finalResults.length > 0) {
            reply += `🏪 *Dijual di Website:*\n`;
            finalResults.forEach((r) => {
              count++;
              const condLabel = r.condition === "new" ? "✨ Baru" : "Bekas";
              const campusLabel = r.campus && r.campus !== "Semua" ? ` | ${r.campus}` : "";
              const slug = buildSlug(r.title, r.id);
              reply += `${count}. *${r.title}*\n`;
              reply += `   💰 Rp ${Number(r.price).toLocaleString("id-ID")} · ${condLabel}${campusLabel}\n`;
              reply += `   📲 wa.me/${r.seller_wa}\n`;
              reply += `   👉 ${baseUrl}/produk/${slug}\n\n`;
            });
          }

          if (groupResults && groupResults.length > 0) {
            reply += `💬 *Dijual di Grup WA:*\n`;
            groupResults.forEach((g) => {
              count++;
              const preview = (g.message || "").slice(0, 80);
              reply += `${count}. ${preview}${g.message?.length > 80 ? "..." : ""}\n`;
              reply += `   📲 wa.me/${g.sender_wa}\n\n`;
            });
          }

          if (wantedResults && wantedResults.length > 0) {
            reply += `🛒 *Yang Lagi Cari ${aiRes.keywords}:*\n`;
            wantedResults.forEach((w) => {
              count++;
              const budgetLabel = w.budget ? ` · Budget Rp ${Number(w.budget).toLocaleString("id-ID")}` : "";
              const campusLabel = w.campus && w.campus !== "Semua" ? ` · ${w.campus}` : "";
              reply += `${count}. *${w.buyer_name}* cari ${w.title}${budgetLabel}${campusLabel}\n`;
              reply += `   📲 wa.me/${w.buyer_wa}\n\n`;
            });
          }

          if (count === 0) {
            const noResultReply = `❌ Maaf, aku nggak nemuin *"${aiRes.keywords}"* di web, grup, maupun halaman dicari.\n\nCoba kata kunci lain atau ketik *JUAL* untuk pasang iklan!`;
            await sendWa(senderJid, noResultReply);
            return NextResponse.json({ ok: true, state: "search_no_results", bot_reply: noResultReply });
          }

          reply += `Hubungi langsung via WA di atas ya! 😊`;
          await sendWa(senderJid, reply);
          return NextResponse.json({ ok: true, state: "search_results_sent", bot_reply: reply });

        } else if (aiRes.intent === "handoff") {
          const currentPaused = settings?.bot?.paused_users || [];
          if (!currentPaused.includes(normalizedWa)) {
            currentPaused.push(normalizedWa);
            await supa.from("settings").update({ value: { paused_users: currentPaused } }).eq("key", "bot");
          }
          const handoffReply = aiRes.reply_message || "Baik kak, pesan diteruskan ke Admin. Bot diam dulu ya 🙏";
          await sendWa(senderJid, handoffReply);
          return NextResponse.json({ ok: true, state: "handoff", bot_reply: handoffReply });

        } else {
          const chatReply = aiRes.reply_message || "Halo! Ada yang bisa kubantu?";
          await sendWa(senderJid, chatReply);
          return NextResponse.json({ ok: true, state: "ai_general_chat", bot_reply: chatReply });
        }
      } catch (err) {
        console.error("AI General Chat Error:", err);
        await sendWa(senderJid, "Duh lagi rame nih kak, coba bentar lagi ya 🙏");
      }
      return NextResponse.json({ ok: true, state: "ai_general_chat" });
    }

    // ==========================================
    // FOTO [kode] + foto → tambah foto ke iklan
    // ==========================================
    const fotoMatch = (message || "").match(/^FOTO\s+([A-Za-z0-9]+)/i);
    if (fotoMatch && file) {
      const fotoShortId = fotoMatch[1];
      const { data: fotoListings } = await supa
        .from("listings")
        .select("id, title, images")
        .eq("listing_code", parseInt(fotoShortId))
        .eq("seller_wa", normalizedWa)
        .in("status", ["active", "pending"]);

      if (fotoListings && fotoListings.length > 0) {
        const fotoListing = fotoListings[0];
        const fotoUrls = [];
        for (const f of files.filter(f => (f.type || "").startsWith("image/"))) {
          try {
            const fBuf = await sharp(Buffer.from(await f.arrayBuffer())).webp({ quality: 80 }).toBuffer();
            const fName = `wa-${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;
            await supa.storage.from("listings").upload(fName, fBuf, { contentType: "image/webp" });
            const { data: { publicUrl: fUrl } } = supa.storage.from("listings").getPublicUrl(fName);
            fotoUrls.push(fUrl);
          } catch (_) {}
        }

        if (fotoUrls.length > 0) {
          const existingImages = Array.isArray(fotoListing.images) ? fotoListing.images : [];
          const newImages = [...existingImages, ...fotoUrls].slice(0, 10);
          const updateData = { images: newImages };
          if (!existingImages[0]) updateData.image_url = fotoUrls[0];
          await supa.from("listings").update(updateData).eq("id", fotoListing.id);

          const fotoMsg =
            `✅ *${fotoUrls.length} foto ditambahkan!*\n\n` +
            `📦 *${fotoListing.title}*\n` +
            `🖼️ Total foto: ${newImages.length}/10\n\n` +
            `Ketik *IKLANKU* untuk cek iklan kamu.`;
          await sendWa(senderJid, fotoMsg);
          return NextResponse.json({ ok: true, state: "foto_added", bot_reply: fotoMsg });
        }
      }
      // Jika kode tidak ditemukan, lanjut ke new listing creation di bawah
    }

    // Ada Teks/Media = Iklan Baru!
    await sendWa(senderJid, "⏳ Bentar ya, lagi diproses…");

    try {
      const settings = await getSettings();
      
      const fileBuffers = [];
      const imageBuffers = [];
      const mimeTypes = [];
      
      if (files && files.length > 0) {
        for (const f of files) {
          const buf = Buffer.from(await f.arrayBuffer());
          const fType = f.type || "application/octet-stream";
          fileBuffers.push({ file: f, buffer: buf, type: fType });
          if (fType.startsWith("image/")) {
            imageBuffers.push(buf);
            mimeTypes.push(fType);
          }
        }
      }

      const extracted = await parseListingFromText(message, settings.ai_config || {}, imageBuffers, mimeTypes);

      if (!extracted || !extracted.items || extracted.items.length === 0) {
        throw new Error("Waduh aku kurang nangkep detail iklannya kak. Coba tulis lebih jelas ya, atau pastikan tulisan di fotonya kebaca.");
      }

      // Cek Distributor
      const { data: profile } = await supa.from("seller_profiles").select("name, distributor").eq("wa", normalizedWa).maybeSingle();
      
      let profileName = profile?.name || profileNameFromBot || "Pengguna WA";
      let isNewWaUser = false;
      if (!profile) {
        isNewWaUser = true;
        await supa.from("seller_profiles").insert({ wa: normalizedWa, name: profileName });
      } else if (profileNameFromBot && profile.name === "Pengguna WA") {
        await supa.from("seller_profiles").update({ name: profileNameFromBot }).eq("wa", normalizedWa);
        profileName = profileNameFromBot;
      }
      
      const isDistributor = profile?.distributor === true;

      // Batas max listing aktif per seller (cegah spam listing)
      const maxListings = isDistributor ? 30 : (settings.pricing?.maxActiveListings || 5);
      const { count: activeCount } = await supa
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_wa", normalizedWa)
        .eq("status", "active");
      if ((activeCount || 0) >= maxListings) {
        await sendWa(senderJid,
          `⚠️ *Batas Iklan Aktif Tercapai*\n\n` +
          `Kamu sudah punya *${activeCount} iklan aktif* (maks. ${maxListings}).\n\n` +
          `Hapus atau tandai iklan lama sebagai *TERJUAL* sebelum pasang yang baru.\n` +
          `Ketik *IKLANKU* untuk melihat daftar iklanmu.`
        );
        return NextResponse.json({ ok: true, state: "max_listing_reached" });
      }

      // Upload semua file
      const uploadedUrls = [];
      let primaryMimeType = fileBuffers[0]?.type || "application/octet-stream";
      
      for (const fObj of fileBuffers) {
        let uploadBuf = fObj.buffer;
        let uploadMime = fObj.type;
        let ext = "bin";

        if (uploadMime.startsWith("image/")) {
          uploadBuf = await processImageWithWatermark(uploadBuf);
          uploadMime = "image/webp";
          ext = "webp";
        } else if (uploadMime.startsWith("video/")) {
          ext = "mp4";
        } else if (uploadMime.includes("pdf")) {
          ext = "pdf";
        } else {
          ext = uploadMime.split("/")[1] || "bin";
        }

        const fName = `wa-${Date.now()}-${Math.floor(Math.random() * 9999)}.${ext}`;
        const { error: upErr } = await supa.storage
          .from("listings")
          .upload(fName, uploadBuf, { contentType: uploadMime });
        if (upErr) throw new Error("Gagal mengunggah media ke server.");

        const { data: { publicUrl: url } } = supa.storage.from("listings").getPublicUrl(fName);
        uploadedUrls.push(url);
        await new Promise(r => setTimeout(r, 200));
      }

      const publicUrl = uploadedUrls[0] || null;
      const fileMimeType = primaryMimeType;
      
      const listingDays = Number(settings.pricing?.listingDays) || 14;
      const expiresAt = new Date(Date.now() + listingDays * 24 * 60 * 60 * 1000).toISOString();
      const isAutoAddFee = settings.distributor?.auto_add_fee !== false;

      let totalAmount = 0;
      const createdListings = [];

      for (const item of extracted.items) {
        let finalPrice = Number(item.price) || 0;
        let distFee = 0;

        if (isDistributor) {
          if (finalPrice < 6000000) {
            distFee = 150000;
          } else if (finalPrice <= 10000000) {
            distFee = Math.round(finalPrice * 0.05);
          } else {
            distFee = Math.round(finalPrice * 0.05);
          }
          if (isAutoAddFee && distFee > 0) finalPrice += distFee;
        }

        const { data: newListing, error: listingError } = await supa.from("listings").insert({
          seller_wa: normalizedWa,
          seller_name: profileName,
          title: item.title || "Barang Dijual",
          price: finalPrice,
          description: item.description || message || "",
          category: item.category || "Lainnya",
          type: "barang",
          condition: item.condition === "new" ? "new" : "used",
          campus: ["USU", "POLMED", "Semua"].includes(item.campus) ? item.campus : "Semua",
          image_url: fileMimeType.startsWith("image/") ? publicUrl : null,
          images: fileMimeType.startsWith("image/") ? uploadedUrls : [],
          status: isDistributor ? "active" : "pending",
          distributor_fee: isDistributor ? distFee : null,
          expires_at: expiresAt,
          bumped_at: new Date().toISOString(),
        }).select().single();

        if (listingError) throw new Error("Gagal menyimpan data iklan: " + listingError.message);
        
        createdListings.push(newListing);
        if (!isDistributor) {
          totalAmount += adFeeFrom(settings.pricing, "barang", newListing.price);
        }
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";

      if (isDistributor) {
        let botReply = `✅ *Iklan Otomatis Tayang (Distributor)*\n\n`;
        for (const l of createdListings) {
          const productSlug = buildSlug(l.title, l.id);
          botReply += `📦 *${l.title}*\n💰 Harga: Rp ${l.price.toLocaleString("id-ID")}\n💳 Fee: Rp ${l.distributor_fee?.toLocaleString("id-ID") || 0}\n🔗 ${baseUrl}/produk/${productSlug}\n\n`;
        }
        botReply += `_Barang sudah disebarkan ke grup WA dan tayang di website._`;
        
        await sendWa(senderJid, botReply);
        
        // Notify superadmins & post to group
        const to62 = n => (n || "").replace(/\D/g, "").replace(/^0/, "62");
        const rawAdmins = [process.env.ADMIN_WA || "", process.env.SUPER_ADMIN_WA || ""].join(",");
        const adminNumbers = [...new Set(rawAdmins.split(",").map(a => to62(a.trim())).filter(Boolean))];
        
        for (const l of createdListings) {
          const productSlug = buildSlug(l.title, l.id);
          const shareMsg = `📢 *Distributor Post*\n\n🛒 *${l.title}* — Rp ${Number(l.price).toLocaleString("id-ID")}\nFee: Rp ${l.distributor_fee?.toLocaleString("id-ID") || 0}\n👉 ${baseUrl}/produk/${productSlug}`;
          for (const adminNum of adminNumbers) {
            await sendWa(adminNum, shareMsg).catch(() => {});
          }
          await Promise.all([
            postToGroup(l, settings?.admin),
            notifyMatchingWanted(supa, l),
            notifyCategorySubscribers(supa, l),
          ].map(p => p.catch(() => {})));
        }
        
        return NextResponse.json({ ok: true, state: "listing_created_distributor" });
      }

      // Harga belum diisi (AI tak nemu harga di teks/foto) → JANGAN posting Rp 0 &
      // langsung tagih. Iklan sudah tersimpan (pending, belum tayang) + foto aman;
      // cukup tanya harganya, lalu resume via blok RESUME di atas.
      if (createdListings.length === 1 && Number(createdListings[0].price) <= 0) {
        await supa.from("wa_listing_drafts").upsert({
          wa: normalizedWa,
          text_parts: JSON.stringify({ awaitingPriceFor: createdListings[0].id }),
          updated_at: new Date().toISOString(),
        });
        await sendWa(senderJid,
          `📦 *${createdListings[0].title}* udah aku catat + fotonya tersimpan! 📸\n\n` +
          `Tinggal *harganya* nih kak — ketik angka harganya aja ya, contoh: *90rb* atau *150000*.\n\n_(Ketik *BATAL* kalau ga jadi)_`
        );
        return NextResponse.json({ ok: true, state: "listing_awaiting_price" });
      }

      // Non-distributor payment logic
      const orderId = `IKLAN-WA-${createdListings[0].listing_code}-${Date.now()}`;
      const isBulk = createdListings.length > 1;

      await supa.from("payments").insert({
        listing_id: createdListings[0].id,
        type: isBulk ? "bulk_iklan" : "iklan",
        amount: totalAmount,
        status: "pending",
        midtrans_order_id: orderId,
        meta: isBulk ? { listing_ids: createdListings.map(l => l.id) } : null,
      });

      const qrisUrl = getQrisUrl();
      const namaReminder = (isNewWaUser && profileName === "Pengguna WA") ? `\n💡 Ketik *NAMA [nama kamu]* untuk set nama profil iklan.\n` : "";
      
      let fallbackReply = `✅ *Iklanmu udah masuk!*\n\n`;
      for (const l of createdListings) {
        fallbackReply += `📦 *${l.title}* (Rp ${l.price.toLocaleString("id-ID")}) - Kode: *${l.listing_code}*\n`;
      }
      fallbackReply += `${namaReminder}\n`;
      
      const aiReply = extracted.reply_message ? `${extracted.reply_message}\n${namaReminder}\n` : fallbackReply;

      const paymentInstructions =
        `Biar iklannya tayang, scan QRIS di bawah & transfer ya kak:\n\n` +
        `💳 *Rp ${totalAmount.toLocaleString("id-ID")}*\n\n` +
        `Kalau udah transfer, kirim *screenshot struk*nya ke sini ya.\n\n` +
        (isBulk ? "" : `_(Biaya terasa berat? Ketik *TAWAR BIAYA ${createdListings[0].listing_code} [nominal]* untuk menawar ke admin)_`);

      await sendWa(senderJid, aiReply + paymentInstructions, qrisUrl);

      return NextResponse.json({ ok: true, state: "listing_created_pending_payment" });

    } catch (err) {
      console.error("WA New Listing Error Baileys:", err);
      await sendWa(senderJid, "Waduh, ada kendala pas proses iklanmu: " + err.message);
      return NextResponse.json({ ok: true, error: err.message });
    }

  } catch (error) {
    console.error("Webhook Error Baileys:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
