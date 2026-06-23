import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { parseListingFromText, verifyReceiptImage } from "@/lib/gemini";
import { sendWa, postToGroup, notifyWantedMatch, notifyCategorySubscribers } from "@/lib/fonnte";
import { formatWa } from "@/lib/constants";
import { getSettings, adFeeFrom } from "@/lib/settings";
import { createQrisTransaction } from "@/lib/midtrans";

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
    await Promise.allSettled(
      matches.map((w) => notifyWantedMatch(w.buyer_wa, w.buyer_name, listing))
    );
  } catch (err) {
    console.error("[wanted-match-baileys] error:", err?.message);
  }
}

export async function POST(req) {
  try {
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
    // STATE 1: Iklan Baru
    // ==========================================
    if (!message && !file) return NextResponse.json({ ok: true, ignored: true });

    if (file && !message) {
      await sendWa(senderJid, "📝 Tolong sertakan deskripsi barangnya (Nama, Harga, Kondisi, dll) bersama foto dalam 1 pesan agar AI bisa membacanya.");
      return NextResponse.json({ ok: true, state: "new_listing_no_text" });
    }

    if (message && !file) {
      const msgLower = message.toLowerCase().trim();
      if (msgLower.includes("jual") || msgLower.includes("wts") || msgLower.includes("ready") || msgLower.includes("dijual")) {
        await sendWa(senderJid, "📸 Sepertinya Anda ingin pasang iklan. Kirim *Foto Barang + Teks Deskripsi & Harga* dalam 1 pesan ya.");
      } else {
        await sendWa(senderJid,
          `Halo! Saya bot Jual Beli USU/Polmed 👋\n\n` +
          `Untuk pasang iklan, kirim *Foto + Deskripsi barang* (harga, kondisi, dll) dalam 1 pesan.\n\n` +
          `Atau kunjungi: ${process.env.NEXT_PUBLIC_BASE_URL}`
        );
      }
      return NextResponse.json({ ok: true, state: "new_listing_no_image" });
    }

    // Ada Teks + Gambar = Iklan Baru!
    await sendWa(senderJid, "⏳ AI kami sedang membaca detail iklan Anda...");

    try {
      const extracted = await parseListingFromText(message);

      if (!extracted || !extracted.title) {
        throw new Error("AI gagal mengekstrak judul iklan. Coba tulis lebih jelas: nama barang, harga, dan kondisinya.");
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
      else await supa.from("seller_profiles").insert({ wa: normalizedWa, name: profileName });

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
      await sendWa(senderJid,
        `✅ *Iklan Berhasil Dibaca AI!*\n\n` +
        `📦 *${newListing.title}*\n` +
        `🏷️ ${newListing.category} · ${conditionLabel}\n` +
        `💰 Rp ${newListing.price.toLocaleString("id-ID")}\n\n` +
        `Untuk tayangkan iklan, scan QRIS di bawah ini.\n` +
        `Nominal *sudah otomatis terisi* saat di-scan:\n\n` +
        `💳 *Rp ${totalAmount.toLocaleString("id-ID")}*\n\n` +
        `Setelah transfer, kirim *screenshot struk* ke sini.`,
        qrisUrl
      );

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
