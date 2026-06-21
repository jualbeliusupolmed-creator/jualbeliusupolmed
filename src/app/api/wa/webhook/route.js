import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { parseListingFromText, verifyReceiptImage } from "@/lib/gemini";
import { sendWa, postToGroup } from "@/lib/fonnte";
import { formatWa } from "@/lib/constants";
import { getSettings, adFeeFrom } from "@/lib/settings";

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
        await sendWa(normalizedWa, "⚠️ Anda masih memiliki tagihan pembayaran iklan yang belum lunas.\n\nSilakan kirimkan *GAMBAR STRUK* transfer Anda agar sistem AI kami dapat memverifikasinya.");
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

        if (Number(extractedData.nominal) !== Number(pendingPayment.amount)) {
          await sendWa(normalizedWa, `❌ *Nominal Tidak Sesuai*\n\nNominal di struk (Rp ${extractedData.nominal?.toLocaleString("id-ID") || 0}) tidak sama dengan tagihan (Rp ${Number(pendingPayment.amount).toLocaleString("id-ID")}).\n\nSistem tidak dapat mengaktifkan iklan Anda.`);
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

        // Notif Sukses ke User
        const successMessage = `🎉 *PEMBAYARAN BERHASIL*\n\nStruk sebesar *Rp ${pendingPayment.amount.toLocaleString("id-ID")}* telah divalidasi oleh AI.\n\nIklan untuk *"${pendingPayment.listings.title}"* sudah tayang dan disebarkan ke Grup WhatsApp! 🚀\n\nCek di website: ${process.env.NEXT_PUBLIC_BASE_URL}`;
        await sendWa(normalizedWa, successMessage);

        // Auto-post ke Grup
        if (updatedListing) {
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
       // Cek niat user (heuristik sederhana, jika ada kata jual/wts/ready)
       const msgLower = message.toLowerCase();
       if (msgLower.includes("jual") || msgLower.includes("wts") || msgLower.includes("ready")) {
          await sendWa(normalizedWa, "📸 Sepertinya Anda ingin memasang iklan. Silakan kirimkan *Foto Barang* beserta teks deskripsinya dalam 1 pesan.");
       }
       return NextResponse.json({ ok: true, state: "new_listing_no_image" });
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

      // 6. Buat DB Payment dengan angka unik (Fee + Random 1-99)
      const baseFee = adFeeFrom(settings.pricing, "barang", newListing.price);
      const uniqueCode = Math.floor(Math.random() * 99) + 1; // 1 to 99
      const totalAmount = baseFee + uniqueCode;
      
      const orderId = `IKLAN-WA-${newListing.id.slice(0, 8)}-${Date.now()}`;

      await supa.from("payments").insert({
        listing_id: newListing.id,
        type: "iklan",
        amount: totalAmount,
        status: "pending",
        midtrans_order_id: orderId,
      });

      // 7. Kirim balasan QRIS
      const qrisUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://jualbelimedan.web.id"}/qris.png`;
      const replyMessage = `✅ *Iklan Diterima!*\n\nAI berhasil membaca barang Anda:\n*Judul:* ${newListing.title}\n*Kategori:* ${newListing.category}\n*Harga:* Rp ${newListing.price.toLocaleString("id-ID")}\n\nUntuk menayangkannya, silakan Scan QRIS ini dan transfer *TEPAT SEBESAR*:\n\n👉 *Rp ${totalAmount.toLocaleString("id-ID")}* 👈\n*(Jangan dibulatkan!)*\n\nSetelah berhasil transfer, balas pesan ini dengan *GAMBAR STRUK* Anda.`;

      await sendWa(normalizedWa, replyMessage, qrisUrl);

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
