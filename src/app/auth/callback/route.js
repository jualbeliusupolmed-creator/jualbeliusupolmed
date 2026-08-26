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

  // Jika kita menerima implicit flow, Supabase meletakkan access_token di URL fragment (#).
  // Fragment tidak pernah dikirim ke server. Jadi kita render HTML untuk memprosesnya
  // dan mengirimkannya ke endpoint POST kita sendiri.
  if (!code) {
    return new NextResponse(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8">
        <title>Sedang Masuk...</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f9fafb; color: #111827; }
          .spinner { width: 40px; height: 40px; border: 4px solid rgba(0,0,0,0.1); border-left-color: #16a34a; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 20px; }
          @keyframes spin { to { transform: rotate(360deg); } }
        </style>
      </head>
      <body>
        <div class="spinner"></div>
        <p>Memproses otentikasi Google...</p>
        <script>
          const hash = window.location.hash.substring(1);
          if (hash && hash.includes("access_token=")) {
            const params = new URLSearchParams(hash);
            const accessToken = params.get("access_token");
            if (accessToken) {
              fetch("${origin}/auth/callback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ access_token: accessToken, next: "${next}" })
              }).then(res => res.json()).then(data => {
                if (data.success) {
                  window.location.href = data.redirectUrl || "${origin}${next}";
                } else {
                  window.location.href = "${origin}/?error=oauth_sync_failed";
                }
              }).catch(() => {
                window.location.href = "${origin}/?error=oauth_sync_error";
              });
            } else {
              window.location.href = "${origin}/?error=oauth_invalid_hash";
            }
          } else {
            // Coba redirect fallback jika tidak ada hash
            window.location.href = "${origin}/?error=oauth_no_code_or_hash";
          }
        </script>
      </body>
      </html>
    `, { headers: { "Content-Type": "text/html" } });
  }

  // Jika suatu saat PKCE digunakan (ada 'code'):
  try {
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

    return await syncUserAndSetSession(data.user, origin, next);
  } catch (err) {
    console.error("[auth/callback GET] error:", err.message);
    return NextResponse.redirect(`${origin}/?error=oauth_db_error`);
  }
}

// Endpoint POST untuk menerima access_token dari browser (Implicit Flow)
export async function POST(request) {
  try {
    const { origin } = new URL(request.url);
    const { access_token, next } = await request.json();

    if (!access_token) {
      return NextResponse.json({ success: false, error: "No access token" }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      { auth: { persistSession: false } }
    );

    const { data, error: userErr } = await supabase.auth.getUser(access_token);
    
    if (userErr || !data?.user) {
      console.error("[auth/callback] getUser error:", userErr?.message);
      return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });
    }

    const result = await syncUserAndSetSession(data.user, origin, next || "/");
    
    // Ekstrak URL dari redirect response
    const redirectUrl = result.headers.get("Location") || `${origin}/`;
    return NextResponse.json({
      success: true,
      wa: result._wa || null,
      name: result._name || null,
      redirectUrl
    });
  } catch (err) {
    console.error("[auth/callback POST] error:", err.message);
    return NextResponse.json({ success: false, error: "Server error: " + err.message }, { status: 500 });
  }
}

// Helper untuk menyinkronkan data pengguna dan membuat cookie HMAC
async function syncUserAndSetSession(user, origin, next) {
  const email = user.email;
  const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const avatar = user.user_metadata?.avatar_url || "";

  if (!email) {
    return NextResponse.redirect(`${origin}/?error=oauth_no_email`);
  }

  const supa = getAdminClient();

  // Cari profil: cek email_google ATAU kolom email
  let existing = null;
  try {
    const { data: byGoogleEmail } = await supa
      .from("seller_profiles")
      .select("wa, name, email_google")
      .eq("email_google", email)
      .maybeSingle();
    existing = byGoogleEmail;
  } catch (_) {
    // Abaikan jika kolom email_google belum ada
  }

  // Fallback: cek kolom email jika tidak ditemukan via email_google
  if (!existing) {
    try {
      const { data: byEmail } = await supa
        .from("seller_profiles")
        .select("wa, name")
        .eq("email", email)
        .maybeSingle();
      existing = byEmail;
    } catch (_) {
      // Kolom email belum ada — abaikan
    }
  }

  let waIdentifier;

  if (existing) {
    waIdentifier = existing.wa;
    try {
      const updates = {};
      if (name && !existing.name) updates.name = name;
      if (avatar) updates.photo_url = avatar;
      if (!existing.email_google) updates.email_google = email;
      if (Object.keys(updates).length > 0) {
        await supa.from("seller_profiles").update(updates).eq("wa", waIdentifier);
      }
    } catch (err) {
      console.warn("[auth/callback] update profile non-fatal warning:", err.message);
    }
  } else {
    const localPart = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 20);
    waIdentifier = `google_${localPart}_${Date.now().toString(36)}`;

    // Coba insert lengkap
    let inserted = false;
    try {
      const { error: insErr } = await supa.from("seller_profiles").insert({
        wa: waIdentifier,
        name: name || email,
        email: email,
        email_google: email,
        photo_url: avatar || null,
        auth_provider: "google",
      });
      if (!insErr) inserted = true;
    } catch (_) {}

    // Fallback jika ada kolom yang belum ada di schema DB
    if (!inserted) {
      try {
        await supa.from("seller_profiles").insert({
          wa: waIdentifier,
          name: name || email,
        });
      } catch (err) {
        console.error("[auth/callback] insert fallback error:", err.message);
      }
    }
  }

  setSellerCookie(waIdentifier);

  const redirectUrl = new URL(`${origin}${next || "/"}`);
  redirectUrl.searchParams.set("_gwa", waIdentifier);
  const response = NextResponse.redirect(redirectUrl.toString());
  response._wa = waIdentifier;
  response._name = name || existing?.name || email;
  return response;
}

