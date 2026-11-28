import { spawn } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sanitizeCloudflareEnvFile } from "./cloudflareEnv.mjs";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const envFilePath = resolve(projectRoot, ".open-next/cloudflare/next-env.mjs");
const adapterCli = resolve(
  projectRoot,
  "node_modules/@opennextjs/cloudflare/dist/cli/index.js"
);
const allowedEnvironment = new Set([
  "CI",
  "HOME",
  "LANG",
  "LC_ALL",
  "PATH",
  "SHELL",
  "TEMP",
  "TMP",
  "TMPDIR",
  "USER",
]);
const buildEnvironment = Object.fromEntries(
  Object.entries(process.env).filter(
    ([name]) => allowedEnvironment.has(name) || name.startsWith("NEXT_PUBLIC_")
  )
);
buildEnvironment.NODE_ENV = "production";
buildEnvironment.NEXTJS_ENV = "production";

let buildResult;
try {
  buildResult = await new Promise((resolveResult, reject) => {
    const child = spawn(process.execPath, [adapterCli, "build"], {
      cwd: projectRoot,
      env: buildEnvironment,
      stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code, signal) => resolveResult({ code, signal }));
  });
} finally {
  await sanitizeCloudflareEnvFile(envFilePath);
}

if (buildResult.code !== 0) {
  const reason = buildResult.signal ? `signal ${buildResult.signal}` : `exit code ${buildResult.code}`;
  throw new Error(`Cloudflare build failed with ${reason}`);
}
