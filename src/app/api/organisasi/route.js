import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { bentukOrganisasi, gabungDenganContoh, ORGANISASI_CONTOH } from "@/lib/organisasiDemo";

export const dynamic = "force-dynamic";


// GET /api/organisasi — Fetch direktori organisasi & UKM terverifikasi
export async function GET(req) {
  try {
    const rl = rateLimit(getClientIp(req), { limit: 60, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");
    const campus = searchParams.get("campus");
    const q = searchParams.get("q")?.toLowerCase();

    const supa = getAdminClient();

    // Query seller_profiles yang memiliki account_type 'ukm' atau is_ukm true
    const { data: dbOrgs, error } = await supa
      .from("seller_profiles")
      .select("wa, name, bio, avatar_url, campus, faculty, ukm_name, ukm_category, ukm_instagram, ukm_verified, created_at")
      .or("account_type.eq.ukm,ukm_verified.eq.true")
      .order("created_at", { ascending: false });

    let orgList = [];

    if (!error && dbOrgs && dbOrgs.length > 0) {
      orgList = dbOrgs.map(bentukOrganisasi);
    }

    // Contoh etalase ikut, tapi sebagai contoh — lihat lib/organisasiDemo.js
    let results = gabungDenganContoh(orgList);

    // Filter Kategori
    if (category && category !== "all") {
      results = results.filter((o) => o.ukm_category === category);
    }

    // Filter Kampus
    if (campus && campus !== "Semua") {
      results = results.filter((o) => o.campus === campus);
    }

    // Filter Pencarian
    if (q) {
      results = results.filter(
        (o) =>
          o.ukm_name?.toLowerCase().includes(q) ||
          o.bio?.toLowerCase().includes(q) ||
          o.faculty?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      organisasi: results,
      total: results.length,
    });
  } catch (err) {
    console.error("GET /api/organisasi error:", err);
    return NextResponse.json({ error: "Gagal memuat direktori organisasi." }, { status: 500 });
  }
}

// PATCH /api/organisasi — Update profil & susunan struktur BPH organisasi
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { wa, ukm_bio, ukm_structure, ukm_instagram } = body;

    if (!wa) {
      return NextResponse.json({ error: "Identitas organisasi (wa) diperlukan." }, { status: 400 });
    }

    const supa = getAdminClient();
    const updates = {};
    if (typeof ukm_bio === "string") {
      updates.ukm_bio = ukm_bio;
      updates.bio = ukm_bio;
    }
    if (typeof ukm_structure === "string" || typeof ukm_structure === "object") {
      updates.ukm_structure = typeof ukm_structure === "string" ? ukm_structure : JSON.stringify(ukm_structure);
    }
    if (typeof ukm_instagram === "string") {
      updates.ukm_instagram = ukm_instagram;
    }

    if (Object.keys(updates).length > 0) {
      try {
        await supa.from("seller_profiles").update(updates).eq("wa", wa);
      } catch (err) {
        // Fallback jika kolom tertentu belum ada di DB
        if (updates.bio) {
          await supa.from("seller_profiles").update({ bio: updates.bio }).eq("wa", wa);
        }
      }
    }

    return NextResponse.json({ success: true, message: "Profil organisasi berhasil diperbarui." });
  } catch (err) {
    console.error("PATCH /api/organisasi error:", err);
    return NextResponse.json({ error: "Gagal menyimpan perubahan organisasi." }, { status: 500 });
  }
}

