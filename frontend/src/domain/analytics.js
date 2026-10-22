// Pure aggregation helpers for the company analytics page. Everything is derived from recorded dates and statuses.
import { STAGE_ORDER } from "./recruitment.js";

export const ANALYTICS_RANGES = {
  "30d": { label: "30 days", days: 30 },
  "90d": { label: "90 days", days: 90 },
  "12m": { label: "12 months", days: 365 },
  all: { label: "All time", days: null },
};

const DAY = 86400000;

function periodStart(date, unit) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  if (unit === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (unit === "month") d.setDate(1);
  return d;
}

function nextPeriod(date, unit) {
  const d = new Date(date);
  if (unit === "day") d.setDate(d.getDate() + 1);
  if (unit === "week") d.setDate(d.getDate() + 7);
  if (unit === "month") d.setMonth(d.getMonth() + 1);
  return d;
}

// Day buckets up to a month, weeks up to ~6 months, months beyond, so a chart keeps a readable number of columns.
export function bucketUnit(spanDays) {
  if (spanDays <= 31) return "day";
  if (spanDays <= 190) return "week";
  return "month";
}

// Counts `dates` (ISO strings) per period from `since` to `now`, including empty periods.
export function countByPeriod(dates, { since, now = new Date() }) {
  const end = new Date(now);
  const start = since ? new Date(since) : dates.length ? new Date(Math.min(...dates.map((d) => new Date(d).getTime()))) : new Date(end.getTime() - 30 * DAY);
  const unit = bucketUnit((end - start) / DAY);
  const buckets = [];
  for (let cursor = periodStart(start, unit); cursor <= end; cursor = nextPeriod(cursor, unit)) {
    buckets.push({ start: cursor.toISOString(), end: nextPeriod(cursor, unit).toISOString(), count: 0 });
  }
  for (const iso of dates) {
    const t = new Date(iso).getTime();
    const bucket = buckets.find((b) => t >= new Date(b.start).getTime() && t < new Date(b.end).getTime());
    if (bucket) bucket.count += 1;
  }
  return { unit, buckets };
}

// Furthest happy-path stage an application reached, from its history, so rejected ones still count where they got to.
export function furthestStage(app) {
  return Math.max(-1, STAGE_ORDER.indexOf(app.status), ...(app.history ?? []).map((h) => STAGE_ORDER.indexOf(h.status)));
}

// Whole-number percentages that add up to exactly 100 (largest remainder), or all 0 when there is nothing to share.
export function percentages(values) {
  const total = values.reduce((sum, v) => sum + v, 0);
  if (!total) return values.map(() => 0);
  const exact = values.map((v) => (100 * v) / total);
  const result = exact.map(Math.floor);
  const order = exact.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
  const missing = 100 - result.reduce((sum, v) => sum + v, 0);
  for (let k = 0; k < missing; k++) result[order[k][1]] += 1;
  return result;
}

// How many applications reached each stage.
export function stageFunnel(apps) {
  const reached = apps.map(furthestStage);
  return STAGE_ORDER.map((status, i) => ({ status, count: reached.filter((r) => r >= i).length }));
}
