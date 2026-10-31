import { describe, expect, it } from "vitest";
import { firstCodePoint } from "../src/lib/utils";

describe("firstCodePoint", () => {
  it("keeps supplementary Unicode characters intact", () => {
    expect(firstCodePoint("🧕Rani")).toBe("🧕");
  });

  it("trims whitespace and returns an empty string for empty input", () => {
    expect(firstCodePoint("  Kampus")).toBe("K");
    expect(firstCodePoint("   ")).toBe("");
  });
});
