import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { formatWa } from "@/lib/constants";
import { getSellerSession, isAdmin } from "@/lib/auth";
import { postWantedToGroup } from "@/lib/fonnte";

export const dynamic = "force-dynamic";

// GET /api/wanted -> list all wanted listings
// OR GET /api/wanted?buyer_wa=... -> for dashboard
export async function GET(req) {
  try {
    const sp = req.nextUrl.searchParams;
    const buyer_wa = sp.get("buyer_wa");
    const campus = sp.get("campus");
    const cat = sp.get("cat");
    const q = sp.get("q");

    const supa = getAdminClient();

    if (buyer_wa) {
      const normalizedWa = formatWa(buyer_wa);
      const { data, error } = await supa
        .from("wanted_listings")
        .select("*")
        .eq("buyer_wa", normalizedWa)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return NextResponse.json({ listings: data || [] });
    }

    // List active/resolved wanted from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    let query = supa
      .from("wanted_listings")
      .select("*")
      .in("status", ["active", "resolved"])
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (campus && campus !== "Semua") {
      query = query.eq("campus", campus);
    }
    if (cat && cat !== "all") {
      query = query.eq("category", cat);
    }
    if (q) {
      // Sanitasi karakter khusus PostgREST agar tidak bisa memanipulasi filter
      const safeQ = q.replace(/[%_,()]/g, " ").trim().slice(0, 100);
      if (safeQ) {
        query = query.or(`title.ilike.%${safeQ}%,description.ilike.%${safeQ}%`);
      }
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return NextResponse.json({ listings: data || [] });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { createPaymentLink } from "@/lib/ipaymu";

// POST /api/wanted -> create a wanted listing
export async function POST(req) {
  try {
    const rl = rateLimit(`wanted:${getClientIp(req)}`, { limit: 8, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { buyer_name, buyer_wa, title, description, budget, category, campus, area } = body;

    if (!buyer_name || !buyer_wa || !title || !category) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    const normalizedBuyerWa = formatWa(buyer_wa);
    if (!normalizedBuyerWa) {
      return NextResponse.json({ error: "Nomor WA tidak valid" }, { status: 400 });
    }

    const sessionWa = getSellerSession();
    if (!isAdmin() && sessionWa !== normalizedBuyerWa) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supa = getAdminClient();

    // Cek blacklist — normalized
    const { data: bl } = await supa
      .from("blacklist")
      .select("id")
      .eq("wa", normalizedBuyerWa)
      .maybeSingle();
    if (bl) {
      return NextResponse.json(
        { error: "Nomor WA ini diblokir admin." },
        { status: 403 }
      );
    }

    const { data: listing, error } = await supa
      .from("wanted_listings")
      .insert({
        buyer_name,
        buyer_wa: normalizedBuyerWa,
        title,
        description: description || "",
        budget: Math.round(Number(budget)) || 0,
        category,
        campus: campus || "Semua",
        area: area || "Sekitar Kampus",
        status: "pending",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Buat tagihan iPaymu Rp 1.000 untuk postingan Cari Barang
    const amount = 1000;
    const orderId = `WNT-${listing.id.slice(0, 8)}-${Date.now()}`;

    await supa.from("payments").insert({
      listing_id: null, // wanted listing tidak masuk ke listings foreign key
      type: "iklan", // bypass check constraint
      amount,
      status: "pending",
      midtrans_order_id: orderId,
      meta: { wanted_id: listing.id }
    });

    let paymentUrl = null;
    try {
      const tx = await createPaymentLink({
        orderId,
        amount,
        customerName: listing.buyer_name,
        customerWa: listing.buyer_wa,
        itemName: `Cari Barang: ${listing.title}`,
      });
      paymentUrl = tx.url;
    } catch (e) {
      console.error("wanted payment charge:", e?.message);
    }

    return NextResponse.json({ listing, paymentUrl });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
