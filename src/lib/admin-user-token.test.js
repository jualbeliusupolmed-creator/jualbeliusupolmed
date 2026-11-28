import { afterEach, describe, expect, it } from "vitest";
import { createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { openAdminUserToken, sealAdminUserToken } from "./admin-user-token";

const SECRET = "test-only-admin-session-secret-with-sufficient-length";
const originalSecret = process.env.ADMIN_SESSION_SECRET;
const originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = originalSecret;
  if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
});

describe("opaque admin user token", () => {
  it("roundtrips the private user identifier without exposing it in the token", async () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const token = await sealAdminUserToken("081234567890");
    expect(token).not.toContain("081234567890");
    expect(await openAdminUserToken(token)).toBe("081234567890");
  });

  it("rejects tampered tokens", async () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const token = await sealAdminUserToken("081234567890");
    const changed = token.slice(0, -1) + (token.endsWith("a") ? "b" : "a");
    await expect(openAdminUserToken(changed)).rejects.toThrow();
  });

  it("uses the server-only service key as a fallback when no admin secret is configured", async () => {
    delete process.env.ADMIN_SESSION_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = SECRET;
    const token = await sealAdminUserToken("081234567890");
    expect(await openAdminUserToken(token)).toBe("081234567890");
  });

  it("remains compatible with the previous AES-GCM token format", async () => {
    process.env.ADMIN_SESSION_SECRET = SECRET;
    const iv = "0123456789abcdef01234567";
    const encryptionKey = createHash("sha256").update(`jb-admin-user-token:${SECRET}`).digest();
    const cipher = createCipheriv("aes-256-gcm", encryptionKey, Buffer.from(iv, "utf8"));
    const payload = Buffer.from(JSON.stringify({
      wa: "081234567890",
      exp: Date.now() + 60_000,
    }));
    const ciphertext = Buffer.concat([cipher.update(payload), cipher.final()]);
    const legacyToken = `${iv}-${cipher.getAuthTag().toString("hex")}-${ciphertext.toString("hex")}`;

    expect(await openAdminUserToken(legacyToken)).toBe("081234567890");

    const newToken = await sealAdminUserToken("081234567890");
    const [newIv, authTag, encrypted] = newToken.split("-");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey, Buffer.from(newIv, "utf8"));
    decipher.setAuthTag(Buffer.from(authTag, "hex"));
    const clear = Buffer.concat([
      decipher.update(Buffer.from(encrypted, "hex")),
      decipher.final(),
    ]);
    expect(JSON.parse(clear.toString("utf8")).wa).toBe("081234567890");
  });
});
