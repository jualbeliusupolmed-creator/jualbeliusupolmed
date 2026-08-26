import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/setup/ukm-admin
// Upsert profil akun yang sedang login menjadi UKM Admin.
export async function GET() {
  try {
    const wa = getSellerSession();
    if (!wa) {
      return NextResponse.json({ error: "Tidak ada sesi aktif. Login dulu." }, { status: 401 });
    }

    const supa = getAdminClient();

    // UPSERT: insert jika belum ada, update jika sudah ada
    const { error } = await supa
      .from("seller_profiles")
      .upsert({
        wa,
        name: "UP Admin",
        ukm_name: "UP — USU POLMED UPDATE",
        account_type: "ukm",
        ukm_verified: true,
        ukm_category: "Platform",
        campus: "USU & POLMED",
        ukm_instagram: "@usupolmedupdate",
        bio: "Platform resmi komunitas jual beli, mading, dan kegiatan mahasiswa USU & POLMED.",
        auth_provider: "email",
      }, { onConflict: "wa" });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Verifikasi hasil
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("wa, name, account_type, ukm_verified, ukm_name")
      .eq("wa", wa)
      .maybeSingle();

    return NextResponse.json({
      success: true,
      wa,
      profile,
      message: "✅ Profil UP Admin berhasil diperbarui! Silakan refresh halaman dashboard.",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
