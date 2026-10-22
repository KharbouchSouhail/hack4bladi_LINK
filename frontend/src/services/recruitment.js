// Recruitment workflow shared by the company and admin APIs: stage changes, interviews, feedback, offers
// and hires. Callers check who may act on the application first; these functions enforce the workflow rules.
import { APPLICATION_STATUSES } from "../domain/constants.js";
import {
  canTransition,
  computeCommission,
  INTERVIEW_TYPES,
  isTerminal,
  manualTransitions,
  RECOMMENDATIONS,
  validateInterview,
} from "../domain/recruitment.js";
import { formatDate } from "../lib/format.js";
import { findOr404, logActivity, newId, notify, validate } from "./core.js";
import { ValidationError } from "./errors.js";

// Demo meeting rooms. Set VITE_DEMO_MEETING_URL to point generated links at another service.
export const DEMO_MEETING_BASE = (import.meta.env?.VITE_DEMO_MEETING_URL || "https://meet.jit.si/").replace(/\/?$/, "/");

export function demoMeetingLink() {
  return `${DEMO_MEETING_BASE}CareerBridge-Demo-${Math.random().toString(36).slice(2, 10)}`;
}

export function isDemoLink(url) {
  return Boolean(url) && url.startsWith(DEMO_MEETING_BASE);
}

const LINKS = {
  candidate: (appId) => `/candidate/applications/${appId}`,
  company: (appId) => `/company/candidates/${appId}`,
  admin: (appId) => `/admin/applications/${appId}`,
};

function context(draft, app) {
  const job = draft.jobs.find((j) => j.id === app.jobId);
  const company = draft.companies.find((c) => c.id === job.companyId);
  const candidate = draft.candidates.find((c) => c.id === app.candidateId);
  return { job, company, candidate };
}

function toCandidate(draft, app, text, type, ref = {}) {
  notify(draft, `candidate:${app.candidateId}`, text, LINKS.candidate(app.id), { type, ref: { applicationId: app.id, ...ref } });
}

// The employer hears about changes it didn't make itself (an admin acting, or the candidate).
function toEmployer(draft, app, actor, text, type, ref = {}) {
  if (actor.role === "company") return;
  const { company } = context(draft, app);
  notify(draft, `company:${company.id}`, text, LINKS.company(app.id), { type, ref: { applicationId: app.id, ...ref } });
}

function trimmed(value) {
  return (value ?? "").trim();
}

function setStage(draft, app, status, actor, note = "") {
  if (!canTransition(app.status, status)) {
    throw new ValidationError(
      {},
      `An application that is “${APPLICATION_STATUSES[app.status]?.label ?? app.status}” can't move to “${APPLICATION_STATUSES[status]?.label ?? status}”.`,
    );
  }
  const now = new Date().toISOString();
  app.status = status;
  app.updatedAt = now;
  // `note` is internal: candidate views only receive the status and date of each entry.
  app.history.push({ status, at: now, note: trimmed(note), by: actor.name });
}

const STAGE_MESSAGES = {
  under_review: (job) => `Your application for ${job.title} is now under review.`,
  shortlisted: (job) => `Good news: you've been shortlisted for ${job.title}.`,
  rejected: (job) => `Update on ${job.title}: the employer has decided not to move forward with your application.`,
};

function activeInterview(draft, appId) {
  return draft.interviews.find((i) => i.applicationId === appId && i.status === "scheduled") ?? null;
}

function appFor(draft, interview) {
  return findOr404(draft.applications, interview.applicationId, "Application");
}

// ---- Stage changes ----

// Plain status changes. Interviews, offers and hires go through their own actions below.
export function changeStage(draft, appId, status, note, actor) {
  if (!APPLICATION_STATUSES[status]) throw new ValidationError({ status: "Choose a status." });
  const app = findOr404(draft.applications, appId, "Application");
  if (status === app.status) throw new ValidationError({}, `This application is already “${APPLICATION_STATUSES[status].label}”.`);
  if (!manualTransitions(app.status).includes(status)) {
    const hint = {
      interview_scheduled: "Schedule an interview to move it there.",
      interview_completed: "Mark the interview as completed to move it there.",
      offer_extended: "Use “Extend offer” to move it there.",
      hired: "Use “Confirm hire” to move it there.",
    }[status];
    throw new ValidationError(
      {},
      `An application that is “${APPLICATION_STATUSES[app.status].label}” can't be moved to “${APPLICATION_STATUSES[status].label}” directly.${hint ? ` ${hint}` : ""}`,
    );
  }
  if (status === "rejected") return rejectApplication(draft, appId, note, actor);

  const { job, candidate } = context(draft, app);
  setStage(draft, app, status, actor, note);
  toCandidate(draft, app, STAGE_MESSAGES[status](job), "status");
  toEmployer(draft, app, actor, `${candidate.name}'s application for ${job.title} moved to ${APPLICATION_STATUSES[status].label}.`, "status");
  logActivity(draft, `${candidate.name}'s application for ${job.title} moved to ${APPLICATION_STATUSES[status].label}`);
  return app;
}

// Closing an application also cancels its scheduled interview and withdraws an open offer,
// so no contradictory records remain.
export function rejectApplication(draft, appId, note, actor) {
  const app = findOr404(draft.applications, appId, "Application");
  if (isTerminal(app.status)) throw new ValidationError({}, `This application is already closed (${APPLICATION_STATUSES[app.status].label}).`);
  const { job, candidate } = context(draft, app);
  const now = new Date().toISOString();

  for (const interview of draft.interviews.filter((i) => i.applicationId === app.id && i.status === "scheduled")) {
    interview.status = "cancelled";
    interview.cancelReason = "The application was closed.";
    interview.updatedAt = now;
    interview.history.push({ action: "cancelled", at: now, by: actor.name, detail: "Application closed" });
  }
  if (app.offer?.status === "extended") Object.assign(app.offer, { status: "withdrawn", closedAt: now });

  setStage(draft, app, "rejected", actor, note);
  toCandidate(draft, app, STAGE_MESSAGES.rejected(job), "rejected");
  toEmployer(draft, app, actor, `${candidate.name}'s application for ${job.title} was closed by an administrator.`, "rejected");
  logActivity(draft, `${candidate.name}'s application for ${job.title} was rejected`);
  return app;
}

// ---- Interviews ----

function interviewFields(input, scheduledAt) {
  const meetingUrl = trimmed(input.meetingUrl);
  return {
    scheduledAt,
    durationMinutes: Number(input.durationMinutes),
    timeZone: input.timeZone,
    type: input.type,
    interviewer: trimmed(input.interviewer),
    meetingUrl,
    isDemoLink: isDemoLink(meetingUrl),
    location: input.type === "onsite" ? trimmed(input.location) : "",
    instructions: trimmed(input.instructions),
  };
}

function when(interview) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: interview.timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    new Date(interview.scheduledAt),
  );
  return `${formatDate(interview.scheduledAt)} at ${time} (${interview.timeZone})`;
}

export function scheduleInterview(draft, appId, input, actor, now = Date.now()) {
  const app = findOr404(draft.applications, appId, "Application");
  if (!["shortlisted", "interview_completed"].includes(app.status)) {
    throw new ValidationError(
      {},
      app.status === "interview_scheduled"
        ? "This candidate already has an interview scheduled. Reschedule or cancel it instead."
        : `Shortlist the candidate before scheduling an interview (current stage: ${APPLICATION_STATUSES[app.status].label}).`,
    );
  }
  if (activeInterview(draft, appId)) throw new ValidationError({}, "This candidate already has an interview scheduled. Reschedule or cancel it instead.");

  const { errors, scheduledAt } = validateInterview(input, now);
  validate(errors);

  const { job, candidate, company } = context(draft, app);
  const at = new Date().toISOString();
  const interview = {
    id: newId("int"),
    applicationId: app.id,
    candidateId: app.candidateId,
    jobId: job.id,
    companyId: company.id,
    round: draft.interviews.filter((i) => i.applicationId === app.id && i.status !== "cancelled").length + 1,
    ...interviewFields(input, scheduledAt),
    status: "scheduled",
    rescheduleCount: 0,
    previousScheduledAt: null,
    cancelReason: "",
    candidateConfirmedAt: null,
    feedback: null,
    createdBy: actor.name,
    createdAt: at,
    updatedAt: at,
    history: [{ action: "scheduled", at, by: actor.name, detail: when({ ...interviewFields(input, scheduledAt) }) }],
  };
  draft.interviews.push(interview);
  setStage(draft, app, "interview_scheduled", actor, `Interview round ${interview.round} scheduled`);

  toCandidate(
    draft,
    app,
    `Interview invitation for ${job.title}: ${INTERVIEW_TYPES[interview.type].label.toLowerCase()} on ${when(interview)}.`,
    "interview",
    { interviewId: interview.id },
  );
  toEmployer(draft, app, actor, `An interview with ${candidate.name} for ${job.title} was scheduled for ${when(interview)}.`, "interview", {
    interviewId: interview.id,
  });
  logActivity(draft, `Interview scheduled with ${candidate.name} for ${job.title}`);
  return interview;
}

export function rescheduleInterview(draft, interviewId, input, actor, now = Date.now()) {
  const interview = findOr404(draft.interviews, interviewId, "Interview");
  if (interview.status !== "scheduled") throw new ValidationError({}, `A ${interview.status} interview can't be rescheduled.`);
  const { errors, scheduledAt } = validateInterview(input, now);
  validate(errors);

  const next = interviewFields(input, scheduledAt);
  const changed = Object.keys(next).some((key) => next[key] !== interview[key]);
  if (!changed) throw new ValidationError({}, "Nothing changed. Edit the date, time or details to reschedule.");

  const app = appFor(draft, interview);
  const { job, candidate } = context(draft, app);
  const moved = next.scheduledAt !== interview.scheduledAt;
  const at = new Date().toISOString();
  if (moved) {
    interview.previousScheduledAt = interview.scheduledAt;
    interview.rescheduleCount += 1;
    // The candidate confirmed the old time, not this one.
    interview.candidateConfirmedAt = null;
  }
  Object.assign(interview, next, { updatedAt: at });
  interview.history.push({ action: moved ? "rescheduled" : "updated", at, by: actor.name, detail: when(interview) });

  toCandidate(
    draft,
    app,
    moved ? `Your interview for ${job.title} was rescheduled to ${when(interview)}.` : `The details of your interview for ${job.title} were updated.`,
    "interview_changed",
    { interviewId },
  );
  toEmployer(draft, app, actor, `The interview with ${candidate.name} for ${job.title} was ${moved ? "rescheduled" : "updated"}.`, "interview_changed", {
    interviewId,
  });
  logActivity(draft, `Interview with ${candidate.name} for ${job.title} ${moved ? "rescheduled" : "updated"}`);
  return interview;
}

// `reason` is shared with the candidate.
export function cancelInterview(draft, interviewId, reason, actor) {
  const interview = findOr404(draft.interviews, interviewId, "Interview");
  if (interview.status !== "scheduled") throw new ValidationError({}, `This interview is already ${interview.status}.`);
  validate({ reason: trimmed(reason).length > 500 && "Keep the message under 500 characters." });

  const app = appFor(draft, interview);
  const { job, candidate } = context(draft, app);
  const at = new Date().toISOString();
  Object.assign(interview, { status: "cancelled", cancelReason: trimmed(reason), updatedAt: at });
  interview.history.push({ action: "cancelled", at, by: actor.name, detail: trimmed(reason) });

  // Back to where the candidate stood before this round.
  if (app.status === "interview_scheduled") {
    const earlierRound = draft.interviews.some((i) => i.applicationId === app.id && i.status === "completed");
    setStage(draft, app, earlierRound ? "interview_completed" : "shortlisted", actor, `Interview round ${interview.round} cancelled`);
  }

  toCandidate(draft, app, `Your interview for ${job.title} on ${when(interview)} was cancelled.`, "interview_cancelled", { interviewId });
  toEmployer(draft, app, actor, `The interview with ${candidate.name} for ${job.title} was cancelled.`, "interview_cancelled", { interviewId });
  logActivity(draft, `Interview with ${candidate.name} for ${job.title} cancelled`);
  return interview;
}

// Feedback is internal: candidate views never include it.
export function completeInterview(draft, interviewId, feedback, actor, now = Date.now()) {
  const interview = findOr404(draft.interviews, interviewId, "Interview");
  if (interview.status !== "scheduled") throw new ValidationError({}, `This interview is already ${interview.status}.`);
  if (new Date(interview.scheduledAt).getTime() > now) {
    throw new ValidationError({}, "This interview hasn't started yet. You can mark it completed once its start time has passed.");
  }
  const rating = Number(feedback.rating);
  validate({
    rating: !(Number.isInteger(rating) && rating >= 1 && rating <= 5) && "Choose a rating from 1 to 5.",
    recommendation: !RECOMMENDATIONS[feedback.recommendation] && "Choose a recommendation.",
    notes: (trimmed(feedback.notes).length < 10 && "Write at least 10 characters of feedback.") || (trimmed(feedback.notes).length > 2000 && "Keep feedback under 2,000 characters."),
  });

  const app = appFor(draft, interview);
  const { job } = context(draft, app);
  const at = new Date().toISOString();
  Object.assign(interview, {
    status: "completed",
    updatedAt: at,
    feedback: { rating, recommendation: feedback.recommendation, notes: trimmed(feedback.notes), by: actor.name, at },
  });
  interview.history.push({ action: "completed", at, by: actor.name, detail: "" });
  if (app.status === "interview_scheduled") setStage(draft, app, "interview_completed", actor, `Interview round ${interview.round} completed`);

  toCandidate(draft, app, `Your interview for ${job.title} is marked as completed. The employer will share the next step.`, "status", {
    interviewId,
  });
  logActivity(draft, `Interview round ${interview.round} for ${job.title} completed`);
  return interview;
}

// ---- Offer and hire ----

function isoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? null : date;
}

function today() {
  return new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
}

export function extendOffer(draft, appId, input, actor) {
  const app = findOr404(draft.applications, appId, "Application");
  if (app.status !== "interview_completed") {
    throw new ValidationError({}, "Complete at least one interview before extending an offer.");
  }
  const salary = input.annualSalary === "" || input.annualSalary === undefined ? null : Number(input.annualSalary);
  const start = trimmed(input.startDate) ? isoDate(input.startDate) : null;
  validate({
    startDate: trimmed(input.startDate) && ((!start && "Enter a valid date.") || (start < today() && "The start date can't be in the past.")),
    annualSalary: salary !== null && !(Number.isFinite(salary) && salary > 0) && "Enter an amount above 0, or leave it empty.",
    message: (trimmed(input.message).length < 10 && "Write a short message to the candidate (at least 10 characters).") || (trimmed(input.message).length > 1000 && "Keep the message under 1,000 characters."),
  });

  const { job, candidate } = context(draft, app);
  const at = new Date().toISOString();
  app.offer = {
    status: "extended",
    extendedAt: at,
    extendedBy: actor.name,
    startDate: trimmed(input.startDate) || null,
    annualSalary: salary,
    currency: "MAD",
    message: trimmed(input.message),
    closedAt: null,
  };
  setStage(draft, app, "offer_extended", actor, "Offer extended");
  toCandidate(draft, app, `You've received a job offer for ${job.title}. Open your application to read it.`, "offer");
  toEmployer(draft, app, actor, `An offer for ${job.title} was extended to ${candidate.name}.`, "offer");
  logActivity(draft, `Offer extended to ${candidate.name} for ${job.title}`);
  return app;
}

// Records the hire and creates the application's single placement, with a snapshot of the commission settings.
export function confirmHire(draft, appId, input, actor) {
  const app = findOr404(draft.applications, appId, "Application");
  if (draft.placements.some((p) => p.applicationId === appId)) {
    throw new ValidationError({}, "A placement already exists for this application.");
  }
  if (app.status !== "offer_extended" || app.offer?.status !== "extended") {
    throw new ValidationError({}, "Extend an offer before confirming the hire.");
  }
  const hire = isoDate(input.hireDate);
  validate({
    hireDate:
      (!hire && "Enter the hire date.") ||
      (Math.abs(hire - today()) > 365 * 86400000 && "Use a date within a year of today."),
  });

  const { job, candidate, company } = context(draft, app);
  const at = new Date().toISOString();
  const placement = {
    id: newId("pl"),
    applicationId: app.id,
    candidateId: candidate.id,
    companyId: company.id,
    jobId: job.id,
    hireDate: input.hireDate,
    startDate: app.offer.startDate,
    status: "confirmed",
    commission: computeCommission(draft.settings.commission, app.offer.annualSalary),
    demo: true,
    confirmedBy: actor.name,
    createdAt: at,
    updatedAt: at,
    history: [{ status: "confirmed", at, by: actor.name }],
  };
  draft.placements.push(placement);
  Object.assign(app.offer, { status: "accepted", closedAt: at });
  setStage(draft, app, "hired", actor, `Hire confirmed for ${formatDate(input.hireDate)}`);

  toCandidate(draft, app, `Congratulations! Your hire for ${job.title} at ${company.name} is confirmed.`, "hired");
  toEmployer(draft, app, actor, `${candidate.name}'s hire for ${job.title} was confirmed.`, "hired");
  notify(draft, "admin", `Placement recorded: ${candidate.name} hired by ${company.name} for ${job.title}.`, "/admin/placements", {
    type: "hired",
    ref: { applicationId: app.id, placementId: placement.id },
  });
  logActivity(draft, `${candidate.name} hired by ${company.name} for ${job.title}`);
  return placement;
}

// Lets the candidate tell the employer they'll attend. Ownership is checked by the caller.
export function confirmAttendance(draft, interviewId) {
  const interview = findOr404(draft.interviews, interviewId, "Interview");
  if (interview.status !== "scheduled") throw new ValidationError({}, `This interview is ${interview.status}.`);
  if (interview.candidateConfirmedAt) return interview;
  const app = appFor(draft, interview);
  const { job, candidate } = context(draft, app);
  const at = new Date().toISOString();
  interview.candidateConfirmedAt = at;
  interview.history.push({ action: "confirmed", at, by: candidate.name, detail: "" });
  toEmployer(draft, app, { role: "candidate" }, `${candidate.name} confirmed attendance for the ${job.title} interview on ${when(interview)}.`, "interview", {
    interviewId,
  });
  notify(draft, "admin", `${candidate.name} confirmed attendance for the ${job.title} interview.`, LINKS.admin(app.id), {
    type: "interview",
    ref: { applicationId: app.id, interviewId },
  });
  return interview;
}

// ---- Views ----

// Candidates get logistics only (an allow-list): never feedback, internal history or who scheduled it.
const CANDIDATE_INTERVIEW_FIELDS = [
  "id",
  "applicationId",
  "round",
  "scheduledAt",
  "durationMinutes",
  "timeZone",
  "type",
  "interviewer",
  "meetingUrl",
  "isDemoLink",
  "location",
  "instructions",
  "status",
  "rescheduleCount",
  "previousScheduledAt",
  "cancelReason",
  "candidateConfirmedAt",
  "createdAt",
  "updatedAt",
];

export function candidateInterviewView(interview) {
  return Object.fromEntries(CANDIDATE_INTERVIEW_FIELDS.map((key) => [key, interview[key]]));
}

// What a recruiter can do next, so the UI only offers valid actions.
export function nextActions(draft, app) {
  const active = activeInterview(draft, app.id);
  return {
    stages: manualTransitions(app.status).filter((s) => s !== "rejected"),
    canReject: !isTerminal(app.status),
    canSchedule: ["shortlisted", "interview_completed"].includes(app.status) && !active,
    canOffer: app.status === "interview_completed",
    canHire: app.status === "offer_extended" && !draft.placements.some((p) => p.applicationId === app.id),
  };
}
