import { autoPublishListingInstagram } from "@/lib/listingInstagram";
import { siteOriginFromRequest } from "@/lib/instagramQueue";
import { getSettings } from "@/lib/settings";
import { postToGroup, sendWa } from "@/lib/fonnte";
import { pushListingBaru } from "@/lib/webpush";
import { ADMIN_PAYMENT_STATUSES, canSettleAdminPaymentType } from "@/lib/admin-finance-policy";

function failure(error, status) {
  return { ok: false, error, status };
}

async function notifySeller(wa, message) {
  if (!wa) return true;
  const result = await sendWa(wa, message).catch(() => null);
  if (result?.ok) return true;
  console.error("[admin-finance] WhatsApp delivery failed.");
  return false;
}

export async function updateAdminPayment({ supa, paymentId, status, actorId, request }) {
  if (!paymentId || !ADMIN_PAYMENT_STATUSES.includes(status)) {
    return failure("Status atau transaksi tidak valid.", 400);
  }

  const { data: current, error: readError } = await supa
    .from("payments")
    .select("status,type")
    .eq("id", paymentId)
    .maybeSingle();
  if (readError) return failure("Transaksi belum dapat diperiksa.", 503);
  if (!current) return failure("Transaksi tidak ditemukan.", 404);
  if (status === "paid" && current.status === "paid") return failure("Transaksi sudah lunas.", 409);
  if (status === "paid" && !canSettleAdminPaymentType(current.type)) {
    return failure("Tipe pembayaran ini harus diproses melalui alur khususnya.", 400);
  }

  let update = supa.from("payments").update({ status }).eq("id", paymentId);
  update = current.status == null ? update.is("status", null) : update.eq("status", current.status);
  const { data: payment, error: updateError } = await update.select().maybeSingle();
  if (updateError) return failure("Status transaksi gagal diperbarui.", 503);
  if (!payment) return failure("Status transaksi berubah. Muat ulang daftar lalu coba kembali.", 409);

  await supa.from("admin_audit_events").insert({
    actor_id: actorId,
    action: "payment_status_changed",
    target_id: paymentId,
    metadata: { from: current.status, to: status, type: payment.type || "" },
  });

  let warning = null;
  if (status !== "paid") return { ok: true, warning };

  if (payment.type === "subscribe") {
    const wa = payment.meta?.wa;
    if (!wa) return { ok: true, warning: "Pembayaran lunas, tetapi akun paket Pro tidak tercantum pada transaksi." };
    const until = new Date(Date.now() + 30 * 864e5).toISOString();
    const { data: profile, error } = await supa.from("seller_profiles")
      .update({ subscription_tier: "pro", subscription_expires_at: until })
      .eq("wa", wa)
      .select("wa")
      .maybeSingle();
    if (error || !profile) warning = "Pembayaran lunas, tetapi paket Pro gagal diaktifkan.";
    return { ok: true, warning };
  }

  if (!payment.listing_id) return { ok: true, warning: "Pembayaran lunas, tetapi iklan terkait tidak ditemukan." };

  if (payment.type === "iklan" || payment.type === "bump") {
    const { data: listing, error } = await supa.from("listings")
      .update({ status: "active", bumped_at: new Date().toISOString() })
      .eq("id", payment.listing_id)
      .select()
      .maybeSingle();
    if (error || !listing) return { ok: true, warning: "Pembayaran lunas, tetapi iklan gagal diperbarui." };
    if (payment.type === "iklan") {
      const settings = await getSettings().catch(() => null);
      pushListingBaru(supa, listing).catch(() => {});
      const [groupResult] = await Promise.allSettled([postToGroup(listing, settings?.admin)]);
      const broadcast = groupResult.status === "fulfilled" ? groupResult.value : null;
      if (!broadcast?.ok) warning = "Iklan aktif, tetapi pemberitahuan grup gagal terkirim.";
      await autoPublishListingInstagram({ origin: siteOriginFromRequest(request), listingId: listing.id }).catch(() => {
        warning = "Iklan aktif, tetapi publikasi Instagram gagal diproses.";
      });
    }
  } else if (payment.type === "featured") {
    const days = Math.max(1, Math.min(30, Number(payment.meta?.days) || 1));
    const until = new Date(Date.now() + days * 864e5).toISOString();
    const { error } = await supa.from("listings")
      .update({ featured: true, featured_until: until, bumped_at: new Date().toISOString() })
      .eq("id", payment.listing_id);
    if (error) warning = "Pembayaran lunas, tetapi sorotan iklan gagal diaktifkan.";
  } else if (payment.type === "autobump") {
    const until = new Date(Date.now() + 7 * 864e5).toISOString();
    const { error } = await supa.from("listings")
      .update({ auto_bump_until: until, bumped_at: new Date().toISOString() })
      .eq("id", payment.listing_id);
    if (error) warning = "Pembayaran lunas, tetapi jadwal naik otomatis gagal diaktifkan.";
  } else if (payment.type === "sold_fee") {
    const { error } = await supa.from("listings")
      .update({ status: "sold", stock: 0 })
      .eq("id", payment.listing_id);
    if (error) warning = "Pembayaran lunas, tetapi status iklan gagal diperbarui.";
  } else if (payment.type === "renewal") {
    const days = Math.max(1, Math.min(365, Number(payment.meta?.renew_days) || 14));
    const expiresAt = new Date(Date.now() + days * 864e5).toISOString();
    const { data: listing, error } = await supa.from("listings")
      .update({ status: "active", expires_at: expiresAt, bumped_at: new Date().toISOString() })
      .eq("id", payment.listing_id)
      .select("seller_wa,title")
      .maybeSingle();
    if (error || !listing) warning = "Pembayaran lunas, tetapi masa iklan gagal diperbarui.";
    else if (!(await notifySeller(listing.seller_wa, `Perpanjangan iklan *${listing.title || "iklan Anda"}* disetujui. Masa aktif diperbarui hingga ${new Date(expiresAt).toLocaleDateString("id-ID")}.`))) warning = "Pembayaran disetujui, tetapi pemberitahuan WhatsApp gagal terkirim.";
  } else if (payment.type === "sponsored") {
    const days = Math.max(1, Math.min(30, Number(payment.meta?.days) || 1));
    const until = new Date(Date.now() + days * 864e5).toISOString();
    const { data: listing, error } = await supa.from("listings")
      .update({ sponsored_until: until })
      .eq("id", payment.listing_id)
      .select("seller_wa,title")
      .maybeSingle();
    if (error || !listing) warning = "Pembayaran lunas, tetapi sponsor iklan gagal diaktifkan.";
    else if (!(await notifySeller(listing.seller_wa, `Sponsor iklan *${listing.title || "iklan Anda"}* aktif selama ${days} hari.`))) warning = "Pembayaran disetujui, tetapi pemberitahuan WhatsApp gagal terkirim.";
  }

  return { ok: true, warning };
}

export async function approveWantedContactUnlock({ supa, paymentId, actorId }) {
  if (!paymentId) return failure("Transaksi tidak valid.", 400);
  const { data: payment, error: paymentError } = await supa.from("payments")
    .select("id,type,status,meta")
    .eq("id", paymentId)
    .maybeSingle();
  if (paymentError) return failure("Transaksi belum dapat diperiksa.", 503);
  if (!payment) return failure("Transaksi pembayaran tidak ditemukan.", 404);
  if (payment.type !== "wanted") return failure("Transaksi ini bukan permintaan buka kontak.", 400);
  if (payment.status === "paid") return failure("Transaksi sudah lunas.", 409);

  const wantedId = payment.meta?.unlock_wanted_id;
  const requesterWa = payment.meta?.requester_wa;
  if (!wantedId || !requesterWa) return failure("Data pencarian atau pemohon tidak lengkap.", 400);
  const { data: wanted, error: wantedError } = await supa.from("wanted_listings")
    .select("id,title,buyer_name,buyer_wa")
    .eq("id", wantedId)
    .maybeSingle();
  if (wantedError) return failure("Postingan Dicari belum dapat diperiksa.", 503);
  if (!wanted) return failure("Postingan Dicari tidak ditemukan.", 404);

  let update = supa.from("payments").update({ status: "paid" }).eq("id", paymentId);
  update = payment.status == null ? update.is("status", null) : update.eq("status", payment.status);
  const { data: approved, error: updateError } = await update.select("id,type").maybeSingle();
  if (updateError) return failure("Gagal memperbarui transaksi pembayaran.", 503);
  if (!approved) return failure("Transaksi berubah saat diproses. Muat ulang daftar sebelum mencoba lagi.", 409);

  await supa.from("admin_audit_events").insert({
    actor_id: actorId,
    action: "wanted_unlock_approved",
    target_id: paymentId,
    metadata: { from: payment.status || null, to: "paid", type: approved.type },
  });

  const message =
    ` *PEMBAYARAN QRIS MANUAL DISETUJUI*\n\n` +
    `Halo, permintaan buka kontak Anda untuk pencarian barang berikut telah disetujui:\n` +
    ` *Cari Barang:* ${wanted.title}\n\n` +
    `Berikut adalah kontak pembeli yang mengajukan pencarian:\n` +
    ` *Nama:* ${wanted.buyer_name}\n` +
    ` *No. WhatsApp:* ${wanted.buyer_wa}\n\n` +
    `Silakan hubungi pembeli melalui tautan berikut:\n` +
    ` https://wa.me/${wanted.buyer_wa}?text=${encodeURIComponent(`Halo ${wanted.buyer_name}, saya melihat postingan Anda mencari "${wanted.title}" di Jual Beli USU Polmed. Saya ada barangnya.`)}\n\n` +
    `Terima kasih telah menggunakan Jual Beli USU Polmed!`;
  const delivery = await sendWa(requesterWa, message).catch(() => null);
  if (!delivery?.ok) {
    console.error("[admin-finance] Wanted contact notification failed.");
    return { ok: true, warning: "Pembayaran disetujui, tetapi pesan WhatsApp gagal terkirim. Periksa status pengiriman." };
  }
  return { ok: true, warning: null };
}
