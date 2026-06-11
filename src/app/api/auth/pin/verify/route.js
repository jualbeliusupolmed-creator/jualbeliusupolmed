import { NextResponse } from "next/server";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { formatWa } from "@/lib/constants";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { setSellerCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const rl = rateLimit(`pin_verify:${getClientIp(req)}`, { limit: 10, windowMs: 60_000 });
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Terlalu banyak permintaan. Coba lagi dalam ${rl.retryAfter} detik.` },
        { status: 429 }
      );
    }

    const { wa, pin } = await req.json();
    const normalizedWa = formatWa(wa);
    
    if (!normalizedWa || !pin) {
      return NextResponse.json({ error: "Data tidak lengkap" }, { status: 400 });
    }

    // Backdoor akun testing
    if (normalizedWa === "6281234567890" && pin === "123456") {
      setSellerCookie(normalizedWa);
      return NextResponse.json({ success: true, message: "Login berhasil (Test Account)!" });
    }

    const supa = getAdminClient();
    const { data: profile } = await supa
      .from("seller_profiles")
      .select("wa, pin")
      .eq("wa", normalizedWa)
      .single();

    if (!profile || profile.pin !== pin) {
      return NextResponse.json({ error: "PIN salah." }, { status: 400 });
    }

    setSellerCookie(normalizedWa);

    return NextResponse.json({ success: true, message: "Login berhasil!" });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
