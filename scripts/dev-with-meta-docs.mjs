import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { syncMetaHtml } from "./sync-meta-docs.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nextCli = path.join(root, "node_modules/next/dist/bin/next");
const commandArgs = process.argv.slice(2);

if (!commandArgs.length) {
  console.error("Provide a Next.js command, for example: dev or dev --turbo.");
  process.exit(2);
}

await syncMetaHtml();

const { watch } = await import("node:fs");
let timer;
const watcher = watch(path.join(root, "docs/meta.md"), () => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    syncMetaHtml().catch((error) => {
      console.error("Could not regenerate docs/meta.html:", error);
    });
  }, 120);
});

const child = spawn(process.execPath, [nextCli, ...commandArgs], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

let stopping = false;
const stop = (signal) => {
  if (stopping) return;
  stopping = true;
  watcher.close();
  clearTimeout(timer);
  if (!child.killed) child.kill(signal);
};

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

child.on("error", (error) => {
  console.error("Could not start Next.js:", error);
  watcher.close();
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  watcher.close();
  clearTimeout(timer);
  process.exitCode = signal ? 1 : (code ?? 1);
});
