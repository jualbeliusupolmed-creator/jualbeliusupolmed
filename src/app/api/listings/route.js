import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createQrisTransaction } from "@/lib/midtrans";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getSettings, adFeeFrom, listingExpiresAt, hasUnpaidSoldFees } from "@/lib/settings";
import { formatWa } from "@/lib/constants";
import { postToGroup, notifyCategorySubscribers } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// GET /api/listings?seller_wa=...  -> daftar iklan milik penjual
export async function GET(req) {
  const wa = formatWa(req.nextUrl.searchParams.get("seller_wa") || "");
  if (!wa) return NextResponse.json({ listings: [] });
  const supa = getAdminClient();
  // Fetch seller profile
  const { data: profile } = await supa
    .from("seller_profiles")
    .select("*")
    .eq("wa", wa)
    .maybeSingle();

  // Fetch listings
  const { data, error } = await supa
    .from("listings")
    .select("*")
    .eq("seller_wa", wa)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

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
        } else if (listing.status === "active") {
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

  return NextResponse.json({ listings, profile });
}

// POST /api/listings -> buat listing (pending) + payment + snap token
export async function POST(req) {
  try {
    const rl = rateLimit(`listing:${getClientIp(req)}`, { limit: 8, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
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
      campus,
      area,
      condition,
    } = body;

    if (!seller_name || !seller_wa || !title || price == null) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const normalizedWa = formatWa(seller_wa);
    if (!normalizedWa) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }

    const supa = getAdminClient();

    // Check if seller has unpaid sold fees (Account locked - Cara 2)
    const locked = await hasUnpaidSoldFees(supa, normalizedWa);
    if (locked) {
      return NextResponse.json(
        { error: "Akun Anda terkunci karena memiliki tagihan komisi (Sold Fee) yang belum dibayar. Silakan lunasi tagihan tersebut di Dashboard." },
        { status: 403 }
      );
    }

    // cek blacklist — bandingkan dalam format normalized
    const { data: bl } = await supa
      .from("blacklist")
      .select("id")
      .eq("wa", normalizedWa)
      .maybeSingle();
    if (bl) {
      return NextResponse.json(
        { error: "Nomor WA ini diblokir admin." },
        { status: 403 }
      );
    }

    // Enforce name from seller_profiles
    // 1. Coba masukkan ke seller_profiles. Jika sudah ada (konflik WA), abaikan namanya (DO NOTHING).
    await supa.from("seller_profiles").upsert(
      { wa: normalizedWa, name: seller_name },
      { onConflict: "wa", ignoreDuplicates: true }
    );
    // 2. Ambil nama paten dan status pro dari seller_profiles
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("name, subscription_tier, subscription_expires_at")
      .eq("wa", normalizedWa)
      .maybeSingle();

    const enforcedName = profile?.name || seller_name;
    const isPro = profile?.subscription_tier === "pro" && new Date(profile?.subscription_expires_at) > new Date();

    // Batas iklan aktif+pending untuk non-PRO
    if (!isPro) {
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

    // FIXED: Fetch settings BEFORE insert so expires_at uses configurable listingDays
    const settings = await getSettings();
    const isJasa = type === "jasa";
    let isJasaFree = false;

    if (isJasa) {
      // Cek apakah dia pernah posting jasa sebelumnya
      const { count } = await supa
        .from("listings")
        .select("*", { count: "exact", head: true })
        .eq("seller_wa", normalizedWa)
        .eq("type", "jasa");
      
      if (count === 0) {
        isJasaFree = true;
      }
    }

    let days = Math.max(1, Number(settings.pricing?.listingDays) || 14);
    if (isJasaFree) days = 7;
    else if (isJasa || type === "poster") days = 30; // Jasa berbayar dan poster dapat 30 hari

    const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const initialStatus = (isPro || isJasaFree) ? "active" : "pending";

    const { data: listing, error } = await supa
      .from("listings")
      .insert({
        seller_name: enforcedName,
        seller_wa: normalizedWa,
        title,
        description: description || "",
        price: Math.round(Number(price)) || 0,
        stock: Math.max(1, Number(stock) || 1),
        category: category || "Elektronik",
        type: type === "poster" ? "poster" : (type === "jasa" ? "jasa" : "barang"),
        image_url: image_url || null,
        status: initialStatus,
        campus: campus || "Semua",
        area: area || "Sekitar Kampus",
        condition: (type === "barang" && condition) ? condition : "used",
        bumped_at: new Date().toISOString(),
        expires_at: expiresAt, // FIXED: from settings.pricing.listingDays
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Simpan galeri (kolom `images`) — non-fatal jika migration belum dijalankan.
    if (Array.isArray(images) && images.length) {
      await supa.from("listings").update({ images }).eq("id", listing.id);
    }

    if (isPro || isJasaFree) {
      // Kirim notifikasi WA (berjalan di background tanpa await jika tidak mutlak diperlukan, tapi baiknya await)
      try {
        await postToGroup(listing);
        notifyCategorySubscribers(supa, listing).catch(() => {});
      } catch (err) {
        console.error("Fonnte postToGroup error:", err?.message);
      }
      return NextResponse.json({ listing, paymentUrl: null, isPro, isJasaFree });
    }

    const amount = adFeeFrom(settings.pricing, listing.type, listing.price);
    const orderId = `IKLAN-${listing.id.slice(0, 8)}-${Date.now()}`;

    await supa.from("payments").insert({
      listing_id: listing.id,
      type: "iklan",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
    });

    let paymentUrl = null;
    try {
      const tx = await createQrisTransaction({
        orderId,
        amount,
        customerName: seller_name,
        customerWa: normalizedWa,
        itemName: `Pasang Iklan: ${title}`,
      });
      paymentUrl = tx.redirect_url;
    } catch (e) {
      console.error("doku charge error:", e?.message);
    }

    return NextResponse.json({ listing, paymentUrl, orderId, amount });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
