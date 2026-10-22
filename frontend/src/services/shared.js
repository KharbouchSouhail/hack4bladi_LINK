// Logic shared by the company and admin APIs: validation, saves and the application view.
import { APPLICATION_STATUSES, EMPLOYMENT_TYPES, WORK_MODES } from "../domain/constants.js";
import { checkEligibility } from "../domain/eligibility.js";
import { buildContext, courseProgress, SKILL_STATES } from "../domain/evidence.js";
import { computeMatch } from "../domain/scoring.js";
import { findOr404, logActivity, lookups, newId, notify, validate } from "./core.js";
import { ValidationError } from "./errors.js";

function trimmed(value) {
  return (value ?? "").trim();
}

function duplicateSkills(rows) {
  const ids = rows.map((r) => r.skillId);
  return ids.length !== new Set(ids).size;
}

export function saveProfile(draft, input) {
  const skills = input.skills ?? [];
  validate({
    companyId: !draft.companies.some((c) => c.id === input.companyId) && "Choose a company.",
    title: !trimmed(input.title) && "Enter a role title.",
    description: trimmed(input.description).length < 20 && "Describe the role in at least 20 characters.",
    skills:
      (skills.length === 0 && "Add at least one competency.") ||
      (skills.some((s) => !s.skillId) && "Choose a skill for every row.") ||
      (duplicateSkills(skills) && "Each skill can only appear once.") ||
      (skills.some((s) => !(Number(s.weight) > 0)) && "Every weight must be greater than 0.") ||
      (!skills.some((s) => s.importance === "required") && "Mark at least one competency as required."),
  });

  const fields = {
    companyId: input.companyId,
    title: trimmed(input.title),
    description: trimmed(input.description),
    education: trimmed(input.education),
    experience: trimmed(input.experience),
    skills: skills.map((s) => ({ skillId: s.skillId, weight: Number(s.weight), level: Number(s.level), importance: s.importance })),
    updatedAt: new Date().toISOString(),
  };

  if (input.id) {
    const profile = findOr404(draft.profiles, input.id, "Job profile");
    // A new version whenever the requirements change, so past scores stay traceable.
    const changed = JSON.stringify(profile.skills) !== JSON.stringify(fields.skills);
    Object.assign(profile, fields, { version: profile.version + (changed ? 1 : 0) });
    logActivity(draft, `Job profile updated: ${profile.title}`);
    return profile;
  }
  const profile = { id: newId("prof"), status: "draft", version: 1, ...fields };
  draft.profiles.push(profile);
  logActivity(draft, `Job profile created: ${profile.title}`);
  return profile;
}

export function saveJob(draft, input) {
  const requirements = input.requirements ?? [];
  const profile = draft.profiles.find((p) => p.id === input.profileId && p.companyId === input.companyId);
  validate({
    companyId: !draft.companies.some((c) => c.id === input.companyId) && "Choose a company.",
    profileId: (!profile && "Choose one of this company's job profiles.") || (profile.status === "archived" && "This profile is archived."),
    title: !trimmed(input.title) && "Enter a job title.",
    location: !trimmed(input.location) && "Enter a location.",
    workMode: !WORK_MODES.includes(input.workMode) && "Choose a work arrangement.",
    employmentType: !EMPLOYMENT_TYPES.includes(input.employmentType) && "Choose an employment type.",
    description: trimmed(input.description).length < 20 && "Describe the job in at least 20 characters.",
    requirements:
      (requirements.some((r) => !r.skillId) && "Choose a skill for every requirement.") ||
      (duplicateSkills(requirements) && "Each skill can only appear once.") ||
      (!requirements.some((r) => r.mandatory) && "Add at least one mandatory requirement."),
  });

  const fields = {
    companyId: input.companyId,
    profileId: input.profileId,
    title: trimmed(input.title),
    location: trimmed(input.location),
    workMode: input.workMode,
    employmentType: input.employmentType,
    description: trimmed(input.description),
    requirements: requirements.map((r) => ({ skillId: r.skillId, rule: r.rule, mandatory: Boolean(r.mandatory) })),
  };

  if (input.id) {
    const job = findOr404(draft.jobs, input.id, "Job");
    Object.assign(job, fields);
    logActivity(draft, `Job listing updated: ${job.title}`);
    return job;
  }
  const job = { id: newId("job"), status: "draft", createdAt: new Date().toISOString(), ...fields };
  draft.jobs.push(job);
  logActivity(draft, `Job listing created: ${job.title}`);
  return job;
}

export function setJobStatus(draft, jobId, status) {
  const job = findOr404(draft.jobs, jobId, "Job");
  if (status === "published") {
    const profile = draft.profiles.find((p) => p.id === job.profileId);
    if (profile?.status !== "published") {
      throw new ValidationError({}, "Publish the job's profile before publishing the job.");
    }
  }
  job.status = status;
  logActivity(draft, `${job.title} ${status === "published" ? "published" : "unpublished"}`);
  return job;
}

export function changeApplicationStatus(draft, appId, status, note) {
  if (!APPLICATION_STATUSES[status]) throw new ValidationError({ status: "Choose a status." });
  const app = findOr404(draft.applications, appId, "Application");
  const job = draft.jobs.find((j) => j.id === app.jobId);
  const candidate = draft.candidates.find((c) => c.id === app.candidateId);
  const now = new Date().toISOString();

  app.status = status;
  app.updatedAt = now;
  app.history.push({ status, at: now, note: trimmed(note) });
  notify(
    draft,
    `candidate:${app.candidateId}`,
    `Your application for ${job.title} is now “${APPLICATION_STATUSES[status].label}”.`,
    "/candidate/applications",
  );
  logActivity(draft, `${candidate.name}'s application for ${job.title} moved to ${APPLICATION_STATUSES[status].label}`);
  return app;
}

function skillName(map, id) {
  return map.skills[id]?.name ?? id;
}

// Summary row for pipelines. With respectConsent, skill evidence is hidden unless the candidate shared it.
export function applicationRow(db, app, { respectConsent }) {
  const map = lookups(db);
  const job = map.jobs[app.jobId];
  const candidate = map.candidates[app.candidateId];
  const ctx = buildContext(db, candidate.id);
  const eligibility = checkEligibility(job, ctx);
  const required = eligibility.checklist.filter((c) => c.mandatory);
  const sharesEvidence = !respectConsent || app.consent.evidence;

  return {
    id: app.id,
    status: app.status,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
    job: { id: job.id, title: job.title, companyName: map.companies[job.companyId]?.name },
    candidate: { id: candidate.id, name: candidate.name, headline: candidate.headline },
    eligibility: eligibility.status,
    requiredMet: { met: required.filter((c) => c.met).length, total: required.length },
    testsPassed: !respectConsent || app.consent.tests ? ctx.passed.size : null,
    skills: sharesEvidence
      ? job.requirements.map((r) => ({ skillId: r.skillId, name: skillName(map, r.skillId), passed: ctx.passed.has(r.skillId) }))
      : [],
    skillIds: sharesEvidence ? [...new Set([...candidate.evidence.map((e) => e.skillId), ...ctx.passed])] : [],
  };
}

// Full candidate view. Companies only receive the sections the candidate consented to share.
export function applicationDetail(db, app, { respectConsent }) {
  const map = lookups(db);
  const job = map.jobs[app.jobId];
  const candidate = map.candidates[app.candidateId];
  const ctx = buildContext(db, candidate.id);
  const shares = (key) => !respectConsent || app.consent[key];
  const profile = map.profiles[job.profileId];

  return {
    ...applicationRow(db, app, { respectConsent }),
    note: app.note,
    history: app.history,
    consent: app.consent,
    job: { ...job, companyName: map.companies[job.companyId]?.name, profileTitle: profile?.title },
    candidate: {
      id: candidate.id,
      name: candidate.name,
      headline: candidate.headline,
      location: candidate.location,
      email: shares("profile") ? candidate.email : null,
      resume: shares("profile") ? candidate.resume : null,
    },
    match: shares("evidence") && profile ? { score: computeMatch(profile, ctx).score, profileTitle: profile.title } : null,
    checklist: checkEligibility(job, ctx).checklist.map((c) => ({ ...c, name: skillName(map, c.skillId) })),
    evidence: shares("evidence")
      ? candidate.evidence.map((e) => ({ ...e, name: skillName(map, e.skillId), state: SKILL_STATES[e.strength ? "identified" : "confirmed"].label }))
      : null,
    assessments: shares("tests")
      ? ctx.attempts
          .map((a) => ({ ...a, title: map.tests[a.testId]?.title, skillName: skillName(map, map.tests[a.testId]?.skillId) }))
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      : null,
    learning: shares("learning")
      ? db.courses
          .filter((c) => ctx.progressByCourse[c.id])
          .map((c) => ({ id: c.id, title: c.title, skillName: skillName(map, c.skillId), progress: courseProgress(c, ctx.progressByCourse) }))
      : null,
  };
}
