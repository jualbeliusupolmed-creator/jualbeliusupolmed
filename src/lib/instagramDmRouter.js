import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa, MARKETPLACE_WA } from "@/lib/constants";
import { rupiah } from "@/lib/fees";
import { buildSlug } from "@/lib/slug";
import { postToGroup } from "@/lib/fonnte";
import { autoPublishListingInstagram } from "@/lib/listingInstagram";
import { pushListingBaru } from "@/lib/webpush";
import { checkProhibitedListing } from "@/lib/profanity";
import {
  sendInstagramQuickReplies,
  sendInstagramText,
} from "@/lib/instagramDm";
import {
  getDmSession,
  setDmSession,
  clearDmSession,
} from "@/lib/instagramDmSession";

function siteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    "https://www.jualbeliusupolmed.web.id"
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
        { title: "💬 Kirim Menfess", payload: "ACTION_MENFESS" },
        { title: "🔍 Cari Barang", payload: "ACTION_SEARCH" },
        { title: "📋 Menu Utama", payload: "ACTION_MENU" },
      ]
    );
    return { ok: true, action: "cancelled" };
  }

  // Ambil sesi obrolan yang sedang berjalan
  const session = await getDmSession(cleanSender);

  // ── 2. STATE MACHINE: JUAL BARANG ──
  if (session?.flow === "jual") {
    // Step 1: Menerima foto barang (atau skip)
    if (session.step === "jual_ask_photo") {
      const isSkip = payload === "ACTION_SKIP_PHOTO" || lowerText === "skip" || lowerText === "lewati";
      let imageUrl = null;

      if (!isSkip) {
        const imgAttachment = attachments.find((a) => a.type === "image");
        if (imgAttachment?.payload?.url) {
          imageUrl = imgAttachment.payload.url;
        } else if (!isSkip && rawText) {
          // Pengguna mengetik teks alih-alih mengirim foto
          // Izinkan lanjut dengan teks sebagai judul jika pengguna langsung menulis nama barang
          imageUrl = null;
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
        "📝 Apa *Nama / Judul Barang* yang mau kamu jual?\n\n(Contoh: Kalkulator Casio fx-991EX Bekas)",
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

      const mod = checkProhibitedListing(rawText, "");
      if (mod.prohibited) {
        await sendInstagramQuickReplies(
          cleanSender,
          `⛔ Maaf kak, barang ini terdeteksi barang yang tidak diizinkan (${mod.reason}). Coba jual barang lain ya.`,
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
          title: rawText,
        },
      });

      await sendInstagramQuickReplies(
        cleanSender,
        `💰 Berapa *Harga* untuk "${rawText}"?\n\n(Contoh: 180000 atau ketik 180rb)`,
        [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
      );
      return { ok: true, step: "jual_ask_price" };
    }

    // Step 3: Menerima Harga Barang
    if (session.step === "jual_ask_price") {
      const price = parseInstagramPrice(rawText);
      if (!price || price < 1000) {
        await sendInstagramText(
          cleanSender,
          "⚠️ Masukkan nominal harga yang wajar ya kak (minimal Rp 1.000). Contoh: 50rb atau 50000:"
        );
        return { ok: false, error: "invalid_price" };
      }

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_desc",
        data: {
          ...session.data,
          price,
        },
      });

      await sendInstagramQuickReplies(
        cleanSender,
        `📋 Tuliskan *Deskripsi singkat* barang (kondisi fisik, kelengkapan, titik temu COD):\n\n(Contoh: Kondisi 95% mulus, tombol empuk, COD di Pendopo USU)`,
        [
          { title: "⏩ Lewati deskripsi", payload: "ACTION_SKIP_DESC" },
          { title: "❌ Batal", payload: "ACTION_CANCEL" },
        ]
      );
      return { ok: true, step: "jual_ask_desc" };
    }

    // Step 4: Menerima Deskripsi Barang
    if (session.step === "jual_ask_desc") {
      const isSkipDesc = payload === "ACTION_SKIP_DESC" || lowerText === "skip" || lowerText === "lewati";
      const description = isSkipDesc ? "" : rawText;

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_ask_wa",
        data: {
          ...session.data,
          description,
        },
      });

      await sendInstagramQuickReplies(
        cleanSender,
        "📱 Terakhir, masukkan *Nomor WhatsApp* kamu agar pembeli bisa langsung menghubungi:\n\n(Contoh: 081234567890)",
        [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
      );
      return { ok: true, step: "jual_ask_wa" };
    }

    // Step 5: Menerima Nomor WhatsApp & Konfirmasi
    if (session.step === "jual_ask_wa") {
      const waFormatted = formatWa(rawText);
      if (!waFormatted || waFormatted.length < 10) {
        await sendInstagramText(
          cleanSender,
          "⚠️ Format nomor WhatsApp kurang tepat. Pastikan minimal 10 digit (contoh: 081234567890):"
        );
        return { ok: false, error: "invalid_wa" };
      }

      const listingData = {
        ...session.data,
        seller_wa: waFormatted,
      };

      await setDmSession(cleanSender, {
        ...session,
        step: "jual_confirm",
        data: listingData,
      });

      const konfirmasi = [
        "🔎 *Cek Detail Iklanmu:*",
        "",
        `📌 *Barang:* ${listingData.title}`,
        `💰 *Harga:* ${rupiah(listingData.price)}`,
        `📋 *Deskripsi:* ${listingData.description || "Tidak ada deskripsi"}`,
        `📱 *WhatsApp:* +${listingData.seller_wa}`,
        "",
        "Siap ditayangkan langsung ke Web, Grup WA, dan Katalog Instagram?",
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, konfirmasi, [
        { title: "✅ Tayangkan Sekarang", payload: "ACTION_CONFIRM_PUBLISH" },
        { title: "❌ Batal", payload: "ACTION_CANCEL" },
      ]);
      return { ok: true, step: "jual_confirm" };
    }

    // Step 6: Eksekusi Publikasi Iklan
    if (session.step === "jual_confirm") {
      if (payload === "ACTION_CONFIRM_PUBLISH" || lowerText === "ya" || lowerText === "tayangkan") {
        const item = session.data;
        const supa = getAdminClient();

        // 1. Simpan ke Database Web (listings)
        const { data: newListing, error: insertErr } = await supa
          .from("listings")
          .insert({
            title: item.title,
            price: item.price,
            description: item.description || "",
            seller_name: `Penjual IG (${cleanSender.slice(-4)})`,
            seller_wa: item.seller_wa,
            image_url: item.image_url || null,
            status: "active",
            type: "barang",
            campus: "Semua",
            area: "Sekitar Kampus",
            condition: "used",
            moderation_reason: "Lolos moderasi otomatis via Instagram DM",
            bumped_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
          })
          .select()
          .single();

        if (insertErr || !newListing) {
          console.error("Gagal simpan listing via IG DM:", insertErr);
          await sendInstagramText(cleanSender, "❌ Terjadi kendala saat menyimpan iklan. Silakan coba sebentar lagi ya kak.");
          await clearDmSession(cleanSender);
          return { ok: false, error: insertErr?.message };
        }

        // 2. Siarkan ke WhatsApp Group & Channel
        try {
          await postToGroup(newListing);
        } catch (err) {
          console.warn("postToGroup via IG DM warning:", err?.message);
        }

        // 3. Masukkan ke Antrean Instagram Feed
        try {
          await autoPublishListingInstagram({
            origin: siteBaseUrl(),
            listingId: newListing.id,
            timeoutMs: 0,
          });
        } catch (err) {
          console.warn("autoPublishListingInstagram via IG DM warning:", err?.message);
        }

        // 4. Kirim Web Push
        try {
          await pushListingBaru(supa, newListing);
        } catch (err) {}

        await clearDmSession(cleanSender);

        const detailUrl = `${siteBaseUrl()}/produk/${buildSlug(newListing.title, newListing.id)}`;
        const successMsg = [
          "🎉 *Iklanmu BERHASIL Ditayangkan!*",
          "",
          `🌐 *Lihat di Web:* ${detailUrl}`,
          "📲 *WhatsApp:* Otomatis disiarkan ke Grup & Channel Kampus",
          "📸 *Instagram:* Dalam antrean tayang feed @usupolmedkatalog",
          "",
          "Semoga cepat laku ya kak! ✨",
        ].join("\n");

        await sendInstagramQuickReplies(cleanSender, successMsg, [
          { title: "🛍️ Jual Barang Lagi", payload: "ACTION_JUAL" },
          { title: "🔍 Cari Barang", payload: "ACTION_SEARCH" },
          { title: "📋 Menu Utama", payload: "ACTION_MENU" },
        ]);
        return { ok: true, action: "published", listingId: newListing.id };
      }
    }
  }

  // ── 3. STATE MACHINE: MENFESS KAMPUS (SESUAI GAMBAR) ──
  if (session?.flow === "menfess") {
    // Step 1: Menerima foto menfess (atau skip)
    if (session.step === "menfess_ask_photo") {
      const isSkip = payload === "ACTION_SKIP_PHOTO" || lowerText === "skip" || lowerText === "lewati";
      let imageUrl = null;

      if (!isSkip) {
        const imgAttachment = attachments.find((a) => a.type === "image");
        if (imgAttachment?.payload?.url) {
          imageUrl = imgAttachment.payload.url;
        }
      }

      const supa = getAdminClient();
      const content = session.data?.content || "";

      // Simpan menfess ke database mading_posts
      const { data: post, error: insertErr } = await supa
        .from("mading_posts")
        .insert({
          content,
          sender_name: "Anonim IG",
          faculty: "Semua",
          type: "menfess",
          status: "approved",
          image_url: imageUrl,
          is_anon: true,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      await clearDmSession(cleanSender);

      if (insertErr || !post) {
        await sendInstagramText(cleanSender, "❌ Terjadi kendala saat menyimpan menfess. Coba lagi sebentar ya kak.");
        return { ok: false, error: insertErr?.message };
      }

      const successMenfessMsg = [
        "✅ *Menfess kamu berhasil diterima!*",
        "",
        `Nomor antrean: #${post.id ? String(post.id).slice(-4) : "FESS"}`,
        `🌐 Tayang di web: ${siteBaseUrl()}/mading`,
        "📸 Segera diproses ke feed & story Instagram!",
        "",
        "Terima kasih sudah berbagi! 💌",
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, successMenfessMsg, [
        { title: "💬 Kirim Menfess Lagi", payload: "ACTION_MENFESS" },
        { title: "🛍️ Jual Barang", payload: "ACTION_JUAL" },
        { title: "📋 Menu Utama", payload: "ACTION_MENU" },
      ]);
      return { ok: true, action: "menfess_published", postId: post.id };
    }

    if (session.step === "menfess_ask_text") {
      if (!rawText || rawText.length < 5) {
        await sendInstagramText(cleanSender, "⚠️ Pesan menfess terlalu pendek. Tuliskan curhatanmu minimal beberapa kata ya:");
        return { ok: false, error: "menfess_too_short" };
      }

      await setDmSession(cleanSender, {
        flow: "menfess",
        step: "menfess_ask_photo",
        data: { content: rawText },
      });

      // Balasan persis seperti tangkapan layar pengguna
      const replyPrompt = [
        "📷 Selanjutnya, kirim foto untuk menfess kamu, maks 5 foto.",
        "",
        '"skip" untuk melanjutkan tanpa gambar',
        '"batal" untuk membatalkan',
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, replyPrompt, [
        { title: "⏩ Skip, tanpa gambar", payload: "ACTION_SKIP_PHOTO" },
        { title: "❌ Batal", payload: "ACTION_CANCEL" },
      ]);
      return { ok: true, step: "menfess_ask_photo" };
    }
  }

  // ── 4. PERINTAH AWAL / MENU UTAMA (IDLE) ──

  // Trigger: Jual Barang
  if (
    payload === "ACTION_JUAL" ||
    lowerText === "jual" ||
    lowerText.startsWith("jual ") ||
    lowerText === "wts"
  ) {
    await setDmSession(cleanSender, {
      flow: "jual",
      step: "jual_ask_photo",
      data: {},
    });

    await sendInstagramQuickReplies(
      cleanSender,
      "📸 *Mulai Pasang Iklan di Kampus Kita!*\n\nKirimkan *foto barang* yang mau kamu jual (bisa foto langsung atau dari galeri):\n\nAtau ketuk tombol di bawah jika tanpa foto:",
      [
        { title: "⏩ Lewati, tanpa foto", payload: "ACTION_SKIP_PHOTO" },
        { title: "❌ Batal", payload: "ACTION_CANCEL" },
      ]
    );
    return { ok: true, flow: "jual", step: "jual_ask_photo" };
  }

  // Trigger: Menfess
  if (
    payload === "ACTION_MENFESS" ||
    lowerText === "menfess" ||
    lowerText.startsWith("menfess ") ||
    lowerText.startsWith("#menfess")
  ) {
    const directContent = rawText.replace(/^(#?menfess)\s*/i, "").trim();

    if (directContent.length >= 5) {
      await setDmSession(cleanSender, {
        flow: "menfess",
        step: "menfess_ask_photo",
        data: { content: directContent },
      });

      // Balasan persis seperti tangkapan layar pengguna
      const replyPrompt = [
        "📷 Selanjutnya, kirim foto untuk menfess kamu, maks 5 foto.",
        "",
        '"skip" untuk melanjutkan tanpa gambar',
        '"batal" untuk membatalkan',
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, replyPrompt, [
        { title: "⏩ Skip, tanpa gambar", payload: "ACTION_SKIP_PHOTO" },
        { title: "❌ Batal", payload: "ACTION_CANCEL" },
      ]);
      return { ok: true, flow: "menfess", step: "menfess_ask_photo" };
    }

    await setDmSession(cleanSender, {
      flow: "menfess",
      step: "menfess_ask_text",
      data: {},
    });

    await sendInstagramQuickReplies(
      cleanSender,
      "💌 Tuliskan pesan curhat / menfess kampus kamu di sini:\n\n(Identitasmu dijamin 100% anonim)",
      [{ title: "❌ Batal", payload: "ACTION_CANCEL" }]
    );
    return { ok: true, flow: "menfess", step: "menfess_ask_text" };
  }

  // Trigger: Cari Barang / Tanya Harga
  if (
    payload === "ACTION_SEARCH" ||
    lowerText.startsWith("cari ") ||
    lowerText.startsWith("harga ") ||
    lowerText.startsWith("cek ")
  ) {
    const query = rawText.replace(/^(cari|harga|cek)\s*/i, "").trim();
    if (!query) {
      await sendInstagramQuickReplies(
        cleanSender,
        "🔍 Mau cari barang apa kak?\n\nKetik: *cari [nama barang]*\nContoh: _cari kalkulator_ atau _cari laptop_",
        [{ title: "📋 Menu Utama", payload: "ACTION_MENU" }]
      );
      return { ok: true, prompt: "ask_search_query" };
    }

    const supa = getAdminClient();
    const { data: results } = await supa
      .from("listings")
      .select("id, title, price, campus, area, seller_wa")
      .eq("status", "active")
      .ilike("title", `%${query}%`)
      .order("created_at", { ascending: false })
      .limit(3);

    if (results && results.length > 0) {
      const itemsText = results
        .map(
          (r, idx) =>
            `${idx + 1}. *${r.title}*\n   💰 ${rupiah(r.price)} • 📍 ${r.campus || "Kampus"}\n   🔗 ${siteBaseUrl()}/produk/${buildSlug(r.title, r.id)}`
        )
        .join("\n\n");

      const responseText = [
        `🔎 Ditemukan ${results.length} barang untuk "*${query}*":`,
        "",
        itemsText,
        "",
        `Lihat semua di: ${siteBaseUrl()}/jual-beli?q=${encodeURIComponent(query)}`,
      ].join("\n");

      await sendInstagramQuickReplies(cleanSender, responseText, [
        { title: "🛍️ Jual Barang", payload: "ACTION_JUAL" },
        { title: "🔍 Cari Lagi", payload: "ACTION_SEARCH" },
        { title: "📋 Menu Utama", payload: "ACTION_MENU" },
      ]);
      return { ok: true, resultsCount: results.length };
    }

    const notFoundText = [
      `Belum ada yang menjual "*${query}*" saat ini kak.`,
      "",
      `💡 Kamu bisa buat permintaan di Papan Dicari (WTB) lewat web:`,
      `${siteBaseUrl()}/dicari`,
    ].join("\n");

    await sendInstagramQuickReplies(cleanSender, notFoundText, [
      { title: "🛍️ Pasang Iklan Jual", payload: "ACTION_JUAL" },
      { title: "🔍 Cari Barang Lain", payload: "ACTION_SEARCH" },
      { title: "📋 Menu Utama", payload: "ACTION_MENU" },
    ]);
    return { ok: true, resultsCount: 0 };
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
      "4. Jangan transfer uang muka (DP) kepada orang asing.",
      "",
      `Baca panduan lengkap: ${siteBaseUrl()}/panduan-aman`,
    ].join("\n");

    await sendInstagramQuickReplies(cleanSender, codTips, [
      { title: "🛍️ Jual Barang", payload: "ACTION_JUAL" },
      { title: "💬 Kirim Menfess", payload: "ACTION_MENFESS" },
      { title: "📋 Menu Utama", payload: "ACTION_MENU" },
    ]);
    return { ok: true, action: "sent_cod_tips" };
  }

  // ── 5. DEFAULT / GREETING MENU ──
  const greeting = [
    "Halo kak! 👋",
    "Selamat datang di bot resmi *Kampus Kita* (USU & POLMED).",
    "",
    "Mau ngapain hari ini?",
  ].join("\n");

  await sendInstagramQuickReplies(cleanSender, greeting, [
    { title: "🛍️ Jual Barang", payload: "ACTION_JUAL" },
    { title: "💬 Kirim Menfess", payload: "ACTION_MENFESS" },
    { title: "🔍 Cari Barang / Harga", payload: "ACTION_SEARCH" },
    { title: "🛡️ Panduan COD", payload: "ACTION_PANDUAN_COD" },
  ]);

  return { ok: true, action: "sent_menu" };
}
