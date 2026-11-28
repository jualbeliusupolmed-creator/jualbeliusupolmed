import { describe, expect, it, vi } from "vitest";
import {
  addLinuskuServiceWorkerScope,
  handleLinuskuServiceWorker,
} from "@/lib/cloudflareServiceWorker";

describe("LINUSKU service worker response", () => {
  it("allows the worker script to control the canonical LINUSKU path", async () => {
    const request = new Request("https://example.test/linusku/sw.js");
    const response = new Response("worker script", {
      headers: { "content-type": "application/javascript" },
    });

    const result = addLinuskuServiceWorkerScope(request, response);

    expect(result.status).toBe(200);
    expect(result.headers.get("Service-Worker-Allowed")).toBe("/linusku");
    expect(result.headers.get("content-type")).toBe("application/javascript");
    expect(await result.text()).toBe("worker script");
  });

  it("leaves other paths and unsuccessful responses unchanged", () => {
    const response = new Response("not found", { status: 404 });

    expect(
      addLinuskuServiceWorkerScope(
        new Request("https://example.test/other/sw.js"),
        response
      )
    ).toBe(response);
    expect(
      addLinuskuServiceWorkerScope(
        new Request("https://example.test/linusku/sw.js"),
        response
      )
    ).toBe(response);
  });

  it("fetches from ASSETS binding when run_worker_first intercepts sw.js", async () => {
    const request = new Request("https://example.test/linusku/sw.js");
    const assetResponse = new Response("self.__SW_MANIFEST = [];", {
      status: 200,
      headers: { "content-type": "application/javascript" },
    });
    const env = {
      ASSETS: {
        fetch: vi.fn().mockResolvedValue(assetResponse),
      },
    };

    const result = await handleLinuskuServiceWorker(request, env);

    expect(env.ASSETS.fetch).toHaveBeenCalledWith(request);
    expect(result).not.toBeNull();
    expect(result.status).toBe(200);
    expect(result.headers.get("Service-Worker-Allowed")).toBe("/linusku");
    expect(await result.text()).toBe("self.__SW_MANIFEST = [];");
  });

  it("returns null for non-sw paths or when ASSETS binding is missing", async () => {
    const request = new Request("https://example.test/linusku/other.js");
    const env = { ASSETS: { fetch: vi.fn() } };

    expect(await handleLinuskuServiceWorker(request, env)).toBeNull();
    expect(env.ASSETS.fetch).not.toHaveBeenCalled();

    const swRequest = new Request("https://example.test/linusku/sw.js");
    expect(await handleLinuskuServiceWorker(swRequest, {})).toBeNull();
  });
});
