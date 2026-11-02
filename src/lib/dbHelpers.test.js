import { describe, expect, it } from "vitest";
import { toPublicListing } from "@/lib/dbHelpers";

describe("toPublicListing", () => {
  it("removes private WhatsApp identifiers while preserving a contact slug", () => {
    const listing = {
      id: "listing-id",
      seller_wa: "081234567890",
      seller_profiles: {
        wa: "081234567890",
        slug: null,
        trusted_seller: true,
      },
    };

    const result = toPublicListing(listing);

    expect(result.seller_wa).toBeUndefined();
    expect(result.seller_profiles.wa).toBeUndefined();
    expect(result.seller_profiles.slug).toMatch(/^p_[a-f0-9]{10}$/);
    expect(result.seller_profiles.trusted_seller).toBe(true);
    expect(listing.seller_wa).toBe("081234567890");
  });

  it("preserves existing seller slugs and tolerates absent profile data", () => {
    expect(toPublicListing({ seller_wa: "081234567890", seller_profiles: { wa: "081234567890", slug: "toko-aman" } }))
      .toEqual({ seller_profiles: { slug: "toko-aman" } });
    expect(toPublicListing(null)).toBeNull();
  });
});
