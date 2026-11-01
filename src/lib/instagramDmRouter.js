import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { checkProhibitedListing } from "@/lib/profanity";
import { moderateListing } from "@/lib/moderationRules";
import { sanitizeListingTitle, normalizePriceInput } from "@/lib/listingSchema";
import { getSettings, adFeeFrom } from "@/lib/settings";
import {
  sendInstagramQuickReplies,
  sendInstagramText,
} from "@/lib/instagramDm";
import {
  getDmSession,
  setDmSession,
  clearDmSession,
} from "@/lib/instagramDmSession";
import {
  getLinkedSeller,
  createLinkChallenge,
  verifyLinkChallenge,
} from "@/lib/instagramDmAuth";

function siteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.kampuskita.my.id"
  ).replace(/\/$/, "");
}

/**
 * Parsing nominal harga yang fleksibel dari teks chat:
 * Contoh: "180rb" -> 180000, "1,5jt" -> 1500000, "50k" -> 50000, "50.000" -> 50000
 */
export function parseInstagramPrice(rawText) {
  if (!rawText) return 0;
  const text = String(rawText).toLowerCase().trim();

  // 1. Cek juta (e.g. 1.5jt, 1,5 juta, 2jt)
  const matchJuta = text.match(/(\d+(?:[.,]\d+)?)\s*(?:jt|juta)\b/i);
  if (matchJuta) {
    const val = parseFloat(matchJuta[1].replace(",", "."));
    return Math.round(val * 1_000_000);
  }

  // 2. Cek ribu / k (e.g. 180rb, 50k, 25 ribu)
  const matchRibu = text.match(/(\d+(?:[.,]\d+)?)\s*(?:rb|k|ribu)\b/i);
  if (matchRibu) {
    const val = parseFloat(matchRibu[1].replace(",", "."));
    return Math.round(val * 1_000);
  }

  // 3. Hanya angka / titik / koma
  const digits = text.replace(/\D/g, "");
  if (!digits) return 0;
  const num = parseInt(digits, 10);
  // Koreksi salah ketik tipikal: ketik 180 untuk 180.000
  if (num > 0 && num < 1000) {
    return num * 1000;
  }
  return num;
}

/**
 * Router DM Utama Instagram Kampus Kita
 * Mengisolasi alur pada fase Jual Barang dengan verifikasi identitas (OTP WA).
 */
export async function handleInstagramDmEvent({
  senderId,
  recipientId,
  text = "",
  quickReplyPayload = "",
  attachments = [],
}) {
  const cleanSender = String(senderId || "").trim();
  if (!cleanSender) return { ok: false, error: "sender_missing" };

  const rawText = String(text || "").trim();
  const lowerText = rawText.toLowerCase();
  const payload = String(quickReplyPayload || "").toUpperCase();

  // ── 1. BATAL / RESET GLOBAL ──
  if (
    payload === "ACTION_CANCEL" ||
    lowerText === "batal" ||
    lowerText === "cancel" ||
    lowerText === "reset"
  ) {
    await clearDmSession(cleanSender);
    await sendInstagramQuickReplies(
      cleanSender,
      "❌ Proses dibatalkan. Ada yang bisa dibantu lagi kak?",
      [
        { title: "🛍️ Jual Barang", payload: "ACTION_JUAL" },
        { title: "🛡️ Panduan COD", payload: "ACTION_PANDUAN_COD" },
      ]
    );
    return { ok: true, action: "cancelled" };
  }

  // ── 2. PENGALIHAN FITUR DI LUAR FASE JUAL (MENFESS & CARI BARANG) ──
  if (
    payload === "ACTION_MENFESS" ||
    payload === "ACTION_SEARCH" ||
    lowerText.startsWith("menfess") ||
    lowerText.startsWith("curhat") ||
    lowerText.startsWith("cari ") ||
    lowerText.startsWith("harga ") ||
    lowerText.startsWith("cek ")
  ) {
    const infoText = [
      "ℹ️ *Informasi Fitur*",
      "",
      "Untuk saat ini, fitur **Menfess Kampus** dan **Pencarian Barang** dapat kamu akses langsung melalui:",
      `🌐 Website Resmi: ${siteBaseUrl()}`,
      "💬 Bot WhatsApp Kampus Kita",
      "",
      "Instagram DM saat ini difokuskan khusus untuk **memasang iklan jual barang** mahasiswa.",
    ].join("\n");

    await sendInstagramQuickReplies(cleanSender, infoText, [
      { title: "🛍️ Pasang Iklan Jual", payload: "ACTION_JUAL" },
      { title: "🛡️ Panduan COD", payload: "ACTION_PANDUAN_COD" },
    ]);
    return { ok: true, action: "feature_redirected" };
  }

  // Ambil sesi DM pengguna
  const session = await getDmSession(cleanSender);

  // ── 3. STATE MACHINE: JUAL BARANG ──
  if (session?.flow === "jual") {
    // Step 0A: Meminta Nomor WhatsApp (jika belum tertaut)
    if (session.step === "jual_ask_wa") {
      const waFormatted = formatWa(rawText);
      if (!waFormatted || waFormatted.length < 10) {
        await sendInstagramText(
          cleanSender,
          "⚠️ Format nomor WhatsApp kurang tepat. Pastikan minimal 10 digit (contoh: 081234567890):"
        );
        return { ok: false, error: "invalid_wa" };
      }

      // Buat tantangan OTP
      const challengeRes = await createLinkChallenge({
        igSenderId: cleanSender,
        wa: waFormatted,
        campus: "Semua",
      });

      if (!challengeRes.ok) {
        await sendInstagramText(cleanSender, `⚠️ ${challengeRes.message}`);
        return { ok: false, error: "challenge_failed" };
      }

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_otp",
        data: {
          ...session.data,
          pending_wa: waFormatted,
        },
      });

      const maskedWa = `+${waFormatted.slice(0, 4)}...${waFormatted.slice(-3)}`;
      const otpPrompt = [
        "🔐 *Verifikasi Keamanan Akun*",
        "",
        `Kami telah mengirim 6 digit kode OTP ke WhatsApp kamu (${maskedWa}).`,
        "",
        "Pilih salah satu cara verifikasi:",
        "1. Buka WhatsApp dan balas pesan bot dengan: *VERIF <kode>*",
        "2. ATAU ketik 6 digit kodenya langsung di sini:",
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, otpPrompt, [
        { title: "🔄 Cek Status", payload: "ACTION_CHECK_LINK_STATUS" },
        { title: "❌ Batal", payload: "ACTION_CANCEL" },
      ]);
      return { ok: true, step: "jual_ask_otp" };
    }

    // Step 0B: Verifikasi Kode OTP (lewat DM atau tombol cek status)
    if (session.step === "jual_ask_otp") {
      const isCheckStatus = payload === "ACTION_CHECK_LINK_STATUS" || lowerText === "cek";
      const cleanDigits = rawText.replace(/\D/g, "");

      if (isCheckStatus) {
        const linkCheck = await getLinkedSeller(cleanSender);
        if (linkCheck.linked) {
          await setDmSession(cleanSender, {
            ...session,
            step: "jual_ask_photo",
            data: {
              ...session.data,
              seller_wa: linkCheck.wa,
              campus: linkCheck.campus || "Semua",
            },
          });

          await sendInstagramQuickReplies(
            cleanSender,
            "✅ *Akun Berhasil Ditautkan!*\n\n📸 **Langkah 1:** Kirimkan 1 foto barang yang ingin kamu jual (atau ketik 'skip' jika tanpa foto):",
            [
              { title: "⏩ Lewati Foto", payload: "ACTION_SKIP_PHOTO" },
              { title: "❌ Batal", payload: "ACTION_CANCEL" },
            ]
          );
          return { ok: true, step: "jual_ask_photo" };
        } else {
          await sendInstagramQuickReplies(
            cleanSender,
            "⏳ Belum terverifikasi nih kak. Pastikan kamu sudah membalas *VERIF <kode>* di WhatsApp, atau ketik 6 digit kodenya langsung di sini ya:",
            [
              { title: "🔄 Cek Lagi", payload: "ACTION_CHECK_LINK_STATUS" },
              { title: "❌ Batal", payload: "ACTION_CANCEL" },
            ]
          );
          return { ok: false, error: "otp_not_verified_yet" };
        }
      }

      if (cleanDigits.length === 6) {
        const verifRes = await verifyLinkChallenge({
          wa: session.data?.pending_wa,
          otpInput: cleanDigits,
          igSenderId: cleanSender,
        });

        if (verifRes.ok) {
          await setDmSession(cleanSender, {
            ...session,
            step: "jual_ask_photo",
            data: {
              ...session.data,
              seller_wa: verifRes.wa,
              campus: verifRes.campus || "Semua",
            },
          });

          await sendInstagramQuickReplies(
            cleanSender,
            "✅ *Akun Berhasil Ditautkan!*\n\n📸 **Langkah 1:** Kirimkan 1 foto barang yang ingin kamu jual (atau ketik 'skip' jika tanpa foto):",
            [
              { title: "⏩ Lewati Foto", payload: "ACTION_SKIP_PHOTO" },
              { title: "❌ Batal", payload: "ACTION_CANCEL" },
            ]
          );
          return { ok: true, step: "jual_ask_photo" };
        } else {
          await sendInstagramText(cleanSender, `❌ ${verifRes.message}`);
          return { ok: false, error: "invalid_otp" };
        }
      }

      await sendInstagramText(cleanSender, "⚠️ Masukkan 6 digit kode OTP yang kamu terima di WhatsApp, atau balas di WA dengan format: VERIF <kode>:");
      return { ok: false, error: "invalid_otp_input" };
    }

    // Step 1: Menerima Foto Barang (atau skip)
    if (session.step === "jual_ask_photo") {
      const isSkip = payload === "ACTION_SKIP_PHOTO" || lowerText === "skip" || lowerText === "lewati";
      let imageUrl = null;

      if (!isSkip) {
        const imgAttachment = attachments.find((a) => a.type === "image");
        if (imgAttachment?.payload?.url) {
          imageUrl = imgAttachment.payload.url;
        }
      }

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_title",
        data: {
          ...session.data,
          image_url: imageUrl,
        },
      });

      await sendInstagramQuickReplies(
        cleanSender,
        "📝 **Langkah 2:** Apa *Nama / Judul Barang* yang kamu jual?\n\n(Contoh: Kalkulator Casio fx-991EX Bekas)",
        [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
      );
      return { ok: true, step: "jual_ask_title" };
    }

    // Step 2: Menerima Judul Barang
    if (session.step === "jual_ask_title") {
      if (!rawText || rawText.length < 3) {
        await sendInstagramText(cleanSender, "⚠️ Judul barang terlalu pendek. Tuliskan nama barang yang jelas ya kak:");
        return { ok: false, error: "title_too_short" };
      }

      const cleanedTitle = sanitizeListingTitle(rawText);
      const mod = checkProhibitedListing(cleanedTitle, "");
      if (mod.prohibited) {
        await sendInstagramQuickReplies(
          cleanSender,
          `⛔ Maaf kak, barang ini terdeteksi barang terlarang (${mod.reason}). Dilarang demi keselamatan kampus dan kebijakan AdSense.`,
          [{ title: "🛍️ Jual Lainnya", payload: "ACTION_JUAL" }, { title: "❌ Batal", payload: "ACTION_CANCEL" }]
        );
        await clearDmSession(cleanSender);
        return { ok: false, error: "prohibited_item" };
      }

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_price",
        data: {
          ...session.data,
          title: cleanedTitle,
        },
      });

      await sendInstagramQuickReplies(
        cleanSender,
        `💰 **Langkah 3:** Berapa *Harga* untuk "${cleanedTitle}"?\n\n(Contoh: 180000 atau ketik 180rb)`,
        [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
      );
      return { ok: true, step: "jual_ask_price" };
    }

    // Step 3: Menerima Harga Barang
    if (session.step === "jual_ask_price") {
      const parsedPrice = parseInstagramPrice(rawText);
      let normalizedPrice;
      try {
        normalizedPrice = normalizePriceInput(parsedPrice, "barang", "Elektronik");
      } catch (err) {
        await sendInstagramText(
          cleanSender,
          `⚠️ ${err.message || "Masukkan nominal harga yang wajar (minimal Rp 1.000)."}`
        );
        return { ok: false, error: "invalid_price" };
      }

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_desc",
        data: {
          ...session.data,
          price: normalizedPrice,
        },
      });

      await sendInstagramQuickReplies(
        cleanSender,
        "📋 **Langkah 4:** Tuliskan *Deskripsi singkat* (kondisi fisik, kelengkapan, titik temu COD):\n\n(Contoh: Mulus 95%, lengkap dus, COD di Pendopo USU)",
        [
          { title: "⏩ Lewati Deskripsi", payload: "ACTION_SKIP_DESC" },
          { title: "❌ Batal", payload: "ACTION_CANCEL" },
        ]
      );
      return { ok: true, step: "jual_ask_desc" };
    }

    // Step 4: Menerima Deskripsi Barang & Pratinjau
    if (session.step === "jual_ask_desc") {
      const isSkipDesc = payload === "ACTION_SKIP_DESC" || lowerText === "skip" || lowerText === "lewati";
      const description = isSkipDesc ? "" : rawText;

      const listingData = {
        ...session.data,
        description,
      };

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_confirm",
        data: listingData,
      });

      const konfirmasi = [
        "🔎 *Pratinjau Iklanmu:*",
        "",
        `📌 *Barang:* ${listingData.title}`,
        `💰 *Harga:* ${rupiah(listingData.price)}`,
        `📋 *Deskripsi:* ${listingData.description || "Tidak ada deskripsi"}`,
        `📍 *Kampus:* ${listingData.campus || "USU / POLMED"}`,
        `📱 *WhatsApp:* +${listingData.seller_wa}`,
        "",
        "Siap dikirim untuk peninjauan moderator kampus?",
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, konfirmasi, [
        { title: "✅ Tayangkan Iklan", payload: "ACTION_CONFIRM_PUBLISH" },
        { title: "❌ Batal", payload: "ACTION_CANCEL" },
      ]);
      return { ok: true, step: "jual_confirm" };
    }

    // Step 5: Eksekusi Publikasi / Pengiriman Iklan
    if (session.step === "jual_confirm") {
      if (payload === "ACTION_CONFIRM_PUBLISH" || lowerText === "ya" || lowerText === "tayangkan") {
        const item = session.data;

        // Pastikan akun penjual masih tertaut sah
        const linked = await getLinkedSeller(cleanSender);
        if (!linked.linked || linked.wa !== item.seller_wa) {
          await sendInstagramText(cleanSender, "⚠️ Sesi penautan akun berakhir. Silakan mulai ulang penautan WhatsApp.");
          await clearDmSession(cleanSender);
          return { ok: false, error: "session_expired" };
        }

        // Moderasi Lengkap (Deterministik + Gemini)
        const moderation = await moderateListing({
          title: item.title,
          description: item.description,
          price: item.price,
          category: "Elektronik",
          type: "barang",
          seller_wa: linked.wa,
        });

        if (moderation.status === "rejected") {
          await sendInstagramQuickReplies(
            cleanSender,
            `⛔ Iklan tidak dapat ditayangkan: ${moderation.moderation_reason}`,
            [{ title: "🛍️ Jual Lainnya", payload: "ACTION_JUAL" }, { title: "❌ Batal", payload: "ACTION_CANCEL" }]
          );
          await clearDmSession(cleanSender);
          return { ok: false, error: "moderation_rejected" };
        }

        const supa = getAdminClient();
        const settings = await getSettings().catch(() => ({ pricing: {} }));
        const amount = adFeeFrom(settings.pricing, "barang", item.price);
        const isFreeMode = amount === 0 || settings.pricing?.freeMode !== false;

        // Pilot policy: status 'pending' agar moderator meninjau sebelum siaran WhatsApp
        const initialStatus = "pending";
        const modReason = "Menunggu peninjauan moderator kampus (Instagram DM)";

        const insertPayload = {
          title: item.title,
          price: item.price,
          description: item.description || "",
          seller_name: linked.profile?.name || `Penjual IG (${cleanSender.slice(-4)})`,
          seller_wa: linked.wa,
          image_url: item.image_url || null,
          status: initialStatus,
          type: "barang",
          campus: linked.campus || "USU / POLMED",
          area: "Sekitar Kampus",
          condition: "used",
          moderation_reason: modReason,
          risk_score: moderation.risk_score || 0.0,
          bumped_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
        };

        let { data: newListing, error: insertErr } = await supa
          .from("listings")
          .insert(insertPayload)
          .select()
          .single();

        // Fallback jika skema database produksi belum punya kolom moderasi (PGRST204)
        if (insertErr && (insertErr.code === "PGRST204" || String(insertErr.message || "").includes("column"))) {
          delete insertPayload.moderation_reason;
          delete insertPayload.risk_score;
          const retry = await supa.from("listings").insert(insertPayload).select().single();
          newListing = retry.data;
          insertErr = retry.error;
        }

        if (insertErr || !newListing) {
          console.error("Gagal simpan listing via IG DM:", insertErr);
          await sendInstagramText(cleanSender, "❌ Terjadi kendala saat menyimpan iklan. Silakan coba sebentar lagi ya kak.");
          await clearDmSession(cleanSender);
          return { ok: false, error: insertErr?.message };
        }

        await clearDmSession(cleanSender);

        const detailUrl = `${siteBaseUrl()}/produk/${buildSlug(newListing.title, newListing.id)}`;

        // Mode Berbayar: buat order pembayaran jika berlaku
        if (!isFreeMode && amount > 0) {
          const orderId = `IKLAN-IG-${newListing.id.slice(0, 8)}-${Date.now()}`;
          await supa.from("payments").insert({
            listing_id: newListing.id,
            type: "iklan",
            amount,
            status: "pending",
            midtrans_order_id: orderId,
          }).catch(() => {});

          const payMsg = [
            "📋 *Iklan Berhasil Dibuat!*",
            "",
            `📌 *Judul:* ${newListing.title}`,
            `💰 *Biaya Tayang:* ${rupiah(amount)}`,
            "",
            `Silakan selesaikan pembayaran biaya pasang iklan di:`,
            `${siteBaseUrl()}/dashboard`,
            "",
            "Setelah pembayaran terverifikasi, iklan akan segera ditinjau dan ditayangkan.",
          ].join("\n");

          await sendInstagramQuickReplies(cleanSender, payMsg, [
            { title: "🛍️ Pasang Iklan Lain", payload: "ACTION_JUAL" },
            { title: "📋 Menu Utama", payload: "ACTION_MENU" },
          ]);
          return { ok: true, action: "payment_required", listingId: newListing.id };
        }

        // Mode Gratis / Pilot: Masuk Antrean Moderasi
        const successMsg = [
          "🎉 *Iklanmu Berhasil Terkirim!*",
          "",
          `📌 *Judul:* ${newListing.title}`,
          `⏳ *Status:* Menunggu peninjauan moderator kampus`,
          `🌐 *Pratinjau Web:* ${detailUrl}`,
          "",
          "Setelah disetujui moderator, iklanmu akan otomatis aktif dan disiarkan ke WhatsApp Kampus Kita.",
        ].join("\n");

        await sendInstagramQuickReplies(cleanSender, successMsg, [
          { title: "🛍️ Pasang Iklan Lain", payload: "ACTION_JUAL" },
          { title: "📋 Menu Utama", payload: "ACTION_MENU" },
        ]);
        return { ok: true, action: "submitted_for_review", listingId: newListing.id };
      }
    }
  }

  // ── 4. ENTRY POINT ALUR JUAL (JUAL / PASANG IKLAN / ACTION_JUAL) ──
  if (
    payload === "ACTION_JUAL" ||
    payload === "ACTION_CONTINUE_PHOTO" ||
    lowerText === "jual" ||
    lowerText === "pasang iklan" ||
    lowerText === "iklan"
  ) {
    // Periksa apakah Instagram sender sudah ditautkan ke akun WhatsApp
    const linked = await getLinkedSeller(cleanSender);

    if (linked.linked) {
      await setDmSession(cleanSender, {
        flow: "jual",
        step: "jual_ask_photo",
        data: {
          seller_wa: linked.wa,
          campus: linked.campus || "Semua",
        },
      });

      const maskedWa = `+${linked.wa.slice(0, 4)}...${linked.wa.slice(-3)}`;
      const promptLinked = [
        `Halo kak! 👋`,
        `Akun Instagram kamu sudah terhubung dengan WhatsApp (${maskedWa}).`,
        "",
        "📸 **Langkah 1:** Kirimkan 1 foto barang yang mau kamu jual (atau ketik 'skip' jika tanpa foto):",
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, promptLinked, [
        { title: "⏩ Lewati Foto", payload: "ACTION_SKIP_PHOTO" },
        { title: "❌ Batal", payload: "ACTION_CANCEL" },
      ]);
      return { ok: true, flow: "jual", step: "jual_ask_photo" };
    } else {
      await setDmSession(cleanSender, {
        flow: "jual",
        step: "jual_ask_wa",
        data: {},
      });

      const promptWa = [
        "🛍️ *Pasang Iklan via Instagram DM*",
        "",
        "Sebelum mulai, masukkan **Nomor WhatsApp** aktif kamu untuk menautkan akun (cukup sekali di awal):",
        "",
        "(Contoh: 081234567890)",
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, promptWa, [
        { title: "❌ Batal", payload: "ACTION_CANCEL" },
      ]);
      return { ok: true, flow: "jual", step: "jual_ask_wa" };
    }
  }

  // Trigger: Panduan COD Aman
  if (payload === "ACTION_PANDUAN_COD" || lowerText.includes("cod") || lowerText.includes("aman")) {
    const codTips = [
      "🛡️ *Panduan COD Aman di Kampus:*",
      "",
      "1. Bertemu hanya di titik ramai & terang:",
      "   • Pendopo USU & Pintu 1-4 Dr. Mansyur",
      "   • Gazebo FIB & Kantin FEB",
      "   • Gedung Z POLMED",
      "2. Ajak teman menemani.",
      "3. Periksa kondisi barang sebelum membayar.",
      "4. Jangan pernah transfer uang muka (DP) kepada orang asing.",
      "",
      `Baca panduan lengkap: ${siteBaseUrl()}/panduan-aman`,
    ].join("\n");

    await sendInstagramQuickReplies(cleanSender, codTips, [
      { title: "🛍️ Jual Barang", payload: "ACTION_JUAL" },
      { title: "📋 Menu Utama", payload: "ACTION_MENU" },
    ]);
    return { ok: true, action: "sent_cod_tips" };
  }

  // ── 5. DEFAULT / GREETING MENU (FOKUS FASE JUAL) ──
  const greeting = [
    "Halo kak! 👋",
    "Selamat datang di asisten resmi *Kampus Kita* (USU & POLMED).",
    "",
    "Ketik *JUAL* untuk memasang iklan barang langsung dari Instagram DM.",
  ].join("\n");

  await sendInstagramQuickReplies(cleanSender, greeting, [
    { title: "🛍️ Jual Barang", payload: "ACTION_JUAL" },
    { title: "🛡️ Panduan COD", payload: "ACTION_PANDUAN_COD" },
  ]);

  return { ok: true, action: "sent_menu" };
}
