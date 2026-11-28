import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  isSupabaseConfigured: true,
}));

vi.mock("@/lib/linuskuSupabase", () => ({
  get getSupabaseClient() {
    return mocks.getSupabaseClient;
  },
  get isSupabaseConfigured() {
    return mocks.isSupabaseConfigured;
  },
}));

import { GET } from "@/app/linusku/api/health/route";

describe("GET /linusku/api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isSupabaseConfigured = true;
  });

  it("returns simulation mode 200 when Supabase is not configured", async () => {
    mocks.isSupabaseConfigured = false;
    mocks.getSupabaseClient.mockReturnValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.mode).toBe("simulation");
    expect(data.timestamp).toBeDefined();
  });

  it("returns database mode 200 when Supabase query succeeds", async () => {
    const mockSelect = vi.fn().mockResolvedValue({ count: 3, error: null });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    mocks.getSupabaseClient.mockReturnValue({ from: mockFrom });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.mode).toBe("database");
    expect(data.registeredBuses).toBe(3);
    expect(mockFrom).toHaveBeenCalledWith("buses");
  });

  it("returns 503 when Supabase data query fails", async () => {
    const mockSelect = vi.fn().mockResolvedValue({
      count: null,
      error: { message: "connection refused", code: "PGRST_ERR" },
    });
    const mockFrom = vi.fn().mockReturnValue({ select: mockSelect });
    mocks.getSupabaseClient.mockReturnValue({ from: mockFrom });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.ok).toBe(false);
    expect(data.error).toBe("Layanan data tidak tersedia.");
  });
});
