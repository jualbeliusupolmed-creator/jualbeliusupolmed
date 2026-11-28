const CRON_ROUTES = Object.freeze({
  "0 8 * * *": ["/api/cron/expire", "/api/cron/auto-bump"],
  "0 0 * * *": ["/api/cron/broadcast"],
  "0 6 * * *": ["/api/cron/distributor-digest"],
});

export function getCloudflareCronRoutes(schedule, scheduledTime) {
  if (schedule === "0 1,2,3 * * *") {
    if (!Number.isFinite(scheduledTime)) {
      throw new Error("Scheduled time is required for grouped Cloudflare cron schedules");
    }

    const scheduledDate = new Date(scheduledTime);
    switch (scheduledDate.getUTCHours()) {
      case 1:
        return [
          "/api/cron/daily-digest",
          ...(scheduledDate.getUTCDay() === 1 ? ["/api/cron/weekly-report"] : []),
        ];
      case 2:
        return ["/api/cron/deal-followup"];
      case 3:
        return ["/api/cron/instagram-menfess"];
      default:
        throw new Error(`Unexpected hour for grouped Cloudflare cron schedule: ${scheduledDate.getUTCHours()}`);
    }
  }

  const routes = CRON_ROUTES[schedule];
  if (!routes) throw new Error(`Unknown Cloudflare cron schedule: ${schedule}`);
  return routes;
}

export async function dispatchCloudflareCron(controller, env) {
  const routes = getCloudflareCronRoutes(controller.cron, controller.scheduledTime);
  if (!env.CRON_SECRET) throw new Error("CRON_SECRET is required for scheduled tasks");
  if (typeof env.WORKER_SELF_REFERENCE?.fetch !== "function") {
    throw new Error("WORKER_SELF_REFERENCE service binding is required for scheduled tasks");
  }

  const responses = await Promise.all(
    routes.map((route) =>
      env.WORKER_SELF_REFERENCE.fetch(
        new Request(`https://www.kampuskita.my.id${route}`, {
          headers: { authorization: `Bearer ${env.CRON_SECRET}` },
        })
      )
    )
  );
  const failedRoutes = responses.flatMap((response, index) =>
    response.ok ? [] : [`${routes[index]} (${response.status})`]
  );
  if (failedRoutes.length) {
    throw new Error(`Cloudflare cron ${controller.cron} failed for ${failedRoutes.join(", ")}`);
  }
}
