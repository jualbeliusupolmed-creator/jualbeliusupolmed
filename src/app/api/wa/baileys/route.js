import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { parseListingFromText, verifyReceiptImage, processGeneralChat, suggestPrice } from "@/lib/gemini";
import { sendWa, postToGroup, notifyWantedMatch, notifyCategorySubscribers, notifyBuyerOfferResult } from "@/lib/fonnte";
import { formatWa } from "@/lib/constants";
import { getSettings, adFeeFrom } from "@/lib/settings";
import { createQrisTransaction } from "@/lib/midtrans";
import { buildSlug } from "@/lib/slug";
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
            const ext = (file.type || "image/jpeg").includes("png") ? "png" : "jpg";
            const fileName = `group/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
            await supa.storage.from("listings").upload(fileName, buffer, { contentType: file.type || "image/jpeg", upsert: false });
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
          // Hapus listing hanya jika pembayaran untuk iklan baru (bukan renewal/upgrade)
          if (pendingPayment.type === "iklan") {
            await supa.from("listings").delete().eq("id", pendingPayment.listings.id);
          }
          await sendWa(senderJid, "🗑️ Tagihan sebelumnya telah dibatalkan. Anda sekarang bisa melanjutkan.");
          return NextResponse.json({ ok: true, state: "payment_cancelled" });
        }

        // Generate QRIS dinamis dengan nominal yang sudah terisi
        const qrisUrl = await getQrisUrl(supa, pendingPayment.midtrans_order_id, pendingPayment.amount);
        const typeLabel = pendingPayment.type === "renewal" ? "Perpanjang Iklan"
          : pendingPayment.type === "featured" ? "Featured Iklan"
          : pendingPayment.type === "autobump" ? "AutoBump Iklan"
          : "Biaya Tayang Iklan";
        const reminderMsg =
          `⚠️ *Tagihan Belum Lunas*\n\n` +
          `📌 ${typeLabel}: *${pendingPayment.listings.title}*\n` +
          `💳 Nominal: *Rp ${pendingPayment.amount.toLocaleString("id-ID")}*\n\n` +
          `Scan QRIS di bawah ini — *nominal sudah terisi otomatis* saat di-scan.\n\n` +
          `Setelah transfer, kirim *screenshot struk* ke sini.\n\n` +
          `_(Ketik *BATAL* untuk batalkan tagihan)_`;
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

        } else {
          // Default: pembayaran iklan baru
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
            `Cek di: ${baseUrl}`
          );

          if (updatedListing) {
            await postToGroup(updatedListing).catch(() => {});
            notifyMatchingWanted(supa, updatedListing).catch(() => {});
            notifyCategorySubscribers(supa, updatedListing).catch(() => {});
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
          listMsg += `${i + 1}. *${l.title}*\n   ${statusLabel} | Berakhir: ${exp}\n   Kode: \`${l.id.slice(0, 8)}\`\n\n`;
        });
        listMsg += `Balas: *PERPANJANG [kode]* untuk perpanjang iklan.\nContoh: PERPANJANG ${myListings[0].id.slice(0, 8)}`;
        await sendWa(senderJid, listMsg);
        return NextResponse.json({ ok: true, state: "perpanjang_list_sent" });

      } else if (textMsg.startsWith("PERPANJANG ") && textMsg.split(" ").length === 2) {
        const shortId = textMsg.split(" ")[1];
        const { data: listings } = await supa
          .from("listings")
          .select("id, title, expires_at, status")
          .ilike("id", `${shortId.toLowerCase()}%`)
          .eq("seller_wa", normalizedWa)
          .in("status", ["active", "expired"]);

        if (!listings || listings.length === 0) {
          await sendWa(senderJid, `❌ Iklan dengan kode *${shortId}* tidak ditemukan atau bukan milik Anda.\n\nKetik *PERPANJANG* untuk lihat daftar iklan Anda.`);
          return NextResponse.json({ ok: true, state: "perpanjang_not_found" });
        }

        const listing = listings[0];
        const renewalSettings = await getSettings();
        const renewDays = Number(renewalSettings.pricing?.listingDays) || 14;
        const renewFee = Number(renewalSettings.pricing?.renewalFee) || 2000;
        const uniqueCode = Math.floor(Math.random() * 99) + 1;
        const totalAmount = renewFee + uniqueCode;
        const orderId = `RENEW-${listing.id.slice(0, 8)}-${Date.now()}`;

        await supa.from("payments").insert({
          listing_id: listing.id,
          type: "renewal",
          amount: totalAmount,
          status: "pending",
          midtrans_order_id: orderId,
          meta: { renew_days: renewDays },
        });

        const qrisUrl = await getQrisUrl(supa, orderId, totalAmount);
        const renewMsg =
          `🔄 *Perpanjang Iklan*\n\n` +
          `📦 *${listing.title}*\n` +
          `📅 Perpanjang +${renewDays} hari\n` +
          `💳 Biaya: *Rp ${totalAmount.toLocaleString("id-ID")}*\n\n` +
          `Scan QRIS di bawah, nominal sudah terisi otomatis.\n` +
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
          listMsg += `${i + 1}. *${l.title}*\n   Kode: \`${l.id.slice(0, 8)}\`\n\n`;
        });
        const exampleCmd = upgradeType === "featured" ? `UPGRADE FEATURED ${myListings[0].id.slice(0, 8)} 3` : `UPGRADE AUTOBUMP ${myListings[0].id.slice(0, 8)}`;
        listMsg += upgradeType === "featured"
          ? `Balas: *UPGRADE FEATURED [kode] [hari]*\nContoh: ${exampleCmd}`
          : `Balas: *UPGRADE AUTOBUMP [kode]*\nContoh: ${exampleCmd}`;
        await sendWa(senderJid, listMsg);
        return NextResponse.json({ ok: true, state: "upgrade_list_sent" });

      } else if (textMsg.match(/^UPGRADE FEATURED ([A-Z0-9]{8}) (\d+)$/i) || textMsg.match(/^UPGRADE AUTOBUMP ([A-Z0-9]{8})$/i)) {
        const isFeatured = textMsg.startsWith("UPGRADE FEATURED");
        const parts = textMsg.split(" ");
        const shortId = parts[2];
        const days = isFeatured ? Math.min(30, Math.max(1, parseInt(parts[3]) || 1)) : 7;

        const { data: listings } = await supa
          .from("listings")
          .select("id, title")
          .ilike("id", `${shortId.toLowerCase()}%`)
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
        const uniqueCode = Math.floor(Math.random() * 99) + 1;
        const totalAmount = baseFee + uniqueCode;
        const upgradeTypeKey = isFeatured ? "featured" : "autobump";
        const orderId = `UPGRADE-${upgradeTypeKey.toUpperCase()}-${listing.id.slice(0, 8)}-${Date.now()}`;

        await supa.from("payments").insert({
          listing_id: listing.id,
          type: upgradeTypeKey,
          amount: totalAmount,
          status: "pending",
          midtrans_order_id: orderId,
          meta: { days },
        });

        const qrisUrl = await getQrisUrl(supa, orderId, totalAmount);
        const upgradeMsg = isFeatured
          ? `⭐ *Featured ${days} Hari*\n\n📦 *${listing.title}*\n💳 Biaya: *Rp ${totalAmount.toLocaleString("id-ID")}*\n\nScan QRIS di bawah untuk bayar.\nSetelah transfer, kirim *screenshot struk* ke sini.`
          : `🔄 *AutoBump 7 Hari*\n\n📦 *${listing.title}*\n💳 Biaya: *Rp ${totalAmount.toLocaleString("id-ID")}*\n\nScan QRIS di bawah untuk bayar.\nSetelah transfer, kirim *screenshot struk* ke sini.`;
        await sendWa(senderJid, upgradeMsg, qrisUrl);
        return NextResponse.json({ ok: true, state: "upgrade_payment_created" });
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

      // ── Keyword-first mode ──────────────────────────────────────────────────
      // Hanya proses AI jika pesan mengandung kata kunci marketplace atau angka harga.
      // Pesan sapaan biasa (tanpa keyword) → balas dengan menu singkat saja.
      const kwConfig = settings.bot_keywords || {};
      if (kwConfig.enabled !== false) {
        const triggerList = (kwConfig.triggers || "jual,wts,wtb,cari,beli,admin,min,perpanjang,upgrade,dijual")
          .split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
        const minDigits = Number(kwConfig.min_price_digits) || 4;
        const hasNumber = new RegExp(`\\d{${minDigits},}`).test(message);
        const hasTrigger = triggerList.some(kw => msgLower.includes(kw));

        if (!hasTrigger && !hasNumber) {
          // Tidak ada keyword → bot diam, tidak balas sama sekali
          // Kecuali jika greeting diaktifkan dari settings (greeting_enabled: true)
          if (kwConfig.greeting_enabled) {
            const greetingMsg = kwConfig.greeting || "Halo! 👋 Ada yang bisa dibantu?";
            await sendWa(senderJid, greetingMsg);
            return NextResponse.json({ ok: true, state: "greeting_only", bot_reply: greetingMsg });
          }
          return NextResponse.json({ ok: true, state: "ignored_no_keyword" });
        }
      }

      // "admin" / "min" / "mimin" → sapaan ke bot, balas dengan menu
      if (msgLower === "admin" || msgLower === "min" || msgLower === "mimin" || msgLower === "halo admin" || msgLower === "hai min") {
        const greetingMsg = kwConfig.greeting || "Halo! 👋 Ada yang bisa dibantu?\n\nKetik:\n• *JUAL* — Pasang iklan\n• *CARI [barang]* — Cari barang\n• *PERPANJANG* — Perpanjang iklan\n• *UPGRADE* — Upgrade iklan";
        await sendWa(senderJid, greetingMsg);
        return NextResponse.json({ ok: true, state: "admin_greeting", bot_reply: greetingMsg });
      }

      // Jika instruksi standar untuk pasang iklan dari command khusus, tetap layani dengan cepat
      if (msgLower === "jual" || msgLower === "wts" || msgLower === "dijual" || msgLower === "ready") {
         await sendWa(senderJid, "📸 Sepertinya Anda ingin pasang iklan. Kirim *Foto Barang + Teks Deskripsi & Harga* dalam 1 pesan ya.");
         return NextResponse.json({ ok: true, state: "new_listing_no_image" });
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

          if (!results || results.length === 0) {
            // Coba fallback pencarian lebih luas tanpa filter kategori
            const { data: fallbackResults } = await supa
              .from("listings")
              .select("id, title, price, seller_wa, condition, campus, sponsored_until, bumped_at")
              .eq("status", "active")
              .or(`title.ilike.%${aiRes.keywords}%,description.ilike.%${aiRes.keywords}%`)
              .order("bumped_at", { ascending: false, nullsFirst: false })
              .limit(5);

            if (!fallbackResults || fallbackResults.length === 0) {
              const noResultReply = `❌ Maaf, aku nggak nemuin barang dengan kata kunci *"${aiRes.keywords}"*.\n\nCoba kata kunci lain atau ketik *JUAL* untuk pasang iklan sendiri ya!`;
              await sendWa(senderJid, noResultReply);
              return NextResponse.json({ ok: true, state: "search_no_results", bot_reply: noResultReply });
            }

            // Gunakan fallback results
            results?.push(...(fallbackResults || []));
          }

          // Cari juga dari postingan grup WA
          const { data: groupResults } = await supa
            .from("group_posts")
            .select("id, sender_wa, message, image_url, created_at")
            .ilike("message", `%${aiRes.keywords}%`)
            .order("created_at", { ascending: false })
            .limit(3);

          let reply = `🔍 *Hasil Pencarian: ${aiRes.keywords}*\n\n`;
          let count = 0;

          if (results && results.length > 0) {
            reply += `📌 *Dari Website:*\n`;
            results.forEach((r) => {
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
            reply += `💬 *Dari Grup WA:*\n`;
            groupResults.forEach((g) => {
              count++;
              const preview = (g.message || "").slice(0, 80);
              reply += `${count}. ${preview}${g.message?.length > 80 ? "..." : ""}\n`;
              reply += `   📲 wa.me/${g.sender_wa}\n\n`;
            });
          }

          if (count === 0) {
            const noResultReply = `❌ Maaf, aku nggak nemuin barang *"${aiRes.keywords}"* di web maupun grup.\n\nCoba kata kunci lain atau ketik *JUAL* untuk pasang iklan sendiri ya!`;
            await sendWa(senderJid, noResultReply);
            return NextResponse.json({ ok: true, state: "search_no_results", bot_reply: noResultReply });
          }

          reply += `Hubungi penjual langsung via WA di atas ya! 😊`;
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
        await sendWa(senderJid, "Mohon maaf, sistem AI sedang sibuk. Silakan coba lagi nanti.");
      }
      return NextResponse.json({ ok: true, state: "ai_general_chat" });
    }

    // Ada Teks + Media (Gambar/Video/Dokumen) = Iklan Baru!
    await sendWa(senderJid, "⏳ AI kami sedang membaca detail iklan Anda...");

    try {
      const settings = await getSettings();
      const extracted = await parseListingFromText(message, settings.ai_config || {});

      if (!extracted || !extracted.title) {
        throw new Error("AI gagal mengekstrak judul iklan. Coba tulis lebih jelas: nama barang, harga, dan kondisinya.");
      }

      const arrayBuffer = await file.arrayBuffer();
      const originalBuffer = Buffer.from(arrayBuffer);
      const fileMimeType = file.type || "application/octet-stream";

      let uploadBuffer = originalBuffer;
      let uploadMimeType = fileMimeType;
      let fileExt = "bin";

      // Kompres hanya jika gambar, simpan apa adanya jika video/dokumen
      if (fileMimeType.startsWith("image/")) {
        uploadBuffer = await sharp(originalBuffer).webp({ quality: 80 }).toBuffer();
        uploadMimeType = "image/webp";
        fileExt = "webp";
      } else if (fileMimeType.startsWith("video/")) {
        fileExt = "mp4";
      } else if (fileMimeType.includes("pdf")) {
        fileExt = "pdf";
      } else {
        fileExt = fileMimeType.split("/")[1] || "bin";
      }

      const fileName = `wa-${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const { error: uploadError } = await supa.storage
        .from("listings")
        .upload(fileName, uploadBuffer, { contentType: uploadMimeType });

      if (uploadError) throw new Error("Gagal mengunggah media ke server.");

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
        image_url: fileMimeType.startsWith("image/") ? publicUrl : null,
        images: fileMimeType.startsWith("image/") ? [publicUrl] : [],
        status: "pending",
        expires_at: expiresAt,
        bumped_at: new Date().toISOString(),
      }).select().single();

      if (listingError) throw new Error("Gagal menyimpan data iklan: " + listingError.message);

      const baseFee = adFeeFrom(settings.pricing, "barang", newListing.price);
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

      // Ambil saran harga AI dari iklan serupa (non-blocking)
      let priceSuggestion = "";
      try {
        const { data: similar } = await supa
          .from("listings")
          .select("price")
          .eq("status", "active")
          .eq("category", newListing.category)
          .neq("id", newListing.id)
          .limit(5);
        if (similar && similar.length >= 2) {
          const prices = similar.map(s => s.price);
          const suggestion = await suggestPrice(newListing.title, newListing.category, prices);
          if (suggestion) {
            priceSuggestion = `\n💡 *Saran harga AI:* Rp ${Number(suggestion.suggested_price).toLocaleString("id-ID")} (${suggestion.note})\n`;
          }
        }
      } catch (_) {}

      const conditionLabel = newListing.condition === "new" ? "✨ Baru" : "Bekas";
      const fallbackReply = `✅ *Iklan Berhasil Dibaca AI!*\n\n📦 *${newListing.title}*\n🏷️ ${newListing.category} · ${conditionLabel}\n💰 Rp ${newListing.price.toLocaleString("id-ID")}\n${priceSuggestion}\n`;
      const aiReply = extracted.reply_message ? `${extracted.reply_message}${priceSuggestion}\n\n` : fallbackReply;

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
