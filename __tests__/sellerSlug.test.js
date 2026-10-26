import { describe, it, expect } from "vitest";
import { encodeSellerSlug, parseSellerParam, maskPhone } from "../src/lib/sellerSlug";

describe("sellerSlug - Phone Number Privacy", () => {
  it("generates deterministic opaque slug starting with p_ and hex chars", () => {
    const slug1 = encodeSellerSlug("081234567890");
    const slug2 = encodeSellerSlug("6281234567890");
    const slug3 = encodeSellerSlug("+62 812-3456-7890");

    expect(slug1).toMatch(/^p_[0-9a-f]{10}$/);
    // Should be consistent regardless of format
    expect(slug1).toBe(slug2);
    expect(slug2).toBe(slug3);
  });

  it("handles empty or invalid phone values gracefully", () => {
    expect(encodeSellerSlug("")).toBe("");
    expect(encodeSellerSlug(null)).toBe("");
    expect(encodeSellerSlug("abc")).toBe("");
  });

  it("identifies legacy phone numbers for 301 redirection", () => {
    const res1 = parseSellerParam("081234567890");
    expect(res1.type).toBe("legacy_phone");
    expect(res1.value).toBe("081234567890");

    const res2 = parseSellerParam("6281234567890");
    expect(res2.type).toBe("legacy_phone");

    const res3 = parseSellerParam("+6281234567890");
    expect(res3.type).toBe("legacy_phone");
  });

  it("decodes legacy u-<base64url> slugs as legacy_phone for redirection", () => {
    const rawNumber = "081234567890";
    const b64 = Buffer.from(rawNumber).toString("base64url");
    const res = parseSellerParam(`u-${b64}`);
    expect(res.type).toBe("legacy_phone");
    expect(res.value).toBe(rawNumber);
  });

  it("identifies custom slugs and opaque p_ slugs as slug", () => {
    const res1 = parseSellerParam("tokoberkah");
    expect(res1.type).toBe("slug");
    expect(res1.value).toBe("tokoberkah");

    const res2 = parseSellerParam("p_a1b2c3d4e5");
    expect(res2.type).toBe("slug");
    expect(res2.value).toBe("p_a1b2c3d4e5");
  });

  it("masks phone numbers correctly", () => {
    expect(maskPhone("081234567890")).toBe("0812 **** 7890");
    expect(maskPhone("6282111946196")).toBe("6282 **** 6196");
    expect(maskPhone("123")).toBe("****");
  });
});
