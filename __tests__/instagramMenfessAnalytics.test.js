import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  hasAdminPermission: vi.fn(),
  getAdminClient: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
  getAdminActor: mocks.getAdminActor,
  hasAdminPermission: mocks.hasAdminPermission,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

import { GET } from "@/app/api/admin/social/menfess-analytics/route";

function makeQuery(result, calls = []) {
  const query = {};
  for (const method of ["select", "eq", "gte", "lt", "in", "order", "limit"]) {
    query[method] = vi.fn((...args) => {
      calls.push([method, ...args]);
      return query;
    });
  }
  query.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  return query;
}

describe("Instagram Menfess analytics API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthorized requests before querying Supabase", async () => {
    mocks.getAdminActor.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/social/menfess-analytics"));

    expect(response.status).toBe(401);
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("rejects malformed custom date ranges", async () => {
    mocks.getAdminActor.mockResolvedValue({ role: "superadmin" });
    mocks.hasAdminPermission.mockReturnValue(true);

    const response = await GET(new Request(
      "http://localhost/api/admin/social/menfess-analytics?period=custom&from=2026-02-30&to=2026-03-01"
    ));

    expect(response.status).toBe(400);
    expect(mocks.getAdminClient).not.toHaveBeenCalled();
  });

  it("limits account options and event queries to accounts in the admin's assigned scope", async () => {
    mocks.getAdminActor.mockResolvedValue({
      role: "university_admin",
      scopes: [{ scope_type: "campus", scope_id: "usu" }],
    });
    mocks.hasAdminPermission.mockReturnValue(true);

    const accountRows = [
      {
        id: "account-usu",
        provider: "instagram",
        scope_type: "university",
        university_id: "usu",
        external_account_id: "17841430000000001",
        handle: "usu.menfess",
        universities: { id: "usu", code: "USU", province_id: "sumatera-utara" },
      },
      {
        id: "account-polmed",
        provider: "instagram",
        scope_type: "university",
        university_id: "polmed",
        external_account_id: "17841430000000002",
        handle: "polmed.menfess",
        universities: { id: "polmed", code: "POLMED", province_id: "sumatera-utara" },
      },
    ];
    const accountQuery = makeQuery({ data: accountRows, error: null });
    const eventCalls = [];
    const priorCalls = [];
    const eventQuery = makeQuery({
      data: [
        { sender_id: "private-sender", created_at: "2026-10-15T10:00:00.000Z" },
        { sender_id: "private-returning", created_at: "2026-10-15T11:00:00.000Z" },
      ],
      count: 2,
      error: null,
    }, eventCalls);
    const priorQuery = makeQuery({
      data: [{ sender_id: "private-sender" }],
      count: 1001,
      error: null,
    }, priorCalls);
    const fallbackCalls = [];
    const fallbackQuery = makeQuery(
      { data: [{ sender_id: "private-returning" }], error: null },
      fallbackCalls
    );
    const logQueries = [eventQuery, priorQuery, fallbackQuery];
    mocks.getAdminClient.mockReturnValue({
      from: vi.fn((table) => {
        if (table === "organization_social_accounts") return accountQuery;
        if (table === "instagram_dm_logs") return logQueries.shift();
        throw new Error(`Unexpected table: ${table}`);
      }),
    });

    const response = await GET(new Request("http://localhost/api/admin/social/menfess-analytics?period=today"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.accountOptions).toEqual([{ id: "account-usu", handle: "usu.menfess" }]);
    expect(payload.summary).toEqual({
      received: 2,
      activeSenders: 2,
      newSenders: 0,
      returningSenders: 2,
    });
    expect(eventCalls).toContainEqual(["in", "recipient_account_id", ["17841430000000001"]]);
    expect(fallbackCalls).toContainEqual(["eq", "sender_id", "private-returning"]);
    expect(JSON.stringify(payload)).not.toContain("private-returning");
    expect(JSON.stringify(payload)).not.toContain("sender_id");
    expect(JSON.stringify(payload)).not.toContain("message_text");
  });
});
