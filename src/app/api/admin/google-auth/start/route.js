import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rateLimit";
import {
  ADMIN_GOOGLE_FLOW_COOKIE,
  ADMIN_GOOGLE_FLOW_PATH,
  ADMIN_GOOGLE_FLOW_TTL,
  createAdminGoogleAuthClient,
  getAdminGoogleVerifierCookieName,
} from "@/lib/admin-google-oauth";

export const dynamic = "force-dynamic";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: ADMIN_GOOGLE_FLOW_PATH,
    maxAge: ADMIN_GOOGLE_FLOW_TTL,
  };
}

export async function POST(request) {
  const limit = rateLimit(`admin-google-start:${getClientIp(request)}`, { limit: 10, windowMs: 60_000 });
  if (!limit.ok) {
    return NextResponse.json({ error: "Terlalu banyak percobaan. Coba lagi sebentar." }, { status: 429 });
  }

  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 403 });
  }

  const pendingCookies = [];
  const adapter = {
    get: () => null,
    set: (name, value) => pendingCookies.push({ name, value, options: cookieOptions() }),
    remove: (name) => pendingCookies.push({ name, value: "", options: { ...cookieOptions(), maxAge: 0 } }),
  };

  try {
    const supabase = createAdminGoogleAuthClient(adapter);
    const origin = new URL(request.url).origin;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data?.url || !data.url.startsWith("https://")) {
      throw new Error("Google OAuth belum tersedia.");
    }

    const response = NextResponse.json({ url: data.url });
    for (const cookie of pendingCookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
    response.cookies.set(ADMIN_GOOGLE_FLOW_COOKIE, "1", cookieOptions());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[admin-google-start] OAuth initialization failed:", error?.message || "unknown error");
    const response = NextResponse.json({ error: "Login Google belum dapat dimulai. Coba lagi." }, { status: 503 });
    for (const cookie of pendingCookies) response.cookies.set(cookie.name, cookie.value, cookie.options);
    const verifierCookie = getAdminGoogleVerifierCookieName();
    if (verifierCookie) response.cookies.set(verifierCookie, "", { ...cookieOptions(), maxAge: 0 });
    response.cookies.set(ADMIN_GOOGLE_FLOW_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
