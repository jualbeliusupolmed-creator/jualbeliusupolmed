import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { parseListingFromText, verifyReceiptImage, processGeneralChat } from "@/lib/gemini";
import { sendWa, postToGroup, notifyWantedMatch, notifyCategorySubscribers, notifyBuyerOfferResult } from "@/lib/fonnte";
import { formatWa } from "@/lib/constants";
import { getSettings, adFeeFrom } from "@/lib/settings";
import { createQrisTransaction } from "@/lib/midtrans";
import sharp from "sharp";

export const dynamic = "force-dynamic";

// Generate QRIS dinamis dan upload ke Supabase Storage → return public URL.
// Fallback ke QRIS statis jika gagal.
async function getQrisUrl(supa, orderId, amount) {
  try {
    const tx = await createQrisTransaction({ orderId, amount, customerName: "Pembeli", customerWa: "", itemName: "Pembayaran" });
    const base64 = tx.redirect_url.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    const fileName = `qris/qr-${orderId}.png`;
    const { error } = await supa.storage.from("listings").upload(fileName, buffer, { contentType: "image/png", upsert: true });
    if (error) throw error;
    const { data: { publicUrl } } = supa.storage.from("listings").getPublicUrl(fileName);
    return publicUrl;
  } catch (e) {
    console.error("[qris-gen] gagal generate dinamis, fallback statis:", e?.message);
    return `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/qris.png`;
  }
}

async function notifyMatchingWanted(supa, listing) {
  try {
    const { data: matches } = await supa
      .from("wanted_listings")
      .select("id, buyer_wa, buyer_name, title")
      .eq("category", listing.category)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!matches || matches.length === 0) return;
    
    for (const w of matches) {
      await notifyWantedMatch(w.buyer_wa, w.buyer_name, listing).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  } catch (err) {
    console.error("[wanted-match-baileys] error:", err?.message);
  }
}

export async function POST(req) {
  try {
    const authHeader = (req.headers.get("authorization") || "").trim();
    const expectedToken = (process.env.BAILEYS_API_TOKEN || "jualbeliusu_rahasia").replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    if (authHeader !== expectedToken) {
      return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
    }

    const formData = await req.formData();
    const senderJid = formData.get("sender");
    const message = formData.get("message") || "";
    const file = formData.get("file");

    if (!senderJid || senderJid.includes("-") || senderJid.includes("@g.us") || senderJid === "status@broadcast") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const normalizedWa = formatWa(senderJid);
    if (!normalizedWa) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const settings = await getSettings();
    if (settings?.bot?.paused_users?.includes(normalizedWa)) {
      return NextResponse.json({ ok: true, ignored: true, reason: "human_handoff" });
    }

    const supa = getAdminClient();

    // 1. Cek apakah ada pembayaran PENDING untuk user ini
    const { data: pendingPayments } = await supa
      .from("payments")
      .select("*, listings!inner(id, title, seller_wa)")
      .eq("status", "pending")
      .eq("listings.seller_wa", normalizedWa)
      .order("created_at", { ascending: false })
      .limit(1);

    const pendingPayment = pendingPayments?.[0];

    // ==========================================
    // STATE 2: Menunggu Bukti Transfer (Struk)
    // ==========================================
    if (pendingPayment) {
      if (!file) {
        if (message && message.toLowerCase().trim() === "batal") {
          await supa.from("payments").delete().eq("id", pendingPayment.id);
          await supa.from("listings").delete().eq("id", pendingPayment.listings.id);
          await sendWa(senderJid, "🗑️ Tagihan iklan sebelumnya telah dibatalkan. Anda sekarang bisa mengirim iklan baru.");
          return NextResponse.json({ ok: true, state: "payment_cancelled" });
        }

        // Generate QRIS dinamis dengan nominal yang sudah terisi
        const qrisUrl = await getQrisUrl(supa, pendingPayment.midtrans_order_id, pendingPayment.amount);
        const reminderMsg =
          `⚠️ *Tagihan Belum Lunas*\n\n` +
          `Iklan: *${pendingPayment.listings.title}*\n` +
          `Nominal: *Rp ${pendingPayment.amount.toLocaleString("id-ID")}*\n\n` +
          `Scan QRIS di bawah ini — *nominal sudah terisi otomatis* saat di-scan.\n\n` +
          `Setelah transfer, kirim *screenshot struk* ke sini.\n\n` +
          `_(Ketik *BATAL* untuk batalkan iklan)_`;
        await sendWa(senderJid, reminderMsg, qrisUrl);
        return NextResponse.json({ ok: true, state: "waiting_receipt_no_image" });
      }

      await sendWa(senderJid, "⏳ Sedang memverifikasi struk Anda menggunakan AI...");

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "image/jpeg";
        const extractedData = await verifyReceiptImage(buffer, mimeType);

        if (!extractedData.is_struk_valid) {
          await sendWa(senderJid, "❌ *Gambar Ditolak*\n\nSistem AI mendeteksi bahwa gambar yang Anda kirim *bukan struk transfer yang sah*. Pastikan foto jelas dan terang.");
          return NextResponse.json({ ok: true, state: "invalid_receipt_image" });
        }

        if (Number(extractedData.nominal) !== Number(pendingPayment.amount)) {
          await sendWa(senderJid,
            `❌ *Nominal Tidak Sesuai*\n\n` +
            `Nominal di struk: *Rp ${(extractedData.nominal || 0).toLocaleString("id-ID")}*\n` +
            `Tagihan: *Rp ${Number(pendingPayment.amount).toLocaleString("id-ID")}*\n\n` +
            `Tidak cocok. Mohon transfer ulang dengan nominal yang tepat, lalu kirim struk lagi.`
          );
          return NextResponse.json({ ok: true, state: "invalid_amount" });
        }

        // VERIFIKASI BERHASIL
        await supa.from("payments").update({ status: "paid" }).eq("id", pendingPayment.id);

        const { data: updatedListing } = await supa
          .from("listings")
          .update({ status: "active", bumped_at: new Date().toISOString() })
          .eq("id", pendingPayment.listings.id)
          .select()
          .single();

        await sendWa(senderJid,
          `🎉 *PEMBAYARAN BERHASIL!*\n\n` +
          `Struk *Rp ${pendingPayment.amount.toLocaleString("id-ID")}* sudah divalidasi AI.\n\n` +
          `Iklan *"${pendingPayment.listings.title}"* sudah tayang dan disebarkan ke Grup WA! 🚀\n\n` +
          `Cek di: ${process.env.NEXT_PUBLIC_BASE_URL}`
        );

        if (updatedListing) {
          await postToGroup(updatedListing).catch(() => {});
          notifyMatchingWanted(supa, updatedListing).catch(() => {});
          notifyCategorySubscribers(supa, updatedListing).catch(() => {});
        }

        return NextResponse.json({ ok: true, state: "receipt_verified" });

      } catch (err) {
        console.error("AI Receipt Error via Baileys:", err);
        await sendWa(senderJid, "❌ Terjadi kendala saat membaca struk: " + err.message);
        return NextResponse.json({ ok: true, error: err.message });
      }
    }

    // ==========================================
    // STATE 3: TERIMA / TOLAK Nego In-App
    // ==========================================
    if (message && !file) {
      const textMsg = message.toUpperCase().trim();
      if (textMsg.startsWith("TERIMA ") || textMsg.startsWith("TOLAK ")) {
        const parts = textMsg.split(" ");
        const action = parts[0]; // TERIMA / TOLAK
        const shortId = parts[1]; // short UUID

        if (shortId && shortId.length >= 6) {
          const { data: offers } = await supa
            .from("price_offers")
            .select("*, listings(title, seller_wa, seller_name)")
            .ilike("id", `${shortId.toLowerCase()}%`)
            .eq("status", "pending");

          if (offers && offers.length > 0) {
            const offer = offers[0];
            // Pastikan penjual sesuai
            if (offer.listings.seller_wa === normalizedWa) {
              const newStatus = action === "TERIMA" ? "accepted" : "rejected";
              await supa.from("price_offers").update({ status: newStatus }).eq("id", offer.id);

              if (action === "TERIMA") {
                await sendWa(senderJid, `✅ Anda telah *MENERIMA* tawaran Rp ${offer.offer_price.toLocaleString("id-ID")} untuk *${offer.listings.title}*.\n\n📞 Silakan hubungi pembeli untuk janjian COD:\nwa.me/${offer.buyer_wa}`);
              } else {
                await sendWa(senderJid, `❌ Anda telah *MENOLAK* tawaran Rp ${offer.offer_price.toLocaleString("id-ID")} untuk *${offer.listings.title}*.`);
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
          await sendWa(senderJid, "✅ Anda telah *berhasil berhenti berlangganan* dari semua notifikasi kategori.\nAnda tidak akan menerima pesan otomatis ini lagi.");
        } else {
          await sendWa(senderJid, "❌ Terjadi kesalahan saat memproses permintaan berhenti langganan Anda.");
        }
        return NextResponse.json({ ok: true, state: "unsubscribed" });
      }
    }

    // ==========================================
    // STATE 1: Iklan Baru
    // ==========================================
    if (!message && !file) return NextResponse.json({ ok: true, ignored: true });

    if (file && !message) {
      await sendWa(senderJid, "📝 Tolong sertakan deskripsi barangnya (Nama, Harga, Kondisi, dll) bersama foto dalam 1 pesan agar AI bisa membacanya.");
      return NextResponse.json({ ok: true, state: "new_listing_no_text" });
    }

    if (message && !file) {
      const msgLower = message.toLowerCase().trim();
      
      // Jika instruksi standar untuk pasang iklan dari command khusus, tetap layani dengan cepat
      if (msgLower === "jual" || msgLower === "wts" || msgLower === "dijual" || msgLower === "ready") {
         await sendWa(senderJid, "📸 Sepertinya Anda ingin pasang iklan. Kirim *Foto Barang + Teks Deskripsi & Harga* dalam 1 pesan ya.");
         return NextResponse.json({ ok: true, state: "new_listing_no_image" });
      }

      // --- NEW LOGIC: DYNAMIC AI CHAT & SEARCH & HANDOFF ---
      try {
        const settings = await getSettings();
        const aiConfig = settings.ai_config || {};
        const aiRes = await processGeneralChat(message, aiConfig);

        if (aiRes.intent === "search" && aiRes.keywords) {
          await sendWa(senderJid, aiRes.reply_message || "🔍 Sedang mencari data...");
          
          // Lakukan pencarian ke Supabase
          const { data: results } = await supa
            .from("listings")
            .select("id, title, price, seller_wa, sponsored_until")
            .eq("status", "active")
            .ilike("title", `%${aiRes.keywords}%`)
            .order("sponsored_until", { ascending: false, nullsFirst: false })
            .limit(3);

          if (!results || results.length === 0) {
            await sendWa(senderJid, `❌ Maaf, aku nggak nemuin barang dengan kata kunci "${aiRes.keywords}". Coba kata kunci lain ya!`);
          } else {
            let reply = `🔍 *Hasil Pencarian: ${aiRes.keywords}*\n\n`;
            results.forEach((r, idx) => {
               reply += `${idx + 1}. *${r.title}*\n`;
               reply += `💰 Rp ${r.price.toLocaleString("id-ID")}\n`;
               reply += `📲 wa.me/${r.seller_wa}\n`;
               reply += `👉 Detail: ${process.env.NEXT_PUBLIC_BASE_URL}/produk/${r.id}\n\n`;
            });
            reply += `Itu dia hasil pencarian terbaik dari database kami! 🚀`;
            await sendWa(senderJid, reply);
          }
        } else if (aiRes.intent === "handoff") {
           // Tambahkan WA ke paused_users di tabel settings
           const currentPaused = settings?.bot?.paused_users || [];
           if (!currentPaused.includes(normalizedWa)) {
              currentPaused.push(normalizedWa);
              await supa.from("settings").update({ value: { paused_users: currentPaused } }).eq("key", "bot");
           }
           await sendWa(senderJid, aiRes.reply_message || "Pesan diteruskan ke Admin. Bot akan dihentikan sementara.");
        } else {
          // Intent = chat
          await sendWa(senderJid, aiRes.reply_message || "Halo! Ada yang bisa kubantu?");
        }
      } catch (err) {
         console.error("AI General Chat Error:", err);
         await sendWa(senderJid, "Mohon maaf, sistem AI sedang sibuk. Silakan coba lagi nanti.");
      }
      return NextResponse.json({ ok: true, state: "ai_general_chat" });
    }

    // Ada Teks + Gambar = Iklan Baru!
    await sendWa(senderJid, "⏳ AI kami sedang membaca detail iklan Anda...");

    try {
      const settings = await getSettings();
      const extracted = await parseListingFromText(message, settings.ai_config || {});

      if (!extracted || !extracted.title) {
        throw new Error("AI gagal mengekstrak judul iklan. Coba tulis lebih jelas: nama barang, harga, dan kondisinya.");
      }

      const arrayBuffer = await file.arrayBuffer();
      const originalBuffer = Buffer.from(arrayBuffer);
      
      // Kompres ke WebP
      const buffer = await sharp(originalBuffer).webp({ quality: 80 }).toBuffer();
      const mimeType = "image/webp";
      
      const fileName = `wa-${Date.now()}-${Math.floor(Math.random() * 1000)}.webp`;
      const { data: uploadData, error: uploadError } = await supa.storage
        .from("listings")
        .upload(fileName, buffer, { contentType: mimeType });

      if (uploadError) throw new Error("Gagal mengunggah gambar ke server.");

      const { data: publicUrlData } = supa.storage.from("listings").getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      let profileName = "Pengguna WA";
      const { data: profile } = await supa.from("seller_profiles").select("name").eq("wa", normalizedWa).maybeSingle();
      if (profile) profileName = profile.name;
      else await supa.from("seller_profiles").insert({ wa: normalizedWa, name: profileName });

      const listingDays = Number(settings.pricing?.listingDays) || 14;
      const expiresAt = new Date(Date.now() + listingDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: newListing, error: listingError } = await supa.from("listings").insert({
        seller_wa: normalizedWa,
        seller_name: profileName,
        title: extracted.title || "Barang Dijual",
        price: extracted.price || 0,
        description: extracted.description || message,
        category: extracted.category || "Lainnya",
        type: "barang",
        condition: extracted.condition === "new" ? "new" : "used",
        image_url: publicUrl,
        status: "pending",
        expires_at: expiresAt,
        bumped_at: new Date().toISOString(),
      }).select().single();

      if (listingError) throw new Error("Gagal menyimpan data iklan: " + listingError.message);

      const baseFee = adFeeFrom(settings.pricing, "barang", newListing.price);
      // Unique code agar nominal mudah diverifikasi AI (1-99)
      const uniqueCode = Math.floor(Math.random() * 99) + 1;
      const totalAmount = baseFee + uniqueCode;
      const orderId = `IKLAN-WA-${newListing.id.slice(0, 8)}-${Date.now()}`;

      await supa.from("payments").insert({
        listing_id: newListing.id,
        type: "iklan",
        amount: totalAmount,
        status: "pending",
        midtrans_order_id: orderId,
      });

      // Generate QRIS dinamis dengan nominal yang sudah terisi otomatis
      const qrisUrl = await getQrisUrl(supa, orderId, totalAmount);

      const conditionLabel = newListing.condition === "new" ? "✨ Baru" : "Bekas";
      const fallbackReply = `✅ *Iklan Berhasil Dibaca AI!*\n\n📦 *${newListing.title}*\n🏷️ ${newListing.category} · ${conditionLabel}\n💰 Rp ${newListing.price.toLocaleString("id-ID")}\n\n`;
      const aiReply = extracted.reply_message ? `${extracted.reply_message}\n\n` : fallbackReply;

      const paymentInstructions = 
        `Untuk tayangkan iklan, scan QRIS di bawah ini.\n` +
        `Nominal *sudah otomatis terisi* saat di-scan:\n\n` +
        `💳 *Rp ${totalAmount.toLocaleString("id-ID")}*\n\n` +
        `Setelah transfer, kirim *screenshot struk* ke sini.`;

      await sendWa(senderJid, aiReply + paymentInstructions, qrisUrl);

      return NextResponse.json({ ok: true, state: "listing_created_pending_payment" });

    } catch (err) {
      console.error("WA New Listing Error Baileys:", err);
      await sendWa(senderJid, "❌ Terjadi kendala saat memproses iklan Anda: " + err.message);
      return NextResponse.json({ ok: true, error: err.message });
    }

  } catch (error) {
    console.error("Webhook Error Baileys:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
