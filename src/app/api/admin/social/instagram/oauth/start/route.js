import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { canManageSocialAccount, getSocialAccount } from "@/lib/socialAccountAccess";
import {
  createInstagramOAuthState,
  getInstagramOAuthConfig,
  getInstagramOAuthStateCookieName,
  getInstagramOAuthStateTtlSeconds,
} from "@/lib/instagramBusinessOAuth";
import { assertInstagramTokenEncryptionReady } from "@/lib/instagramAccountCredentials";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasAdminPermission(actor, "social", "manage") &&
      !hasAdminPermission(actor, "organization", "manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accountId = request.nextUrl.searchParams.get("accountId");
  if (!accountId || accountId.length > 100) {
    return NextResponse.json({ error: "Akun sosial tidak valid." }, { status: 400 });
  }

  const supa = getAdminClient();
  const { account, error } = await getSocialAccount(supa, accountId);
  if (error) {
    return NextResponse.json({ error: "Gagal memeriksa akun sosial." }, { status: 500 });
  }
  if (!account || account.provider !== "instagram" || !canManageSocialAccount(actor, account)) {
    return NextResponse.json({ error: "Akun tidak ditemukan atau di luar cakupan akses Anda." }, { status: 404 });
  }

  try {
    const config = getInstagramOAuthConfig();
    assertInstagramTokenEncryptionReady();
    const state = createInstagramOAuthState({ accountId, actorId: actor.userId });
    const authorizeUrl = new URL("https://www.instagram.com/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", config.appId);
    authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set(
      "scope",
      "instagram_business_basic,instagram_business_content_publish,instagram_business_manage_messages"
    );
    authorizeUrl.searchParams.set("enable_fb_login", "0");
    authorizeUrl.searchParams.set("force_reauth", "true");
    authorizeUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(getInstagramOAuthStateCookieName(), state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/api/admin/social/instagram/oauth/callback",
      maxAge: getInstagramOAuthStateTtlSeconds(),
    });
    return response;
  } catch {
    return NextResponse.json({
      error: "OAuth Instagram belum siap. Operator perlu mengatur App ID, App Secret, callback URI, dan kunci enkripsi.",
    }, { status: 503 });
  }
}
