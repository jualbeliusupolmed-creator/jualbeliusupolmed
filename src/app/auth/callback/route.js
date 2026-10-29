import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { getSellerSession, setAdminCookieOnResponse, setSellerCookie } from "@/lib/auth";
import { formatWa } from "@/lib/constants";
import { isGoogleAuthIdentity, resolveAdminLoginRole } from "@/lib/admin-auth-policy";
import {
  SELLER_GOOGLE_LINK_COOKIE,
  verifySellerGoogleLinkToken,
} from "@/lib/seller-google-link";
import { mergeSellerProfiles } from "@/lib/seller-profile-identity";
import {
  ADMIN_GOOGLE_FLOW_COOKIE,
  ADMIN_GOOGLE_FLOW_PATH,
  ADMIN_GOOGLE_FLOW_TTL,
  appendExpiredCookie,
  canonicalizeUrlOrigin,
  createAdminGoogleAuthClient,
  getAdminGoogleVerifierCookieName,
} from "@/lib/admin-google-oauth";

export const dynamic = "force-dynamic";

function googleLinkRedirect(request, status) {
  const response = NextResponse.redirect(
    new URL(`/dashboard?tab=profil&google_link=${status}`, request.url)
  );
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.cookies.set(SELLER_GOOGLE_LINK_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/callback",
    maxAge: 0,
  });
  return response;
}

function googleLinkJson(body, status = 200) {
  const response = NextResponse.json(body, { status });
  response.cookies.set(SELLER_GOOGLE_LINK_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/auth/callback",
    maxAge: 0,
  });
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

async function linkGoogleToSeller(user, wa) {
  const providerList = user.app_metadata?.providers || [];
  if (
    !user.email ||
    (user.app_metadata?.provider !== "google" && !providerList.includes("google"))
  ) {
    return { status: 400, error: "Identitas Google tidak berhasil diverifikasi." };
  }

  const email = user.email.trim().toLowerCase();
  const emailPattern = email.replace(/[\\%_]/g, "\\$&");
  const supa = getAdminClient();
  const { data: byGoogle, error: googleLookupError } = await supa
    .from("seller_profiles")
    .select("wa,phone_wa,email_google,email")
    .ilike("email_google", emailPattern)
    .limit(2);
  const { data: byEmail, error: emailLookupError } = await supa
    .from("seller_profiles")
    .select("wa,phone_wa,email_google,email")
    .ilike("email", emailPattern)
    .limit(2);
  if (googleLookupError || emailLookupError) {
    return { status: 503, error: "Status tautan akun belum dapat diperiksa." };
  }
  const linkedProfiles = [...new Map([...(byGoogle || []), ...(byEmail || [])].map((p) => [p.wa, p])).values()];
  if ((linkedProfiles || []).length > 1) {
    return { status: 409, error: "Email Google ini ditemukan pada lebih dari satu profil. Hubungi bantuan." };
  }
  const existing = linkedProfiles?.[0] || null;
  if (existing && existing.wa !== wa) {
    if (existing.phone_wa && existing.phone_wa !== wa) {
      return { status: 409, error: "Akun Google ini sudah tertaut ke nomor WhatsApp lain." };
    }
    if (formatWa(existing.wa) && existing.wa !== wa) {
      return { status: 409, error: "Akun ini sudah memiliki profil WhatsApp lain. Hubungi bantuan untuk menggabungkannya dengan aman." };
    }
    const merged = await mergeSellerProfiles(supa, existing.wa, wa);
    if (merged.error) {
      return {
        status: ["23505", "23514"].includes(merged.error.code) ? 409 : 503,
        error: merged.message || "Profil Google belum dapat digabungkan.",
      };
    }
    return { status: 200, email, merged: true };
  }

  if (!existing || (existing.wa === wa && !existing.email_google)) {
    const { data: updated, error: updateError } = await supa
      .from("seller_profiles")
      .update({ email_google: email, auth_provider: "wa_google" })
      .eq("wa", wa)
      .is("email_google", null)
      .select("wa")
      .maybeSingle();
    if (updateError) {
      if (updateError.code === "23505") {
        return { status: 409, error: "Akun Google ini sudah terhubung ke profil lain." };
      }
      return { status: 503, error: "Akun Google belum dapat ditautkan." };
    }
    if (!updated) {
      return { status: 409, error: "Profil ini sudah memiliki metode Google atau berubah saat proses berlangsung." };
    }
  }
  return { status: 200, email };
}

function finishAdminGoogleCallback(request, redirectPath, pendingCookies = [], userId = null) {
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  response.headers.set("Cache-Control", "no-store, max-age=0");
  response.headers.set("Referrer-Policy", "no-referrer");
  for (const cookie of pendingCookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
  response.cookies.set(ADMIN_GOOGLE_FLOW_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  appendExpiredCookie(response, ADMIN_GOOGLE_FLOW_COOKIE, ADMIN_GOOGLE_FLOW_PATH);
  const verifierCookie = getAdminGoogleVerifierCookieName();
  if (verifierCookie) {
    response.cookies.set(verifierCookie, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    appendExpiredCookie(response, verifierCookie, ADMIN_GOOGLE_FLOW_PATH);
  }
  if (userId) setAdminCookieOnResponse(response, userId);
  return response;
}

async function handleAdminGoogleCallback(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const pendingCookies = [];
  const adapter = {
    get: (name) => request.cookies?.get(name)?.value || null,
    set: (name, value) => pendingCookies.push({
      name,
      value,
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: ADMIN_GOOGLE_FLOW_PATH,
        maxAge: ADMIN_GOOGLE_FLOW_TTL,
      },
    }),
    remove: (name) => pendingCookies.push({
      name,
      value: "",
      options: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: ADMIN_GOOGLE_FLOW_PATH,
        maxAge: 0,
      },
    }),
  };

  if (!code || searchParams.has("error")) {
    return finishAdminGoogleCallback(request, "/admin?auth_error=google_failed", pendingCookies);
  }

  try {
    const supabase = createAdminGoogleAuthClient(adapter);
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    const user = data?.user;
    if (error || !user?.id || !isGoogleAuthIdentity(user)) {
      return finishAdminGoogleCallback(request, "/admin?auth_error=google_failed", pendingCookies);
    }
    if (user.banned_until && new Date(user.banned_until) > new Date()) {
      return finishAdminGoogleCallback(request, "/admin?auth_error=not_authorized", pendingCookies);
    }

    const userId = user.id.toLowerCase();
    const superadminId = String(process.env.SUPERADMIN_AUTH_USER_ID || "").toLowerCase();
    let hasActiveMembership = false;
    if (!superadminId || userId !== superadminId) {
      const { data: membership, error: membershipError } = await getAdminClient()
        .from("admin_memberships")
        .select("user_id")
        .eq("user_id", userId)
        .eq("status", "active")
        .maybeSingle();
      if (membershipError) {
        return finishAdminGoogleCallback(request, "/admin?auth_error=google_failed", pendingCookies);
      }
      hasActiveMembership = !!membership;
    }

    const role = resolveAdminLoginRole(userId, superadminId, hasActiveMembership);
    if (!role) {
      return finishAdminGoogleCallback(request, "/admin?auth_error=not_authorized", pendingCookies);
    }

    try {
      await getAdminClient().from("admin_audit_events").insert({
        actor_id: userId,
        action: "admin_login_google",
        target_id: userId,
        metadata: { role },
      });
    } catch {
      // Audit logging must not prevent a valid login.
    }
    return finishAdminGoogleCallback(request, "/admin/overview", pendingCookies, userId);
  } catch (error) {
    console.error("[admin-google-callback] OAuth verification failed:", error?.message || "unknown error");
    return finishAdminGoogleCallback(request, "/admin?auth_error=google_failed", pendingCookies);
  }
}

/**
 * Callback OAuth Google (via Supabase Auth). Admin PKCE is completed first and
 * uses its own server-side authorization path; regular buyers follow the flow below.
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
  const { searchParams } = new URL(request.url);
  const origin = canonicalizeUrlOrigin(request.url) || new URL(request.url).origin;
  if (request.cookies?.get(ADMIN_GOOGLE_FLOW_COOKIE)?.value === "1") {
    return handleAdminGoogleCallback(request);
  }
  const googleLinkToken = request.cookies?.get(SELLER_GOOGLE_LINK_COOKIE)?.value;
  const googleLinkWa = formatWa(getSellerSession() || "");
  const isGoogleLinkFlow = Boolean(googleLinkToken);
  if (
    isGoogleLinkFlow &&
    (!googleLinkWa || !verifySellerGoogleLinkToken(googleLinkToken, googleLinkWa))
  ) {
    return googleLinkRedirect(request, "failed");
  }
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
                body: JSON.stringify({ access_token: accessToken, next: "${next}", google_link: ${isGoogleLinkFlow} })
              }).then(res => res.json()).then(data => {
                if (data.success) {
                  window.location.href = data.redirectUrl || "${origin}${next}";
                } else {
                  window.location.href = data.redirectUrl || "${origin}/?error=oauth_sync_failed";
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
      if (isGoogleLinkFlow) return googleLinkRedirect(request, "failed");
      return NextResponse.redirect(`${origin}/?error=oauth_failed`);
    }

    if (isGoogleLinkFlow) {
      const result = await linkGoogleToSeller(data.user, googleLinkWa);
      if (result.status !== 200) {
        return googleLinkRedirect(request, result.status === 409 ? "merge_conflict" : "failed");
      }
      return googleLinkRedirect(request, "success");
    }

    return await syncUserAndSetSession(data.user, origin, next);
  } catch (err) {
    console.error("[auth/callback GET] error:", err.message);
    if (isGoogleLinkFlow) return googleLinkRedirect(request, "failed");
    return NextResponse.redirect(`${origin}/?error=oauth_db_error`);
  }
}

// Endpoint POST untuk menerima access_token dari browser (Implicit Flow)
export async function POST(request) {
  try {
    const { origin } = new URL(request.url);
    const { access_token, next, google_link: isGoogleLinkFlow } = await request.json();

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

    if (isGoogleLinkFlow) {
      const token = request.cookies?.get(SELLER_GOOGLE_LINK_COOKIE)?.value;
      const wa = formatWa(getSellerSession() || "");
      if (!token || !wa || !verifySellerGoogleLinkToken(token, wa)) {
        return googleLinkJson(
          { success: false, redirectUrl: `${origin}/dashboard?tab=profil&google_link=failed` },
          403
        );
      }

      const result = await linkGoogleToSeller(data.user, wa);
      if (result.status !== 200) {
        const status = result.status === 409 ? "merge_conflict" : "failed";
        return googleLinkJson(
          { success: false, redirectUrl: `${origin}/dashboard?tab=profil&google_link=${status}` },
          result.status
        );
      }
      return googleLinkJson({
        success: true,
        redirectUrl: `${origin}/dashboard?tab=profil&google_link=success`,
      });
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
  const email = String(user.email || "").trim().toLowerCase();
  const name = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const avatar = user.user_metadata?.avatar_url || "";

  if (!email) {
    return NextResponse.redirect(`${origin}/?error=oauth_no_email`);
  }

  const supa = getAdminClient();
  const emailPattern = email.replace(/[\\%_]/g, "\\$&");

  // Cari profil: cek email_google ATAU kolom email
  let existing = null;
  try {
    const { data: byGoogleEmail } = await supa
      .from("seller_profiles")
      .select("wa, phone_wa, name, email_google")
      .ilike("email_google", emailPattern)
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
        .select("wa, phone_wa, name")
        .ilike("email", emailPattern)
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
      if (avatar) updates.avatar_url = avatar;
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

    const { error: insertError } = await supa.from("seller_profiles").insert({
      wa: waIdentifier,
      name: name || email,
      email,
      email_google: email,
      avatar_url: avatar || null,
      auth_provider: "google",
    });
    if (insertError) {
      console.error("[auth/callback] Google profile insert failed:", insertError.code || "database_error");
      return NextResponse.redirect(`${origin}/?error=oauth_profile_save`);
    }
  }

  const sessionWa = formatWa(existing?.phone_wa || waIdentifier) || waIdentifier;
  setSellerCookie(sessionWa);

  const redirectUrl = new URL(`${origin}${next || "/"}`);
  redirectUrl.searchParams.set("_gwa", sessionWa);
  const response = NextResponse.redirect(redirectUrl.toString());
  response._wa = sessionWa;
  response._name = name || existing?.name || email;
  return response;
}
