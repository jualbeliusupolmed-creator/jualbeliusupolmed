import { describe, expect, it } from "vitest";
import {
  buildListingCode,
  buildListingShortPath,
  looksLikeListingCode,
  normalizeListingCode,
} from "../src/lib/listingCode";

describe("listingCode helpers", () => {
  it("menormalkan kode integer atau digit campuran", () => {
    expect(buildListingCode(123456)).toBe("123456");
    expect(buildListingCode("kode-000981")).toBe("000981");
  });

  it("menormalkan input kode dari pengguna", () => {
    expect(normalizeListingCode(" kode #9812 ")).toBe("9812");
  });

  it("membuat short path dan validasi bentuk kode", () => {
    expect(buildListingShortPath("9812")).toBe("/c/9812");
    expect(looksLikeListingCode("9812")).toBe(true);
    expect(looksLikeListingCode("kode")).toBe(false);
  });
});
