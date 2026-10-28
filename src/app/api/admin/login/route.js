import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { clearAdminCookie, getAdminSession, setAdminCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rateLimit";
import { getAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

function authClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase Auth belum dikonfigurasi.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
}

export async function POST(req) {
  const ip = getClientIp(req);
  const limit = rateLimit(`admin-login:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: `Terlalu banyak percobaan. Coba lagi dalam ${limit.retryAfter} detik.` }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 254) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 512) : "";
  if (!email || !password) return NextResponse.json({ error: "Email dan kata sandi wajib diisi." }, { status: 400 });

  try {
    const auth = authClient();
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.user || !data.session) {
      return NextResponse.json({ error: "Akun atau kata sandi tidak cocok." }, { status: 401 });
    }

    const userId = data.user.id.toLowerCase();
    const isSuperadmin = !!process.env.SUPERADMIN_AUTH_USER_ID && userId === process.env.SUPERADMIN_AUTH_USER_ID.toLowerCase();
    if (!isSuperadmin) {
      const admin = getAdminClient();
      const { data: member, error: memberError } = await admin
        .from("admin_memberships")
        .select("user_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (memberError || !member) {
        await auth.auth.signOut({ scope: "local" }).catch(() => {});
        return NextResponse.json({ error: "Akun ini belum diberi akses workspace." }, { status: 403 });
      }
    }

    setAdminCookie(userId);
    try {
      await getAdminClient().from("admin_audit_events").insert({ actor_id: userId, action: "admin_login", target_id: userId, metadata: { role: isSuperadmin ? "superadmin" : "owner" } });
    } catch {
      // A missing migration must not prevent Auth login; audit writes work after the migration is applied.
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin-login] Authentication setup failed:", error?.message || "unknown error");
    return NextResponse.json({ error: "Login admin belum siap. Periksa konfigurasi Auth dan migrasi akses admin." }, { status: 503 });
  }
}

export async function DELETE() {
  const session = getAdminSession();
  if (session?.sub) {
    try {
      await getAdminClient().from("admin_audit_events").insert({ actor_id: session.sub, action: "admin_logout", target_id: session.sub, metadata: {} });
    } catch {
      // Logout remains available when the audit migration is not installed.
    }
  }
  clearAdminCookie();
  return NextResponse.json({ ok: true });
}
