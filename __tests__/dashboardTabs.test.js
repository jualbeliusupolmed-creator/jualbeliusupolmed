import { describe, expect, it } from "vitest";
import { resolveDashboardTab } from "../src/lib/dashboardTabs";

describe("resolveDashboardTab", () => {
  it("uses a valid tab from the URL", () => {
    expect(resolveDashboardTab("open-po")).toBe("open-po");
  });

  it("returns to the default tab when the URL has no valid tab", () => {
    expect(resolveDashboardTab(null)).toBe("jual");
    expect(resolveDashboardTab("unknown")).toBe("jual");
  });

  it("defaults loaded organization accounts to their workspace", () => {
    expect(resolveDashboardTab(null, { isUkmAccount: true, loaded: true })).toBe("ukm");
  });

  it("prevents non-organization accounts from landing on the organization tab", () => {
    expect(resolveDashboardTab("ukm", { loaded: true })).toBe("jual");
  });
});
