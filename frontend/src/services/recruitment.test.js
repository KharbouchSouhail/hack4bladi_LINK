import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessError, NotFoundError, ValidationError } from "./errors.js";

let session;
vi.mock("../auth/auth.js", () => ({ getSession: () => session }));

const candidateApi = await import("./candidateApi.js");
const companyApi = await import("./companyApi.js");
const adminApi = await import("./adminApi.js");
const core = await import("./core.js");
const { getDb, migrate, mutate, resetDb } = await import("./store.js");
const { utcToZoned, zonedToUtc } = await import("../domain/recruitment.js");

const AS = {
  yassine: { username: "yassine jahjah", name: "Yassine Jahjah", role: "candidate" },
  salma: { username: "salma", name: "Salma Benali", role: "candidate" },
  atlas: { username: "atlas", name: "Atlas Analytics", role: "company" },
  rival: { username: "rival", name: "Rival Corp", role: "company" },
  admin: { username: "root", name: "Administrator", role: "admin" },
};

function as(who) {
  session = AS[who];
}

// A slot `days` from now, as the recruiter's form would send it.
function slotInput(days, overrides = {}) {
  const { date } = utcToZoned(new Date(Date.now() + days * 86400000).toISOString(), "Africa/Casablanca");
  return {
    date,
    time: "10:00",
    timeZone: "Africa/Casablanca",
    durationMinutes: 45,
    type: "video",
    interviewer: "Nadia Berrada",
    meetingUrl: "https://meet.jit.si/CareerBridge-Demo-test",
    instructions: "Prepare a short project walkthrough.",
    ...overrides,
  };
}

async function passTest(testId) {
  const test = getDb().tests.find((t) => t.id === testId);
  const answers = Object.fromEntries(test.questions.map((q) => [q.id, q.correctIndex]));
  return candidateApi.submitAttempt(testId, answers);
}

function inbox(to) {
  return getDb().notifications.filter((n) => n.to === to);
}

const YASSINE = "candidate:cand-yassine";

beforeEach(() => {
  resetDb();
  as("yassine");
});

describe("candidate-to-hire flow", () => {
  it("runs end to end with persisted state, notifications and exactly one placement", async () => {
    // 1–2. Learn, validate skills, become eligible and apply.
    await candidateApi.setPlan("max");
    const course = getDb().courses.find((c) => c.id === "c-sql-1");
    for (const lesson of course.lessons) await candidateApi.setLessonComplete(course.id, lesson.id, true);
    await passTest("t-python");
    const sql = await passTest("t-sql");
    expect(sql.newlyEligible.map((j) => j.id)).toContain("job-atlas-ds");
    const app = await candidateApi.applyToJob("job-atlas-ds", { note: "Keen to join.", consent: { profile: true, evidence: true, tests: true } });
    await expect(candidateApi.applyToJob("job-atlas-ds", { consent: { profile: true } })).rejects.toBeInstanceOf(ValidationError);

    // 3. The recruiter sees it in that job's applicant list.
    as("atlas");
    const rows = await companyApi.listApplications();
    expect(rows.find((r) => r.id === app.id)).toMatchObject({ job: { id: "job-atlas-ds" }, status: "submitted" });

    // 4. Shortlist; an interview can't be scheduled in the past or skip the shortlist.
    await expect(companyApi.scheduleInterview(app.id, slotInput(2))).rejects.toThrow(/Shortlist/);
    await companyApi.updateApplicationStatus(app.id, "shortlisted", "Strong test results.");
    await expect(companyApi.scheduleInterview(app.id, slotInput(-1))).rejects.toMatchObject({ fieldErrors: { date: "Choose a time in the future." } });
    await expect(companyApi.scheduleInterview(app.id, slotInput(2, { meetingUrl: "" }))).rejects.toMatchObject({ fieldErrors: { meetingUrl: expect.any(String) } });
    const first = await companyApi.scheduleInterview(app.id, slotInput(2));
    await expect(companyApi.scheduleInterview(app.id, slotInput(3))).rejects.toThrow(/already has an interview/);

    // 5–6. Persisted, notified, visible to the candidate without internal data.
    expect(getDb().interviews.find((i) => i.id === first.id)).toMatchObject({ status: "scheduled", isDemoLink: true, applicationId: app.id });
    const invite = inbox(YASSINE).find((n) => n.type === "interview");
    expect(invite).toMatchObject({ read: false, link: `/candidate/applications/${app.id}`, ref: { applicationId: app.id, interviewId: first.id } });
    as("yassine");
    await core.markNotificationRead(invite.id);
    let mine = await candidateApi.getMyApplication(app.id);
    expect(mine.status).toBe("interview_scheduled");
    expect(mine.nextInterview).toMatchObject({ id: first.id, meetingUrl: "https://meet.jit.si/CareerBridge-Demo-test", durationMinutes: 45, timeZone: "Africa/Casablanca" });
    expect(JSON.stringify(mine)).not.toContain("Strong test results.");
    await candidateApi.confirmInterviewAttendance(first.id);
    expect(inbox("company:comp-atlas")[0].text).toMatch(/confirmed attendance/);

    // 7. Reschedule, then cancel: the candidate is told each time and the stage steps back.
    as("atlas");
    await expect(companyApi.rescheduleInterview(first.id, slotInput(2))).rejects.toThrow(/Nothing changed/);
    await companyApi.rescheduleInterview(first.id, slotInput(3, { time: "14:30" }));
    expect(getDb().interviews.find((i) => i.id === first.id)).toMatchObject({ rescheduleCount: 1, candidateConfirmedAt: null });
    expect(inbox(YASSINE)[0]).toMatchObject({ type: "interview_changed", text: expect.stringMatching(/rescheduled/) });
    await companyApi.cancelInterview(first.id, "The interviewer is unavailable; we'll send a new time.");
    expect(inbox(YASSINE)[0].type).toBe("interview_cancelled");
    expect(getDb().applications.find((a) => a.id === app.id).status).toBe("shortlisted");
    await expect(companyApi.completeInterview(first.id, { rating: 4, recommendation: "hire", notes: "Too late" })).rejects.toThrow(/already cancelled/);

    // 8. A new interview; it can only be completed once it has started. Feedback stays private.
    const second = await companyApi.scheduleInterview(app.id, slotInput(1));
    expect(second.round).toBe(1);
    const feedback = { rating: 5, recommendation: "strong_hire", notes: "PRIVATE: excellent SQL, confident communicator." };
    await expect(companyApi.completeInterview(second.id, feedback)).rejects.toThrow(/hasn't started/);
    mutate((draft) => (draft.interviews.find((i) => i.id === second.id).scheduledAt = new Date(Date.now() - 3600000).toISOString()));
    await expect(companyApi.extendOffer(app.id, { message: "Welcome aboard, we'd love to have you." })).rejects.toThrow(/Complete at least one interview/);
    await companyApi.completeInterview(second.id, feedback);

    // 9. Offer, then hire. Hiring twice never creates a second placement.
    await expect(companyApi.confirmHire(app.id, { hireDate: "2026-10-22" })).rejects.toThrow(/Extend an offer/);
    await companyApi.extendOffer(app.id, { annualSalary: 110000, startDate: "", message: "We're happy to offer you the role." });
    expect(inbox(YASSINE)[0].type).toBe("offer");
    const hireDate = new Date().toISOString().slice(0, 10);
    const placement = await companyApi.confirmHire(app.id, { hireDate });
    expect(placement.commission).toBeUndefined();
    await expect(companyApi.confirmHire(app.id, { hireDate })).rejects.toThrow(/already exists/);
    await expect(companyApi.updateApplicationStatus(app.id, "rejected", "")).rejects.toThrow(/can't be moved/);

    // 10. The candidate sees the outcome but no feedback, notes or commission.
    as("yassine");
    mine = await candidateApi.getMyApplication(app.id);
    expect(mine).toMatchObject({ status: "hired", hireDate, offer: { status: "accepted", annualSalary: 110000 } });
    const json = JSON.stringify(await candidateApi.listMyApplications());
    expect(json).not.toMatch(/PRIVATE|strong_hire|commission|ratePercent/);
    expect(inbox(YASSINE)[0]).toMatchObject({ type: "hired" });

    // 11–12. Exactly one placement, with the illustrative commission, visible to the admin.
    const placements = getDb().placements.filter((p) => p.applicationId === app.id);
    expect(placements).toHaveLength(1);
    expect(placements[0]).toMatchObject({ candidateId: "cand-yassine", companyId: "comp-atlas", jobId: "job-atlas-ds", hireDate, demo: true });
    as("admin");
    const list = await adminApi.listPlacements();
    expect(list.placements.find((p) => p.applicationId === app.id).commission).toEqual({
      model: "percentage",
      ratePercent: 8,
      fixedFee: null,
      referenceAmount: 110000,
      referenceSource: "offer",
      amount: 8800,
      currency: "MAD",
    });
    expect((await adminApi.getApplication(app.id)).placement.commission.amount).toBe(8800);
    as("atlas");
    expect((await companyApi.getApplication(app.id)).placement.commission).toBeUndefined();

    // 13. The stored dataset survives a reload through the migration unchanged.
    const reloaded = migrate(JSON.parse(JSON.stringify(getDb())));
    expect(reloaded.applications.find((a) => a.id === app.id).status).toBe("hired");
    expect(reloaded.placements.filter((p) => p.applicationId === app.id)).toHaveLength(1);
    expect(reloaded.interviews.filter((i) => i.applicationId === app.id).map((i) => i.status)).toEqual(["cancelled", "completed"]);
  }, 30000);
});

describe("access control", () => {
  it("keeps candidates out of recruiter and admin actions", async () => {
    await expect(companyApi.listApplications()).rejects.toBeInstanceOf(AccessError);
    await expect(companyApi.scheduleInterview("app-1", slotInput(2))).rejects.toBeInstanceOf(AccessError);
    await expect(adminApi.listPlacements()).rejects.toBeInstanceOf(AccessError);
    await expect(adminApi.confirmHire("app-1", { hireDate: "2026-10-22" })).rejects.toBeInstanceOf(AccessError);
  });

  it("hides other candidates' applications, interviews and notifications", async () => {
    await expect(candidateApi.getMyApplication("app-1")).rejects.toBeInstanceOf(NotFoundError);
    await expect(candidateApi.confirmInterviewAttendance("int-1")).rejects.toBeInstanceOf(NotFoundError);
    const atlasNote = getDb().notifications.find((n) => n.to === "company:comp-atlas");
    await expect(core.markNotificationRead(atlasNote.id)).rejects.toBeInstanceOf(NotFoundError);
    const { items } = await core.getNotifications({ limit: null });
    expect(items.every((n) => n.to === YASSINE)).toBe(true);
  });

  it("stops a company acting on another company's applications", async () => {
    as("rival");
    await expect(companyApi.getApplication("app-1")).rejects.toBeInstanceOf(NotFoundError);
    await expect(companyApi.scheduleInterview("app-1", slotInput(2))).rejects.toBeInstanceOf(NotFoundError);
    await expect(companyApi.cancelInterview("int-1", "")).rejects.toBeInstanceOf(NotFoundError);
    as("atlas");
    // int-1 belongs to Medina Health Labs.
    await expect(companyApi.completeInterview("int-1", { rating: 3, recommendation: "hire", notes: "Not our interview." })).rejects.toBeInstanceOf(NotFoundError);
    expect((await companyApi.listInterviews()).every((i) => i.companyId === "comp-atlas")).toBe(true);
  });
});

describe("workflow rules", () => {
  it("rejects direct jumps that would skip the required records", async () => {
    as("admin");
    await expect(adminApi.updateApplicationStatus("app-3", "hired", "")).rejects.toThrow(/Confirm hire/);
    await expect(adminApi.updateApplicationStatus("app-3", "interview_scheduled", "")).rejects.toThrow(/Schedule an interview/);
    await expect(adminApi.updateApplicationStatus("app-2", "shortlisted", "")).rejects.toThrow(/can't be moved/);
    await expect(adminApi.updateApplicationStatus("app-3", "nope", "")).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejecting an application cancels its interview and withdraws the offer", async () => {
    as("admin");
    await adminApi.updateApplicationStatus("app-5", "rejected", "Role filled internally.");
    expect(getDb().interviews.find((i) => i.id === "int-1").status).toBe("cancelled");
    expect(getDb().applications.find((a) => a.id === "app-5").status).toBe("rejected");
    // The employer hears about it because an admin acted.
    expect(inbox("company:comp-medina")[0].type).toBe("rejected");
  });

  it("validates interview input and the commission settings", async () => {
    as("admin");
    await adminApi.updateApplicationStatus("app-3", "shortlisted", "");
    await expect(adminApi.scheduleInterview("app-3", slotInput(2, { date: "2026-02-31" }))).rejects.toBeInstanceOf(ValidationError);
    await expect(adminApi.scheduleInterview("app-3", slotInput(2, { durationMinutes: 5 }))).rejects.toMatchObject({ fieldErrors: { durationMinutes: expect.any(String) } });
    await expect(adminApi.scheduleInterview("app-3", slotInput(2, { type: "onsite", meetingUrl: "" }))).rejects.toMatchObject({ fieldErrors: { location: expect.any(String) } });
    await expect(adminApi.scheduleInterview("app-3", slotInput(2, { meetingUrl: "javascript:alert(1)" }))).rejects.toMatchObject({ fieldErrors: { meetingUrl: expect.any(String) } });

    await expect(adminApi.saveCommissionSettings({ model: "percentage", ratePercent: 0, fixedFee: 0, defaultReferenceAmount: 1, currency: "MAD" })).rejects.toBeInstanceOf(ValidationError);
    await adminApi.saveCommissionSettings({ model: "fixed", ratePercent: 8, fixedFee: 7000, defaultReferenceAmount: 96000, currency: "MAD" });

    // A fixed fee applies to new placements; the existing one keeps its snapshot.
    await adminApi.extendOffer("app-4", { message: "Offer for the internship role." });
    await adminApi.confirmHire("app-4", { hireDate: new Date().toISOString().slice(0, 10) });
    const { placements } = await adminApi.listPlacements();
    expect(placements.find((p) => p.applicationId === "app-4").commission).toMatchObject({ model: "fixed", amount: 7000, referenceSource: "default" });
    expect(placements.find((p) => p.id === "pl-1").commission.amount).toBe(9600);

    await adminApi.setPlacementStatus("pl-1", "started");
    await expect(adminApi.setPlacementStatus("pl-1", "confirmed")).rejects.toBeInstanceOf(ValidationError);
  });

  it("converts wall-clock times in a zone to UTC", () => {
    expect(zonedToUtc("2026-07-01", "10:00", "Europe/Paris")).toBe("2026-07-01T08:00:00.000Z");
    expect(zonedToUtc("2026-12-01", "10:00", "Europe/Paris")).toBe("2026-12-01T09:00:00.000Z");
    expect(zonedToUtc("2026-12-01", "10:00", "America/New_York")).toBe("2026-12-01T15:00:00.000Z");
    expect(zonedToUtc("2026-02-31", "10:00", "UTC")).toBeNull();
    expect(utcToZoned("2026-07-01T08:00:00.000Z", "Europe/Paris")).toEqual({ date: "2026-07-01", time: "10:00" });
  });

  it("migrates data saved by older builds", () => {
    const legacy = { applications: [{ id: "a", status: "interview", history: [{ status: "interview" }] }] };
    const migrated = migrate(legacy);
    expect(migrated.applications[0]).toMatchObject({ status: "interview_scheduled", offer: null, history: [{ status: "interview_scheduled" }] });
    expect(migrated).toMatchObject({ interviews: [], placements: [], settings: { commission: { model: "percentage" } } });
  });
});

describe("company analytics", () => {
  it("counts only the company's own applications received in the chosen range", async () => {
    as("atlas");
    const all = await companyApi.getAnalytics();
    const total = all.kpis.totalApplicants;
    expect(total).toBeGreaterThan(0);
    expect(all.timeline.buckets.reduce((sum, b) => sum + b.count, 0)).toBe(total);
    expect(all.funnel[0].count).toBe(total);

    // Age one application past the 30-day window: it leaves the range but stays in "all time".
    const ownJobIds = new Set(getDb().jobs.filter((j) => j.companyId === getDb().companies.find((c) => c.ownerUsername === "atlas").id).map((j) => j.id));
    mutate((draft) => {
      for (const app of draft.applications.filter((a) => ownJobIds.has(a.jobId))) app.createdAt = new Date(Date.now() - 10 * 86400000).toISOString();
      draft.applications.find((a) => ownJobIds.has(a.jobId)).createdAt = new Date(Date.now() - 60 * 86400000).toISOString();
    });
    expect((await companyApi.getAnalytics({ range: "30d" })).kpis.totalApplicants).toBe(total - 1);
    expect((await companyApi.getAnalytics({ range: "all" })).kpis.totalApplicants).toBe(total);

    as("rival");
    expect((await companyApi.getAnalytics()).kpis.totalApplicants).toBe(0);
    as("yassine");
    await expect(companyApi.getAnalytics()).rejects.toBeInstanceOf(AccessError);
  });
});

describe("admin overview", () => {
  it("filters activity figures by range, keeps platform totals, and is admin-only", async () => {
    as("admin");
    const all = await adminApi.getOverview();
    expect(all.metrics.applications).toBe(getDb().applications.length);
    expect(all.timeline.applications.buckets.reduce((sum, b) => sum + b.count, 0)).toBe(all.metrics.applications);
    expect(all.perStatus.reduce((sum, s) => sum + s.count, 0)).toBe(all.metrics.applications);

    mutate((draft) => {
      draft.applications[0].createdAt = new Date(Date.now() - 200 * 86400000).toISOString();
    });
    const recent = await adminApi.getOverview({ range: "90d" });
    expect(recent.metrics.applications).toBe(all.metrics.applications - 1);
    expect(recent.metrics.candidates).toBe(all.metrics.candidates);
    // The three series share their periods so they can be compared.
    expect(recent.timeline.attempts.buckets.map((b) => b.start)).toEqual(recent.timeline.applications.buckets.map((b) => b.start));

    as("atlas");
    await expect(adminApi.getOverview()).rejects.toBeInstanceOf(AccessError);
  });
});
