import { beforeEach, describe, expect, it, vi } from "vitest";
import { AccessError, NotFoundError, ValidationError } from "./errors.js";

let session = { username: "yassine jahjah", name: "Yassine Jahjah", role: "candidate" };
vi.mock("../auth/auth.js", () => ({ getSession: () => session }));

// PDF/DOCX parsing needs a browser; everything else in resumeText (signature check, hashing) runs for real.
const extractResumeText = vi.fn();
vi.mock("./resumeText.js", async (importOriginal) => ({ ...(await importOriginal()), extractResumeText: (...args) => extractResumeText(...args) }));

const api = await import("./candidateApi.js");
const { ExtractionError } = await import("./resumeText.js");
const { getDb, mutate, resetDb } = await import("./store.js");

const RESUME_TEXT = `Education
BSc Computer Science, 2021–2024
Projects
- Built a churn prediction model in Python with pandas and scikit-learn.
Skills: SQL, Git`;

function pdf(name = "cv.pdf", body = "a résumé") {
  return new File([`%PDF-1.7\n${body}`], name, { type: "application/pdf" });
}

function setPlan(plan, username = session.username) {
  mutate((draft) => {
    draft.candidates.find((c) => c.username === username).plan = plan;
  });
}

function me() {
  return getDb().candidates.find((c) => c.username === session.username);
}

beforeEach(() => {
  session = { username: "yassine jahjah", name: "Yassine Jahjah", role: "candidate" };
  resetDb();
  extractResumeText.mockReset();
  extractResumeText.mockResolvedValue(RESUME_TEXT);
});

describe("uploadResume", () => {
  it("analyses the file straight after upload and persists the result", async () => {
    const stages = [];
    const result = await api.uploadResume({ file: pdf() }, { onStage: (s) => stages.push(s) });

    expect(stages).toEqual(["upload", "extract", "analyse", "save"]);
    expect(result).toMatchObject({ source: "keyword", reused: false });
    const record = getDb().analyses.find((a) => a.id === result.analysisId);
    expect(record).toMatchObject({ status: "completed", profileId: "prof-ds-atlas", profileVersion: 2, fileName: "cv.pdf" });
    expect(record.extraction.education).toEqual([{ text: "BSc Computer Science, 2021–2024" }]);
    expect(record.result.gaps.length).toBe(result.gapsFound);
    expect(me().resume.analysisId).toBe(record.id);
    expect(me().evidence.find((e) => e.skillId === "python").strength).toBe("demonstrated");

    const latest = await api.getLatestAnalysis();
    expect(latest).toMatchObject({ id: record.id, status: "completed" });
  });

  it("doesn't analyse the same file twice for the same profile version", async () => {
    const first = await api.uploadResume({ file: pdf() });
    const second = await api.uploadResume({ file: pdf() });
    expect(second).toMatchObject({ analysisId: first.analysisId, reused: true });
    expect(extractResumeText).toHaveBeenCalledTimes(1);
    expect(getDb().analyses).toHaveLength(1);
  });

  it("joins a concurrent duplicate request instead of starting a second analysis", async () => {
    const [a, b] = await Promise.all([api.uploadResume({ file: pdf() }), api.uploadResume({ file: pdf() })]);
    expect(a.analysisId).toBe(b.analysisId);
    expect(extractResumeText).toHaveBeenCalledTimes(1);
  });

  it("keeps history: a different CV creates a new analysis record", async () => {
    await api.uploadResume({ file: pdf("a.pdf", "one") });
    await api.uploadResume({ file: pdf("b.pdf", "two") });
    expect(getDb().analyses.map((a) => a.fileName)).toEqual(["a.pdf", "b.pdf"]);
    expect(me().resume.fileName).toBe("b.pdf");
  });

  it("rejects unsupported, oversized and disguised files", async () => {
    await expect(api.uploadResume({ file: new File(["x"], "cv.txt") })).rejects.toBeInstanceOf(ValidationError);
    const big = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "cv.pdf");
    await expect(api.uploadResume({ file: big })).rejects.toMatchObject({ fieldErrors: { file: expect.stringMatching(/5 MB/) } });
    await expect(api.uploadResume({ file: new File(["<html>"], "cv.pdf") })).rejects.toMatchObject({ fieldErrors: { file: expect.stringMatching(/valid PDF/) } });
    expect(getDb().analyses).toHaveLength(0);
  });

  it("records an extraction failure and accepts pasted text as the retry", async () => {
    extractResumeText.mockRejectedValue(new ExtractionError("We couldn't find readable text in this file."));
    const error = await api.uploadResume({ file: pdf() }).catch((e) => e);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.fieldErrors.text).toMatch(/Paste your résumé text/);
    expect((await api.getLatestAnalysis()).status).toBe("failed");
    expect(me().resume.analysisId).toBeUndefined();

    const retry = await api.uploadResume({ file: pdf(), text: RESUME_TEXT });
    expect(retry.source).toBe("text");
    expect((await api.getLatestAnalysis()).status).toBe("completed");
  });

  it("requires a signed-in candidate", async () => {
    session = null;
    await expect(api.uploadResume({ file: pdf() })).rejects.toBeInstanceOf(AccessError);
    await expect(api.getSkillGaps()).rejects.toBeInstanceOf(AccessError);
  });
});

describe("getSkillGaps", () => {
  it("Free gets exactly two gaps in full and only a count for the rest", async () => {
    setPlan("free");
    const data = await api.getSkillGaps();
    expect(data.total).toBeGreaterThan(2);
    expect(data.gaps).toHaveLength(2);
    expect(data.lockedCount).toBe(data.total - 2);
    expect(data.gaps[0]).toMatchObject({ explanation: expect.any(String), priority: expect.any(String), relevance: expect.any(String) });
    expect(data.gaps[0].level).toBeUndefined();

    // No name, id or detail of a locked skill is in the response.
    const pro = (setPlan("pro"), await api.getSkillGaps());
    const json = JSON.stringify(data);
    for (const locked of pro.gaps.slice(2)) {
      expect(json).not.toContain(`"${locked.skillId}"`);
      expect(json).not.toContain(locked.name);
    }
  });

  it("Pro and Max get every gap with expected levels", async () => {
    for (const plan of ["pro", "max"]) {
      setPlan(plan);
      const data = await api.getSkillGaps();
      expect(data.lockedCount).toBe(0);
      expect(data.gaps).toHaveLength(data.total);
      expect(data.gaps.every((g) => g.level >= 1)).toBe(true);
    }
  });

  it("shows a single gap when only one is found, and none when all are demonstrated", async () => {
    setPlan("free");
    const profileSkills = getDb().profiles.find((p) => p.id === "prof-ds-atlas").skills;
    const strong = (skillId) => ({ skillId, strength: "professional", level: 3, quote: "", confirmed: false });
    mutate((draft) => {
      draft.candidates.find((c) => c.username === session.username).evidence = profileSkills.slice(1).map((s) => strong(s.skillId));
    });
    let data = await api.getSkillGaps();
    expect(data.total).toBe(1);
    expect(data.gaps).toHaveLength(1);
    expect(data.lockedCount).toBe(0);

    mutate((draft) => {
      draft.candidates.find((c) => c.username === session.username).evidence = profileSkills.map((s) => strong(s.skillId));
    });
    data = await api.getSkillGaps();
    expect(data).toMatchObject({ total: 0, gaps: [], lockedCount: 0 });
  });

  it("follows the candidate's target role and current plan", async () => {
    setPlan("pro");
    await api.setTargetProfile("prof-da-nordwave");
    const data = await api.getSkillGaps();
    expect(data.profile.id).toBe("prof-da-nordwave");
    expect(data.gaps.some((g) => g.skillId === "power-bi")).toBe(true);

    setPlan("free");
    expect((await api.getSkillGaps()).gaps).toHaveLength(2);
  });
});

describe("getSkillDetail", () => {
  it("lets Free open a visible gap but not a locked one", async () => {
    setPlan("free");
    const { gaps } = await api.getSkillGaps();
    const detail = await api.getSkillDetail(gaps[0].skillId);
    expect(detail.skill.id).toBe(gaps[0].skillId);

    setPlan("pro");
    const locked = (await api.getSkillGaps()).gaps[2].skillId;
    setPlan("free");
    const error = await api.getSkillDetail(locked).catch((e) => e);
    expect(error).toBeInstanceOf(AccessError);
    expect(error.requiredPlan).toBe("pro");
    expect(error.message).not.toMatch(new RegExp(locked, "i"));
  });

  it("returns only the courses mapped to that skill, in order", async () => {
    setPlan("pro");
    const detail = await api.getSkillDetail("sql");
    const db = getDb();
    expect(detail.courses.map((c) => c.id)).toEqual(["c-sql-1", "c-sql-2"]);
    expect(detail.courses.every((c) => db.courses.find((x) => x.id === c.id).skillId === "sql")).toBe(true);
  });

  it("opens only the starter courses below Max, and keeps tests behind Max", async () => {
    setPlan("pro");
    // SQL is the top gap, so its two courses are the starter courses; Statistics' course is not.
    const sql = await api.getSkillDetail("sql");
    expect(sql.courses.map((c) => c.accessible)).toEqual([true, true]);
    expect(sql.courses[0].videoUrl).toMatch(/youtube/);
    const stats = await api.getSkillDetail("statistics");
    expect(stats.contentUnlocked).toBe(false);
    expect(stats.courses[0]).toMatchObject({ accessible: false });
    expect(stats.courses[0].videoUrl).toBeUndefined();
    expect(stats.courses[0].lessons).toBeUndefined();
    expect(stats.objectives).toEqual([]);
    expect(stats.test.lastAttempt).toBeUndefined();
    await expect(api.getCourse("c-stats-1")).rejects.toMatchObject({ requiredPlan: "max" });

    setPlan("max");
    const max = await api.getSkillDetail("sql");
    expect(max.contentUnlocked).toBe(true);
    expect(max.courses[0].videoUrl).toMatch(/youtube/);
    expect(max.courses[0].lessons.length).toBeGreaterThan(0);
    expect(max.objectives.length).toBeGreaterThan(0);
  });

  it("returns an empty course list when no course is mapped to the skill", async () => {
    setPlan("pro");
    await api.setTargetProfile("prof-da-nordwave");
    const detail = await api.getSkillDetail("power-bi"); // its only course is a draft
    expect(detail.courses).toEqual([]);
  });

  it("404s for a skill outside the target role (Pro)", async () => {
    setPlan("pro");
    await expect(api.getSkillDetail("rest-apis")).rejects.toBeInstanceOf(NotFoundError);
  });

  it("only ever reads the signed-in candidate's records", async () => {
    session = { username: "salma", name: "Salma Benali", role: "candidate" };
    const salma = await api.getSkillGaps();
    session = { username: "yassine jahjah", name: "Yassine Jahjah", role: "candidate" };
    setPlan("max");
    const yassine = await api.getSkillGaps();
    expect(salma.score).not.toBe(yassine.score);
    session = { username: "atlas", name: "Atlas Analytics", role: "company" };
    await expect(api.getSkillDetail("sql")).rejects.toBeInstanceOf(AccessError);
  });
});
