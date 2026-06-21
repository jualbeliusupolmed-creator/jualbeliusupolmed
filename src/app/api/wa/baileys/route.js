import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { parseListingFromText, verifyReceiptImage } from "@/lib/gemini";
import { sendWa, postToGroup } from "@/lib/fonnte";
import { formatWa } from "@/lib/constants";
import { getSettings, adFeeFrom } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const sender = formData.get("sender");
    const message = formData.get("message") || "";
    const file = formData.get("file"); // Ini berupa File/Blob (Buffer dari Baileys)

    if (!sender || sender.includes("-") || sender === "status@broadcast") {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const normalizedWa = formatWa(sender);
    if (!normalizedWa) {
      return NextResponse.json({ ok: true, ignored: true });
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
        // Cek jika user ketik BATAL
        if (message && message.toLowerCase().trim() === "batal") {
          await supa.from("payments").delete().eq("id", pendingPayment.id);
          await supa.from("listings").delete().eq("id", pendingPayment.listings.id);
          await sendWa(normalizedWa, "🗑️ Tagihan iklan sebelumnya telah dibatalkan. Anda sekarang bisa mengirim iklan baru.");
          return NextResponse.json({ ok: true, state: "payment_cancelled" });
        }

        const qrisUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/qris.png`;
        const reminderMsg = `⚠️ Anda masih memiliki tagihan pembayaran iklan yang belum lunas untuk:\n\n*Judul:* ${pendingPayment.listings.title}\n*Nominal:* Rp ${pendingPayment.amount.toLocaleString("id-ID")}\n\nSilakan scan QRIS ini dan kirimkan *GAMBAR STRUK* transfer Anda agar sistem AI kami dapat memverifikasinya.\n\n_(Ketik *BATAL* jika Anda ingin membatalkan iklan tersebut)_`;
        await sendWa(normalizedWa, reminderMsg, qrisUrl);
        return NextResponse.json({ ok: true, state: "waiting_receipt_no_image" });
      }

      await sendWa(normalizedWa, "⏳ Sedang memverifikasi struk Anda menggunakan AI...");

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "image/jpeg";
        const extractedData = await verifyReceiptImage(buffer, mimeType);

        if (!extractedData.is_struk_valid) {
          await sendWa(normalizedWa, "❌ *Gambar Ditolak*\n\nSistem AI mendeteksi bahwa gambar yang Anda kirim *bukan struk transfer yang sah*. Pastikan foto jelas dan terang.");
          return NextResponse.json({ ok: true, state: "invalid_receipt_image" });
        }

        if (Number(extractedData.nominal) !== Number(pendingPayment.amount)) {
          await sendWa(normalizedWa, `❌ *Nominal Tidak Sesuai*\n\nNominal di struk (Rp ${extractedData.nominal?.toLocaleString("id-ID") || 0}) tidak sama dengan tagihan (Rp ${Number(pendingPayment.amount).toLocaleString("id-ID")}).\n\nSistem tidak dapat mengaktifkan iklan Anda.`);
          return NextResponse.json({ ok: true, state: "invalid_amount" });
        }

        // --- VERIFIKASI BERHASIL ---
        await supa.from("payments").update({ status: "paid" }).eq("id", pendingPayment.id);
        
        const { data: updatedListing } = await supa
          .from("listings")
          .update({ status: "active", bumped_at: new Date().toISOString() })
          .eq("id", pendingPayment.listings.id)
          .select()
          .single();

        const successMessage = `🎉 *PEMBAYARAN BERHASIL*\n\nStruk sebesar *Rp ${pendingPayment.amount.toLocaleString("id-ID")}* telah divalidasi oleh AI.\n\nIklan untuk *"${pendingPayment.listings.title}"* sudah tayang dan disebarkan ke Grup WhatsApp! 🚀\n\nCek di website: ${process.env.NEXT_PUBLIC_BASE_URL}`;
        await sendWa(normalizedWa, successMessage);

        if (updatedListing) {
          await postToGroup(updatedListing);
        }

        return NextResponse.json({ ok: true, state: "receipt_verified" });

      } catch (err) {
        console.error("AI Receipt Error via Baileys:", err);
        await sendWa(normalizedWa, "❌ Terjadi kendala saat membaca struk Anda. " + err.message);
        return NextResponse.json({ ok: true, error: err.message });
      }
    }


    // ==========================================
    // STATE 1: Iklan Baru
    // ==========================================
    if (!message && !file) return NextResponse.json({ ok: true, ignored: true });

    if (file && !message) {
      await sendWa(normalizedWa, "📝 Tolong sertakan deskripsi barangnya (Nama, Harga, Minus, dll) bersama dengan fotonya dalam 1 pesan agar bisa diproses AI.");
      return NextResponse.json({ ok: true, state: "new_listing_no_text" });
    }

    if (message && !file) {
       const msgLower = message.toLowerCase().trim();
       if (msgLower.includes("jual") || msgLower.includes("wts") || msgLower.includes("ready")) {
          await sendWa(normalizedWa, "📸 Sepertinya Anda ingin memasang iklan. Silakan kirimkan *Foto Barang* beserta teks deskripsinya dalam 1 pesan.");
       }
       return NextResponse.json({ ok: true, state: "new_listing_no_image" });
    }

    // Ada Teks + Gambar = Iklan Baru!
    await sendWa(normalizedWa, "⏳ AI kami sedang membaca detail iklan Anda dari Baileys...");

    try {
      const extracted = await parseListingFromText(message);
      
      if (!extracted || !extracted.title) {
        throw new Error("AI gagal mengekstrak judul iklan dari pesan Anda. Coba tulis lebih jelas.");
      }

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || "image/jpeg";
      
      const ext = mimeType.split("/")[1] || "jpg";
      const fileName = `wa-${Date.now()}-${Math.floor(Math.random() * 1000)}.${ext}`;
      const { data: uploadData, error: uploadError } = await supa.storage
        .from("listings")
        .upload(fileName, buffer, { contentType: mimeType });
        
      if (uploadError) throw new Error("Gagal mengunggah gambar ke server.");
      
      const { data: publicUrlData } = supa.storage.from("listings").getPublicUrl(fileName);
      const publicUrl = publicUrlData.publicUrl;

      let profileName = "Pengguna WA";
      const { data: profile } = await supa.from("seller_profiles").select("name").eq("wa", normalizedWa).maybeSingle();
      if (profile) profileName = profile.name;
      else {
        await supa.from("seller_profiles").insert({ wa: normalizedWa, name: profileName });
      }

      const settings = await getSettings();
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
        image_url: publicUrl,
        status: "pending",
        expires_at: expiresAt,
        bumped_at: new Date().toISOString(),
      }).select().single();

      if (listingError) throw new Error("Gagal menyimpan data iklan. " + listingError.message);

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

      const qrisUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/qris.png`;
      const replyMessage = `✅ *Iklan Diterima!*\n\nAI berhasil membaca barang Anda:\n*Judul:* ${newListing.title}\n*Kategori:* ${newListing.category}\n*Harga:* Rp ${newListing.price.toLocaleString("id-ID")}\n\nUntuk menayangkannya, silakan Scan QRIS ini dan transfer *TEPAT SEBESAR*:\n\n👉 *Rp ${totalAmount.toLocaleString("id-ID")}* 👈\n*(Jangan dibulatkan!)*\n\nSetelah berhasil transfer, balas pesan ini dengan *GAMBAR STRUK* Anda.`;

      await sendWa(normalizedWa, replyMessage, qrisUrl);

      return NextResponse.json({ ok: true, state: "listing_created_pending_payment" });

    } catch (err) {
      console.error("WA New Listing Error Baileys:", err);
      await sendWa(normalizedWa, "❌ Terjadi kendala saat memproses iklan Anda: " + err.message);
      return NextResponse.json({ ok: true, error: err.message });
    }

  } catch (error) {
    console.error("Webhook Error Baileys:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
