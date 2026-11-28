import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminClient } = vi.hoisted(() => ({ getAdminClient: vi.fn() }));
vi.mock("@/lib/supabaseAdmin", () => ({ getAdminClient }));

import { GET } from "./route";

describe("GET /api/blog pagination", () => {
  let query;

  beforeEach(() => {
    const result = {
      data: [{ id: "article-6", title: "Halaman kedua" }],
      count: 13,
      error: null,
    };
    query = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      range: vi.fn(),
      then: (resolve, reject) => Promise.resolve(result).then(resolve, reject),
    };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.order.mockReturnValue(query);
    query.range.mockReturnValue(query);
    getAdminClient.mockReturnValue({ from: vi.fn(() => query) });
  });

  it("returns the requested page with pagination metadata", async () => {
    const response = await GET(new Request("http://localhost/api/blog?page=2&limit=5"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.blogs).toEqual([{ id: "article-6", title: "Halaman kedua" }]);
    expect(body).toMatchObject({ page: 2, total: 13, totalPages: 3 });
    expect(query.range).toHaveBeenCalledWith(5, 9);
    expect(query.select).toHaveBeenCalledWith(
      expect.any(String),
      { count: "exact" }
    );
  });
});
