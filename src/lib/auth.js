import { cookies } from "next/headers";
import crypto from "crypto";

const COOKIE = "admin_session";

function secret() {
  return process.env.ADMIN_PASSWORD || "bismillah";
}

function token() {
  return crypto.createHash("sha256").update(secret()).digest("hex");
}

export function checkPassword(pw) {
  return typeof pw === "string" && pw === secret();
}

export function setAdminCookie() {
  cookies().set(COOKIE, token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 jam
  });
}

export function clearAdminCookie() {
  cookies().set(COOKIE, "", { path: "/", maxAge: 0 });
}

export function isAdmin() {
  const c = cookies().get(COOKIE)?.value;
  return c && c === token();
}
