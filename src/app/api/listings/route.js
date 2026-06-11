import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { createSnapTransaction } from "@/lib/midtrans";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getSettings, adFeeFrom } from "@/lib/settings";
import { formatWa } from "@/lib/constants";

export const dynamic = "force-dynamic";

// GET /api/listings?seller_wa=...  -> daftar iklan milik penjual
export async function GET(req) {
  const wa = formatWa(req.nextUrl.searchParams.get("seller_wa") || "");
  if (!wa) return NextResponse.json({ listings: [] });
  const supa = getAdminClient();
  // Support kedua format: cari yang match normalized
  const { data, error } = await supa
    .from("listings")
    .select("*")
    .eq("seller_wa", wa)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ listings: data || [] });
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

    const { data: listing, error } = await supa
      .from("listings")
      .insert({
        seller_name,
        seller_wa: normalizedWa,
        title,
        description: description || "",
        price: Math.round(Number(price)) || 0,
        stock: Math.max(1, Number(stock) || 1),
        category: category || "Elektronik",
        type: type === "poster" ? "poster" : "barang",
        image_url: image_url || null,
        status: "pending",
        campus: campus || "Semua",
        area: area || "Sekitar Kampus",
        bumped_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 14 * 864e5).toISOString(),
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    // Simpan galeri (kolom `images`) — non-fatal jika migration belum dijalankan.
    if (Array.isArray(images) && images.length) {
      await supa.from("listings").update({ images }).eq("id", listing.id);
    }

    const settings = await getSettings();
    const amount = adFeeFrom(settings.pricing, listing.type);
    const orderId = `IKLAN-${listing.id.slice(0, 8)}-${Date.now()}`;

    await supa.from("payments").insert({
      listing_id: listing.id,
      type: "iklan",
      amount,
      status: "pending",
      midtrans_order_id: orderId,
    });

    let snapToken = null;
    try {
      const tx = await createSnapTransaction({
        orderId,
        amount,
        customerName: seller_name,
        customerWa: seller_wa,
        itemName: `Iklan: ${title}`,
      });
      snapToken = tx.token;
    } catch (e) {
      console.error("midtrans charge:", e?.message);
    }

    return NextResponse.json({ listing, snapToken, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
