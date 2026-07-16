import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Proxy khusus admin untuk "hash-mode" panel Kontrol Chat: menyuntik pesan ke
// webhook seolah dari pelanggan (memicu flow bot) TANPA pernah menaruh token bot
// di browser. Sebelumnya TabChat.jsx memanggil /api/wa/baileys langsung dengan
// token hardcoded — token itu ikut ter-bundle & terbaca publik. Di sini token
// tetap di server dan endpoint dijaga isAdmin().
export async function POST(req) {
  if (!isAdmin()) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { jid, message } = await req.json().catch(() => ({}));
  const text = String(message || "").trim();
  if (!jid || !text) {
    return NextResponse.json({ error: "jid & message wajib" }, { status: 400 });
  }
  // Hanya izinkan hash-mode (memang tujuan fitur ini). Tanpa '#', gunakan tombol
  // kirim manual biasa.
  if (!text.startsWith("#")) {
    return NextResponse.json({ error: "Hanya untuk perintah diawali '#'" }, { status: 400 });
  }

  const token = (process.env.BAILEYS_API_TOKEN || "jualbeliusu_rahasia").replace(/[​-‍﻿]/g, "").trim();

  const fd = new FormData();
  fd.append("sender", String(jid));
  fd.append("message", text);
  fd.append("fromMe", "true");

  try {
    const res = await fetch(`${req.nextUrl.origin}/api/wa/baileys`, {
      method: "POST",
      headers: { Authorization: token },
      body: fd,
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
