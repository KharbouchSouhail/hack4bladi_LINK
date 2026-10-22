import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessError } from "./errors.js";

let session;
vi.mock("../auth/auth.js", () => ({ getSession: () => session }));

const api = await import("./candidateApi.js");
const { getDb, mutate, resetDb } = await import("./store.js");

const PUBLISHED_COURSES = 8; // c-pbi-1 is a draft
const VISIBLE_JOBS = 4; // job-nordwave-be is a draft

function me() {
  return getDb().candidates.find((c) => c.username === session.username);
}

function setPlan(plan) {
  mutate((draft) => {
    draft.candidates.find((c) => c.username === session.username).plan = plan;
  });
}

beforeEach(() => {
  session = { username: "yassine jahjah", name: "Yassine Jahjah", role: "candidate" };
  resetDb();
});

describe("courses", () => {
  it("Free lists two open courses and only a count for the rest", async () => {
    setPlan("free");
    const data = await api.listCourses();
    expect(data.courses).toHaveLength(2);
    expect(data.courses.every((c) => c.accessible)).toBe(true);
    expect(data.lockedCount).toBe(PUBLISHED_COURSES - 2);

    const json = JSON.stringify(data);
    const listed = new Set(data.courses.map((c) => c.id));
    for (const course of getDb().courses.filter((c) => !listed.has(c.id))) {
      expect(json).not.toContain(course.id);
      expect(json).not.toContain(course.title);
      expect(json).not.toContain(course.description);
    }
    expect(json).not.toMatch(/youtube/);
  });

  it("Free's starter courses are the ones for its top skill gap", async () => {
    setPlan("free");
    const [{ gaps }, { courses }] = await Promise.all([api.getSkillGaps(), api.listCourses()]);
    expect(courses.every((c) => c.skillId === gaps[0].skillId)).toBe(true);
  });

  it("Free can open and track its starter courses but not others, by any route", async () => {
    setPlan("free");
    const [open] = (await api.listCourses()).courses;
    const course = await api.getCourse(open.id);
    expect(course.lessons.length).toBeGreaterThan(0);
    expect(course.test.locked).toBe(true);

    await api.setLessonComplete(open.id, course.lessons[0].id, true);
    expect((await api.listCourses()).courses.find((c) => c.id === open.id).progress).toBeGreaterThan(0);

    for (const call of [() => api.getCourse("c-ml-1"), () => api.setLessonComplete("c-ml-1", "c-ml-1-l1", true)]) {
      const error = await call().catch((e) => e);
      expect(error).toBeInstanceOf(AccessError);
      expect(error.requiredPlan).toBe("max");
    }
    await expect(api.getTest("t-sql")).rejects.toMatchObject({ requiredPlan: "max" });
  });

  it("a started course stays open when the gap it belongs to closes", async () => {
    setPlan("free");
    await api.setLessonComplete("c-sql-2", "c-sql-2-l1", true);
    mutate((draft) => {
      const sql = draft.candidates.find((c) => c.username === session.username).evidence.find((e) => e.skillId === "sql");
      Object.assign(sql, { strength: "professional", level: 3 });
    });
    const ids = (await api.listCourses()).courses.map((c) => c.id);
    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe("c-sql-2");
    await expect(api.getCourse("c-sql-2")).resolves.toMatchObject({ id: "c-sql-2" });
  });

  it("ignores any paging or filter arguments", async () => {
    setPlan("free");
    const plain = await api.listCourses();
    const paged = await api.listCourses({ page: 2, limit: 100, scope: "all", skillId: "ml" });
    expect(paged).toEqual(plain);
  });

  it("Pro sees every course card but opens only the starter courses", async () => {
    setPlan("pro");
    const data = await api.listCourses();
    expect(data.courses).toHaveLength(PUBLISHED_COURSES);
    expect(data.lockedCount).toBe(0);
    expect(data.courses.filter((c) => c.accessible)).toHaveLength(2);
    expect(data.courses.filter((c) => !c.accessible).every((c) => c.progress === null)).toBe(true);
    await expect(api.getCourse("c-ml-1")).rejects.toMatchObject({ requiredPlan: "max" });

    const path = await api.getLearningPath();
    const pathCourses = path.modules.flatMap((m) => m.courses);
    const open = new Set(data.courses.filter((c) => c.accessible).map((c) => c.id));
    expect(pathCourses.every((c) => c.accessible === open.has(c.id))).toBe(true);
  });

  it("Max opens every course", async () => {
    setPlan("max");
    const data = await api.listCourses();
    expect(data).toMatchObject({ locked: false, lockedCount: 0 });
    expect(data.courses.every((c) => c.accessible)).toBe(true);
    await expect(api.getCourse("c-ml-1")).resolves.toMatchObject({ id: "c-ml-1" });
  });
});

describe("job opportunities", () => {
  it("Free lists two jobs and only a count for the rest", async () => {
    setPlan("free");
    const data = await api.listJobs();
    expect(data.jobs.map((j) => j.id)).toEqual(["job-atlas-intern", "job-medina-ml"]);
    expect(data.lockedCount).toBe(VISIBLE_JOBS - 2);
    expect(data.jobs.every((j) => j.eligibility === null)).toBe(true);

    const json = JSON.stringify(data);
    for (const job of getDb().jobs.filter((j) => !data.jobs.some((x) => x.id === j.id))) {
      expect(json).not.toContain(job.id);
      expect(json).not.toContain(job.description);
    }
    expect(json).not.toContain("Nordwave");
  });

  it("Free can open its two jobs but not others by direct request, and can't apply", async () => {
    setPlan("free");
    await expect(api.getJob("job-atlas-intern")).resolves.toMatchObject({ id: "job-atlas-intern", canApply: false });
    const error = await api.getJob("job-nordwave-da").catch((e) => e);
    expect(error).toBeInstanceOf(AccessError);
    expect(error.requiredPlan).toBe("pro");
    expect(error.message).not.toMatch(/Nordwave|Risk/);
    await expect(api.applyToJob("job-atlas-intern", { consent: { profile: true } })).rejects.toMatchObject({ requiredPlan: "max" });
  });

  it("ignores any paging or filter arguments", async () => {
    setPlan("free");
    expect(await api.listJobs({ page: 2, limit: 50 })).toEqual(await api.listJobs());
  });

  it("keeps a job the candidate applied to visible after a downgrade", async () => {
    mutate((draft) => {
      draft.applications.push({
        id: "app-test",
        candidateId: me().id,
        jobId: "job-nordwave-da",
        status: "submitted",
        note: "",
        consent: { profile: true, evidence: true, tests: true, learning: false },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        history: [],
      });
    });
    setPlan("free");
    const data = await api.listJobs();
    expect(data.jobs.map((j) => j.id)).toEqual(["job-nordwave-da", "job-atlas-intern"]);
    await expect(api.getJob("job-nordwave-da")).resolves.toMatchObject({ application: { id: "app-test" } });
  });

  it("Pro browses every job but eligibility and applying stay with Max", async () => {
    setPlan("pro");
    const data = await api.listJobs();
    expect(data.jobs).toHaveLength(VISIBLE_JOBS);
    expect(data).toMatchObject({ lockedCount: 0, eligibilityLocked: true });
    await expect(api.getJob("job-nordwave-da")).resolves.toMatchObject({ eligibility: null, canApply: false });
    await expect(api.applyToJob("job-atlas-intern", { consent: { profile: true } })).rejects.toMatchObject({ requiredPlan: "max" });
  });

  it("Max still has to meet each job's requirements to apply", async () => {
    setPlan("max");
    const data = await api.listJobs();
    expect(data.jobs.every((j) => j.eligibility)).toBe(true);

    const blocked = await api.applyToJob("job-atlas-intern", { consent: { profile: true } }).catch((e) => e);
    expect(blocked).toBeInstanceOf(AccessError);
    expect(blocked.requiredPlan).toBeNull();

    // Passing the Python test meets the internship's last mandatory requirement.
    mutate((draft) => {
      draft.attempts.push({ id: "att-test", candidateId: me().id, testId: "t-python", answers: {}, score: 100, passed: true, createdAt: new Date().toISOString() });
    });
    await expect(api.applyToJob("job-atlas-intern", { consent: { profile: true } })).resolves.toMatchObject({ jobId: "job-atlas-intern" });
    expect((await api.listMyApplications()).map((a) => a.jobId)).toContain("job-atlas-intern");
  });
});
