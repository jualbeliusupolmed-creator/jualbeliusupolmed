export function getOpenPoBatchMetrics(batch) {
  const rawQuota = Number(batch?.quota);
  const rawReserved = Number(batch?.reserved);
  const quota = Number.isFinite(rawQuota) ? Math.max(0, rawQuota) : 0;
  const reserved = Number.isFinite(rawReserved) ? Math.max(0, rawReserved) : 0;

  return {
    quota,
    reserved,
    remaining: Math.max(0, quota - reserved),
    progress: quota > 0 ? Math.min(100, Math.round((reserved / quota) * 100)) : 0,
    photo: typeof batch?.photo === "string" ? batch.photo : "",
    closesAt: batch?.closes_at || null,
  };
}
