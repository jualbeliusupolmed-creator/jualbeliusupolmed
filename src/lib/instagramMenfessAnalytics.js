const MAX_RANGE_DAYS = 90;

function jakartaDate(date) {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Jakarta" }).format(date);
}

function shiftDate(dateText, days) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateOnly(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ""))) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function resolveInstagramMenfessDateRange({ period, from, to, now = new Date() }) {
  if (!["today", "7d", "30d", "custom"].includes(period)) {
    throw new Error("Periode analitik tidak valid.");
  }
  let startDate;
  let endDate;
  if (period === "custom") {
    if (!dateOnly(from) || !dateOnly(to) || from > to) {
      throw new Error("Rentang tanggal kustom tidak valid.");
    }
    startDate = from;
    endDate = to;
  } else {
    const today = jakartaDate(now);
    endDate = today;
    const days = period === "today" ? 1 : period === "30d" ? 30 : 7;
    startDate = shiftDate(today, -(days - 1));
  }

  const durationMs = Date.parse(`${endDate}T00:00:00.000Z`) -
    Date.parse(`${startDate}T00:00:00.000Z`);
  const days = Math.floor(durationMs / 86_400_000) + 1;
  if (days < 1 || days > MAX_RANGE_DAYS) {
    throw new Error(`Rentang analitik maksimal ${MAX_RANGE_DAYS} hari.`);
  }
  return {
    from: startDate,
    to: endDate,
    startAt: new Date(`${startDate}T00:00:00+07:00`).toISOString(),
    endAt: new Date(`${shiftDate(endDate, 1)}T00:00:00+07:00`).toISOString(),
    days,
  };
}

function jakartaParts(value) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date(value));
  return Object.fromEntries(parts.map(({ type, value: part }) => [type, part]));
}

const WEEKDAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

export function summarizeInstagramMenfessAnalytics({
  events = [],
  priorSenderIds = new Set(),
  dateRange,
  truncated = false,
}) {
  const daily = new Map();
  for (let offset = 0; offset < dateRange.days; offset += 1) {
    const date = shiftDate(dateRange.from, offset);
    daily.set(date, 0);
  }

  const activeSenders = new Set();
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0 }));
  const weekdays = WEEKDAYS.map((day, weekday) => ({ day, weekday, total: 0 }));
  for (const event of events) {
    const senderId = String(event.sender_id || "").trim();
    if (senderId) activeSenders.add(senderId);
    const parts = jakartaParts(event.created_at);
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    if (daily.has(date)) daily.set(date, daily.get(date) + 1);
    const hour = Number(parts.hour);
    const weekday = WEEKDAY_INDEX[parts.weekday];
    if (hourly[hour]) hourly[hour].total += 1;
    if (weekdays[weekday]) weekdays[weekday].total += 1;
  }

  let newSenders = 0;
  for (const senderId of activeSenders) {
    if (!priorSenderIds.has(senderId)) newSenders += 1;
  }

  return {
    summary: {
      received: events.length,
      activeSenders: activeSenders.size,
      newSenders,
      returningSenders: activeSenders.size - newSenders,
    },
    daily: [...daily.entries()].map(([date, total]) => ({ date, total })),
    hourly,
    weekdays,
    truncated,
  };
}
