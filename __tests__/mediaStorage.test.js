import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadMedia } from "@/lib/mediaStorage";

vi.mock("@/lib/supabaseAdmin", () => ({
  getAdminClient: vi.fn(),
}));

import { getAdminClient } from "@/lib/supabaseAdmin";

describe("mediaStorage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("fallback ke Supabase Storage saat R2 belum dikonfigurasi", async () => {
    delete process.env.R2_ACCOUNT_ID;
    delete process.env.R2_ACCESS_KEY_ID;
    delete process.env.R2_SECRET_ACCESS_KEY;

    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://supabase.co/storage/v1/object/public/listings/test.webp" },
    });

    getAdminClient.mockReturnValue({
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockUpload,
          getPublicUrl: mockGetPublicUrl,
        }),
      },
    });

    const result = await uploadMedia(Buffer.from("dummy"), "test.webp");

    expect(result.provider).toBe("supabase");
    expect(result.url).toBe("https://supabase.co/storage/v1/object/public/listings/test.webp");
    expect(mockUpload).toHaveBeenCalledWith(
      "test.webp",
      expect.any(Buffer),
      expect.objectContaining({ contentType: "image/webp" })
    );
  });
});

