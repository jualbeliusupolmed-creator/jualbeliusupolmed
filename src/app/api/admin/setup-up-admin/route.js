import { NextResponse } from "next/server";
import { getSellerSession } from "@/lib/auth";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// GET /api/admin/setup-up-admin
// Endpoint sekali pakai untuk memperbaiki data akun UP Admin yang sedang login.
// Hanya bisa diakses jika session cookie valid.
export async function GET() {
  try {
    const wa = getSellerSession();
    if (!wa) {
      return NextResponse.json({ error: "Tidak ada sesi aktif. Login dulu." }, { status: 401 });
    }

    const supa = getAdminClient();

    // Patch profil yang sedang login agar menjadi akun UKM Admin
    const { error } = await supa
      .from("seller_profiles")
      .update({
        name: "UP Admin",
        ukm_name: "UP — USU POLMED UPDATE",
        account_type: "ukm",
        ukm_verified: true,
        ukm_category: "Platform",
        campus: "USU & POLMED",
        ukm_instagram: "@usupolmedupdate",
        bio: "Platform resmi komunitas jual beli, mading, dan kegiatan mahasiswa USU & POLMED.",
        auth_provider: "email",
      })
      .eq("wa", wa);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      wa,
      message: "Profil UP Admin berhasil diperbarui! Silakan refresh halaman dashboard.",
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
