// Local-time date helpers for the calendar views. Weeks start on Monday.

export function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date, months) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function startOfWeek(date) {
  const d = startOfDay(date);
  return addDays(d, -((d.getDay() + 6) % 7));
}

export function startOfMonth(date) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

// "YYYY-MM-DD" in local time, used to bucket events by the day the viewer sees them on.
export function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isSameDay(a, b) {
  return dayKey(a) === dayKey(b);
}

// A date-only value ("2026-11-02") is a calendar day, not an instant: parse it as local midnight
// so it never shifts to the previous day west of UTC.
export function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : new Date(value);
}

// The 6 full weeks shown for the month containing `date`.
export function monthGrid(date) {
  const first = startOfWeek(startOfMonth(date));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

export function weekDays(date) {
  const first = startOfWeek(date);
  return Array.from({ length: 7 }, (_, i) => addDays(first, i));
}

// Events grouped by local day, each day sorted by start (all-day entries first).
export function groupByDay(events) {
  const groups = new Map();
  for (const event of events) {
    const key = dayKey(event.start);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(event);
  }
  for (const list of groups.values()) {
    list.sort((a, b) => (a.allDay === b.allDay ? a.start - b.start : a.allDay ? -1 : 1));
  }
  return groups;
}
