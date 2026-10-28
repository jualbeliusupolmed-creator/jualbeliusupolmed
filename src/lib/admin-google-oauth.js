import { createClient } from "@supabase/supabase-js";

export const ADMIN_GOOGLE_FLOW_COOKIE = "admin_google_oauth_flow";
export const ADMIN_GOOGLE_FLOW_PATH = "/auth/callback";
export const ADMIN_GOOGLE_FLOW_TTL = 10 * 60;

export function getAdminGoogleVerifierCookieName() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!url) return null;
    const projectRef = new URL(url).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token-code-verifier`;
  } catch {
    return null;
  }
}

export function createAdminGoogleAuthClient(cookieAdapter) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase Auth belum dikonfigurasi.");

  const storageKey = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
  const verifierKey = `${storageKey}-code-verifier`;
  const storage = {
    getItem: async (name) => {
      if (name !== verifierKey) return null;
      const encoded = cookieAdapter.get(name);
      if (!encoded) return null;
      try {
        return Buffer.from(encoded, "base64url").toString("utf8");
      } catch {
        return null;
      }
    },
    setItem: async (name, value) => {
      // Only the short-lived PKCE verifier belongs in cookies. OAuth access and
      // refresh tokens are intentionally kept out of persistent browser storage.
      if (name === verifierKey) cookieAdapter.set(name, Buffer.from(value, "utf8").toString("base64url"));
    },
    removeItem: async (name) => {
      if (name === verifierKey) cookieAdapter.remove(name);
    },
  };

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      flowType: "pkce",
      persistSession: true,
      skipAutoInitialize: true,
      storage,
      storageKey,
    },
  });
}
