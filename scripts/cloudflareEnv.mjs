export const EMPTY_CLOUDFLARE_ENV = [
  "export const production = {};",
  "export const development = {};",
  "export const test = {};",
  "",
].join("\n");

export async function sanitizeCloudflareEnvFile(filePath) {
  const { mkdir, writeFile } = await import("node:fs/promises");
  const { dirname } = await import("node:path");

  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, EMPTY_CLOUDFLARE_ENV, { mode: 0o600 });
}
