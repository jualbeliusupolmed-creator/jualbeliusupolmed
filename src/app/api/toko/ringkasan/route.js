import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession } from "@/lib/auth";
import { statusToko } from "@/lib/toko";

export const dynamic = "force-dynamic";

/*
 * GET /api/toko/ringkasan — semua yang dibutuhkan halaman "Toko saya" dalam
 * satu panggilan: profil toko, statusnya, angka-angkanya, dan daftar barangnya.
 *
 * Satu panggilan, bukan empat, karena halaman ini dibuka di ponsel dengan
 * jaringan kampus: empat permintaan berurutan berarti empat kesempatan untuk
 * menggantung, dan layar yang setengah terisi lebih membingungkan daripada
 * layar yang masih memuat.
 *
 * Sumbernya sesi penjual (kuki), bukan nomor dari peramban — endpoint yang
 * menerima nomor sebagai parameter akan selalu menggoda seseorang mencoba nomor
 * orang lain.
 */
export async function GET() {
  const wa = getSellerSession();
  if (!wa) return NextResponse.json({ error: "Belum masuk" }, { status: 401 });

  const supa = getAdminClient();

  const { data: profil } = await supa
    .from("seller_profiles")
    .select("*")
    .eq("wa", wa)
    .maybeSingle();

  const { data: produk } = await supa
    .from("listings")
    .select("id, title, price, status, views, image_url, category, type, stock, created_at, expires_at, featured, rental_period, condition")
    .eq("seller_wa", wa)
    .order("created_at", { ascending: false })
    .limit(300);

  const { data: ulasan } = await supa
    .from("seller_ratings")
    .select("rating, comment, buyer_name, created_at")
    .eq("seller_wa", wa)
    .order("created_at", { ascending: false })
    .limit(20);

  const daftar = produk || [];
  const nilai = ulasan || [];

  return NextResponse.json({
    toko: profil || { wa, name: "", slug: null },
    status: statusToko(profil),
    statistik: {
      aktif: daftar.filter((l) => l.status === "active").length,
      pending: daftar.filter((l) => l.status === "pending").length,
      terjual: daftar.filter((l) => l.status === "sold").length,
      total: daftar.length,
      views: daftar.reduce((t, l) => t + (l.views || 0), 0),
      ulasan: nilai.length,
      rata: nilai.length ? nilai.reduce((t, u) => t + (u.rating || 0), 0) / nilai.length : 0,
    },
    produk: daftar,
    ulasan: nilai.slice(0, 5),
  });
}
