import { describe, expect, it, vi } from "vitest";
import { loadMarketplaceRegion } from "./marketplaceRegion";
import {
  applyMarketplaceProvinceScope,
  isCampusInMarketplaceScope,
  loadListingSellerProvince,
} from "./marketplaceRegion";

vi.mock("@/lib/settings", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, getSettings: vi.fn() };
});

import { getSettings } from "@/lib/settings";

describe("marketplace province scope", () => {
  it("resolves a legacy profile campus when its canonical university ID is missing", async () => {
    vi.mocked(getSettings).mockResolvedValue({ campuses: [
      { id: "usu", shortName: "USU", provinceId: "sumatera-utara", active: true },
    ] });
    const university = { id: "usu", code: "USU", name: "Universitas Sumatera Utara", province_id: "sumatera-utara", status: "active" };
    const supa = {
      from: vi.fn((table) => table === "seller_profiles"
        ? { select: vi.fn(() => ({ or: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: { campus: "USU" }, error: null }) })) })) }
        : { select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: vi.fn().mockResolvedValue({ data: university, error: null }) })) })) }),
    };

    await expect(loadMarketplaceRegion(supa, "081234567890")).resolves.toMatchObject({
      province: "sumatera-utara",
      university: { id: "usu" },
    });
  });

  it("limits listings by the seller's province snapshot, never by target campus", () => {
    const query = { eq: vi.fn(() => "scoped-query") };

    expect(applyMarketplaceProvinceScope(query, {
      provinceId: "sumatera-utara",
      universityIds: ["usu", "polmed"],
      campusCodes: ["USU", "POLMED"],
    })).toBe("scoped-query");
    expect(query.eq).toHaveBeenCalledWith("seller_province_id", "sumatera-utara");
  });

  it("does not accept missing, national, or outside-province campus values", () => {
    const scope = { universityIds: ["usu"], campusCodes: ["USU"] };
    expect(isCampusInMarketplaceScope("USU", scope)).toBe(true);
    expect(isCampusInMarketplaceScope("usu", scope)).toBe(true);
    expect(isCampusInMarketplaceScope("Semua", scope)).toBe(false);
    expect(isCampusInMarketplaceScope("UGM", scope)).toBe(false);
    expect(applyMarketplaceProvinceScope({ eq: vi.fn() }, {})).toBeNull();
  });

  it("uses the listing's stored seller province for transaction checks", async () => {
    await expect(loadListingSellerProvince({}, { seller_province_id: "sumatera-utara" }))
      .resolves.toBe("sumatera-utara");
  });
});
