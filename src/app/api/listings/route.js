import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createPaymentLink } from "@/lib/ipaymu";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getSettings, adFeeFrom, listingExpiresAt } from "@/lib/settings";
import { formatWa } from "@/lib/constants";

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
  return NextResponse.json({ listings: data || [], profile });
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
    } = body;

    if (!seller_name || !seller_wa || !title || price == null) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Normalisasi seller_wa → format 628... sebelum simpan
    const normalizedWa = formatWa(seller_wa);
    if (!normalizedWa) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }

    const supa = getAdminClient();

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

    // FIXED: Fetch settings BEFORE insert so expires_at uses configurable listingDays
    const settings = await getSettings();
    const expiresAt = listingExpiresAt(settings.pricing);
    const initialStatus = isPro ? "active" : "pending";

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
        type: type === "poster" ? "poster" : "barang",
        image_url: image_url || null,
        status: initialStatus,
        campus: campus || "Semua",
        area: area || "Sekitar Kampus",
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

    if (isPro) {
      return NextResponse.json({ listing, paymentUrl: null, isPro: true });
    }

    const amount = adFeeFrom(settings.pricing, listing.type);
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
      const tx = await createPaymentLink({
        orderId,
        amount,
        customerName: seller_name,
        customerWa: normalizedWa,
        itemName: `Iklan: ${title}`,
      });
      paymentUrl = tx.url;
    } catch (e) {
      console.error("ipaymu charge error:", e?.message);
    }

    return NextResponse.json({ listing, paymentUrl, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
