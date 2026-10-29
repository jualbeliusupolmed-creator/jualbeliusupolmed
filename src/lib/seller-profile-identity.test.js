import { describe, expect, it, vi } from "vitest";
import {
  findSellerProfileByPhone,
  findSellerProfileBySession,
} from "./seller-profile-identity";

function createSupabaseQuery() {
  const query = {
    select: vi.fn(() => query),
    or: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => ({ data: null, error: null })),
  };
  return {
    from: vi.fn(() => query),
    query,
  };
}

describe("seller profile identity lookup", () => {
  it("resolves a phone session against both legacy and linked phone fields", async () => {
    const supa = createSupabaseQuery();

    await findSellerProfileBySession(supa, "6281234567890", "wa,phone_wa");

    expect(supa.from).toHaveBeenCalledWith("seller_profiles");
    expect(supa.query.or).toHaveBeenCalledWith("wa.eq.081234567890,phone_wa.eq.081234567890");
  });

  it("keeps a Google profile session pinned to its stable profile identity", async () => {
    const supa = createSupabaseQuery();

    await findSellerProfileBySession(supa, "google_user_ab123", "wa");

    expect(supa.query.or).toHaveBeenCalledWith("wa.eq.google_user_ab123");
  });

  it("normalizes WhatsApp before looking up linked accounts", async () => {
    const supa = createSupabaseQuery();

    await findSellerProfileByPhone(supa, "+62 812-3456-7890", "wa,phone_wa");

    expect(supa.query.or).toHaveBeenCalledWith("wa.eq.081234567890,phone_wa.eq.081234567890");
  });
});
