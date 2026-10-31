import { describe, expect, it } from "vitest";
import { isListingAvailable } from "./listingAvailability";

describe("listing availability", () => {
  it("allows active listings with positive or unspecified legacy stock", () => {
    expect(isListingAvailable({ status: "active", stock: 2 })).toBe(true);
    expect(isListingAvailable({ status: "active", stock: "1" })).toBe(true);
    expect(isListingAvailable({ status: "active", stock: null })).toBe(true);
    expect(isListingAvailable({ status: "active" })).toBe(true);
  });

  it.each([0, "0", -1, "invalid"])("rejects active listings with invalid or empty stock: %s", (stock) => {
    expect(isListingAvailable({ status: "active", stock })).toBe(false);
  });

  it.each(["sold", "pending", "suspended", "expired"])("rejects listings with status %s", (status) => {
    expect(isListingAvailable({ status, stock: 1 })).toBe(false);
  });

  it("rejects a missing listing", () => {
    expect(isListingAvailable(null)).toBe(false);
  });
});
