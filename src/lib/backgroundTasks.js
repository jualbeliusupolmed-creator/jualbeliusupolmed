export async function registerBackgroundTask(task) {
  if (process.env.NODE_ENV !== "production") return;

  if (process.env.VERCEL === "1") {
    const { waitUntil } = await import("@vercel/functions");
    waitUntil(task);
    return;
  }

  if (process.env.NEXTJS_ENV !== "production") return;

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  getCloudflareContext().ctx.waitUntil(task);
}
