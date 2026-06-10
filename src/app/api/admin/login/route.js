import { NextResponse } from "next/server";
import { checkPassword, setAdminCookie, clearAdminCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req) {
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
