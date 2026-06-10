import { NextResponse } from "next/server";
import { checkPassword, setAdminCookie, clearAdminCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  // Rate-limit: maks 5 percobaan per menit per IP
  const rl = rateLimit(`admin-login:${getClientIp(req)}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfter} detik.` },
      { status: 429 }
    );
  }

  const { password } = await req.json();
  if (!checkPassword(password)) {
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }
  setAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  clearAdminCookie();
  return NextResponse.json({ ok: true });
}
