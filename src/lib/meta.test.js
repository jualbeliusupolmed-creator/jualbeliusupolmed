import { afterEach, describe, expect, it, vi } from "vitest";
import { postToInstagram } from "./meta";

function jsonResponse(data, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(data),
  };
}

describe("Meta Instagram publisher", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("creates, polls, and publishes without placing the token in URL/body", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ id: "container-1" }))
      .mockResolvedValueOnce(jsonResponse({ status_code: "IN_PROGRESS" }))
      .mockResolvedValueOnce(jsonResponse({ status_code: "FINISHED" }))
      .mockResolvedValueOnce(jsonResponse({ id: "media-1" }));
    vi.stubGlobal("fetch", fetchMock);
    const onContainerCreated = vi.fn();

    const result = await postToInstagram(
      "ig-user",
      "secret-token",
      "https://example.test/post.jpg",
      "Caption",
      { onContainerCreated, maxPolls: 3, pollIntervalMs: 0 },
    );

    expect(result).toMatchObject({ id: "media-1", creation_id: "container-1" });
    expect(onContainerCreated).toHaveBeenCalledWith("container-1");
    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [url, options] of fetchMock.mock.calls) {
      expect(url).not.toContain("secret-token");
      expect(String(options.body || "")).not.toContain("secret-token");
      expect(options.headers.Authorization).toBe("Bearer secret-token");
    }
  });

  it("reuses a published container instead of creating a duplicate", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ status_code: "PUBLISHED" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await postToInstagram(
      "ig-user",
      "secret-token",
      "https://example.test/post.jpg",
      "Caption",
      { creationId: "existing-container", pollIntervalMs: 0 },
    );

    expect(result).toMatchObject({
      creation_id: "existing-container",
      already_published: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("existing-container?fields=status_code");
  });

  it("returns a bounded Meta error without exposing credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse({
      error: { message: "Permission denied", code: 10 },
    }, { ok: false, status: 403 })));

    await expect(postToInstagram(
      "ig-user",
      "secret-token",
      "https://example.test/post.jpg",
      "Caption",
    )).rejects.toThrow("Permission denied [10]");
  });
});

