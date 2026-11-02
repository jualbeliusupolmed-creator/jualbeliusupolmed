import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  getAdminActor: vi.fn(),
  hasAdminPermission: vi.fn(),
  getAdminCampusScope: vi.fn(),
  getAdminClient: vi.fn(),
  resolveInstagramToken: vi.fn(),
  getInstagramUserId: vi.fn(),
}));

vi.mock("@/lib/admin-access", () => ({
  getAdminActor: mocks.getAdminActor,
  hasAdminPermission: mocks.hasAdminPermission,
  getAdminCampusScope: mocks.getAdminCampusScope,
}));

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: mocks.getAdminClient,
}));

vi.mock("@/lib/instagramDm", () => ({
  resolveInstagramToken: mocks.resolveInstagramToken,
  getInstagramUserId: mocks.getInstagramUserId,
}));

import { GET, POST } from "@/app/api/admin/social/accounts/route";
import { logInstagramDmMessage } from "@/lib/instagramDmLogger";

describe("Social & Communication Management API (/api/admin/social/accounts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("menolak akses jika belum login sebagai admin (401)", async () => {
    mocks.getAdminActor.mockResolvedValueOnce(null);
    const req = new Request("http://localhost:3000/api/admin/social/accounts");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("menolak akses jika role tidak memiliki izin social (403)", async () => {
    mocks.getAdminActor.mockResolvedValueOnce({ role: "owner", permissions: {} });
    mocks.hasAdminPermission.mockReturnValue(false);
    const req = new Request("http://localhost:3000/api/admin/social/accounts");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("mengembalikan daftar akun sosial dengan isolasi scope kampus", async () => {
    mocks.getAdminActor.mockResolvedValueOnce({
      id: "admin-1",
      role: "university_admin",
      roles: [{ role_code: "university_admin" }],
    });
    mocks.hasAdminPermission.mockReturnValue(true);
    mocks.getAdminCampusScope.mockResolvedValueOnce(["USU"]);

    const mockAccounts = [
      {
        id: "acc-1",
        provider: "instagram",
        scope_type: "university",
        university_id: "usu",
        universities: { code: "USU", name: "Universitas Sumatera Utara" },
        handle: "usu.menfes",
        external_account_id: "17841430423153964",
        status: "connected",
      },
      {
        id: "acc-2",
        provider: "instagram",
        scope_type: "university",
        university_id: "polmed",
        universities: { code: "POLMED", name: "Politeknik Negeri Medan" },
        handle: "polmed.story",
        external_account_id: "17841430999999999",
        status: "not_connected",
      },
    ];

    const fakeQuery = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockAccounts, error: null }),
    };

    mocks.getAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue(fakeQuery),
    });

    const req = new Request("http://localhost:3000/api/admin/social/accounts");
    const res = await GET(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    // Hanya akun USU yang lolos filter scope admin
    expect(json.accounts).toHaveLength(1);
    expect(json.accounts[0].handle).toBe("usu.menfes");
    expect(json.stats.instagram).toBe(1);
  });

  it("menguji koneksi Meta Graph API via test_connection", async () => {
    mocks.getAdminActor.mockResolvedValueOnce({ role: "superadmin" });
    mocks.hasAdminPermission.mockReturnValue(true);
    mocks.resolveInstagramToken.mockResolvedValueOnce("valid-meta-token");

    const updateMock = vi.fn().mockReturnThis();
    const eqMock = vi.fn().mockResolvedValue({ error: null });
    updateMock.mockReturnValue({ eq: eqMock });

    mocks.getAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ update: updateMock }),
    });

    // Mock fetch ke Meta Graph API
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "17841430423153964",
        username: "usu.menfes",
        name: "USU Menfess Official",
      }),
    });

    const req = new Request("http://localhost:3000/api/admin/social/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "test_connection",
        accountId: "acc-1",
        externalAccountId: "17841430423153964",
        provider: "instagram",
      }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json.ok).toBe(true);
    expect(json.account.username).toBe("usu.menfes");

    global.fetch = originalFetch;
  });

  it("logInstagramDmMessage tidak crash pada environment test", async () => {
    const logId = await logInstagramDmMessage({
      recipientAccountId: "17841430423153964",
      senderId: "test-user-123",
      direction: "inbound",
      messageText: "Halo mau jual laptop",
    });
    expect(logId).toBe("test-log-id");
  });
});
