import { NextResponse } from "next/server";
import { getAdminActor, hasAdminPermission } from "@/lib/admin-access";
import { getAdminClient } from "@/lib/supabaseAdmin";
import { canManageSocialAccount, getSocialAccount } from "@/lib/socialAccountAccess";
import {
  getInstagramOAuthConfig,
  getInstagramOAuthStateCookieName,
  instagramOAuthResultUrl,
  verifyInstagramOAuthState,
} from "@/lib/instagramBusinessOAuth";
import { getMetaApiVersion } from "@/lib/instagramDm";
import { subscribeInstagramWebhooks } from "@/lib/instagramWebhooks";
import {
  assertInstagramTokenEncryptionReady,
  deleteInstagramAccountToken,
  getInstagramAccountCredentials,
  saveInstagramAccountToken,
} from "@/lib/instagramAccountCredentials";

export const dynamic = "force-dynamic";

function redirectResult(origin, result) {
  const response = NextResponse.redirect(instagramOAuthResultUrl(origin, result));
  response.cookies.set(getInstagramOAuthStateCookieName(), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/admin/social/instagram/oauth/callback",
    maxAge: 0,
  });
  return response;
}

async function exchangeForLongLivedToken(code, config) {
  const shortTokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.appId,
      client_secret: config.appSecret,
      grant_type: "authorization_code",
      redirect_uri: config.redirectUri,
      code,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const shortTokenData = await shortTokenResponse.json().catch(() => ({}));
  if (!shortTokenResponse.ok || !shortTokenData.access_token) {
    throw new Error("Instagram authorization code exchange failed.");
  }

  const longTokenUrl = new URL("https://graph.instagram.com/access_token");
  longTokenUrl.searchParams.set("grant_type", "ig_exchange_token");
  longTokenUrl.searchParams.set("client_secret", config.appSecret);
  longTokenUrl.searchParams.set("access_token", shortTokenData.access_token);
  const longTokenResponse = await fetch(longTokenUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const longTokenData = await longTokenResponse.json().catch(() => ({}));
  if (!longTokenResponse.ok || !longTokenData.access_token) {
    throw new Error("Instagram long-lived token exchange failed.");
  }

  return {
    accessToken: longTokenData.access_token,
    expiresIn: Number(longTokenData.expires_in) || 60 * 24 * 60 * 60,
    shortLivedUserId: shortTokenData.user_id,
  };
}

async function fetchInstagramProfile(accessToken) {
  const profileUrl = new URL(`https://graph.instagram.com/${getMetaApiVersion()}/me`);
  profileUrl.searchParams.set("fields", "user_id,username,name");
  const response = await fetch(profileUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  const profile = await response.json().catch(() => ({}));
  if (!response.ok || profile.error) throw new Error("Instagram profile lookup failed.");
  const externalAccountId = String(profile.user_id || profile.id || "");
  const username = String(profile.username || "").trim().replace(/^@/, "");
  if (!/^\d{5,40}$/.test(externalAccountId) || !username) {
    throw new Error("Instagram profile response was incomplete.");
  }
  return { externalAccountId, username };
}

export async function GET(request) {
  let config;
  try {
    config = getInstagramOAuthConfig();
    assertInstagramTokenEncryptionReady();
  } catch {
    return NextResponse.json({ error: "OAuth Instagram belum dikonfigurasi dengan lengkap." }, { status: 503 });
  }

  const origin = new URL(config.redirectUri).origin;
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get(getInstagramOAuthStateCookieName())?.value;
  const statePayload = verifyInstagramOAuthState(state, cookieState);
  if (!statePayload) return redirectResult(origin, "state_error");

  const actor = await getAdminActor();
  if (!actor || actor.userId !== statePayload.actorId ||
      (!hasAdminPermission(actor, "social", "manage") &&
       !hasAdminPermission(actor, "organization", "manage"))) {
    return redirectResult(origin, "session_error");
  }

  const providerError = request.nextUrl.searchParams.get("error");
  if (providerError) return redirectResult(origin, "cancelled");
  const code = String(request.nextUrl.searchParams.get("code") || "").replace(/#_$/, "");
  if (!code || code.length > 4096) return redirectResult(origin, "exchange_error");

  const supa = getAdminClient();
  const { account, error: accountError } = await getSocialAccount(supa, statePayload.accountId);
  if (accountError || !account || account.provider !== "instagram" ||
      !canManageSocialAccount(actor, account)) {
    return redirectResult(origin, "scope_error");
  }
  const previousCredentials = await getInstagramAccountCredentials(supa, account);

  let credentials;
  let profile;
  try {
    credentials = await exchangeForLongLivedToken(code, config);
    profile = await fetchInstagramProfile(credentials.accessToken);
    if (credentials.shortLivedUserId &&
        String(credentials.shortLivedUserId) !== profile.externalAccountId) {
      return redirectResult(origin, "account_error");
    }
  } catch (error) {
    console.error("[instagram-oauth] Token/profile exchange failed.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return redirectResult(origin, "exchange_error");
  }

  const now = new Date().toISOString();
  const { error: updateError } = await supa
    .from("organization_social_accounts")
    .update({
      handle: profile.username,
      external_account_id: profile.externalAccountId,
      status: "connected",
      last_checked_at: now,
      last_error_code: null,
      updated_at: now,
    })
    .eq("id", statePayload.accountId);
  if (updateError) {
    console.error("[instagram-oauth] Could not update connected account.", updateError.code || "database_error");
    return redirectResult(origin, "save_error");
  }

  try {
    await saveInstagramAccountToken(
      supa,
      statePayload.accountId,
      profile.externalAccountId,
      credentials.accessToken,
      {
        apiBase: "https://graph.instagram.com",
        expiresAt: new Date(Date.now() + credentials.expiresIn * 1000).toISOString(),
      }
    );
  } catch (error) {
    const { error: rollbackError } = await supa.from("organization_social_accounts").update({
      handle: account.handle,
      external_account_id: account.external_account_id,
      status: account.status || "pending",
      last_checked_at: account.last_checked_at || null,
      last_error_code: account.last_error_code || null,
      updated_at: new Date().toISOString(),
    }).eq("id", statePayload.accountId);
    if (rollbackError) {
      console.error("[instagram-oauth] Account rollback failed.", rollbackError.code || "database_error");
    }
    try {
      if (previousCredentials?.token && account.external_account_id) {
        await saveInstagramAccountToken(
          supa,
          statePayload.accountId,
          account.external_account_id,
          previousCredentials.token,
          {
            apiBase: previousCredentials.apiBase,
            expiresAt: previousCredentials.expiresAt,
          }
        );
      } else {
        await deleteInstagramAccountToken(supa, statePayload.accountId);
      }
    } catch (restoreError) {
      console.error("[instagram-oauth] Previous credentials could not be restored.", {
        name: restoreError instanceof Error ? restoreError.name : "UnknownError",
      });
    }
    console.error("[instagram-oauth] Could not save encrypted credentials.", {
      name: error instanceof Error ? error.name : "UnknownError",
    });
    return redirectResult(origin, "save_error");
  }

  const webhookSubscription = await subscribeInstagramWebhooks({
    accessToken: credentials.accessToken,
    instagramUserId: profile.externalAccountId,
  });
  if (!webhookSubscription.ok) {
    console.warn("[instagram-oauth] Instagram webhook subscription failed.", {
      status: webhookSubscription.status || null,
      code: webhookSubscription.code || null,
      reason: webhookSubscription.error || null,
    });
    return redirectResult(origin, "webhook_error");
  }

  return redirectResult(origin, "success");
}
