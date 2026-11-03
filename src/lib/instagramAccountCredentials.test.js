import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteInstagramAccountToken,
  getInstagramAccountToken,
  listInstagramAccountTokenIds,
  saveInstagramAccountToken,
} from "./instagramAccountCredentials";

function memorySettingsClient() {
  const rows = new Map();
  return {
    rows,
    from() {
      const query = {
        select() { return this; },
        eq(_column, key) { this.key = key; return this; },
        gte(_column, lowerBound) { this.lowerBound = lowerBound; return this; },
        lt(_column, upperBound) { this.upperBound = upperBound; return this; },
        maybeSingle: async function maybeSingle() {
          const row = rows.get(this.key);
          return { data: row ? { key: this.key, value: row.value } : null, error: null };
        },
        then(resolve, reject) {
          const matching = [...rows.entries()]
            .filter(([key]) => (!this.lowerBound || key >= this.lowerBound) && (!this.upperBound || key < this.upperBound))
            .map(([key, row]) => ({ key, value: row.value }));
          return Promise.resolve({ data: matching, error: null }).then(resolve, reject);
        },
        upsert: async (row) => { rows.set(row.key, row); return { error: null }; },
        delete() {
          return { eq: async (_column, key) => { rows.delete(key); return { error: null }; } };
        },
      };
      return query;
    },
  };
}

describe("per-account Instagram credentials", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("stores ciphertext and decrypts only for the account it belongs to", async () => {
    vi.stubEnv("META_ACCOUNT_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 7).toString("base64"));
    vi.stubEnv("META_KATALOG_IG_USER_ID", "legacy-global-id");
    const supa = memorySettingsClient();
    const account = { id: "account-a", provider: "instagram", external_account_id: "17841400000000000" };

    await saveInstagramAccountToken(supa, account.id, account.external_account_id, "meta-access-token-secret");

    const saved = supa.rows.get("meta_ig_account_token:account-a").value;
    expect(JSON.stringify(saved)).not.toContain("meta-access-token-secret");
    expect(await getInstagramAccountToken(supa, account)).toBe("meta-access-token-secret");
    expect(await getInstagramAccountToken(supa, { ...account, id: "account-b" })).toBeNull();
    expect(await getInstagramAccountToken(supa, { ...account, external_account_id: "17841400000000001" })).toBeNull();
    expect(await listInstagramAccountTokenIds(supa)).toEqual(new Set(["account-a"]));
  });

  it("deletes only the selected account credential", async () => {
    vi.stubEnv("META_ACCOUNT_TOKEN_ENCRYPTION_KEY", Buffer.alloc(32, 9).toString("base64"));
    const supa = memorySettingsClient();
    await saveInstagramAccountToken(supa, "account-a", "17841400000000001", "token-a");
    await saveInstagramAccountToken(supa, "account-b", "17841400000000002", "token-b");

    await deleteInstagramAccountToken(supa, "account-a");

    expect(supa.rows.has("meta_ig_account_token:account-a")).toBe(false);
    expect(supa.rows.has("meta_ig_account_token:account-b")).toBe(true);
  });

  it("fails closed when the encryption key is missing", async () => {
    vi.stubEnv("META_ACCOUNT_TOKEN_ENCRYPTION_KEY", "");
    await expect(saveInstagramAccountToken(memorySettingsClient(), "account-a", "17841400000000001", "token"))
      .rejects.toThrow("Kunci enkripsi token Instagram belum dikonfigurasi");
  });
});
