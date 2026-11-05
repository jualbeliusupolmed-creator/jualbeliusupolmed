import { describe, expect, it, vi } from "vitest";
import { applyListingScope, buildListingScopeValues } from "@/lib/adminListingScope";

describe("admin listing scope", () => {
  it("keeps an explicit national scope unrestricted", () => {
    const query = { or: vi.fn(), eq: vi.fn() };
    expect(applyListingScope(query, null)).toBe(query);
    expect(query.or).not.toHaveBeenCalled();
    expect(query.eq).not.toHaveBeenCalled();
  });

  it("fails closed when a scoped admin has no usable campus values", () => {
    const query = { or: vi.fn(), eq: vi.fn(() => query) };
    applyListingScope(query, { campusNames: [], universityIds: [] });
    expect(query.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
    expect(query.or).not.toHaveBeenCalled();
  });

  it("matches campus names and university IDs, including a referenced listing relation", () => {
    const query = { or: vi.fn(() => query) };
    const scope = buildListingScopeValues(["USU"], [{ id: "univ-123", shortName: "USU" }]);
    applyListingScope(query, scope, "listings");
    expect(query.or).toHaveBeenCalledWith(
      "campus.in.(USU,usu),university_id.in.(univ-123,USU,usu)",
      { referencedTable: "listings" },
    );
  });

  it("drops filter values that could alter PostgREST syntax", () => {
    const query = { or: vi.fn(), eq: vi.fn(() => query) };
    const scope = buildListingScopeValues(["USU,other"], [{ id: "univ.123", shortName: "USU,other" }]);
    applyListingScope(query, scope);
    expect(query.eq).toHaveBeenCalledWith("id", "00000000-0000-0000-0000-000000000000");
    expect(query.or).not.toHaveBeenCalled();
  });
});
