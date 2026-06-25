import { NextResponse } from "next/server";

/**
 * Handler perintah admin bot WA.
 * Dipanggil dari baileys/route.js setelah admin check.
 *
 * ctx = { textMsg, message, senderJid, normalizedWa, supa, sendWa, getSettings, isAdminWa }
 * Return: NextResponse jika command ditangani, null jika bukan perintah admin.
 */
export async function handleAdminCmd(ctx) {
  const { textMsg, message, senderJid, normalizedWa, supa, sendWa, getSettings, isAdminWa } = ctx;

  if (!isAdminWa(normalizedWa)) return null;

  // ── STATS ──────────────────────────────────────────────────────────────────
  if (textMsg === "STATS") {
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const [
      { count: totalActive },
      { count: totalToday },
      { data: paymentsToday },
      { count: totalUsers },
    ] = await Promise.all([
      supa.from("listings").select("id", { count: "exact", head: true }).eq("status", "active"),
      supa.from("listings").select("id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      supa.from("payments").select("amount").eq("status", "paid").gte("created_at", todayStart.toISOString()),
      supa.from("seller_profiles").select("id", { count: "exact", head: true }),
    ]);
    const revenueToday = (paymentsToday || []).reduce((s, p) => s + Number(p.amount), 0);
    const msg =
      `📊 *Statistik Marketplace*\n\n` +
      `🏪 Iklan aktif: *${totalActive || 0}*\n` +
      `📅 Iklan baru hari ini: *${totalToday || 0}*\n` +
      `💳 Transaksi hari ini: *${paymentsToday?.length || 0}*\n` +
      `💰 Revenue hari ini: *Rp ${revenueToday.toLocaleString("id-ID")}*\n` +
      `👤 Total penjual: *${totalUsers || 0}*`;
    await sendWa(senderJid, msg);
    return NextResponse.json({ ok: true, state: "stats_sent" });
  }

  // ── SETUJUI NAMA [nomor] ────────────────────────────────────────────────────
  if (textMsg.startsWith("SETUJUI NAMA ")) {
    const targetWa = (message.trim().split(/\s+/)[2] || "").replace(/^0/, "62").replace(/\D/g, "");
    if (!targetWa) {
      await sendWa(senderJid, "❌ Format: *SETUJUI NAMA [nomor WA]*");
      return NextResponse.json({ ok: true, state: "setujui_invalid" });
    }
    const { data: req } = await supa.from("profile_change_requests")
      .select("*").eq("seller_wa", targetWa).eq("field", "name").eq("status", "pending")
      .order("requested_at", { ascending: false }).limit(1).maybeSingle();
    if (!req) {
      await sendWa(senderJid, `❌ Tidak ada permintaan ganti nama pending untuk *${targetWa}*.`);
      return NextResponse.json({ ok: true, state: "setujui_not_found" });
    }
    await supa.from("seller_profiles").upsert({ wa: targetWa, name: req.requested_value }, { onConflict: "wa" });
    await supa.from("listings").update({ seller_name: req.requested_value }).eq("seller_wa", targetWa).in("status", ["active", "pending"]);
    await supa.from("profile_change_requests").update({ status: "approved", reviewed_at: new Date().toISOString() }).eq("id", req.id);
    await sendWa(targetWa + "@s.whatsapp.net", `✅ *Permintaan ganti nama Anda disetujui!*\n\n📛 Nama baru: *${req.requested_value}*\n\nPerubahan sudah berlaku.`).catch(() => {});
    await sendWa(senderJid, `✅ Nama profil *${targetWa}* → *${req.requested_value}*. Penjual sudah diberitahu.`);
    return NextResponse.json({ ok: true, state: "setujui_done" });
  }

  // ── TOLAK NAMA [nomor] [alasan] ────────────────────────────────────────────
  if (textMsg.startsWith("TOLAK NAMA ")) {
    const parts = message.trim().split(/\s+/);
    const targetWa = (parts[2] || "").replace(/^0/, "62").replace(/\D/g, "");
    const alasan = parts.slice(3).join(" ").trim();
    if (!targetWa) {
      await sendWa(senderJid, "❌ Format: *TOLAK NAMA [nomor WA] [alasan opsional]*");
      return NextResponse.json({ ok: true, state: "tolak_invalid" });
    }
    const { data: req } = await supa.from("profile_change_requests")
      .select("*").eq("seller_wa", targetWa).eq("field", "name").eq("status", "pending")
      .order("requested_at", { ascending: false }).limit(1).maybeSingle();
    if (!req) {
      await sendWa(senderJid, `❌ Tidak ada permintaan ganti nama pending untuk *${targetWa}*.`);
      return NextResponse.json({ ok: true, state: "tolak_not_found" });
    }
    await supa.from("profile_change_requests").update({ status: "rejected", reviewed_at: new Date().toISOString(), review_note: alasan || null }).eq("id", req.id);
    const noteMsg = alasan ? `\n\nAlasan: _${alasan}_` : "";
    await sendWa(targetWa + "@s.whatsapp.net", `❌ *Permintaan ganti nama Anda ditolak.*${noteMsg}\n\nHubungi admin jika ada pertanyaan.`).catch(() => {});
    await sendWa(senderJid, `✅ Permintaan ganti nama *${targetWa}* ditolak. Penjual sudah diberitahu.`);
    return NextResponse.json({ ok: true, state: "tolak_done" });
  }

  // ── SETMODE [mode] ─────────────────────────────────────────────────────────
  if (textMsg.startsWith("SETMODE")) {
    const modeArg = textMsg.split(/\s+/)[1]?.toLowerCase();
    if (!modeArg) {
      await sendWa(senderJid,
        `⚙️ *Pengaturan Mode Monetisasi*\n\n` +
        `1️⃣ *Sewa Lapak* (Bayar saat pasang iklan)\n` +
        `2️⃣ *Jual Dulu* (Gratis pasang, bayar komisi laku)\n` +
        `3️⃣ *Freemium* (Gratis pasang & laku, fitur premium berbayar)\n` +
        `4️⃣ *Gratis Semua* (100% gratis)\n\n` +
        `Contoh: *SETMODE 1*`
      );
      return NextResponse.json({ ok: true, state: "setmode_menu" });
    }
    const modeMap = { "1": "sewalapak", sewalapak: "sewalapak", "2": "jualdulu", jualdulu: "jualdulu", "3": "freemium", freemium: "freemium", "4": "gratis", gratis: "gratis" };
    const resolvedMode = modeMap[modeArg];
    if (!resolvedMode) {
      await sendWa(senderJid, "❌ Pilihan tidak valid. Ketik *SETMODE* untuk melihat menu.");
      return NextResponse.json({ ok: true, state: "setmode_invalid" });
    }
    const s = await getSettings();
    let p = { ...s.pricing };
    if (resolvedMode === "sewalapak") {
      p.adTiers = [{ upto: 50000, flat: 2000 }, { upto: 100000, flat: 3000 }, { upto: 500000, flat: 5000 }, { upto: 1000000, flat: 7000 }, { upto: null, pct: 1 }];
      p.soldTiers = []; p.bump = 1000; p.featuredPerDay = 5000; p.adBarang = 2000;
    } else if (resolvedMode === "jualdulu") {
      p.adTiers = [{ upto: null, flat: 0 }];
      p.soldTiers = [{ upto: 50000, flat: 0 }, { upto: 100000, pct: 10 }, { upto: null, pct: 5 }];
      p.bump = 1000; p.featuredPerDay = 5000; p.adBarang = 0;
    } else if (resolvedMode === "freemium") {
      p.adTiers = [{ upto: null, flat: 0 }]; p.soldTiers = [];
      p.bump = 2000; p.featuredPerDay = 5000; p.adBarang = 0;
    } else {
      p.adTiers = [{ upto: null, flat: 0 }]; p.soldTiers = [];
      p.bump = 0; p.featuredPerDay = 0; p.adBarang = 0; p.adPoster = 0; p.renewalFee = 0;
    }
    await supa.from("settings").upsert({ key: "pricing", value: p }, { onConflict: "key" });
    const modeLabels = { sewalapak: "Sewa Lapak", jualdulu: "Jual Dulu (Komisi)", freemium: "Freemium", gratis: "Gratis Semua" };
    await sendWa(senderJid,
      `✅ Mode monetisasi → *${modeLabels[resolvedMode]}*. Tarif diperbarui.\n\n` +
      `Kirim *BROADCAST SETMODE ${resolvedMode}* untuk umumkan ke grup.`
    );
    return NextResponse.json({ ok: true, state: "setmode_done_awaiting_broadcast" });
  }

  // ── BROADCAST SETMODE [mode] ────────────────────────────────────────────────
  if (textMsg.startsWith("BROADCAST SETMODE ")) {
    const bMode = textMsg.split(/\s+/)[2]?.toLowerCase();
    const validModes = ["sewalapak", "jualdulu", "freemium", "gratis"];
    if (!bMode || !validModes.includes(bMode)) return NextResponse.json({ ok: true, state: "broadcast_invalid" });
    const s = await getSettings();
    const groupJid = s.admin?.groupJid || process.env.FONNTE_WA_GROUP_ID;
    if (!groupJid) {
      await sendWa(senderJid, "❌ Grup WA belum dikonfigurasi. Set groupJid di Pengaturan Admin.");
      return NextResponse.json({ ok: true, state: "broadcast_no_group" });
    }
    const msgs = {
      sewalapak: `📢 *Pembaruan Tarif!*\n\nSistem Sewa Lapak kini aktif.\nBiaya pasang mulai Rp 2.000 — *tanpa komisi* saat laku! 🤑`,
      jualdulu: `📢 *Kabar Gembira!*\n\nPasang iklan *GRATIS*! Bayar komisi ringan *hanya jika* barang laku. Gak laku = gak bayar! 🛒`,
      freemium: `📢 *Platform Gratis!*\n\nPasang & jual *GRATIS*. Fitur premium (sundul/sorotan) tetap tersedia untuk yang ingin cepat laku. 🚀`,
      gratis: `🎉 *PROMO PELUNCURAN!*\n\n✅ Gratis pasang iklan\n✅ Gratis fitur premium\n✅ Bebas komisi\n\nBuruan post sekarang! 🏃‍♂️`,
    };
    await sendWa(groupJid, msgs[bMode]).catch(() => {});
    await sendWa(senderJid, "✅ Pengumuman mode monetisasi berhasil disiarkan ke grup!");
    return NextResponse.json({ ok: true, state: "broadcast_setmode_sent" });
  }

  // ── PAUSE [nomor] ──────────────────────────────────────────────────────────
  if (textMsg.startsWith("PAUSE ")) {
    const pauseTarget = message.split(/\s+/)[1]?.replace(/^0/, "62").replace(/\D/g, "");
    if (!pauseTarget) {
      await sendWa(senderJid, "❌ Format: *PAUSE [nomor WA]*\nContoh: PAUSE 628123456789");
      return NextResponse.json({ ok: true, state: "pause_invalid" });
    }
    const s = await getSettings();
    const paused = s?.bot?.paused_users || [];
    if (!paused.includes(pauseTarget)) {
      paused.push(pauseTarget);
      await supa.from("settings").update({ value: { paused_users: paused } }).eq("key", "bot");
    }
    await sendWa(senderJid, `✅ Bot di-pause untuk *${pauseTarget}*.\nKetik *RESUME ${pauseTarget}* untuk aktifkan.`);
    return NextResponse.json({ ok: true, state: "pause_done" });
  }

  // ── RESUME [nomor] ─────────────────────────────────────────────────────────
  if (textMsg.startsWith("RESUME ")) {
    const resumeTarget = message.split(/\s+/)[1]?.replace(/^0/, "62").replace(/\D/g, "");
    if (!resumeTarget) {
      await sendWa(senderJid, "❌ Format: *RESUME [nomor WA]*");
      return NextResponse.json({ ok: true, state: "resume_invalid" });
    }
    const s = await getSettings();
    const resumed = (s?.bot?.paused_users || []).filter(u => u !== resumeTarget);
    await supa.from("settings").update({ value: { paused_users: resumed } }).eq("key", "bot");
    await sendWa(senderJid, `✅ Bot aktif kembali untuk *${resumeTarget}*.`);
    return NextResponse.json({ ok: true, state: "resume_done" });
  }

  // ── BROADCAST [pesan] ──────────────────────────────────────────────────────
  if (textMsg.startsWith("BROADCAST ") && !textMsg.startsWith("BROADCAST SETMODE")) {
    const bcMsg = message.replace(/^BROADCAST\s+/i, "").trim();
    if (!bcMsg) {
      await sendWa(senderJid, "❌ Format: *BROADCAST [pesan]*");
      return NextResponse.json({ ok: true, state: "broadcast_invalid" });
    }
    const { data: sellers } = await supa.from("listings").select("seller_wa").eq("status", "active");
    const unique = [...new Set((sellers || []).map(s => s.seller_wa).filter(Boolean))];
    await sendWa(senderJid, `📡 Memulai broadcast ke *${unique.length} penjual*...\n\n"${bcMsg.slice(0, 100)}"`);
    let sent = 0;
    for (const wa of unique) {
      try {
        const r = await sendWa(wa, `📢 *Pesan dari Admin Jual Beli USU:*\n\n${bcMsg}`).catch(() => ({ ok: false }));
        if (r.ok) sent++;
        await new Promise(r => setTimeout(r, 2000));
      } catch (_) {}
    }
    await sendWa(senderJid, `✅ *Broadcast selesai!*\nTerkirim ke *${sent}/${unique.length}* penjual.`);
    return NextResponse.json({ ok: true, state: "broadcast_done", sent, total: unique.length });
  }

  // ── SETUJUI TAWAR BIAYA [kode] ────────────────────────────────────────────
  if (textMsg.startsWith("SETUJUI TAWAR BIAYA ")) {
    const kode = textMsg.split(/\s+/)[3];
    if (!kode) {
      await sendWa(senderJid, "❌ Format: *SETUJUI TAWAR BIAYA [kode iklan]*");
      return NextResponse.json({ ok: true, state: "approve_fee_invalid" });
    }
    const { data: listing } = await supa
      .from("listings").select("id, title, seller_wa, fee_offer, fee_offer_status")
      .eq("listing_code", parseInt(kode)).eq("fee_offer_status", "pending").maybeSingle();
    if (!listing) {
      await sendWa(senderJid, `❌ Tidak ada tawaran biaya pending untuk kode *${kode}*.`);
      return NextResponse.json({ ok: true, state: "approve_fee_not_found" });
    }
    const newFee = Number(listing.fee_offer);
    await supa.from("listings").update({ fee_offer_status: "approved" }).eq("id", listing.id);
    // Update payment amount
    await supa.from("payments").update({ amount: newFee }).eq("listing_id", listing.id).eq("status", "pending");
    const sellerJid = listing.seller_wa;
    if (newFee === 0) {
      // Gratis — aktifkan langsung
      const expiresAt = new Date(Date.now() + 14 * 864e5).toISOString();
      await supa.from("listings").update({ status: "active", expires_at: expiresAt, fee_offer_status: "approved" }).eq("id", listing.id);
      await supa.from("payments").update({ status: "paid" }).eq("listing_id", listing.id).eq("status", "pending");
      await sendWa(sellerJid,
        `🎉 *Admin menyetujui tawaranmu!*\n\n` +
        `📦 *${listing.title}*\n` +
        `✅ Biaya iklan digratiskan oleh admin.\n` +
        `Iklanmu langsung aktif! Selamat berjualan! 🚀`
      ).catch(() => {});
    } else {
      const qrisUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "https://www.jualbeliusupolmed.web.id"}/qris.png`;
      await sendWa(sellerJid,
        `🎉 *Admin menyetujui tawaranmu!*\n\n` +
        `📦 *${listing.title}*\n` +
        `💳 Biaya iklan baru: *Rp ${newFee.toLocaleString("id-ID")}*\n\n` +
        `Scan QRIS di bawah dan transfer nominal di atas, lalu kirim struk.`,
        qrisUrl
      ).catch(() => {});
    }
    await sendWa(senderJid, `✅ Tawaran biaya kode *${kode}* disetujui (Rp ${newFee.toLocaleString("id-ID")}). Penjual sudah diberitahu.`);
    return NextResponse.json({ ok: true, state: "approve_fee_done" });
  }

  // ── TOLAK TAWAR BIAYA [kode] [alasan] ────────────────────────────────────
  if (textMsg.startsWith("TOLAK TAWAR BIAYA ")) {
    const parts = textMsg.split(/\s+/);
    const kode = parts[3];
    const alasan = parts.slice(4).join(" ").trim();
    if (!kode) {
      await sendWa(senderJid, "❌ Format: *TOLAK TAWAR BIAYA [kode iklan] [alasan opsional]*");
      return NextResponse.json({ ok: true, state: "reject_fee_invalid" });
    }
    const { data: listing } = await supa
      .from("listings").select("id, title, seller_wa, fee_offer_status")
      .eq("listing_code", parseInt(kode)).eq("fee_offer_status", "pending").maybeSingle();
    if (!listing) {
      await sendWa(senderJid, `❌ Tidak ada tawaran biaya pending untuk kode *${kode}*.`);
      return NextResponse.json({ ok: true, state: "reject_fee_not_found" });
    }
    await supa.from("listings").update({ fee_offer: null, fee_offer_status: "rejected" }).eq("id", listing.id);
    const noteMsg = alasan ? `\n\nAlasan: _${alasan}_` : "";
    const sellerJid = listing.seller_wa;
    const { data: pmt } = await supa.from("payments").select("amount").eq("listing_id", listing.id).eq("status", "pending").maybeSingle();
    const originalFee = pmt?.amount || 0;
    await sendWa(sellerJid,
      `❌ *Tawaran biaya iklanmu tidak disetujui admin.*${noteMsg}\n\n` +
      `📦 *${listing.title}*\n` +
      `💳 Biaya iklan tetap: *Rp ${Number(originalFee).toLocaleString("id-ID")}*\n\n` +
      `Silakan transfer sesuai tagihan awal dan kirim struk.`
    ).catch(() => {});
    await sendWa(senderJid, `✅ Tawaran biaya kode *${kode}* ditolak. Penjual sudah diberitahu.`);
    return NextResponse.json({ ok: true, state: "reject_fee_done" });
  }

  return null; // bukan perintah admin yang dikenali
}
