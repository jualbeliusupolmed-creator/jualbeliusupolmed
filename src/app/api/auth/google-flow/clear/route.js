import { NextResponse } from "next/server";
import {
  ADMIN_GOOGLE_FLOW_COOKIE,
  ADMIN_GOOGLE_FLOW_PATH,
  appendExpiredCookie,
  getAdminGoogleVerifierCookieName,
  isSameOriginOrLocalEquivalent,
} from "@/lib/admin-google-oauth";

export const dynamic = "force-dynamic";

function clearRootCookie(response, name) {
  response.cookies.set(name, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST(request) {
  const origin = request.headers.get("origin");
  if (!isSameOriginOrLocalEquivalent(origin, request.url)) {
    return NextResponse.json({ error: "Permintaan login tidak valid." }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  clearRootCookie(response, ADMIN_GOOGLE_FLOW_COOKIE);
  const verifierCookie = getAdminGoogleVerifierCookieName();
  if (verifierCookie) clearRootCookie(response, verifierCookie);
  appendExpiredCookie(response, ADMIN_GOOGLE_FLOW_COOKIE, ADMIN_GOOGLE_FLOW_PATH);
  if (verifierCookie) appendExpiredCookie(response, verifierCookie, ADMIN_GOOGLE_FLOW_PATH);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
