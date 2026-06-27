import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { parseListingFromText, verifyReceiptImage, processGeneralChat } from "@/lib/gemini";
import { sendWa, postToGroup } from "@/lib/fonnte";
import { formatWa } from "@/lib/constants";
import { getSettings, adFeeFrom } from "@/lib/settings";
import { createKlikQrisTransaction } from "@/lib/klikqris";

export const dynamic = "force-dynamic";

// Helper untuk download media dari Fonnte URL
async function downloadFonnteMedia(url) {
  const token = process.env.FONNTE_TOKEN;
  const res = await fetch(url, {
    headers: { Authorization: token },
  });
  if (!res.ok) throw new Error("Gagal mengunduh gambar dari Fonnte");
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = res.headers.get("content-type") || "image/jpeg";
  return { buffer, mimeType };
}

export async function POST(req) {
  try {
    let body;
    // Fonnte biasanya mengirimkan JSON, tapi berjaga-jaga jika urlencoded
    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      body = await req.json();
    } else {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    }

    const { sender, message, url: fileUrl } = body;

    // Abaikan pesan dari grup atau status
    if (!sender || sender.includes("-") || sender === "status@broadcast") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const normalizedWa = formatWa(sender);
    if (!normalizedWa) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const settings = await getSettings();
    if (settings?.bot?.paused_users?.includes(normalizedWa)) {
      return NextResponse.json({ ok: true, ignored: true, reason: "human_handoff" });
    }

    const supa = getAdminClient();

    // 1. Cek apakah ada pembayaran PENDING untuk user ini
    const { data: pendingPayments, error: paymentError } = await supa
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
      if (!fileUrl) {
        // Cek jika user ketik BATAL
        if (message && message.toLowerCase().trim() === "batal") {
          await supa.from("payments").delete().eq("id", pendingPayment.id);
          await supa.from("listings").delete().eq("id", pendingPayment.listings.id);
          await sendWa(normalizedWa, "🗑️ Tagihan iklan sebelumnya telah dibatalkan. Anda sekarang bisa mengirim iklan baru.");
          return NextResponse.json({ ok: true, state: "payment_cancelled" });
        }

        // Pakai QRIS dari meta jika ada, fallback buat transaksi baru
        let reminderQrisUrl = pendingPayment.meta?.klikqris_qris_url;
        const nominal = pendingPayment.meta?.final_amount || pendingPayment.amount;
        if (!reminderQrisUrl) {
          try {
            const kq = await createKlikQrisTransaction(
              `${pendingPayment.midtrans_order_id}-R`,
              nominal,
              `Iklan: ${pendingPayment.listings.title}`
            );
            reminderQrisUrl = kq.qrisUrl;
          } catch {
            reminderQrisUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/qris.png`;
          }
        }
        const reminderMsg = `⚠️ Anda masih memiliki tagihan pembayaran iklan yang belum lunas untuk:\n\n*Judul:* ${pendingPayment.listings.title}\n*Nominal:* Rp ${nominal.toLocaleString("id-ID")}\n\nSilakan scan QRIS ini. Iklan otomatis aktif setelah pembayaran terdeteksi, atau kirim *GAMBAR STRUK* untuk konfirmasi manual.\n\n_(Ketik *BATAL* untuk membatalkan iklan)_`;
        await sendWa(normalizedWa, reminderMsg, reminderQrisUrl);
        return NextResponse.json({ ok: true, state: "waiting_receipt_no_image" });
      }

      await sendWa(normalizedWa, "⏳ Sedang memverifikasi struk Anda menggunakan AI...");

      try {
        const { buffer, mimeType } = await downloadFonnteMedia(fileUrl);
        const extractedData = await verifyReceiptImage(buffer, mimeType);

        if (!extractedData.is_struk_valid) {
          await sendWa(normalizedWa, "❌ *Gambar Ditolak*\n\nSistem AI mendeteksi bahwa gambar yang Anda kirim *bukan struk transfer yang sah*. Pastikan foto jelas dan terang.");
          return NextResponse.json({ ok: true, state: "invalid_receipt_image" });
        }

        const expectedNominal = pendingPayment.meta?.final_amount || pendingPayment.amount;
        if (Number(extractedData.nominal) < Number(expectedNominal)) {
          await sendWa(normalizedWa, `❌ *Nominal Tidak Sesuai*\n\nNominal di struk (Rp ${extractedData.nominal?.toLocaleString("id-ID") || 0}) kurang dari tagihan (Rp ${Number(expectedNominal).toLocaleString("id-ID")}).\n\nSistem tidak dapat mengaktifkan iklan Anda.`);
          return NextResponse.json({ ok: true, state: "invalid_amount" });
        }

        // --- VERIFIKASI BERHASIL ---
        // Update payment menjadi paid
        await supa.from("payments").update({ status: "paid" }).eq("id", pendingPayment.id);
        
        // Update listing menjadi active
        const { data: updatedListing } = await supa
          .from("listings")
          .update({ status: "active", bumped_at: new Date().toISOString() })
          .eq("id", pendingPayment.listings.id)
          .select()
          .single();

        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id";

        if (updatedListing) {
          const productSlug = (await import("@/lib/slug")).buildSlug(updatedListing.title, updatedListing.id);
          const productUrl = `${baseUrl}/produk/${productSlug}`;

          const confirmMsg = `🎉 *PEMBAYARAN BERHASIL*\n\n` +
            `Struk sebesar *Rp ${pendingPayment.amount.toLocaleString("id-ID")}* telah divalidasi oleh AI.\n\n` +
            `Iklan untuk *"${updatedListing.title}"* sudah tayang dan disebarkan ke Grup WhatsApp! 🚀`;

          const shareMsg = `🛒 *${updatedListing.title}* — Rp ${Number(updatedListing.price).toLocaleString("id-ID")}\n` +
            `🏷️ ${updatedListing.category}\n` +
            `👉 ${productUrl}\n\n` +
            `_Klik & bagikan link iklanmu ke teman-teman!_ 📤`;

          await sendWa(normalizedWa, confirmMsg);
          await new Promise(r => setTimeout(r, 1500));
          await sendWa(normalizedWa, shareMsg);

          // Send notification to superadmins
          const to62 = n => (n || "").replace(/\D/g, "").replace(/^0/, "62");
          const rawAdmins = [process.env.ADMIN_WA || "", process.env.SUPER_ADMIN_WA || ""].join(",");
          const adminNumbers = [...new Set(rawAdmins.split(",").map(a => to62(a.trim())).filter(Boolean))];
          
          for (const adminNum of adminNumbers) {
            await sendWa(adminNum, `📢 *Iklan Baru Tayang*\n\n${shareMsg}`).catch(() => {});
          }

          // Auto-post ke Grup
          await postToGroup(updatedListing);
        }

        return NextResponse.json({ ok: true, state: "receipt_verified" });

      } catch (err) {
        console.error("AI Receipt Error via WA:", err);
        await sendWa(normalizedWa, "❌ Terjadi kendala saat membaca struk Anda. " + err.message);
        return NextResponse.json({ ok: true, error: err.message });
      }
    }


    // ==========================================
    // STATE 1: Iklan Baru
    // ==========================================
    // Jika tidak ada pesan teks & gambar, abaikan saja
    if (!message && !fileUrl) return NextResponse.json({ ok: true, ignored: true });

    // Jika hanya kirim gambar tanpa deskripsi
    if (fileUrl && !message) {
      await sendWa(normalizedWa, "📝 Tolong sertakan deskripsi barangnya (Nama, Harga, Minus, dll) bersama dengan fotonya dalam 1 pesan agar bisa diproses AI.");
      return NextResponse.json({ ok: true, state: "new_listing_no_text" });
    }

    // Jika hanya kirim teks tanpa gambar
    if (message && !fileUrl) {
       const msgLower = message.toLowerCase().trim();
       
       // Handle kasus di mana user kirim gambar/stiker tapi Fonnte tidak bisa mengirim URL-nya
       if (msgLower === "non-text message") {
         await sendWa(normalizedWa, "⚠️ Sistem mendeteksi Anda mengirim gambar/media tanpa teks, atau media tidak dapat diunduh.\n\nPastikan Anda mengirim *Foto Barang* dan *Teks Deskripsi* (harga, nama barang, dll) dalam **SATU GELEMBUNG PESAN** (ditulis di kolom caption gambar).");
         return NextResponse.json({ ok: true, state: "new_listing_no_text" });
       }

       if (msgLower === "jual" || msgLower === "wts" || msgLower === "dijual" || msgLower === "ready") {
          await sendWa(normalizedWa, "📸 Sepertinya Anda ingin memasang iklan. Silakan kirimkan *Foto Barang* beserta teks deskripsinya dalam 1 pesan.");
          return NextResponse.json({ ok: true, state: "new_listing_no_image" });
       }

       // --- NEW LOGIC: DYNAMIC AI CHAT & SEARCH ---
       try {
         const settings = await getSettings();
         const aiConfig = settings.ai_config || {};
         const aiRes = await processGeneralChat(message, aiConfig);

         if (aiRes.intent === "search" && aiRes.keywords) {
           await sendWa(normalizedWa, aiRes.reply_message || "🔍 Sedang mencari data...");
           
           const { data: results } = await supa
             .from("listings")
             .select("id, title, price, seller_wa, sponsored_until")
             .eq("status", "active")
             .ilike("title", `%${aiRes.keywords}%`)
             .order("sponsored_until", { ascending: false, nullsFirst: false })
             .limit(3);

           if (!results || results.length === 0) {
             await sendWa(normalizedWa, `❌ Maaf, aku nggak nemuin barang dengan kata kunci "${aiRes.keywords}". Coba kata kunci lain ya!`);
           } else {
             let reply = `🔍 *Hasil Pencarian: ${aiRes.keywords}*\n\n`;
             results.forEach((r, idx) => {
                reply += `${idx + 1}. *${r.title}*\n`;
                reply += `💰 Rp ${r.price.toLocaleString("id-ID")}\n`;
                reply += `📲 wa.me/${r.seller_wa}\n`;
                reply += `👉 Detail: ${process.env.NEXT_PUBLIC_BASE_URL}/produk/${r.id}\n\n`;
             });
             reply += `Itu dia hasil pencarian terbaik dari database kami! 🚀`;
             await sendWa(normalizedWa, reply);
           }
         } else if (aiRes.intent === "handoff") {
           const currentPaused = settings?.bot?.paused_users || [];
           if (!currentPaused.includes(normalizedWa)) {
              currentPaused.push(normalizedWa);
              await supa.from("settings").update({ value: { paused_users: currentPaused } }).eq("key", "bot");
           }
           await sendWa(normalizedWa, aiRes.reply_message || "Pesan diteruskan ke Admin. Bot akan dihentikan sementara.");
         } else {
           // Intent = chat
           await sendWa(normalizedWa, aiRes.reply_message || "Halo! Ada yang bisa kubantu?");
         }
       } catch (err) {
          console.error("AI General Chat Error:", err);
          await sendWa(normalizedWa, "Mohon maaf, sistem AI sedang sibuk. Silakan coba lagi nanti.");
       }
       return NextResponse.json({ ok: true, state: "ai_general_chat" });
    }

    // Ada Teks + Gambar = Iklan Baru!
    await sendWa(normalizedWa, "⏳ AI kami sedang membaca detail iklan Anda...");

    try {
      // 1. Ekstrak teks via Gemini
      const extracted = await parseListingFromText(message);
      
      if (!extracted || !extracted.title) {
        throw new Error("AI gagal mengekstrak judul iklan dari pesan Anda. Coba tulis lebih jelas.");
      }

      // 2. Download Media dari Fonnte
      const { buffer, mimeType } = await downloadFonnteMedia(fileUrl);
      
      // 3. Upload ke Supabase Storage
      const ext = mimeType.split("/")[1] || "jpg";
      const fileName = `wa-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
      const { data: uploadData, error: uploadError } = await supa.storage
        .from("listings")
        .upload(fileName, buffer, { contentType: mimeType });
        
      if (uploadError) throw new Error("Gagal mengunggah gambar ke server.");
      
      const { data: publicUrlData } = supa.storage.from("listings").getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      // 4. Pastikan user profile ada
      let profileName = "Pengguna WA";
      const { data: profile } = await supa.from("seller_profiles").select("name").eq("wa", normalizedWa).maybeSingle();
      if (profile) profileName = profile.name;
      else {
        await supa.from("seller_profiles").insert({ wa: normalizedWa, name: profileName });
      }

      // 5. Buat DB Listing
      const settings = await getSettings();
      const listingDays = Number(settings.pricing?.listingDays) || 14;
      const expiresAt = new Date(Date.now() + listingDays * 24 * 60 * 60 * 1000).toISOString();

      const { data: newListing, error: listingError } = await supa.from("listings").insert({
        seller_wa: normalizedWa,
        seller_name: profileName,
        title: extracted.title || "Barang Dijual",
        price: extracted.price || 0,
        description: extracted.description || message, // Fallback ke original text jika kosong
        category: extracted.category || "Lainnya",
        type: "barang",
        image_url: publicUrl,
        status: "pending",
        expires_at: expiresAt,
        bumped_at: new Date().toISOString(),
      }).select().single();

      if (listingError) throw new Error("Gagal menyimpan data iklan. " + listingError.message);

      // 6. Buat transaksi KlikQris
      const baseFee = adFeeFrom(settings.pricing, "barang", newListing.price);
      const orderId = `IKLAN-WA-${newListing.id.slice(0, 8)}-${Date.now()}`;
      const kq = await createKlikQrisTransaction(orderId, baseFee, `Iklan: ${newListing.title}`);
      const totalAmount = kq.totalAmount;

      await supa.from("payments").insert({
        listing_id: newListing.id,
        type: "iklan",
        amount: baseFee,
        status: "pending",
        midtrans_order_id: orderId,
        meta: { final_amount: totalAmount, klikqris_signature: kq.signature },
      });

      // 7. Kirim balasan QRIS
      const replyMessage = `✅ *Iklan Diterima!*\n\nAI berhasil membaca barang Anda:\n*Judul:* ${newListing.title}\n*Kategori:* ${newListing.category}\n*Harga:* Rp ${newListing.price.toLocaleString("id-ID")}\n\nUntuk menayangkannya, silakan Scan QRIS ini dan transfer *TEPAT SEBESAR*:\n\n👉 *Rp ${totalAmount.toLocaleString("id-ID")}* 👈\n*(Jangan dibulatkan!)*\n\nIklan otomatis aktif setelah pembayaran terdeteksi sistem. Atau kirim *GAMBAR STRUK* jika perlu konfirmasi manual.`;

      await sendWa(normalizedWa, replyMessage, kq.qrisUrl);

      return NextResponse.json({ ok: true, state: "listing_created_pending_payment" });

    } catch (err) {
      console.error("WA New Listing Error:", err);
      await sendWa(normalizedWa, "❌ Terjadi kendala saat memproses iklan Anda: " + err.message);
      return NextResponse.json({ ok: true, error: err.message });
    }

  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
