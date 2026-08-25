import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { setSellerCookie } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Callback OAuth Google (via Supabase Auth).
 *
 * Alur:
 * 1. Supabase menukar `code` → sesi (access_token + refresh_token)
 * 2. Ambil email & nama dari user Supabase Auth
 * 3. Cari seller_profiles berdasarkan email_google
 *    - Sudah ada → pakai wa yang tersimpan
 *    - Belum ada → buat profil baru, gunakan identifier berbasis email
 * 4. Setel kuki seller_session HMAC agar kompatibel dengan seluruh sistem
 * 5. Redirect ke beranda
 */
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/?error=oauth_no_code`);
  }

  try {
    // Buat client anon sementara untuk menukar code → sesi
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeErr || !data?.user) {
      console.error("[auth/callback] exchange error:", exchangeErr?.message);
      return NextResponse.redirect(`${origin}/?error=oauth_failed`);
    }

    const user = data.user;
    const email = user.email;
    const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const avatar = user.user_metadata?.avatar_url || "";

    if (!email) {
      return NextResponse.redirect(`${origin}/?error=oauth_no_email`);
    }

    const supa = getAdminClient();

    // Cek apakah kolom email_google ada, cari profil yang cocok
    const { data: existing } = await supa
      .from("seller_profiles")
      .select("wa, name, avatar_url")
      .eq("email_google", email)
      .maybeSingle();

    let waIdentifier;

    if (existing) {
      // Akun sudah ada — update avatar/nama jika belum terisi
      waIdentifier = existing.wa;
      const updates = {};
      if (name && !existing.name) updates.name = name;
      if (avatar && !existing.avatar_url) updates.avatar_url = avatar;
      if (Object.keys(updates).length > 0) {
        await supa.from("seller_profiles").update(updates).eq("wa", waIdentifier);
      }
    } else {
      // Buat profil baru dengan identifier unik
      const localPart = email
        .split("@")[0]
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(0, 20);
      waIdentifier = `google_${localPart}_${Date.now().toString(36)}`;

      await supa.from("seller_profiles").insert({
        wa: waIdentifier,
        name: name || email,
        email_google: email,
        avatar_url: avatar || null,
        auth_provider: "google",
      });
    }

    // Setel kuki seller_session HMAC (30 hari) — sama persis dengan alur WA/Email
    setSellerCookie(waIdentifier);

    // Redirect ke tujuan, sisipkan wa di query agar localStorage bisa di-set client-side
    const redirectUrl = new URL(`${origin}${next}`);
    redirectUrl.searchParams.set("_gwa", waIdentifier);
    const response = NextResponse.redirect(redirectUrl.toString());
    return response;
  } catch (err) {
    console.error("[auth/callback] error:", err.message);
    return NextResponse.redirect(`${origin}/?error=oauth_db_error`);
  }
}
