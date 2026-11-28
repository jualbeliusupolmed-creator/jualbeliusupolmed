import { describe, expect, it } from "vitest";
import { isPrimaryNavigationActive, PRIMARY_NAV_ITEMS } from "../src/lib/siteNavigation";

const item = (id) => PRIMARY_NAV_ITEMS.find((entry) => entry.id === id);

describe("primary site navigation", () => {
  it("matches the marketplace home and nested product routes", () => {
    expect(isPrimaryNavigationActive("/", item("marketplace"))).toBe(true);
    expect(isPrimaryNavigationActive("/produk/buku-123", item("marketplace"))).toBe(true);
    expect(isPrimaryNavigationActive("/produk-lain", item("marketplace"))).toBe(false);
  });

  it("keeps editorial pages separate from Mading and exploration routes", () => {
    expect(isPrimaryNavigationActive("/blog/artikel-kampus", item("news"))).toBe(true);
    expect(isPrimaryNavigationActive("/mading", item("news"))).toBe(false);
    expect(isPrimaryNavigationActive("/mading", item("explore"))).toBe(true);
  });

  it("marks the dedicated Open PO and LINUSKU routes", () => {
    expect(isPrimaryNavigationActive("/open-po", item("open-po"))).toBe(true);
    expect(isPrimaryNavigationActive("/linusku", item("linusku"))).toBe(true);
    expect(isPrimaryNavigationActive(null, item("linusku"))).toBe(false);
  });
});
