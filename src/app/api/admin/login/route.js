import { NextResponse } from "next/server";
import { checkPassword, setAdminCookie, clearAdminCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/** Catat percobaan login admin ke tabel audit (non-fatal). */
async function catatLoginAudit(ip, berhasil, catatan = "") {
  try {
    const supa = getAdminClient();
    await supa.from("admin_logs").insert({
      action: berhasil ? "admin_login_success" : "admin_login_failed",
      target_id: ip,
      details: catatan
        ? { ip, catatan }
        : { ip },
    });
  } catch {
    // Audit bersifat non-fatal — jangan sampai gagal audit memblokir login.
  }
}

export async function POST(req) {
  const ip = getClientIp(req);

  // Rate-limit: maks 5 percobaan per menit per IP
  const rl = rateLimit(`admin-login:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Terlalu banyak percobaan. Coba lagi dalam ${rl.retryAfter} detik.` },
      { status: 429 }
    );
  }

  const { password } = await req.json();
  if (!checkPassword(password)) {
    await catatLoginAudit(ip, false, "Password tidak cocok");
    return NextResponse.json({ error: "Password salah" }, { status: 401 });
  }

  setAdminCookie();
  await catatLoginAudit(ip, true);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  const ip = getClientIp(req);
  clearAdminCookie();
  try {
    const supa = getAdminClient();
    await supa.from("admin_logs").insert({
      action: "admin_logout",
      target_id: ip,
      details: { ip },
    });
  } catch { /* non-fatal */ }
  return NextResponse.json({ ok: true });
}

