// Recruitment workflow rules: application stages, allowed transitions, interview validation,
// time-zone conversion and the illustrative placement commission. Pure functions over plain data.

// Stages in pipeline order. Keys are stored on applications; "submitted" is shown as "Applied".
export const STAGE_ORDER = [
  "submitted",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "interview_completed",
  "offer_extended",
  "hired",
];

export const TERMINAL_STAGES = ["hired", "rejected"];

// Moves a recruiter can make with a plain status change. The other stages are reached through a dedicated
// action that records the matching data: scheduling an interview, completing one, extending an offer, or
// confirming a hire (which creates the placement).
const MANUAL = {
  submitted: ["under_review", "shortlisted", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["rejected"],
  interview_scheduled: ["rejected"],
  interview_completed: ["rejected"],
  offer_extended: ["rejected"],
  hired: [],
  rejected: [],
};

// Every legal move, including those made by the dedicated actions.
const ALL = {
  submitted: ["under_review", "shortlisted", "rejected"],
  under_review: ["shortlisted", "rejected"],
  shortlisted: ["interview_scheduled", "rejected"],
  // Back to the previous stage when the only scheduled interview is cancelled.
  interview_scheduled: ["interview_completed", "shortlisted", "rejected"],
  interview_completed: ["interview_scheduled", "offer_extended", "rejected"],
  offer_extended: ["hired", "rejected"],
  hired: [],
  rejected: [],
};

export function manualTransitions(status) {
  return MANUAL[status] ?? [];
}

export function canTransition(from, to) {
  return (ALL[from] ?? []).includes(to);
}

export function isTerminal(status) {
  return TERMINAL_STAGES.includes(status);
}

// Index along the happy path, used by progress trackers. Rejected returns -1.
export function stageIndex(status) {
  return STAGE_ORDER.indexOf(status);
}

// Candidate-facing, gentle wording for each stage.
export const CANDIDATE_STAGE_TEXT = {
  submitted: "Your application was sent. The employer hasn't opened it yet.",
  under_review: "The employer is reviewing your application.",
  shortlisted: "You're on the shortlist. The employer may invite you to an interview.",
  interview_scheduled: "You have an interview scheduled. Check the details below.",
  interview_completed: "Your interview is done. The employer is deciding on next steps.",
  offer_extended: "You've received a job offer.",
  hired: "Congratulations — your hire is confirmed.",
  rejected: "The employer decided not to move forward with this application.",
};

// ---- Interviews ----

export const INTERVIEW_TYPES = {
  video: { label: "Video call" },
  phone: { label: "Phone call" },
  onsite: { label: "On-site" },
};

export const INTERVIEW_STATUSES = {
  scheduled: { label: "Scheduled", tone: "accent" },
  completed: { label: "Completed", tone: "success" },
  cancelled: { label: "Cancelled", tone: "error" },
};

export const RECOMMENDATIONS = {
  strong_hire: { label: "Strong hire", tone: "success" },
  hire: { label: "Hire", tone: "success" },
  undecided: { label: "Undecided", tone: "warning" },
  no_hire: { label: "No hire", tone: "error" },
};

export const TIME_ZONES = ["Africa/Casablanca", "Europe/Paris", "Europe/London", "UTC", "Asia/Dubai", "America/New_York"];

export const DURATIONS = [15, 30, 45, 60, 90, 120];

// Offset of `zone` from UTC, in minutes, at the given instant.
function zoneOffset(instant, zone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
      .formatToParts(new Date(instant))
      .map((p) => [p.type, p.value]),
  );
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - instant) / 60000);
}

// "2026-10-23" + "14:30" in "Europe/Paris" → UTC ISO string. Returns null for malformed input.
export function zonedToUtc(date, time, zone) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date ?? "");
  const t = /^(\d{2}):(\d{2})$/.exec(time ?? "");
  if (!d || !t || !TIME_ZONES.includes(zone)) return null;
  const wall = Date.UTC(+d[1], +d[2] - 1, +d[3], +t[1], +t[2]);
  // Two passes settle the offset around DST changes.
  let utc = wall - zoneOffset(wall, zone) * 60000;
  utc = wall - zoneOffset(utc, zone) * 60000;
  const result = new Date(utc);
  // Reject impossible dates such as 2026-02-31, which Date.UTC silently rolls over.
  return Number.isNaN(result.getTime()) || new Date(wall).getUTCDate() !== +d[3] ? null : result.toISOString();
}

// UTC ISO → { date: "YYYY-MM-DD", time: "HH:mm" } as seen in `zone`, for pre-filling forms.
export function utcToZoned(iso, zone) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: zone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
      .formatToParts(new Date(iso))
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

// Validates interview input and returns { errors, scheduledAt }. `now` is injectable for tests.
export function validateInterview(input, now = Date.now()) {
  const scheduledAt = zonedToUtc(input.date, input.time, input.timeZone);
  const duration = Number(input.durationMinutes);
  const errors = {
    date:
      (!input.date && "Choose a date.") ||
      (!scheduledAt && input.time && TIME_ZONES.includes(input.timeZone) && "Enter a valid date.") ||
      (scheduledAt && new Date(scheduledAt).getTime() <= now && "Choose a time in the future.") ||
      (scheduledAt && new Date(scheduledAt).getTime() > now + 365 * 86400000 && "Schedule within the next 12 months."),
    time: !/^\d{2}:\d{2}$/.test(input.time ?? "") && "Choose a start time.",
    timeZone: !TIME_ZONES.includes(input.timeZone) && "Choose a time zone.",
    durationMinutes: !(Number.isInteger(duration) && duration >= 15 && duration <= 240) && "Choose a duration between 15 minutes and 4 hours.",
    type: !INTERVIEW_TYPES[input.type] && "Choose an interview type.",
    interviewer: !(input.interviewer ?? "").trim() && "Enter the interviewer's name.",
    meetingUrl:
      (input.type === "video" && !(input.meetingUrl ?? "").trim() && "Add a meeting link, or generate a demo link.") ||
      ((input.meetingUrl ?? "").trim() && !isHttpsUrl(input.meetingUrl.trim()) && "Use a full https:// link."),
    location: input.type === "onsite" && !(input.location ?? "").trim() && "Enter the address for an on-site interview.",
    instructions: (input.instructions ?? "").length > 1000 && "Keep instructions under 1,000 characters.",
  };
  return { errors, scheduledAt };
}

// ---- Placement commission ----

export const COMMISSION_MODELS = {
  percentage: { label: "Percentage of reference amount" },
  fixed: { label: "Fixed fee per placement" },
};

export const PLACEMENT_STATUSES = {
  confirmed: { label: "Hire confirmed", tone: "accent" },
  started: { label: "Candidate started", tone: "success" },
  cancelled: { label: "Cancelled", tone: "error" },
};

export const PLACEMENT_TRANSITIONS = {
  confirmed: ["started", "cancelled"],
  started: ["cancelled"],
  cancelled: [],
};

// Illustrative values only; administrators change them in the placements screen.
export const DEFAULT_COMMISSION = {
  model: "percentage",
  ratePercent: 8,
  fixedFee: 5000,
  defaultReferenceAmount: 96000,
  currency: "MAD",
};

export function validateCommissionSettings(input) {
  const rate = Number(input.ratePercent);
  const fee = Number(input.fixedFee);
  const reference = Number(input.defaultReferenceAmount);
  return {
    model: !COMMISSION_MODELS[input.model] && "Choose a commission model.",
    ratePercent: !(Number.isFinite(rate) && rate > 0 && rate <= 50) && "Use a rate above 0 and up to 50%.",
    fixedFee: !(Number.isFinite(fee) && fee >= 0) && "Use an amount of 0 or more.",
    defaultReferenceAmount: !(Number.isFinite(reference) && reference > 0) && "Use an amount above 0.",
    currency: !/^[A-Z]{3}$/.test(input.currency ?? "") && "Use a three-letter currency code.",
  };
}

// Snapshot stored on the placement, so later settings changes don't rewrite past calculations.
export function computeCommission(settings, offerAmount) {
  const fromOffer = Number(offerAmount) > 0;
  const referenceAmount = fromOffer ? Number(offerAmount) : settings.defaultReferenceAmount;
  const amount = settings.model === "fixed" ? settings.fixedFee : Math.round((referenceAmount * settings.ratePercent) / 100);
  return {
    model: settings.model,
    ratePercent: settings.model === "percentage" ? settings.ratePercent : null,
    fixedFee: settings.model === "fixed" ? settings.fixedFee : null,
    referenceAmount,
    referenceSource: fromOffer ? "offer" : "default",
    amount,
    currency: settings.currency,
  };
}

export function formatMoney(amount, currency = "MAD") {
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(amount)} ${currency}`;
}
