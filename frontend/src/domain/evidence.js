// Turns a candidate's raw records into the facts every rule below relies on:
// strongest evidence per skill, and the derived skill state. Pure functions, no storage access.

export const STRENGTHS = {
  validated: { label: "Validated by test", credit: 1 },
  professional: { label: "Strong résumé evidence", credit: 0.85 },
  demonstrated: { label: "Strong résumé evidence", credit: 0.7 },
  mentioned: { label: "Partial evidence", credit: 0.4 },
  confirmed: { label: "Partial evidence", credit: 0.4 },
  none: { label: "No evidence yet", credit: 0 },
};

// Distinct states; never collapse them into one "has skill" flag.
export const SKILL_STATES = {
  passed: { label: "Assessment passed", tone: "success" },
  learning: { label: "Currently learning", tone: "info" },
  retry: { label: "Assessment not yet passed", tone: "warning" },
  confirmed: { label: "Confirmed by candidate", tone: "accent" },
  identified: { label: "Identified in résumé", tone: "accent" },
  missing: { label: "Evidence missing", tone: "neutral" },
};

export function courseProgress(course, progressByCourse) {
  const done = progressByCourse[course.id]?.completedLessonIds.length ?? 0;
  return course.lessons.length ? Math.round((100 * done) / course.lessons.length) : 0;
}

export function buildContext(db, candidateId) {
  const candidate = db.candidates.find((c) => c.id === candidateId);
  const attempts = db.attempts.filter((a) => a.candidateId === candidateId);
  const progressByCourse = Object.fromEntries(
    db.progress.filter((p) => p.candidateId === candidateId).map((p) => [p.courseId, p]),
  );
  const skillOfTest = Object.fromEntries(db.tests.map((t) => [t.id, t.skillId]));

  const passed = new Set(attempts.filter((a) => a.passed).map((a) => skillOfTest[a.testId]));
  const failed = new Set(attempts.filter((a) => !a.passed).map((a) => skillOfTest[a.testId]));
  const learning = new Set(
    db.courses.filter((c) => courseProgress(c, progressByCourse) > 0).map((c) => c.skillId),
  );

  return { candidate, evidence: candidate?.evidence ?? [], attempts, progressByCourse, passed, failed, learning };
}

export function evidenceFor(skillId, ctx) {
  return ctx.evidence.find((e) => e.skillId === skillId) ?? null;
}

export function bestStrength(skillId, ctx) {
  if (ctx.passed.has(skillId)) return "validated";
  const ev = evidenceFor(skillId, ctx);
  if (ev?.strength) return ev.strength;
  return ev?.confirmed ? "confirmed" : "none";
}

export function skillState(skillId, ctx) {
  if (ctx.passed.has(skillId)) return "passed";
  if (ctx.learning.has(skillId)) return "learning";
  if (ctx.failed.has(skillId)) return "retry";
  const ev = evidenceFor(skillId, ctx);
  if (ev?.confirmed) return "confirmed";
  if (ev?.strength) return "identified";
  return "missing";
}
