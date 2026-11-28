import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, rateLimitDistributed, getClientIp } from "@/lib/rateLimit";
import { getSettings, DEFAULT_SETTINGS, adFeeFrom, listingExpiresAt, hasUnpaidSoldFees } from "@/lib/settings";
import { formatWa } from "@/lib/constants";
import { postToGroup, notifyCategorySubscribers } from "@/lib/fonnte";
import { pushListingBaru } from "@/lib/webpush";
import { getDistributorSettings, calcDistributorFee, effectivePrice } from "@/lib/distributor";
import { tokoAktif, generateDefaultSlug } from "@/lib/toko";
import { getSellerSessionAsync } from "@/lib/auth";
import { autoPublishListingInstagram } from "@/lib/listingInstagram";
import { notifyKeywordSubscribers } from "@/lib/keywordSubs";
import { siteOriginFromRequest } from "@/lib/instagramQueue";
import { jawabGalat } from "@/lib/jawabGalat";
import { sanitizeListingSpecs } from "@/lib/listingSpecs";
import { checkProhibitedListing } from "@/lib/profanity";
import { moderateListing } from "@/lib/moderationRules";
import { listingInputSchema, normalizePriceInput, sanitizeListingTitle, validateElectronicsSpecs } from "@/lib/listingSchema";
import { loadMarketplaceRegion } from "@/lib/marketplaceRegion";
import { findRecentDuplicateListing } from "@/lib/listingDedupe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// GET /api/listings?seller_wa=...  -> daftar iklan milik penjual
export async function GET(req) {
  try {
  const wa = formatWa(req.nextUrl.searchParams.get("seller_wa") || "");
  if (!wa) return NextResponse.json({ listings: [] });
  // Ini adalah endpoint dashboard: ia memuat profil, daftar iklan, dan status
  // pembayaran pemilik. Nomor WA di query string bukan bukti kepemilikan;
  // sebelum 24 Agustus 2026 siapa pun dapat menggantinya dan membaca data
  // dashboard penjual lain. Identitas harus selalu berasal dari kuki sesi.
  const sessionWa = formatWa(await getSellerSessionAsync() || "");
  if (!sessionWa) {
    return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
  }
  if (sessionWa !== wa) {
    return NextResponse.json({ error: "Kamu tidak berhak melihat dashboard penjual ini." }, { status: 403 });
  }
  const supa = getAdminClient();
  // Fetch seller profile
  const { data: profile } = await supa
    .from("seller_profiles")
    .select("*")
    .eq("wa", wa)
    .maybeSingle();

  // Dipakai halaman /jual untuk memajang "GRATIS" sebelum tombol ditekan.
  // Kalau layar bilang Rp 5.000 lalu servernya menayangkan gratis, yang salah
  // bukan cuma angkanya — orangnya jadi tidak percaya pada angka berikutnya.
  const { pricing } = await getSettings().catch(() => ({ pricing: {} }));
  // AKTIF, bukan sekadar punya slug: kalau mengetik alamat toko sudah cukup
  // untuk iklan gratis, persetujuan admin tidak menjaga apa pun.
  const punyaToko = tokoAktif(profile) && pricing?.tokoGratis !== false;

  // Fetch listings
  const { data, error } = await supa
    .from("listings")
    .select("*")
    .or(`seller_wa.eq.${wa},seller_wa.eq.${sessionWa}${profile?.user_id ? `,user_id.eq.${profile.user_id}` : ""}`)
    .order("created_at", { ascending: false });
  if (error) return jawabGalat(error);

  const listings = data || [];
  if (listings.length > 0) {
    const { data: payments } = await supa
      .from("payments")
      .select("id, listing_id, midtrans_order_id, type, amount")
      .in("listing_id", listings.map((l) => l.id))
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (payments) {
      for (const listing of listings) {
        if (listing.status === "pending") {
          const latestPayment = payments.find((p) => p.listing_id === listing.id && p.type === "iklan");
          if (latestPayment) {
            listing.pending_order_id = latestPayment.midtrans_order_id;
            listing.pending_payment_id = latestPayment.id;
            listing.pending_amount = latestPayment.amount;
          }
        } else if (listing.status === "active" || listing.status === "sold") {
          const latestSoldFee = payments.find((p) => p.listing_id === listing.id && p.type === "sold_fee");
          if (latestSoldFee) {
            listing.pending_sold_fee_order_id = latestSoldFee.midtrans_order_id;
            listing.pending_sold_fee_payment_id = latestSoldFee.id;
            listing.pending_sold_fee_amount = latestSoldFee.amount;
          }
        }
      }
    }
  }

  return NextResponse.json({ punyaToko, listings, profile });
  } catch (e) {
    console.error("[GET /api/listings] error:", e);
    return jawabGalat(e);
  }
}

// POST /api/listings -> buat listing (pending) + payment + snap token
export async function POST(req) {
  try {
    const ip = getClientIp(req);
    const ipRl = await rateLimitDistributed(`listing:ip:${ip}`, { limit: 10, windowMs: 600_000 });
    if (!ipRl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan pasang iklan. Coba lagi dalam ${ipRl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();

    // Honeypot anti-spam check
    if (body.website || body.honeypot) {
      return NextResponse.json({ error: "Permintaan tidak dapat diproses." }, { status: 400 });
    }

    const {
      seller_name,
      seller_wa,
      title,
      description,
      price,
      stock,
      category,
      type,
      image_url,
      images,
      area,
      condition,
      rental_period,
      specs,
    } = body;

    const normalizedWa = formatWa(seller_wa);
    const sessionWa = await getSellerSessionAsync();

    if (!sessionWa) {
      return NextResponse.json({ error: "Sesi tidak valid atau telah berakhir. Silakan login kembali." }, { status: 401 });
    }

    const effectiveWa = normalizedWa || sessionWa;

    // 1. Validasi Zod schema bersama
    const parsedInput = listingInputSchema.safeParse(body);
    if (!parsedInput.success) {
      const firstErr = parsedInput.error.issues[0]?.message || "Data iklan tidak lengkap atau tidak valid.";
      return NextResponse.json({ error: firstErr }, { status: 400 });
    }

    if (!normalizedWa) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }

    // 2. Normalisasi harga murni & tolak format anomali ('0m', '1,3jt', '50k', '0')
    let normalizedPrice;
    try {
      normalizedPrice = normalizePriceInput(price, type, category);
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const cleanedTitle = sanitizeListingTitle(title);

    // 3. Validasi spesifikasi elektronik untuk laptop/HP
    validateElectronicsSpecs(category, cleanedTitle, specs);

    // 4. Engine Moderasi (Deterministik + Gemini AI)
    const moderation = await moderateListing({
      title: cleanedTitle,
      description,
      price: normalizedPrice,
      category,
      type,
      images,
      seller_wa: normalizedWa,
    });

    const supa = getAdminClient();

    if (moderation.status === "rejected") {
      // Simpan catatan iklan yang ditolak untuk audit (tanpa menghapus data pengguna)
      await supa.from("listings").insert({
        seller_name: seller_name || "Penjual",
        seller_wa: normalizedWa,
        title: cleanedTitle,
        description: description || "",
        price: normalizedPrice,
        category: category || "Elektronik",
        status: "rejected",
        moderation_reason: moderation.moderation_reason,
        risk_score: moderation.risk_score,
      }).catch(() => {});

      return NextResponse.json(
        {
          error: `Iklan tidak dapat ditayangkan: ${moderation.moderation_reason}`,
          status: "rejected",
        },
        { status: 422 }
      );
    }

    // Cek status distributor & profil akun yang sedang login
    const region = await loadMarketplaceRegion(supa, sessionWa);
    const profileCheck = region.profile || (await findSellerProfileBySession(
      supa,
      sessionWa,
      "wa, phone_wa, distributor, name, subscription_tier, subscription_expires_at, user_id, home_university_id, verified_university_id, affiliation_status, campus, fyp_province_id"
    ))?.data;

    let sellerUniversityId = (profileCheck?.affiliation_status === "verified_student" || profileCheck?.student_verified) && profileCheck?.verified_university_id
      ? profileCheck.verified_university_id
      : (profileCheck?.home_university_id || region.university?.id);

    let sellerProvince = region.province || profileCheck?.fyp_province_id;

    // Fallback jika profil belum memiliki kampus tapi dikirimkan lewat form (campus / home_university_id)
    if ((!sellerUniversityId || !sellerProvince) && (body.campus || body.home_university_id)) {
      const fallbackUniv = await loadUniversityProvince(supa, body.home_university_id || body.campus);
      if (fallbackUniv) {
        sellerUniversityId = sellerUniversityId || fallbackUniv.id;
        sellerProvince = sellerProvince || fallbackUniv.province_id;
      }
    }

    // Default darurat jika pengguna memiliki kampus tertera (misal USU / Polmed)
    if (!sellerUniversityId || !sellerProvince) {
      const fallbackCampus = profileCheck?.campus || body.campus || "USU";
      const fallbackUniv = await loadUniversityProvince(supa, fallbackCampus);
      if (fallbackUniv) {
        sellerUniversityId = sellerUniversityId || fallbackUniv.id;
        sellerProvince = sellerProvince || fallbackUniv.province_id;
      }
    }

    if (!sellerUniversityId || !sellerProvince) {
      return NextResponse.json({ error: "Pilih universitas acuan di profil sebelum memasang barang. Barang hanya tayang di provinsi kampusmu." }, { status: 409 });
    }

    // Auto-heal profil di database jika home_university_id / fyp_province_id masih kosong
    if (profileCheck && (!profileCheck.home_university_id || !profileCheck.fyp_province_id)) {
      try {
        const query = supa.from("seller_profiles");
        if (typeof query?.update === "function") {
          query.update({
            home_university_id: profileCheck.home_university_id || sellerUniversityId,
            fyp_province_id: profileCheck.fyp_province_id || sellerProvince,
            campus: profileCheck.campus || region.university?.code || body.campus || "USU",
          }).eq("wa", profileCheck.wa || sessionWa).then?.(() => {}).catch?.(() => {});
        }
      } catch {}
    }
    const isDistributor = !!profileCheck?.distributor;

    // Check if seller has unpaid sold fees (Account locked - Cara 2)
    const locked = await hasUnpaidSoldFees(supa, sessionWa) || (effectiveWa !== sessionWa && await hasUnpaidSoldFees(supa, effectiveWa));
    if (locked) {
      return NextResponse.json(
        { error: "Akun Anda terkunci karena memiliki tagihan komisi (Sold Fee) yang belum dibayar. Silakan lunasi tagihan tersebut di Dashboard." },
        { status: 403 }
      );
    }

    // cek blacklist — bandingkan nomor akun dan nomor kontak
    let bl = null;
    const { data: blSession } = await supa
      .from("blacklist")
      .select("id")
      .eq("wa", sessionWa)
      .maybeSingle();
    bl = blSession;
    if (!bl && effectiveWa !== sessionWa) {
      const { data: blEffective } = await supa
        .from("blacklist")
        .select("id")
        .eq("wa", effectiveWa)
        .maybeSingle();
      bl = blEffective;
    }
    if (bl) {
      return NextResponse.json(
        { error: "Nomor ini diblokir admin." },
        { status: 403 }
      );
    }

    // Enforce name from seller_profiles
    let profile = profileCheck;
    if (!profile) {
      const defaultSlug = generateDefaultSlug(seller_name, sessionWa);
      let { error: profErr } = await supa.from("seller_profiles").upsert(
        { wa: sessionWa, name: seller_name, slug: defaultSlug },
        { onConflict: "wa", ignoreDuplicates: true }
      );
      if (profErr) {
        const uniqueSlug = `user-${sessionWa.replace(/\D/g, "").slice(-4)}-${Math.random().toString(36).slice(2, 6)}`;
        await supa.from("seller_profiles").upsert(
          { wa: sessionWa, name: seller_name, slug: uniqueSlug },
          { onConflict: "wa", ignoreDuplicates: true }
        );
      }
      const { data: refreshedProfile } = await supa
        .from("seller_profiles")
        .select("distributor, name, subscription_tier, subscription_expires_at, slug, user_id, home_university_id, verified_university_id, affiliation_status, campus")
        .eq("wa", sessionWa)
        .maybeSingle();
      profile = refreshedProfile;
    }
    const enforcedName = profile?.name || seller_name;
    const isPro = profile?.subscription_tier === "pro" && new Date(profile?.subscription_expires_at) > new Date();

    // Batas iklan aktif+pending untuk non-PRO (distributor tidak dibatasi seperti PRO)
    // Penjual bertoko sengaja TIDAK ikut dibatasi 15 iklan: kalau iklannya
    // gratis tapi tokonya cuma boleh berisi 15 barang, yang dijanjikan dan yang
    // diberikan tidak sama. Batasnya tetap berlaku untuk yang tidak punya toko.
    const profilPunyaToko = tokoAktif(profileCheck);
    if (!isPro && !isDistributor && !profilPunyaToko) {
      const { count: activeCount } = await supa
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("seller_wa", normalizedWa)
        .in("status", ["active", "pending"]);
      if ((activeCount || 0) >= 15) {
        return NextResponse.json(
          { error: "Anda sudah memiliki 15 iklan aktif. Upgrade ke Paket Pro untuk iklan tak terbatas!" },
          { status: 403 }
        );
      }
    }

    // Tarif harus berhasil dibaca eksplisit. getSettings() memang fail-safe untuk
    // tampilan, tetapi fallback diam-diam ke mode gratis tidak aman saat membuat iklan.
    const { data: pricingRow, error: pricingError } = await supa
      .from("settings")
      .select("value")
      .eq("key", "pricing")
      .maybeSingle();
    if (pricingError) {
      return NextResponse.json({ error: "Pengaturan biaya iklan belum dapat diperiksa. Coba lagi nanti." }, { status: 503 });
    }
    
    // Ambil settings dengan fallback yang robust
    let settings;
    try {
      settings = await getSettings();
    } catch {
      settings = { pricing: DEFAULT_SETTINGS.pricing };
    }
    settings.pricing = { ...DEFAULT_SETTINGS.pricing, ...(pricingRow?.value || {}) };
    const distSettings = isDistributor ? await getDistributorSettings(supa).catch(() => null) : null;
    const isJasa = type === "jasa";
    let isJasaFree = false;

    if (isJasa) {
      // Cek apakah dia pernah posting jasa sebelumnya
      const { count, error: countError } = await supa
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_wa", normalizedWa)
        .eq("type", "jasa");
      
      if (!countError && count === 0) {
        isJasaFree = true;
      }
    }

    // Punya toko = tidak bayar biaya tayang.
    //
    // Sebelum ini yang gratis cuma HALAMAN tokonya; tiap barang di dalamnya
    // tetap ditagih satu per satu, sehingga toko yang isinya paling banyak
    // justru paling mahal — kebalikan dari yang seharusnya didorong.
    // Sakelarnya `pricing.tokoGratis` (bawaan: nyala).
    const punyaToko = tokoAktif(profile) && settings.pricing?.tokoGratis !== false;

    let days = Math.max(1, Number(settings.pricing?.listingDays) || 14);
    if (isJasaFree) days = 7;
    else if (isJasa || type === "poster") days = 30; // Jasa berbayar dan poster dapat 30 hari

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    
    // Pasar Bebas: cek apakah iklan gratis
    const amount = adFeeFrom(settings.pricing, type, normalizedPrice);
    const isFreeMode = amount === 0 || settings.pricing?.freeMode !== false;
    const requiresPayment = !isFreeMode && amount > 0 && !isPro && !isJasaFree && !punyaToko;

    // Iklan langsung AKTIF seketika tanpa perlu persetujuan manual admin.
    // Hanya berstatus pending bila ada biaya tayang QRIS yang menunggu dibayar.
    // Barang terlarang sudah otomatis ditolak di atas (status: rejected, HTTP 422).
    const initialStatus = requiresPayment ? "pending" : "active";
    const modReason = requiresPayment
      ? "Menunggu pembayaran biaya tayang."
      : "Lolos moderasi otomatis & langsung aktif";
    const safeSpecs = sanitizeListingSpecs(category || "Elektronik", specs);

    // Hitung fee bagi hasil untuk distributor
    let distributorFee = 0;
    let finalPrice = Math.round(Number(normalizedPrice)) || 0;
    if (isDistributor && distSettings) {
      distributorFee = calcDistributorFee(finalPrice, distSettings.rules);
      finalPrice = effectivePrice(finalPrice, distributorFee, distSettings.autoAddPrice);
    }

    // Penjual tidak memilih kampus tujuan. Wilayah listing selalu mengikuti
    // universitas kanonikal akun; pembeli satu provinsi dapat menemukannya.
    // Gunakan fallback yang lebih robust untuk universitas/provinsi
    const resolvedCampus = region.university?.code || profileCheck?.campus || body.campus || "USU";
    const resolvedUniversityId = sellerUniversityId || region.university?.id || "usu";
    const resolvedProvinceId = sellerProvince || region.province || "sumatera-utara";

    const insertPayload = {
      user_id: profileCheck?.user_id || null,
      university_id: resolvedUniversityId,
      seller_university_id: resolvedUniversityId,
      seller_province_id: resolvedProvinceId,
      seller_name: enforcedName,
      seller_wa: effectiveWa,
      title: cleanedTitle,
      description: description || "",
      price: finalPrice,
      distributor_fee: distributorFee || null,
      stock: Math.max(1, Number(stock) || 1),
      category: category || "Elektronik",
      type: ["poster", "jasa", "sewa"].includes(type) ? type : "barang",
      rental_period: type === "sewa" ? (rental_period || "harian") : null,
      image_url: image_url || null,
      images: Array.isArray(images) ? images : [],
      status: initialStatus,
      moderation_reason: modReason,
      risk_score: moderation.risk_score || 0.0,
      campus: resolvedCampus,
      area: (area && area.trim()) || (resolvedCampus ? `Sekitar Kampus ${resolvedCampus}` : "Sekitar Kampus"),
      condition: condition === "new" ? "new" : "used",
      specs: safeSpecs,
      bumped_at: new Date().toISOString(),
      expires_at: expiresAt, // FIXED: from settings.pricing.listingDays
    };

    // Idempotency / anti-duplikat: jika penjual baru saja membuat iklan dengan judul & harga
    // yang sama dalam 30 menit terakhir (mis. double-click, retry jaringan, atau refresh),
    // kembalikan iklan yang sudah ada alih-alih membuat baris duplikat baru.
    const recentDuplicate = await findRecentDuplicateListing(supa, {
      sellerWa: effectiveWa,
      title: cleanedTitle,
      price: finalPrice,
      windowMinutes: 30,
    });

    if (recentDuplicate) {
      if (recentDuplicate.status === "pending" && requiresPayment) {
        const { data: existingPayment } = await supa
          .from("payments")
          .select("midtrans_order_id, amount")
          .eq("listing_id", recentDuplicate.id)
          .eq("type", "iklan")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle()
          .catch(() => ({ data: null }));
        if (existingPayment) {
          return NextResponse.json({
            listing: recentDuplicate,
            paymentUrl: "/qris.png",
            orderId: existingPayment.midtrans_order_id,
            amount: existingPayment.amount,
            isFreeMode: false,
            deduplicated: true,
          });
        }
      }
      return NextResponse.json({
        listing: recentDuplicate,
        paymentUrl: null,
        isPro,
        isJasaFree,
        isDistributor,
        punyaToko,
        isFreeMode: recentDuplicate.status === "active",
        deduplicated: true,
      });
    }

    let { data: listing, error } = await supa
      .from("listings")
      .insert(insertPayload)
      .select()
      .single();

    // Fallback otomatis jika kolom opsional (moderasi / images) belum ada di skema database produksi (PGRST204)
    if (error && (error.code === "PGRST204" || String(error.message || "").includes("column"))) {
      console.warn("[POST /api/listings] Kolom belum ada di skema database, fallback insert tanpa field opsional:", error.message);
      const errMsg = String(error.message || "");
      if (errMsg.includes("moderation_reason") || !errMsg.includes("images")) {
        delete insertPayload.moderation_reason;
        delete insertPayload.risk_score;
      }
      if (errMsg.includes("images")) {
        delete insertPayload.images;
      }
      const retry = await supa
        .from("listings")
        .insert(insertPayload)
        .select()
        .single();
      listing = retry.data;
      error = retry.error;
    }

    if (error) throw new Error(error.message);

    if (requiresPayment) {
      const orderId = `IKLAN-${listing.id.slice(0, 8)}-${Date.now()}`;
      const { error: paymentError } = await supa.from("payments").insert({
        listing_id: listing.id,
        type: "iklan",
        amount,
        status: "pending",
        midtrans_order_id: orderId,
        meta: { source: "web", moderation_status: moderation.status },
      });
      if (paymentError) {
        console.error("[POST /api/listings] Payment record creation failed:", paymentError.code || "database_error");
        await supa.from("listings").delete().eq("id", listing.id).catch(() => {});
        return NextResponse.json({ error: "Tagihan belum dapat dibuat. Coba kirim iklan lagi nanti." }, { status: 503 });
      }

      const paymentUrl = "/qris.png";
      return NextResponse.json({
        listing,
        paymentUrl,
        orderId,
        amount,
        isFreeMode: false,
      });
    }

    // HANYA disebarkan ke grup WA & notifikasi jika sudah AKTIF (approved)
    if (initialStatus === "active") {
      const origin = siteOriginFromRequest(req);
      // Background notifications (non-blocking) sesuai pola Background Jobs backend-patterns
      void (async () => {
        try {
          await postToGroup(listing);
        } catch (err) {
          console.error("Fonnte postToGroup error:", err?.message);
        }
        notifyCategorySubscribers(supa, listing).catch(() => {});
        notifyKeywordSubscribers(supa, listing).catch(() => {});
        pushListingBaru(supa, listing).catch(() => {});
        autoPublishListingInstagram({
          origin,
          listingId: listing.id,
          timeoutMs: 0,
        }).catch((err) => console.error("[POST /api/listings] IG publish error:", err?.message));
      })();

      return NextResponse.json({
        listing,
        paymentUrl: null,
        isPro,
        isJasaFree,
        isDistributor,
        punyaToko,
        isFreeMode: true,
      });
    }

    // Response jika berstatus pending (antrean peninjauan moderasi kampus)
    return NextResponse.json({
      listing,
      pending_review: true,
      message: "Iklan berhasil dikirim dan masuk antrean peninjauan moderator kampus sebelum tayang dan disebarkan ke WhatsApp.",
      isFreeMode: true,
    });
  } catch (e) {
    // Specific error handling for common failures
    const msg = e?.message || String(e);
    
    if (msg.includes("moderation") || msg.includes("terlarang") || msg.includes("prohibited")) {
      return NextResponse.json({ error: "Iklan tidak lolos moderasi: " + msg }, { status: 422 });
    }
    if (msg.includes("universitas") || msg.includes("kampus") || msg.includes("provinsi") || msg.includes("region")) {
      return NextResponse.json({ error: "Pilih kampus di Profil terlebih dahulu sebelum memasang iklan." }, { status: 409 });
    }
    if (msg.includes("session") || msg.includes("auth") || msg.includes("unauthorized")) {
      return NextResponse.json({ error: "Sesi berakhir. Silakan login kembali." }, { status: 401 });
    }
    if (msg.includes("R2") || msg.includes("Cloudflare") || msg.includes("S3") || msg.includes("storage") || msg.includes("upload")) {
      return NextResponse.json({ error: "Upload foto gagal. Coba kompres foto atau coba lagi nanti." }, { status: 500 });
    }
    if (msg.includes("settings") || msg.includes("pricing") || msg.includes("biaya")) {
      return NextResponse.json({ error: "Sistem biaya iklan sedang diperbarui. Coba lagi sebentar." }, { status: 503 });
    }
    if (msg.includes("payment") || msg.includes("midtrans") || msg.includes("QRIS")) {
      return NextResponse.json({ error: "Sistem pembayaran bermasalah. Coba lagi nanti." }, { status: 503 });
    }
    if (msg.includes("supabase") || msg.includes("Supabase") || msg.includes("database") || msg.includes("PGRST")) {
      return NextResponse.json({ error: "Koneksi database bermasalah. Coba lagi dalam beberapa saat." }, { status: 503 });
    }
    
    console.error("[POST /api/listings] Unhandled error:", e?.stack || msg);
    return NextResponse.json({ error: "Terjadi kesalahan tidak terduga. Coba lagi atau hubungi bantuan." }, { status: 500 });
  }
}
