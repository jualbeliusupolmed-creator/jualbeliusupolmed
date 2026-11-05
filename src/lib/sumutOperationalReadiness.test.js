import { describe, expect, it } from "vitest";
import { countSumutOwners, summarizeSumutAccounts } from "@/lib/sumutOperationalReadiness";

describe("Sumut operational readiness summaries", () => {
  it("separates Instagram from WhatsApp and excludes inactive accounts", () => {
    const result = summarizeSumutAccounts([
      { provider: "instagram", province_id: "sumatera-utara", status: "connected", has_access_token: true },
      { provider: "instagram", province_id: "sumatera-utara", status: "pending", has_access_token: false },
      { provider: "whatsapp_channel", province_id: "sumatera-utara", status: "connected" },
      { provider: "instagram", province_id: "dki-jakarta", status: "connected", has_access_token: true },
      { provider: "instagram", province_id: "sumatera-utara", status: "inactive", has_access_token: true },
    ], [
      { provider: "whatsapp_channel", province_id: "sumatera-utara", status: "connected", liveName: "Kabar Sumut" },
      { provider: "whatsapp_group", scope_type: "university", scope_id: "usu-id", status: "connected" },
      { provider: "whatsapp_business", province_id: "sumatera-utara", status: "connected", liveName: "Business" },
      { provider: "whatsapp_group", province_id: "dki-jakarta", status: "connected", liveName: "Jakarta" },
      { provider: "whatsapp_group", province_id: "sumatera-utara", status: "inactive", liveName: "Old group" },
    ], ["usu-id"]);

    expect(result).toEqual({
      instagramTotal: 2,
      instagramConnected: 1,
      whatsappTotal: 2,
      whatsappLive: 1,
    });
  });

  it("counts only active owners assigned to Sumut or its universities", () => {
    const owners = [
      { status: "active", scopes: [{ scope_type: "province", scope_id: "sumatera-utara" }] },
      { status: "active", scopes: [{ scope_type: "campus", scope_id: "usu-id" }] },
      { status: "suspended", scopes: [{ scope_type: "province", scope_id: "sumatera-utara" }] },
      { status: "active", scopes: [{ scope_type: "province", scope_id: "dki-jakarta" }] },
    ];
    expect(countSumutOwners(owners, ["usu-id"])).toBe(2);
  });
});
