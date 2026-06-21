import { NextResponse } from "next/server";
import { parseListingFromText } from "@/lib/gemini";
import { uploadToSupabase } from "@/lib/supabase-storage";
import { createClient } from "@supabase/supabase-js";
import { sendWa } from "@/lib/fonnte"; // Tetap pakai sendWa yang akan kita modif
import { verifyReceiptImage } from "@/lib/gemini-vision";
import { formatWa } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supa = createClient(supabaseUrl, supabaseKey);

export async function POST(req) {
  try {
    const formData = await req.formData();
    const sender = formData.get("sender");
    const message = formData.get("message") || "";
    const file = formData.get("file"); // Ini berupa File/Blob

    if (!sender) return NextResponse.json({ ok: true, ignored: true });

    const normalizedWa = formatWa(sender);
    const msgLower = message.toLowerCase().trim();

    // 1. CEK PENDING PAYMENT (PEMBAYARAN QRIS)
    const { data: pendingPayments } = await supa
      .from("payments")
      .select("*, listings!inner(id, title, seller_wa)")
      .eq("status", "pending")
      .eq("listings.seller_wa", normalizedWa)
      .order("created_at", { ascending: false })
      .limit(1);

    const pendingPayment = pendingPayments?.[0];

    if (pendingPayment) {
      if (msgLower === "batal") {
        await supa.from("payments").delete().eq("id", pendingPayment.id);
        await supa.from("listings").delete().eq("id", pendingPayment.listings.id);
        await sendWa(normalizedWa, "🗑️ Tagihan iklan dibatalkan. Anda bisa mengirim iklan baru.");
        return NextResponse.json({ ok: true, state: "payment_cancelled" });
      }

      if (!file) {
        const qrisUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/qris.png`;
        const reminderMsg = `⚠️ Anda masih memiliki tagihan pembayaran iklan yang belum lunas untuk:\n\n*Judul:* ${pendingPayment.listings.title}\n*Nominal:* Rp ${pendingPayment.amount.toLocaleString("id-ID")}\n\nSilakan scan QRIS ini dan kirimkan *GAMBAR STRUK* transfer Anda agar sistem AI kami dapat memverifikasinya.\n\n_(Ketik *BATAL* jika ingin membatalkan)_`;
        await sendWa(normalizedWa, reminderMsg, qrisUrl);
        return NextResponse.json({ ok: true, state: "waiting_receipt_no_image" });
      }

      // ADA FILE STRUK!
      await sendWa(normalizedWa, "⏳ Sedang memverifikasi struk Anda menggunakan AI...");

      try {
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const mimeType = file.type || "image/jpeg";
        const extractedData = await verifyReceiptImage(buffer, mimeType);

        if (extractedData.status === "rejected") {
          await sendWa(normalizedWa, `❌ *Gambar Ditolak*\n${extractedData.reason}\n\nSilakan kirim ulang foto struk yang benar, atau ketik *BATAL*.`);
          return NextResponse.json({ ok: true, state: "receipt_rejected" });
        }

        const numericAmount = parseFloat(extractedData.amount.replace(/[^0-9]/g, ""));
        if (Math.abs(numericAmount - pendingPayment.amount) > 100) {
           await sendWa(normalizedWa, `⚠️ *Nominal Tidak Sesuai*\nStruk Anda terbaca: Rp ${numericAmount.toLocaleString("id-ID")}\nSedangkan tagihan Anda: Rp ${pendingPayment.amount.toLocaleString("id-ID")}\n\nSilakan hubungi Admin jika terjadi kesalahan.`);
           return NextResponse.json({ ok: true, state: "receipt_amount_mismatch" });
        }

        // LUNAS
        await supa.from("payments").update({ status: "paid" }).eq("id", pendingPayment.id);
        await supa.from("listings").update({ is_paid: true }).eq("id", pendingPayment.listings.id);
        
        await sendWa(normalizedWa, `✅ *Pembayaran Berhasil Diverifikasi!*\n\nTerima kasih, iklan Anda untuk *${pendingPayment.listings.title}* sekarang sudah AKTIF dan dapat dilihat oleh ribuan mahasiswa USU & Polmed.\n\nCek website: https://www.jualbeliusupolmed.web.id`);
        return NextResponse.json({ ok: true, state: "receipt_approved" });

      } catch (err) {
        await sendWa(normalizedWa, "❌ Gagal memverifikasi struk: " + err.message);
        return NextResponse.json({ ok: true, error: err.message });
      }
    }

    // 2. IKLAN BARU (TIDAK ADA PENDING PAYMENT)
    if (!file) {
       if (msgLower.includes("jual") || msgLower.includes("wts") || msgLower.includes("ready")) {
          await sendWa(normalizedWa, "📸 Sepertinya Anda ingin memasang iklan. Silakan kirimkan *Foto Barang* beserta teks deskripsinya dalam 1 pesan.");
       }
       return NextResponse.json({ ok: true, state: "new_listing_no_image" });
    }

    // ADA FILE & TEKS UNTUK IKLAN BARU
    await sendWa(normalizedWa, "⏳ AI kami sedang membaca detail iklan Anda...");

    try {
      const extracted = await parseListingFromText(message);
      
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = file.type || "image/jpeg";
      
      const fileName = `wa-${Date.now()}.jpg`;
      const publicUrl = await uploadToSupabase(buffer, fileName, mimeType);

      // Hitung harga iklan (Rp 2.000 + 3 digit terakhir HP)
      const last3 = normalizedWa.slice(-3);
      let randomCode = parseInt(last3, 10);
      if (isNaN(randomCode) || randomCode < 1) randomCode = Math.floor(Math.random() * 999) + 1;
      const adPrice = 2000 + randomCode;

      // Insert ke Supabase
      const { data: insertData, error: insertError } = await supa
        .from("listings")
        .insert([{
          title: extracted.title,
          price: extracted.price,
          description: extracted.description,
          condition: extracted.condition,
          image_url: publicUrl,
          seller_name: "Penjual",
          seller_wa: normalizedWa,
          is_paid: false
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // Insert ke payments
      await supa
        .from("payments")
        .insert([{
           listing_id: insertData.id,
           amount: adPrice,
           status: "pending"
        }]);

      const qrisUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/qris.png`;
      
      const successMessage = `✨ *Iklan Berhasil Dikenali!*\n\n*Judul:* ${insertData.title}\n*Harga Barang:* Rp ${insertData.price.toLocaleString("id-ID")}\n\nUntuk menerbitkan iklan ini, silakan selesaikan pembayaran iklan:\n*Total:* Rp ${adPrice.toLocaleString("id-ID")}\n\nSilakan scan QRIS dan kirimkan foto bukti struk ke sini.`;
      
      await sendWa(normalizedWa, successMessage, qrisUrl);
      return NextResponse.json({ ok: true, state: "listing_created_pending_payment" });

    } catch (err) {
      console.error("WA New Listing Error:", err);
      await sendWa(normalizedWa, "❌ Terjadi kendala saat memproses iklan Anda: " + err.message);
      return NextResponse.json({ ok: true, error: err.message });
    }

  } catch (error) {
    console.error("Webhook Baileys Error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
