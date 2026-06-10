import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

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
      const { data, error } = await supa
        .from("wanted_listings")
        .select("*")
        .eq("buyer_wa", buyer_wa)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return NextResponse.json({ listings: data || [] });
    }

    // List active wanted
    let query = supa
      .from("wanted_listings")
      .select("*")
      .eq("status", "active")
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

    const supa = getAdminClient();

    // Cek blacklist
    const { data: bl } = await supa
      .from("blacklist")
      .select("id")
      .eq("wa", buyer_wa)
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
        buyer_wa,
        title,
        description: description || "",
        budget: Math.round(Number(budget)) || 0,
        category,
        campus: campus || "Semua",
        area: area || "Sekitar Kampus",
        status: "active",
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return NextResponse.json({ listing });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
