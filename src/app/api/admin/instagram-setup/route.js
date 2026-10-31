import { NextResponse } from "next/server";
import { getInstagramToken, getInstagramUserId } from "@/lib/instagramDm";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");

  // Pengamanan sederhana via secret token atau CRON_SECRET
  if (secret !== "kampuskita_meta_webhook_token" && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = getInstagramToken("katalog");
  const configuredUserId = getInstagramUserId("katalog");

  const results = {
    configured: {
      hasToken: Boolean(token),
      tokenLength: token?.length || 0,
      configuredUserId,
    },
    metaChecks: {},
  };

  if (!token) {
    return NextResponse.json(results);
  }

  // 1. Cek /me dengan Facebook Graph API
  try {
    const meRes = await fetch("https://graph.facebook.com/v24.0/me?fields=id,name,accounts{id,name,access_token,instagram_business_account}", {
      headers: { Authorization: `Bearer ${token}` },
    });
    results.metaChecks.facebookMe = await meRes.json();
  } catch (err) {
    results.metaChecks.facebookMeError = err.message;
  }

  // 2. Cek /me dengan Instagram Graph API
  try {
    const igMeRes = await fetch("https://graph.instagram.com/v24.0/me?fields=id,username,account_type", {
      headers: { Authorization: `Bearer ${token}` },
    });
    results.metaChecks.instagramMe = await igMeRes.json();
  } catch (err) {
    results.metaChecks.instagramMeError = err.message;
  }

  // 3. Cek configuredUserId jika ada
  if (configuredUserId) {
    try {
      const userRes = await fetch(`https://graph.facebook.com/v24.0/${configuredUserId}?fields=id,name,username,connected_facebook_page`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      results.metaChecks.userInfo = await userRes.json();
    } catch (err) {
      results.metaChecks.userInfoError = err.message;
    }
  }

  // 4. Coba subscribe Page jika ada akun Facebook Page yang terkait
  const pages = results.metaChecks?.facebookMe?.accounts?.data || [];
  results.subscribedPages = [];

  for (const page of pages) {
    try {
      const pageToken = page.access_token || token;
      const subRes = await fetch(`https://graph.facebook.com/v24.0/${page.id}/subscribed_apps`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pageToken}`,
        },
        body: JSON.stringify({
          subscribed_fields: ["messages", "messaging_postbacks", "message_reactions"],
        }),
      });
      const subData = await subRes.json();
      results.subscribedPages.push({
        pageId: page.id,
        pageName: page.name,
        result: subData,
      });
    } catch (subErr) {
      results.subscribedPages.push({
        pageId: page.id,
        error: subErr.message,
      });
    }
  }

  return NextResponse.json(results);
}
