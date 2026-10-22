import { courseProgress } from "./evidence.js";

export function gradeAttempt(test, answers) {
  const results = test.questions.map((q) => ({ questionId: q.id, correct: answers[q.id] === q.correctIndex }));
  const correct = results.filter((r) => r.correct).length;
  const score = test.questions.length ? Math.round((100 * correct) / test.questions.length) : 0;
  return { results, correct, total: test.questions.length, score, passed: score >= test.passThreshold };
}

// Skills not yet validated, ordered so prerequisites come first, then by score gain.
export function buildLearningPath(match, { skills, courses, tests, ctx }) {
  const skillById = Object.fromEntries(skills.map((s) => [s.id, s]));
  const pending = match.rows.filter((r) => r.credit < 1).sort((a, b) => b.gain - a.gain);
  const pendingIds = new Set(pending.map((r) => r.skillId));
  const ordered = [];

  while (pending.length) {
    const placed = new Set(ordered.map((r) => r.skillId));
    const index = pending.findIndex((r) =>
      (skillById[r.skillId]?.dependsOn ?? []).every((dep) => !pendingIds.has(dep) || placed.has(dep)),
    );
    ordered.push(...pending.splice(index === -1 ? 0 : index, 1));
  }

  return ordered.map((row) => ({
    ...row,
    skill: skillById[row.skillId],
    courses: courses
      .filter((c) => c.skillId === row.skillId && c.status === "published")
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ ...c, progress: courseProgress(c, ctx.progressByCourse) })),
    test: tests.find((t) => t.skillId === row.skillId && t.status === "published") ?? null,
  }));
}
