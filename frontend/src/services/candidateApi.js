// Candidate API (demo). Every function checks the session role and the plan stored server-side
// (here: in the demo store), and only returns the fields the plan allows.
import { gapExplanation, identifyGaps, relevanceText } from "../domain/analysis.js";
import { LEVELS } from "../domain/constants.js";
import { checkEligibility } from "../domain/eligibility.js";
import { buildContext, courseProgress, STRENGTHS, SKILL_STATES } from "../domain/evidence.js";
import { buildLearningPath, gradeAttempt } from "../domain/learning.js";
import { can, FREE_LIMITS, FREE_VISIBLE_GAPS, PLANS, requiredPlan } from "../domain/permissions.js";
import { computeMatch } from "../domain/scoring.js";
import { runStructuredAnalysis } from "./analyzer.js";
import { findOr404, getDb, logActivity, lookups, mutate, newId, notify, request, requireRole, validate } from "./core.js";
import { AccessError, NotFoundError, ValidationError } from "./errors.js";
import { candidateInterviewView, confirmAttendance } from "./recruitment.js";
import { ExtractionError, extractResumeText, hasExpectedSignature, resumeKind, RESUME_TYPES, sha256 } from "./resumeText.js";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

function currentCandidate() {
  const session = requireRole("candidate");
  const existing = getDb().candidates.find((c) => c.username === session.username);
  if (existing) return existing;

  // First visit of a self-registered candidate.
  return mutate((draft) => {
    const record = {
      id: newId("cand"),
      username: session.username,
      name: session.name,
      email: "",
      location: "",
      headline: "",
      plan: "free",
      targetProfileId: draft.profiles.find((p) => p.status === "published")?.id ?? null,
      resume: null,
      evidence: [],
      analyzedAt: null,
      createdAt: new Date().toISOString(),
    };
    draft.candidates.push(record);
    logActivity(draft, `${record.name} created a candidate account`);
    return record;
  });
}

function assertPlan(candidate, feature) {
  if (!can(candidate.plan, feature)) {
    const plan = requiredPlan(feature);
    throw new AccessError(`This is part of the ${PLANS[plan].label} plan.`, plan);
  }
}

function targetProfile(db, candidate) {
  return db.profiles.find((p) => p.id === candidate.targetProfileId && p.status === "published") ?? null;
}

function courseMinutes(course) {
  return course.lessons.reduce((sum, l) => sum + l.minutes, 0);
}

function jobView(db, job, ctx, candidate) {
  const map = lookups(db);
  const company = map.companies[job.companyId];
  const eligibility = can(candidate.plan, "jobs.eligibility") ? checkEligibility(job, ctx) : null;
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    location: job.location,
    workMode: job.workMode,
    employmentType: job.employmentType,
    createdAt: job.createdAt,
    profileTitle: map.profiles[job.profileId]?.title,
    company: { id: company.id, name: company.name, city: company.city, sector: company.sector, description: company.description },
    skills: job.requirements.map((r) => ({ ...r, name: map.skills[r.skillId]?.name ?? r.skillId })),
    eligibility: eligibility && {
      status: eligibility.status,
      checklist: eligibility.checklist.map((c) => ({ ...c, name: map.skills[c.skillId]?.name ?? c.skillId })),
    },
    application: applicationSummary(db.applications.find((a) => a.jobId === job.id && a.candidateId === candidate.id)),
  };
}

// Status only: the history holds internal recruiter notes.
function applicationSummary(app) {
  return app ? { id: app.id, status: app.status, createdAt: app.createdAt } : null;
}

function visibleJobs(db) {
  const active = new Set(db.companies.filter((c) => c.active).map((c) => c.id));
  return db.jobs.filter((j) => j.status === "published" && active.has(j.companyId));
}

// Free plan allowances are taken from the front of these server-side orders. They depend only on the
// candidate's own data, so no client-side search, filter, sort or direct URL changes which items are open.

// Courses already started, then courses for the candidate's skill gaps (highest priority first),
// then the rest of the target role's skills, then everything else.
function orderedCourses(db, candidate) {
  const ctx = buildContext(db, candidate.id);
  const profile = targetProfile(db, candidate);
  const skillOrder = profile && candidate.resume ? identifyGaps(computeMatch(profile, ctx), ctx).gaps.map((g) => g.skillId) : [];
  for (const s of profile?.skills ?? []) if (!skillOrder.includes(s.skillId)) skillOrder.push(s.skillId);
  const rank = (c) => (skillOrder.includes(c.skillId) ? skillOrder.indexOf(c.skillId) : skillOrder.length);
  const started = (c) => (ctx.progressByCourse[c.id]?.completedLessonIds.length ? 0 : 1);
  return db.courses
    .filter((c) => c.status === "published")
    .sort((a, b) => started(a) - started(b) || rank(a) - rank(b) || a.order - b.order || a.title.localeCompare(b.title));
}

// null means every course is open (Max). Otherwise the starter courses Free gets, which Pro inherits.
function openCourseIds(db, candidate) {
  if (can(candidate.plan, "courses.access")) return null;
  return new Set(orderedCourses(db, candidate).slice(0, FREE_LIMITS.courses).map((c) => c.id));
}

function assertCourseOpen(db, candidate, courseId) {
  const open = openCourseIds(db, candidate);
  if (open && !open.has(courseId)) throw new AccessError("This course is part of the Max plan.", "max");
}

// Jobs the candidate applied to, then newest first.
function orderedJobs(db, candidate) {
  const applied = new Set(db.applications.filter((a) => a.candidateId === candidate.id).map((a) => a.jobId));
  return visibleJobs(db).sort(
    (a, b) => Number(applied.has(b.id)) - Number(applied.has(a.id)) || b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id),
  );
}

function browsableJobs(db, candidate) {
  const jobs = orderedJobs(db, candidate);
  return can(candidate.plan, "jobs.browse") ? jobs : jobs.slice(0, FREE_LIMITS.jobs);
}

export function getMe() {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    const profile = targetProfile(db, candidate);
    return {
      ...candidate,
      evidence: undefined,
      targetProfile: profile && { id: profile.id, title: profile.title, companyName: lookups(db).companies[profile.companyId]?.name },
    };
  });
}

export function listTargetProfiles() {
  return request(() => {
    requireRole("candidate");
    const db = getDb();
    const map = lookups(db);
    return db.profiles
      .filter((p) => p.status === "published")
      .map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        companyName: map.companies[p.companyId]?.name,
        skills: p.skills.map((s) => ({ name: map.skills[s.skillId]?.name, importance: s.importance })),
      }));
  });
}

// Public reference data: canonical skill names.
export function listSkillCatalog() {
  return request(() => {
    requireRole("candidate");
    return getDb().skills.map((s) => ({ id: s.id, name: s.name }));
  });
}

export function setTargetProfile(profileId) {
  return request(() => {
    const candidate = currentCandidate();
    const profile = getDb().profiles.find((p) => p.id === profileId && p.status === "published");
    if (!profile) throw new NotFoundError("Job profile");
    mutate((draft) => {
      draft.candidates.find((c) => c.id === candidate.id).targetProfileId = profileId;
    });
    return profile.title;
  });
}

// A "processing" record older than this was interrupted (tab closed mid-analysis).
const STALE_ANALYSIS_MS = 2 * 60 * 1000;
// Analyses running in this tab, so a double submit joins the running one instead of starting another.
const inflight = new Map();

function isStale(record) {
  return record.status === "processing" && Date.now() - Date.parse(record.startedAt) > STALE_ANALYSIS_MS;
}

// Points the candidate's résumé at a completed analysis, replaces résumé evidence with its skills
// (keeping skills the candidate confirmed themselves) and snapshots the comparison with the profile version used.
function applyAnalysis(draft, candidateId, record, file) {
  const candidate = draft.candidates.find((c) => c.id === candidateId);
  const now = new Date().toISOString();
  const selfConfirmed = candidate.evidence.filter((e) => !e.strength && e.confirmed);
  const confirmedIds = new Set(candidate.evidence.filter((e) => e.confirmed).map((e) => e.skillId));
  candidate.evidence = [
    ...record.skills.map((e) => ({ ...e, confirmed: confirmedIds.has(e.skillId) })),
    ...selfConfirmed.filter((e) => !record.skills.some((x) => x.skillId === e.skillId)),
  ];
  candidate.resume = { fileName: file.name, size: file.size, uploadedAt: now, source: record.source, fileHash: record.fileHash, analysisId: record.id };
  candidate.analyzedAt = now;

  const profile = draft.profiles.find((p) => p.id === record.profileId);
  const ctx = buildContext(draft, candidateId);
  const match = computeMatch(profile, ctx);
  const { demonstrated, gaps } = identifyGaps(match, ctx);
  record.result = {
    score: match.score,
    coverage: match.coverage,
    scoringVersion: match.scoringVersion,
    demonstrated: demonstrated.map((r) => r.skillId),
    gaps: gaps.map((g) => ({ skillId: g.skillId, kind: g.kind, priority: g.priority })),
  };

  notify(draft, `candidate:${candidateId}`, `Your résumé was analysed for ${profile.title}.`, "/candidate/skill-gaps");
  logActivity(draft, `${candidate.name} uploaded a résumé`);
  return { analysisId: record.id, source: record.source, fallbackReason: record.fallbackReason, skillsFound: record.skills.length, gapsFound: gaps.length };
}

async function runAnalysis({ candidate, profile, file, kind, bytes, fileHash, dedupeKey, pasted, onStage }) {
  const db = getDb();
  const mine = db.analyses.filter((a) => a.candidateId === candidate.id && a.dedupeKey === dedupeKey);

  // Same file and text, same profile version: reuse the saved result instead of analysing again.
  const previous = mine.find((a) => a.status === "completed");
  if (previous) {
    onStage("save");
    return { ...mutate((draft) => applyAnalysis(draft, candidate.id, draft.analyses.find((a) => a.id === previous.id), file)), reused: true };
  }
  if (mine.some((a) => a.status === "processing" && !isStale(a))) {
    throw new ValidationError({}, "This résumé is already being analysed. Your results will appear shortly.");
  }

  const id = newId("ana");
  mutate((draft) => {
    draft.analyses.push({
      id,
      candidateId: candidate.id,
      status: "processing",
      dedupeKey,
      fileName: file.name,
      size: file.size,
      fileHash,
      textOrigin: pasted ? "pasted" : "file",
      profileId: profile.id,
      profileVersion: profile.version,
      startedAt: new Date().toISOString(),
    });
  });
  const finish = (fields) => (draft) => Object.assign(draft.analyses.find((a) => a.id === id), { completedAt: new Date().toISOString(), ...fields });

  try {
    let text = pasted;
    if (!text) {
      onStage("extract");
      text = await extractResumeText(kind, bytes);
    }
    onStage("analyse");
    const { engine, value, fallbackReason } = await runStructuredAnalysis(text, getDb().skills);
    onStage("save");
    const { skills, ...extraction } = value;
    const source = engine === "ai" ? "ai" : pasted ? "text" : "keyword";
    return {
      ...mutate((draft) => {
        finish({ status: "completed", source, fallbackReason, extraction, skills })(draft);
        return applyAnalysis(draft, candidate.id, draft.analyses.find((a) => a.id === id), file);
      }),
      reused: false,
    };
  } catch (error) {
    const unreadable = error instanceof ExtractionError;
    const message = unreadable ? error.message : "We couldn't analyse your résumé right now. Please try again.";
    mutate(finish({ status: "failed", errorCode: unreadable ? "extraction_failed" : "analysis_failed", error: message }));
    if (unreadable) throw new ValidationError({ text: `${message} Paste your résumé text below and we'll analyse that instead.` }, message);
    throw new Error(message);
  }
}

// Upload and analysis are one step: a successful upload starts the analysis straight away.
// Only the file's name, size and hash are kept, plus the structured analysis; the file and its text are not stored.
// `pasted` text is the fallback when a file has no readable text (e.g. a scanned PDF).
// onStage reports progress: "upload" → "extract" → "analyse" → "save".
export function uploadResume({ file, text } = {}, { onStage = () => {} } = {}) {
  return request(() => {
    const candidate = currentCandidate();
    const pasted = (text ?? "").trim();
    const kind = resumeKind(file?.name);
    validate({
      file:
        (!file && "Choose a PDF or DOCX file.") ||
        (!kind && "Only PDF and DOCX files are supported.") ||
        (file.size > MAX_RESUME_BYTES && "The file must be 5 MB or smaller.") ||
        (file.size === 0 && "This file is empty."),
      text: pasted.length > 20000 && "Paste at most 20,000 characters.",
    });
    const profile = targetProfile(getDb(), candidate);
    if (!profile) throw new ValidationError({}, "Choose a target role before uploading your résumé.");

    return (async () => {
      onStage("upload");
      const bytes = await file.arrayBuffer();
      if (!hasExpectedSignature(kind, bytes)) {
        throw new ValidationError({ file: `This file isn't a valid ${RESUME_TYPES[kind].label}. Check the file and try again.` });
      }
      const fileHash = await sha256(bytes);
      const dedupeKey = [fileHash, pasted ? await sha256(pasted) : "file", profile.id, profile.version].join(":");
      const flightKey = `${candidate.id}:${dedupeKey}`;
      if (!inflight.has(flightKey)) {
        const run = runAnalysis({ candidate, profile, file, kind, bytes, fileHash, dedupeKey, pasted, onStage });
        inflight.set(flightKey, run.finally(() => inflight.delete(flightKey)));
      }
      return inflight.get(flightKey);
    })();
  });
}

function analysisView(record) {
  const stale = isStale(record);
  return {
    id: record.id,
    status: stale ? "failed" : record.status,
    error: stale ? "The analysis was interrupted. Upload your résumé again." : (record.error ?? null),
    errorCode: stale ? "interrupted" : (record.errorCode ?? null),
    fileName: record.fileName,
    startedAt: record.startedAt,
    completedAt: record.completedAt ?? null,
    source: record.source ?? null,
    fallbackReason: record.fallbackReason ?? null,
    profileId: record.profileId,
    profileVersion: record.profileVersion,
    extraction: record.extraction ?? null,
    result: record.result ? { score: record.result.score, coverage: record.result.coverage } : null,
  };
}

// The candidate's most recent analysis run (possibly still processing or failed). Ownership comes from the session.
export function getLatestAnalysis() {
  return request(() => {
    const candidate = currentCandidate();
    const record = getDb()
      .analyses.filter((a) => a.candidateId === candidate.id)
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    return record ? analysisView(record) : null;
  });
}

function gapView(map, gap, profile, detailed) {
  const name = map.skills[gap.skillId]?.name ?? gap.skillId;
  return {
    skillId: gap.skillId,
    name,
    kind: gap.kind,
    priority: gap.priority,
    importance: gap.importance,
    weight: gap.weight,
    state: gap.state,
    explanation: gapExplanation(gap, name, detailed ? LEVELS : null),
    relevance: relevanceText(gap, profile.title),
    ...(detailed && { level: gap.level, evidenceLabel: STRENGTHS[gap.strength].label, gain: Math.round(gap.gain) }),
  };
}

function currentGaps(db, candidate, profile) {
  const ctx = buildContext(db, candidate.id);
  const match = computeMatch(profile, ctx);
  return { ctx, match, ...identifyGaps(match, ctx) };
}

// Skill gaps for the target role, recalculated from current evidence so test passes, role changes and plan
// changes apply immediately. Free receives FREE_VISIBLE_GAPS gaps; the others are only counted.
export function getSkillGaps() {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    const map = lookups(db);
    const profile = targetProfile(db, candidate);
    const base = {
      hasResume: Boolean(candidate.resume),
      plan: candidate.plan,
      profile: profile && { id: profile.id, title: profile.title, version: profile.version, companyName: map.companies[profile.companyId]?.name },
    };
    if (!candidate.resume || !profile) return base;

    const { match, gaps, demonstrated } = currentGaps(db, candidate, profile);
    const full = can(candidate.plan, "match.gaps");
    const visible = full ? gaps : gaps.slice(0, FREE_VISIBLE_GAPS);
    const analysis = db.analyses.find((a) => a.id === candidate.resume.analysisId);
    return {
      ...base,
      score: match.score,
      coverage: match.coverage,
      analyzedAt: candidate.analyzedAt,
      analyzedForProfileId: analysis?.profileId ?? null,
      full,
      total: gaps.length,
      lockedCount: gaps.length - visible.length,
      gaps: visible.map((g) => gapView(map, g, profile, full)),
      demonstrated: demonstrated.map((r) => ({ skillId: r.skillId, name: map.skills[r.skillId]?.name ?? r.skillId, evidenceLabel: STRENGTHS[r.strength].label })),
    };
  });
}

// One competency of the target role with its learning resources: only courses mapped to this skill.
// Free may open only its visible gaps; course content and tests follow the existing Max rules.
export function getSkillDetail(skillId) {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    const map = lookups(db);
    const profile = targetProfile(db, candidate);
    if (!profile) throw new NotFoundError("Target role");

    const { ctx, match, gaps } = currentGaps(db, candidate, profile);
    const full = can(candidate.plan, "match.gaps");
    const freeVisible = candidate.resume ? gaps.slice(0, FREE_VISIBLE_GAPS) : [];
    // Checked before anything else, so a locked skill's existence or details never leak.
    if (!full && !freeVisible.some((g) => g.skillId === skillId)) {
      throw new AccessError("The full skill-gap report is part of the Pro plan.", "pro");
    }
    const row = match.rows.find((r) => r.skillId === skillId);
    const skill = map.skills[skillId];
    if (!row || !skill) throw new NotFoundError("Skill");

    const gap = candidate.resume ? gaps.find((g) => g.skillId === skillId) : null;
    const contentUnlocked = can(candidate.plan, "courses.access");
    const open = openCourseIds(db, candidate);
    const testsUnlocked = can(candidate.plan, "tests.take");
    const courses = db.courses
      .filter((c) => c.skillId === skillId && c.status === "published")
      .sort((a, b) => a.order - b.order)
      .map((c) => {
        const done = new Set(ctx.progressByCourse[c.id]?.completedLessonIds ?? []);
        const accessible = !open || open.has(c.id);
        return {
          id: c.id,
          title: c.title,
          description: c.description,
          difficulty: c.difficulty,
          provider: c.provider,
          minutes: courseMinutes(c),
          lessonCount: c.lessons.length,
          accessible,
          ...(accessible && {
            videoUrl: c.videoUrl,
            progress: courseProgress(c, ctx.progressByCourse),
            lessons: c.lessons.map((l) => ({ id: l.id, title: l.title, minutes: l.minutes, done: done.has(l.id) })),
          }),
        };
      });
    const test = db.tests.find((t) => t.skillId === skillId && t.status === "published");
    const attempts = test ? ctx.attempts.filter((a) => a.testId === test.id) : [];

    return {
      skill: { id: skill.id, name: skill.name, description: skill.description, category: skill.category },
      profile: { id: profile.id, title: profile.title, companyName: map.companies[profile.companyId]?.name },
      requirement: { importance: row.importance, weight: row.weight, level: full ? row.level : null },
      why: relevanceText(row, profile.title),
      gap: gap ? gapView(map, gap, profile, full) : null,
      state: row.state,
      evidence: { label: STRENGTHS[row.strength].label, quote: candidate.evidence.find((e) => e.skillId === skillId)?.quote ?? "" },
      contentUnlocked,
      testsUnlocked,
      courses,
      totalMinutes: courses.reduce((sum, c) => sum + c.minutes, 0),
      // Lesson titles are the learning objectives, so they're only listed for courses the plan opens.
      objectives: courses.flatMap((c) => c.lessons?.map((l) => l.title) ?? []),
      test: test && {
        id: test.id,
        title: test.title,
        questionCount: test.questions.length,
        passThreshold: test.passThreshold,
        ...(testsUnlocked && { passed: ctx.passed.has(skillId), lastAttempt: attempts.at(-1) ?? null }),
      },
    };
  });
}

export function reanalyze() {
  return request(() => {
    const candidate = currentCandidate();
    if (!candidate.resume) throw new ValidationError({}, "Upload a résumé first.");
    mutate((draft) => {
      draft.candidates.find((c) => c.id === candidate.id).analyzedAt = new Date().toISOString();
    });
  });
}

export function setSkillConfirmed(skillId, confirmed) {
  return request(() => {
    const candidate = currentCandidate();
    if (!getDb().skills.some((s) => s.id === skillId)) throw new NotFoundError("Skill");
    mutate((draft) => {
      const record = draft.candidates.find((c) => c.id === candidate.id);
      const existing = record.evidence.find((e) => e.skillId === skillId);
      if (existing) existing.confirmed = confirmed;
      else if (confirmed) record.evidence.push({ skillId, strength: null, level: 1, quote: "", confirmed: true });
      record.evidence = record.evidence.filter((e) => e.strength || e.confirmed);
    });
  });
}

export function getAssessment() {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    const map = lookups(db);
    const profile = targetProfile(db, candidate);
    const ctx = buildContext(db, candidate.id);
    const extracted = candidate.evidence.map((e) => ({ ...e, name: map.skills[e.skillId]?.name ?? e.skillId }));

    if (!candidate.resume || !profile) {
      return { hasResume: Boolean(candidate.resume), profile: profile && { id: profile.id, title: profile.title }, extracted };
    }

    const match = computeMatch(profile, ctx);
    const analysis = db.analyses.find((x) => x.id === candidate.resume.analysisId);
    const base = {
      hasResume: true,
      score: match.score,
      coverage: match.coverage,
      scoringVersion: match.scoringVersion,
      profile: { id: profile.id, title: profile.title, version: profile.version, companyName: map.companies[profile.companyId]?.name },
      analyzedAt: candidate.analyzedAt,
      source: candidate.resume.source,
      resume: candidate.resume,
      // The structured résumé summary (education, experience…) and why the AI service wasn't used, if it wasn't.
      extraction: analysis?.extraction ?? null,
      fallbackReason: analysis?.fallbackReason ?? null,
      extracted,
      counts: {
        identified: candidate.evidence.filter((e) => e.strength).length,
        needsWork: match.rows.filter((r) => r.credit < 1).length,
        testsPassed: ctx.passed.size,
      },
    };

    if (!can(candidate.plan, "match.gaps")) return { ...base, gapsLocked: true };

    const named = (r) => ({
      ...r,
      name: map.skills[r.skillId]?.name ?? r.skillId,
      evidenceLabel: STRENGTHS[r.strength].label,
      stateLabel: SKILL_STATES[r.state].label,
      quote: candidate.evidence.find((e) => e.skillId === r.skillId)?.quote ?? "",
    });
    return { ...base, gapsLocked: false, rows: match.rows.map(named), improvements: match.improvements.map(named) };
  });
}

export function getLearningPath() {
  return request(() => {
    const candidate = currentCandidate();
    assertPlan(candidate, "path.overview");
    const db = getDb();
    const profile = targetProfile(db, candidate);
    if (!profile || !candidate.resume) return { modules: [], contentLocked: !can(candidate.plan, "path.content"), profile: null };

    const ctx = buildContext(db, candidate.id);
    const modules = buildLearningPath(computeMatch(profile, ctx), { skills: db.skills, courses: db.courses, tests: db.tests, ctx });
    const contentLocked = !can(candidate.plan, "path.content");
    const open = openCourseIds(db, candidate);
    const attemptsFor = (testId) => ctx.attempts.filter((a) => a.testId === testId);

    return {
      profile: { id: profile.id, title: profile.title },
      contentLocked,
      modules: modules.map((m) => ({
        skillId: m.skillId,
        name: m.skill?.name,
        importance: m.importance,
        level: m.level,
        gain: Math.round(m.gain),
        state: m.state,
        stateLabel: SKILL_STATES[m.state].label,
        courses: m.courses.map((c) => {
          const accessible = !open || open.has(c.id);
          return { id: c.id, title: c.title, difficulty: c.difficulty, minutes: courseMinutes(c), accessible, progress: accessible ? c.progress : null };
        }),
        test: m.test && {
          id: m.test.id,
          title: m.test.title,
          lastAttempt: contentLocked ? null : (attemptsFor(m.test.id).at(-1) ?? null),
        },
      })),
    };
  });
}

export function listCourses() {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    const map = lookups(db);
    const ctx = buildContext(db, candidate.id);
    const open = openCourseIds(db, candidate);
    const profile = targetProfile(db, candidate);
    const targetSkills = new Set(profile?.skills.map((s) => s.skillId) ?? []);
    const ordered = orderedCourses(db, candidate);
    // Free gets its starter courses only; Pro sees every card; Max can open every course.
    const listed = can(candidate.plan, "courses.catalog") ? ordered : ordered.slice(0, FREE_LIMITS.courses);

    return {
      locked: Boolean(open),
      lockedCount: ordered.length - listed.length,
      courses: listed
        .map((c) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          difficulty: c.difficulty,
          provider: c.provider,
          skillId: c.skillId,
          skillName: map.skills[c.skillId]?.name,
          minutes: courseMinutes(c),
          lessons: c.lessons.length,
          relevant: targetSkills.has(c.skillId),
          accessible: !open || open.has(c.id),
          progress: !open || open.has(c.id) ? courseProgress(c, ctx.progressByCourse) : null,
        })),
    };
  });
}

export function getCourse(courseId) {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    assertCourseOpen(db, candidate, courseId);
    const course = db.courses.find((c) => c.id === courseId && c.status === "published");
    if (!course) throw new NotFoundError("Course");
    const ctx = buildContext(db, candidate.id);
    const test = db.tests.find((t) => t.skillId === course.skillId && t.status === "published");
    return {
      ...course,
      skillName: lookups(db).skills[course.skillId]?.name,
      minutes: courseMinutes(course),
      completedLessonIds: ctx.progressByCourse[course.id]?.completedLessonIds ?? [],
      progress: courseProgress(course, ctx.progressByCourse),
      test: test && { id: test.id, title: test.title, passed: ctx.passed.has(course.skillId), locked: !can(candidate.plan, "tests.take") },
    };
  });
}

export function setLessonComplete(courseId, lessonId, done) {
  return request(() => {
    const candidate = currentCandidate();
    assertCourseOpen(getDb(), candidate, courseId);
    const course = findOr404(getDb().courses, courseId, "Course");
    if (!course.lessons.some((l) => l.id === lessonId)) throw new NotFoundError("Lesson");

    mutate((draft) => {
      let entry = draft.progress.find((p) => p.candidateId === candidate.id && p.courseId === courseId);
      if (!entry) {
        entry = { candidateId: candidate.id, courseId, completedLessonIds: [], updatedAt: "" };
        draft.progress.push(entry);
      }
      const ids = new Set(entry.completedLessonIds);
      if (done) ids.add(lessonId);
      else ids.delete(lessonId);
      entry.completedLessonIds = [...ids];
      entry.updatedAt = new Date().toISOString();
      if (done && ids.size === course.lessons.length) logActivity(draft, `${candidate.name} completed ${course.title}`);
    });
  });
}

export function listTests() {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    const map = lookups(db);
    const ctx = buildContext(db, candidate.id);
    const profile = targetProfile(db, candidate);
    const targetSkills = new Set(profile?.skills.map((s) => s.skillId) ?? []);
    const unlocked = can(candidate.plan, "tests.take");

    return {
      locked: !unlocked,
      tests: db.tests
        .filter((t) => t.status === "published")
        .map((t) => {
          const attempts = ctx.attempts.filter((a) => a.testId === t.id);
          return {
            id: t.id,
            title: t.title,
            skillId: t.skillId,
            skillName: map.skills[t.skillId]?.name,
            questions: t.questions.length,
            passThreshold: t.passThreshold,
            relevant: targetSkills.has(t.skillId),
            learning: ctx.learning.has(t.skillId),
            attempts: attempts.length,
            lastAttempt: attempts.at(-1) ?? null,
            bestScore: attempts.length ? Math.max(...attempts.map((a) => a.score)) : null,
            passed: ctx.passed.has(t.skillId),
          };
        }),
    };
  });
}

export function getTest(testId) {
  return request(() => {
    const candidate = currentCandidate();
    assertPlan(candidate, "tests.take");
    const db = getDb();
    const test = db.tests.find((t) => t.id === testId && t.status === "published");
    if (!test) throw new NotFoundError("Skill test");
    return {
      id: test.id,
      title: test.title,
      skillName: lookups(db).skills[test.skillId]?.name,
      passThreshold: test.passThreshold,
      // Correct answers never leave the "server".
      questions: test.questions.map(({ id, prompt, code, options }) => ({ id, prompt, code, options })),
    };
  });
}

export function submitAttempt(testId, answers) {
  return request(() => {
    const candidate = currentCandidate();
    assertPlan(candidate, "tests.take");
    const db = getDb();
    const test = db.tests.find((t) => t.id === testId && t.status === "published");
    if (!test) throw new NotFoundError("Skill test");
    if (test.questions.some((q) => !Number.isInteger(answers[q.id]))) {
      throw new ValidationError({}, "Answer every question before submitting.");
    }

    const profile = targetProfile(db, candidate);
    const ctxBefore = buildContext(db, candidate.id);
    const scoreBefore = profile ? computeMatch(profile, ctxBefore).score : null;
    const eligibleBefore = new Set(visibleJobs(db).filter((j) => checkEligibility(j, ctxBefore).status === "eligible").map((j) => j.id));
    const result = gradeAttempt(test, answers);

    mutate((draft) => {
      draft.attempts.push({
        id: newId("att"),
        candidateId: candidate.id,
        testId,
        answers,
        score: result.score,
        passed: result.passed,
        createdAt: new Date().toISOString(),
      });
      logActivity(draft, `${candidate.name} ${result.passed ? "passed" : "attempted"} ${test.title} (${result.score}%)`);
    });

    const after = getDb();
    const ctxAfter = buildContext(after, candidate.id);
    const map = lookups(after);
    return {
      ...result,
      passThreshold: test.passThreshold,
      scoreBefore,
      scoreAfter: profile ? computeMatch(profile, ctxAfter).score : null,
      newlyEligible: visibleJobs(after)
        .filter((j) => !eligibleBefore.has(j.id) && checkEligibility(j, ctxAfter).status === "eligible")
        .map((j) => ({ id: j.id, title: j.title, companyName: map.companies[j.companyId]?.name })),
    };
  });
}

export function listJobs() {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    const ctx = buildContext(db, candidate.id);
    const listed = browsableJobs(db, candidate);
    return {
      eligibilityLocked: !can(candidate.plan, "jobs.eligibility"),
      lockedCount: visibleJobs(db).length - listed.length,
      jobs: listed.map((j) => jobView(db, j, ctx, candidate)),
    };
  });
}

export function getJob(jobId) {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    if (!can(candidate.plan, "jobs.browse") && !browsableJobs(db, candidate).some((j) => j.id === jobId)) {
      throw new AccessError("Browsing every job opportunity is part of the Pro plan.", "pro");
    }
    const job = visibleJobs(db).find((j) => j.id === jobId);
    if (!job) throw new NotFoundError("Job");
    return {
      ...jobView(db, job, buildContext(db, candidate.id), candidate),
      eligibilityLocked: !can(candidate.plan, "jobs.eligibility"),
      canApply: can(candidate.plan, "jobs.apply"),
    };
  });
}

export function applyToJob(jobId, { note, consent }) {
  return request(() => {
    const candidate = currentCandidate();
    assertPlan(candidate, "jobs.apply");
    const db = getDb();
    const job = visibleJobs(db).find((j) => j.id === jobId);
    if (!job) throw new NotFoundError("Job");
    if (db.applications.some((a) => a.jobId === jobId && a.candidateId === candidate.id)) {
      throw new ValidationError({}, "You have already applied to this job.");
    }
    if (checkEligibility(job, buildContext(db, candidate.id)).status !== "eligible") {
      throw new AccessError("You don't meet this job's mandatory requirements yet.");
    }
    validate({
      consent: !consent?.profile && "You must share your profile with the employer to apply.",
      note: (note ?? "").length > 1000 && "Keep your note under 1,000 characters.",
    });

    return mutate((draft) => {
      const now = new Date().toISOString();
      const company = draft.companies.find((c) => c.id === job.companyId);
      const app = {
        id: newId("app"),
        candidateId: candidate.id,
        jobId,
        status: "submitted",
        note: (note ?? "").trim(),
        consent: { profile: true, evidence: Boolean(consent.evidence), tests: Boolean(consent.tests), learning: Boolean(consent.learning) },
        createdAt: now,
        updatedAt: now,
        history: [{ status: "submitted", at: now, note: "", by: candidate.name }],
        offer: null,
      };
      draft.applications.push(app);
      const ref = { type: "application", ref: { applicationId: app.id } };
      notify(draft, `company:${company.id}`, `${candidate.name} applied to ${job.title}.`, `/company/candidates/${app.id}`, ref);
      notify(draft, "admin", `${candidate.name} applied to ${job.title} (${company.name}).`, `/admin/applications/${app.id}`, ref);
      logActivity(draft, `${candidate.name} applied to ${job.title} (${company.name})`);
      return app;
    });
  });
}

// Candidate-facing application: status and dates only. Internal notes, recruiter names, interview feedback
// and placement/commission data never leave the "server".
function myApplicationView(db, app) {
  const map = lookups(db);
  const job = map.jobs[app.jobId];
  const company = map.companies[job.companyId];
  const interviews = db.interviews
    .filter((i) => i.applicationId === app.id)
    .map(candidateInterviewView)
    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));
  const offer = app.offer && {
    status: app.offer.status,
    extendedAt: app.offer.extendedAt,
    startDate: app.offer.startDate,
    annualSalary: app.offer.annualSalary,
    currency: app.offer.currency,
    message: app.offer.message,
  };
  return {
    id: app.id,
    jobId: app.jobId,
    status: app.status,
    note: app.note,
    consent: app.consent,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    history: app.history.map((h) => ({ status: h.status, at: h.at })),
    job: { id: job.id, title: job.title, location: job.location, workMode: job.workMode, employmentType: job.employmentType },
    companyName: company?.name,
    interviews,
    nextInterview: interviews.filter((i) => i.status === "scheduled").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0] ?? null,
    offer,
    hireDate: app.status === "hired" ? (db.placements.find((p) => p.applicationId === app.id)?.hireDate ?? null) : null,
  };
}

export function listMyApplications() {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    return db.applications
      .filter((a) => a.candidateId === candidate.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((a) => myApplicationView(db, a));
  });
}

export function getMyApplication(appId) {
  return request(() => {
    const candidate = currentCandidate();
    const db = getDb();
    // Another candidate's application is reported as missing, so ids can't be probed.
    const app = db.applications.find((a) => a.id === appId && a.candidateId === candidate.id);
    if (!app) throw new NotFoundError("Application");
    return myApplicationView(db, app);
  });
}

export function confirmInterviewAttendance(interviewId) {
  return request(() => {
    const candidate = currentCandidate();
    const interview = getDb().interviews.find((i) => i.id === interviewId && i.candidateId === candidate.id);
    if (!interview) throw new NotFoundError("Interview");
    return candidateInterviewView(mutate((draft) => confirmAttendance(draft, interviewId)));
  });
}

// Demo only: there is no payment. A real backend would change the plan after a billing webhook.
export function setPlan(plan) {
  return request(() => {
    const candidate = currentCandidate();
    if (!PLANS[plan]) throw new ValidationError({ plan: "Unknown plan." });
    mutate((draft) => {
      draft.candidates.find((c) => c.id === candidate.id).plan = plan;
      logActivity(draft, `${candidate.name} switched to the ${PLANS[plan].label} plan (demo)`);
    });
  });
}

export function updateMyProfile({ name, email, location, headline }) {
  return request(() => {
    const candidate = currentCandidate();
    validate({
      name: !name?.trim() && "Enter your full name.",
      email: email?.trim() && !/^\S+@\S+\.\S+$/.test(email.trim()) && "Enter a valid email address.",
      headline: headline?.length > 120 && "Keep your headline under 120 characters.",
    });
    mutate((draft) => {
      Object.assign(draft.candidates.find((c) => c.id === candidate.id), {
        name: name.trim(),
        email: email.trim(),
        location: location.trim(),
        headline: headline.trim(),
      });
    });
  });
}
