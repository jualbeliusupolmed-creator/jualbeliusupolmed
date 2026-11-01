import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { hashPin } from "@/lib/pin";
import { tulisProfil } from "@/lib/tulisProfil";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { checkProhibitedListing } from "@/lib/profanity";
import { moderateListing } from "@/lib/moderationRules";
import { sanitizeListingTitle, normalizePriceInput } from "@/lib/listingSchema";
import { getSettings, DEFAULT_SETTINGS, adFeeFrom } from "@/lib/settings";
import { tokoAktif } from "@/lib/toko";
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
  resolveInstagramCampus,
} from "@/lib/instagramDmAuth";

function siteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.kampuskita.my.id"
  ).replace(/\/$/, "");
}

const DM_PRODUCT_CATEGORIES = [
  ["CATEGORY_ELEKTRONIK", "Elektronik"],
  ["CATEGORY_FASHION", "Fashion"],
  ["CATEGORY_KENDARAAN", "Kendaraan"],
  ["CATEGORY_PROPERTI", "Properti"],
  ["CATEGORY_BUKU", "Buku Kuliah"],
  ["CATEGORY_MAKANAN", "Makanan"],
  ["CATEGORY_LAINNYA", "Lainnya"],
];

export function inferCategoryFromTitle(title = "") {
  const t = String(title || "").toLowerCase();

  // Buku / Kuliah
  if (/\b(buku|diktat|modul|kalkulus|novel|komik|catatan|skripsi|jurnal|kamus|binder)\b/i.test(t)) {
    return "Buku Kuliah";
  }

  // Elektronik
  if (
    /\b(hp|handphone|ponsel|iphone|ipad|samsung|xiaomi|redmi|oppo|vivo|realme|infinix|laptop|macbook|asus|lenovo|acer|dell|kalkulator|casio|tws|headset|earphone|headphone|mouse|keyboard|monitor|charger|kabel|powerbank|ps3|ps4|ps5|nintendo|pc|ram|ssd|vga)\b/i.test(
      t
    )
  ) {
    return "Elektronik";
  }

  // Kendaraan
  if (
    /\b(motor|sepeda|helm|bogo|kyt|nhk|ink|agv|honda|yamaha|suzuki|beat|vario|scoopy|nmax|aerox|vespa|spion|jas hujan)\b/i.test(
      t
    )
  ) {
    return "Kendaraan";
  }

  // Fashion
  if (
    /\b(baju|kaos|kemeja|celana|jaket|hoodie|sweater|sepatu|sneakers|sandal|tas|ransel|tote bag|totebag|dompet|jam tangan|gamis|hijab|jilbab|rok)\b/i.test(
      t
    )
  ) {
    return "Fashion";
  }

  // Kos / Properti
  if (/\b(kos|kost|kontrakan|kamar|sewa kamar|paviliun)\b/i.test(t)) {
    return "Kos";
  }

  // Makanan
  if (/\b(makanan|snack|kue|roti|kopi|minuman|nasi|mie|frozen food|cemilan)\b/i.test(t)) {
    return "Makanan";
  }

  return "Lainnya";
}

async function sellerHasUnpaidSoldFees(supa, sellerWa) {
  const { data: listings, error: listingError } = await supa
    .from("listings")
    .select("id")
    .eq("seller_wa", sellerWa);
  if (listingError) throw new Error("seller_listing_lookup_failed");
  const listingIds = (listings || []).map((listing) => listing.id).filter(Boolean);
  if (!listingIds.length) return false;

  const { count, error: paymentError } = await supa
    .from("payments")
    .select("id", { count: "exact", head: true })
    .in("listing_id", listingIds)
    .eq("type", "sold_fee")
    .eq("status", "pending");
  if (paymentError) throw new Error("seller_payment_lookup_failed");
  return (count || 0) > 0;
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
        campus: session.data?.campus || "Semua",
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
        "Buka DM Instagram ini lalu ketik 6 digit kode yang kamu terima di WhatsApp.",
        "Kode hanya berlaku 5 menit dan hanya untuk penautan akun yang kamu mulai.",
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
            step: "jual_set_password",
            data: {
              ...session.data,
              seller_wa: linkCheck.wa,
              campus: session.data?.campus || linkCheck.campus || "Semua",
            },
          });

          await sendInstagramQuickReplies(
            cleanSender,
            "✅ *Akun WhatsApp Terverifikasi!*\n\n🔐 **Buat Kata Sandi Akun Web:**\nKetik kata sandi (minimal 6 karakter) yang ingin kamu gunakan untuk akunmu di https://www.kampuskita.my.id:",
            [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
          );
          return { ok: true, step: "jual_set_password" };
        } else {
          await sendInstagramQuickReplies(
            cleanSender,
            "⏳ Belum tertaut. Ketik 6 digit kode yang dikirim ke WhatsApp di DM ini, atau minta kode baru jika sudah kedaluwarsa.",
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
            step: "jual_set_password",
            data: {
              ...session.data,
              seller_wa: verifRes.wa,
              campus: session.data?.campus || verifRes.campus || "Semua",
            },
          });

          await sendInstagramQuickReplies(
            cleanSender,
            "✅ *Nomor WhatsApp Berhasil Diverifikasi!*\n\n🔐 **Buat Kata Sandi Akun Web:**\nKetik kata sandi (minimal 6 karakter) yang ingin kamu gunakan untuk akunmu di https://www.kampuskita.my.id:",
            [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
          );
          return { ok: true, step: "jual_set_password" };
        } else {
          await sendInstagramText(cleanSender, `❌ ${verifRes.message}`);
          return { ok: false, error: "invalid_otp" };
        }
      }

      await sendInstagramText(cleanSender, "⚠️ Masukkan 6 digit kode OTP yang kamu terima di WhatsApp ke DM ini:");
      return { ok: false, error: "invalid_otp_input" };
    }

    // Step 0C: Mengatur Kata Sandi Akun di Instagram DM
    if (session.step === "jual_set_password") {
      const password = rawText.trim();
      if (!password || password.length < 6) {
        await sendInstagramText(
          cleanSender,
          "⚠️ Kata sandi minimal 6 karakter. Silakan ketik kata sandi yang kamu inginkan:"
        );
        return { ok: false, error: "password_too_short" };
      }

      const supa = getAdminClient();
      const hashedPassword = hashPin(password);

      // Simpan hash kata sandi ke profil penjual (sellers / seller_profiles)
      const sellerWa = session.data?.seller_wa || session.data?.pending_wa;
      if (sellerWa) {
        await tulisProfil(supa, { pin: hashedPassword, wa_verified: true }, sellerWa);
      }

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_photo",
        data: {
          ...session.data,
          seller_wa: sellerWa,
        },
      });

      await sendInstagramQuickReplies(
        cleanSender,
        "✅ *Kata Sandi Berhasil Disimpan!*\n\nAkunmu kini aktif. Kamu bisa login di https://www.kampuskita.my.id menggunakan nomor WhatsApp dan kata sandi tersebut kapan saja.\n\n📸 **Langkah 1:** Masukkan 1 atau lebih gambar, maks 5 (atau ketik 'skip' jika tanpa foto):",
        [
          { title: "⏩ Lewati Foto", payload: "ACTION_SKIP_PHOTO" },
          { title: "❌ Batal", payload: "ACTION_CANCEL" },
        ]
      );
      return { ok: true, step: "jual_ask_photo" };
    }

    // Step 1: Menerima Foto Barang (bisa lebih dari 1 foto, maks 5 foto)
    if (session.step === "jual_ask_photo") {
      const isSkip = payload === "ACTION_SKIP_PHOTO" || lowerText === "skip" || lowerText === "lewati";
      const isDone = payload === "ACTION_DONE_PHOTOS" || lowerText === "lanjut" || lowerText === "selesai" || lowerText === "done";

      // 1. Jika pengguna memilih lewati foto
      if (isSkip) {
        await setDmSession(cleanSender, {
          ...session,
          step: "jual_ask_title",
          data: {
            ...session.data,
            image_url: null,
            images: [],
          },
        });

        await sendInstagramQuickReplies(
          cleanSender,
          "📝 **Langkah 2:** Apa *Nama / Judul Barang* yang kamu jual?\n\n(Contoh: Kalkulator Casio fx-991EX Bekas)",
          [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
        );
        return { ok: true, step: "jual_ask_title" };
      }

      // 2. Ambil gambar dari attachments (mendukung multiple foto sekaligus)
      const imgAttachments = attachments.filter((a) => a.type === "image" && a.payload?.url);
      const newUrls = imgAttachments.map((a) => a.payload.url);

      if (newUrls.length > 0) {
        const currentImages = Array.isArray(session.data?.images)
          ? session.data.images
          : (session.data?.image_url ? [session.data.image_url] : []);
        const combinedImages = [...currentImages, ...newUrls].slice(0, 5);
        const primaryImage = combinedImages[0] || null;

        await setDmSession(cleanSender, {
          ...session,
          step: "jual_ask_photo",
          data: {
            ...session.data,
            image_url: primaryImage,
            images: combinedImages,
          },
        });

        const photoCount = combinedImages.length;
        const remaining = 5 - photoCount;
        const msg = [
          `📸 *${photoCount} foto barang berhasil disimpan!*`,
          "",
          remaining > 0
            ? `Kamu masih bisa kirim hingga ${remaining} foto lagi, atau tekan tombol **Lanjut ke Judul**:`
            : "Kapasitas maksimal (5 foto) sudah tercapai. Tekan tombol **Lanjut ke Judul**:",
        ].join("\n");

        await sendInstagramQuickReplies(cleanSender, msg, [
          { title: "➡️ Lanjut ke Judul", payload: "ACTION_DONE_PHOTOS" },
          { title: "❌ Batal", payload: "ACTION_CANCEL" },
        ]);
        return { ok: true, step: "jual_ask_photo", photoCount };
      }

      // 3. Jika pengguna menekan tombol selesai / lanjut atau sudah punya foto tersimpan
      if (isDone || (Array.isArray(session.data?.images) && session.data.images.length > 0)) {
        await setDmSession(cleanSender, {
          ...session,
          step: "jual_ask_title",
          data: {
            ...session.data,
          },
        });

        await sendInstagramQuickReplies(
          cleanSender,
          "📝 **Langkah 2:** Apa *Nama / Judul Barang* yang kamu jual?\n\n(Contoh: Kalkulator Casio fx-991EX Bekas)",
          [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
        );
        return { ok: true, step: "jual_ask_title" };
      }

      // 4. Jika pesan bukan foto dan belum ada foto tersimpan
      await sendInstagramQuickReplies(
        cleanSender,
        "⚠️ Silakan masukkan 1 atau lebih gambar, maks 5 (atau tekan **Lewati Foto** jika tanpa foto):",
        [
          { title: "⏩ Lewati Foto", payload: "ACTION_SKIP_PHOTO" },
          { title: "❌ Batal", payload: "ACTION_CANCEL" },
        ]
      );
      return { ok: false, error: "photo_required_or_skip" };
    }

    // Step 2: Menerima Judul Barang -> otomatis tentukan kategori dan langsung minta Harga
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

      const autoCategory = inferCategoryFromTitle(cleanedTitle);

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_price",
        data: {
          ...session.data,
          title: cleanedTitle,
          category: autoCategory,
        },
      });

      await sendInstagramQuickReplies(
        cleanSender,
        `💰 **Langkah 3:** Berapa *Harga* untuk "${cleanedTitle}"?\n\n(Contoh: 180000 atau ketik 180rb)`,
        [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
      );
      return { ok: true, step: "jual_ask_price" };
    }

    // Kompatibilitas jika sesi lama masih berada di step kategori
    if (session.step === "jual_ask_category") {
      const autoCategory = session.data?.category || inferCategoryFromTitle(session.data?.title || "");
      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_price",
        data: { ...session.data, category: autoCategory },
      });
      await sendInstagramQuickReplies(
        cleanSender,
        `💰 **Langkah 3:** Berapa *Harga* untuk "${session.data?.title || "barang"}"?\n\n(Contoh: 180000 atau ketik 180rb)`,
        [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
      );
      return { ok: true, step: "jual_ask_price" };
    }

    // Step 4: Menerima Harga Barang
    if (session.step === "jual_ask_price") {
      const parsedPrice = parseInstagramPrice(rawText);
      let normalizedPrice;
      try {
        normalizedPrice = normalizePriceInput(parsedPrice, "barang", session.data?.category || "Elektronik");
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
        "📋 **Langkah 5:** Tuliskan *Deskripsi singkat* (kondisi fisik, kelengkapan, titik temu COD):\n\n(Contoh: Mulus 95%, lengkap dus, COD di Pendopo USU)",
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

      const photoCount = Array.isArray(listingData.images) && listingData.images.length > 0
        ? listingData.images.length
        : (listingData.image_url ? 1 : 0);

      const konfirmasi = [
        "🔎 *Pratinjau Iklanmu:*",
        "",
        `📌 *Barang:* ${listingData.title}`,
        `💰 *Harga:* ${rupiah(listingData.price)}`,
        `📸 *Foto:* ${photoCount > 0 ? `${photoCount} foto terlampir` : "Tanpa foto"}`,
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

        const supa = getAdminClient();
        const isPro = linked.profile?.subscription_tier === "pro" &&
          new Date(linked.profile?.subscription_expires_at) > new Date();
        const isDistributor = !!linked.profile?.distributor;
        const hasStore = tokoAktif(linked.profile);
        if (!isPro && !isDistributor && !hasStore) {
          const { count: activeCount, error: activeCountError } = await supa
            .from("listings")
            .select("id", { count: "exact", head: true })
            .eq("seller_wa", linked.wa)
            .in("status", ["active", "pending"]);
          if (activeCountError) {
            await sendInstagramText(cleanSender, "⚠️ Batas iklan akun belum dapat diperiksa. Coba lagi nanti.");
            return { ok: false, error: "listing_limit_unavailable" };
          }
          if ((activeCount || 0) >= 15) {
            await sendInstagramText(cleanSender, "⚠️ Akun sudah mencapai batas 15 iklan aktif/menunggu. Kelola iklan lama atau hubungi admin.");
            return { ok: false, error: "listing_limit_reached" };
          }
        }

        let hasUnpaidFee;
        try {
          hasUnpaidFee = await sellerHasUnpaidSoldFees(supa, linked.wa);
        } catch {
          await sendInstagramText(cleanSender, "⚠️ Status tagihan akun belum dapat diperiksa. Coba lagi nanti.");
          return { ok: false, error: "seller_payment_lookup_unavailable" };
        }
        if (hasUnpaidFee) {
          await sendInstagramText(cleanSender, "⚠️ Akun memiliki biaya penjualan yang belum lunas. Silakan selesaikan tagihan di dashboard sebelum memasang iklan baru.");
          return { ok: false, error: "unpaid_sold_fee" };
        }

        const { data: blacklist, error: blacklistError } = await supa
          .from("blacklist")
          .select("id")
          .eq("wa", linked.wa)
          .maybeSingle();
        if (blacklistError) {
          await sendInstagramText(cleanSender, "⚠️ Status akun belum dapat diperiksa. Coba lagi nanti.");
          return { ok: false, error: "seller_status_unavailable" };
        }
        if (blacklist) {
          await sendInstagramText(cleanSender, "Nomor WhatsApp ini tidak dapat memasang iklan. Hubungi admin jika kamu merasa ini keliru.");
          return { ok: false, error: "seller_blocked" };
        }

        // Moderasi Lengkap (Deterministik + Gemini)
        const moderation = await moderateListing({
          title: item.title,
          description: item.description,
          price: item.price,
          category: item.category || "Elektronik",
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

        let settings;
        try {
          const { data: pricingRow, error: pricingError } = await supa
            .from("settings")
            .select("value")
            .eq("key", "pricing")
            .maybeSingle();
          if (pricingError) throw pricingError;
          settings = await getSettings();
          settings = {
            ...settings,
            pricing: { ...DEFAULT_SETTINGS.pricing, ...(pricingRow?.value || {}) },
          };
        } catch {
          await sendInstagramText(cleanSender, "⚠️ Pengaturan iklan belum dapat diperiksa. Data kamu tersimpan di sesi ini; coba kirim ulang sebentar lagi.");
          return { ok: false, error: "settings_unavailable" };
        }
        const amount = adFeeFrom(settings.pricing, "barang", item.price);
        const isFreeMode = amount === 0 || settings.pricing?.freeMode === true;
        const hasPaidStore = hasStore && settings.pricing?.tokoGratis !== false;
        const requiresPayment = !isFreeMode && amount > 0 && !isPro && !hasPaidStore;

        // Pilot policy: status 'pending' agar moderator meninjau sebelum siaran WhatsApp
        const initialStatus = "pending";
        const modReason = "Menunggu peninjauan moderator kampus (Instagram DM)";

        const finalImages = Array.isArray(item.images) && item.images.length > 0
          ? item.images
          : (item.image_url ? [item.image_url] : []);
        const primaryImage = finalImages[0] || item.image_url || null;

        const insertPayload = {
          title: item.title,
          price: item.price,
          description: item.description || "",
          category: item.category || "Elektronik",
          stock: 1,
          seller_name: linked.profile?.name || `Penjual IG (${cleanSender.slice(-4)})`,
          seller_wa: linked.wa,
          image_url: primaryImage,
          images: finalImages,
          status: initialStatus,
          type: "barang",
          campus: linked.campus || "Semua",
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

        // Fallback jika skema database produksi belum punya kolom moderasi atau images (PGRST204)
        if (insertErr && (insertErr.code === "PGRST204" || String(insertErr.message || "").includes("column"))) {
          delete insertPayload.moderation_reason;
          delete insertPayload.risk_score;
          delete insertPayload.images;
          const retry = await supa.from("listings").insert(insertPayload).select().single();
          newListing = retry.data;
          insertErr = retry.error;
        }

        if (newListing && finalImages.length > 0) {
          await supa.from("listings").update({ images: finalImages }).eq("id", newListing.id).catch(() => {});
        }

        if (insertErr || !newListing) {
          console.error("Gagal simpan listing via IG DM:", insertErr);
          await sendInstagramText(cleanSender, "❌ Terjadi kendala saat menyimpan iklan. Silakan coba sebentar lagi ya kak.");
          await clearDmSession(cleanSender);
          return { ok: false, error: insertErr?.message };
        }

        const detailUrl = `${siteBaseUrl()}/produk/${buildSlug(newListing.title, newListing.id)}`;

        // Mode Berbayar: buat order pembayaran jika berlaku
        if (requiresPayment) {
          const orderId = `IKLAN-IG-${newListing.id.slice(0, 8)}-${Date.now()}`;
          const { error: paymentError } = await supa.from("payments").insert({
            listing_id: newListing.id,
            type: "iklan",
            amount,
            status: "pending",
            midtrans_order_id: orderId,
            meta: { source: "instagram_dm", moderation_status: "pending" },
          });

          if (paymentError) {
            const { error: cleanupError } = await supa.from("listings").delete().eq("id", newListing.id);
            if (cleanupError) console.error("[Instagram DM] Failed to remove listing without payment record.", cleanupError.code || "database_error");
            await sendInstagramText(cleanSender, "⚠️ Tagihan belum dapat dibuat, jadi iklan belum dikirim. Silakan coba konfirmasi lagi nanti.");
            return { ok: false, error: "payment_record_failed" };
          }

          await clearDmSession(cleanSender);

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
        await clearDmSession(cleanSender);
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
    const campus = await resolveInstagramCampus(recipientId);
    if (!campus) {
      await sendInstagramText(cleanSender, "⚠️ Akun Instagram ini belum terhubung ke kampus yang aktif. Hubungi admin kampus untuk menyelesaikan pengaturannya.");
      return { ok: false, error: "instagram_account_unmapped" };
    }

    // Periksa apakah Instagram sender sudah ditautkan ke akun WhatsApp
    const linked = await getLinkedSeller(cleanSender);

    if (linked.linked) {
      await setDmSession(cleanSender, {
        flow: "jual",
        step: "jual_ask_photo",
        data: {
          seller_wa: linked.wa,
          campus,
        },
      });

      const maskedWa = `+${linked.wa.slice(0, 4)}...${linked.wa.slice(-3)}`;
      const promptLinked = [
        `Halo kak! 👋`,
        `Akun Instagram kamu sudah terhubung dengan WhatsApp (${maskedWa}).`,
        "",
        "📸 **Langkah 1:** Masukkan 1 atau lebih gambar, maks 5 (atau ketik 'skip' jika tanpa foto):",
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
        data: { campus },
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

  // Trigger: Atur atau Ganti Kata Sandi Akun
  if (
    payload === "ACTION_SET_PASSWORD" ||
    lowerText === "ganti password" ||
    lowerText === "ubah password" ||
    lowerText === "set password"
  ) {
    const linked = await getLinkedSeller(cleanSender);
    if (!linked.linked) {
      await sendInstagramQuickReplies(
        cleanSender,
        "⚠️ Akun Instagram kamu belum terhubung ke WhatsApp. Mulai alur jual untuk menautkan akun dan mengatur kata sandi.",
        [{ title: "🛍️ Jual Barang", payload: "ACTION_JUAL" }, { title: "❌ Batal", payload: "ACTION_CANCEL" }]
      );
      return { ok: false, error: "not_linked" };
    }

    await setDmSession(cleanSender, {
      flow: "jual",
      step: "jual_set_password",
      data: {
        seller_wa: linked.wa,
        campus: linked.campus || "Semua",
      },
    });

    await sendInstagramQuickReplies(
      cleanSender,
      "🔐 **Atur / Ganti Kata Sandi Akun Web**\n\nKetik kata sandi baru (minimal 6 karakter) yang ingin kamu gunakan untuk login di https://www.kampuskita.my.id:",
      [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
    );
    return { ok: true, step: "jual_set_password" };
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
