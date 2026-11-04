import { afterEach, describe, expect, it, vi } from "vitest";
import { subscribeInstagramWebhooks } from "./instagramWebhooks";

describe("Instagram webhook account subscriptions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("subscribes only required messaging fields without placing the token in the URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("META_GRAPH_API_VERSION", "v26.0");

    await expect(subscribeInstagramWebhooks({
      accessToken: "private-token",
      instagramUserId: "17841430000000001",
    })).resolves.toEqual({ ok: true });

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe(
      "https://graph.instagram.com/v26.0/17841430000000001/subscribed_apps"
    );
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer private-token");
    expect(options.body).toBe("subscribed_fields=messages%2Cmessaging_postbacks");
    expect(String(url)).not.toContain("private-token");
    expect(options.body).not.toContain("private-token");
  });

  it("fails safely for invalid credentials and rejected provider responses", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: {
          code: 10,
          message: "Private provider detail",
          fbtrace_id: "private-trace",
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(subscribeInstagramWebhooks({
      accessToken: "private-token",
      instagramUserId: "not-an-id",
    })).resolves.toEqual({ ok: false, error: "invalid_credentials" });
    expect(fetchMock).not.toHaveBeenCalled();

    const result = await subscribeInstagramWebhooks({
      accessToken: "private-token",
      instagramUserId: "17841430000000001",
    });
    expect(result).toEqual({ ok: false, status: 403, code: 10 });
    expect(JSON.stringify(result)).not.toContain("Private provider detail");
    expect(JSON.stringify(result)).not.toContain("private-trace");
  });
});
