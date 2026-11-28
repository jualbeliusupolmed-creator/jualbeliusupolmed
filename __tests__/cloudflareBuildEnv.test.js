import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  EMPTY_CLOUDFLARE_ENV,
  sanitizeCloudflareEnvFile,
} from "../scripts/cloudflareEnv.mjs";

describe("Cloudflare build environment sanitizer", () => {
  let temporaryDirectory;

  afterEach(async () => {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true });
      temporaryDirectory = undefined;
    }
  });

  it("removes values compiled from local environment files", async () => {
    temporaryDirectory = await mkdtemp(join(tmpdir(), "cloudflare-build-env-"));
    const envFile = join(temporaryDirectory, "next-env.mjs");
    await writeFile(envFile, 'export const production = {"PRIVATE_KEY":"sample"};');

    await sanitizeCloudflareEnvFile(envFile);

    expect(await readFile(envFile, "utf8")).toBe(EMPTY_CLOUDFLARE_ENV);
  });
});
