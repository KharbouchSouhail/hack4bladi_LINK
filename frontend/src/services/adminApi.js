// Administrator API (demo). Every call requires the admin role.
import { APPLICATION_STATUSES, DIFFICULTIES, PARTNER_STATUSES } from "../domain/constants.js";
import { buildContext, courseProgress } from "../domain/evidence.js";
import { PLANS } from "../domain/permissions.js";
import { computeMatch } from "../domain/scoring.js";
import { youtubeId } from "../lib/format.js";
import { PLACEMENT_STATUSES, PLACEMENT_TRANSITIONS, validateCommissionSettings } from "../domain/recruitment.js";
import { applicationDetail, applicationRow, changeApplicationStatus, saveJob, saveProfile, setJobStatus } from "./shared.js";
import * as recruitment from "./recruitment.js";
import { getSession } from "../auth/auth.js";
import { findOr404, getDb, logActivity, lookups, mutate, newId, request, requireRole, validate } from "./core.js";
import { ValidationError } from "./errors.js";

function admin(fn) {
  return request(() => {
    requireRole("admin");
    return fn(getDb());
  });
}

function blockDelete(reason) {
  throw new ValidationError({}, reason);
}

function slugify(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function matchScore(db, candidate) {
  const profile = db.profiles.find((p) => p.id === candidate.targetProfileId);
  return profile && candidate.resume ? computeMatch(profile, buildContext(db, candidate.id)).score : null;
}

// ---- Overview ----

export function getOverview() {
  return admin((db) => ({
    metrics: {
      candidates: db.candidates.length,
      companies: db.companies.length,
      activeCompanies: db.companies.filter((c) => c.active).length,
      publishedProfiles: db.profiles.filter((p) => p.status === "published").length,
      activeJobs: db.jobs.filter((j) => j.status === "published").length,
      courses: db.courses.filter((c) => c.status === "published").length,
      tests: db.tests.filter((t) => t.status === "published").length,
      attempts: db.attempts.length,
      passedAttempts: db.attempts.filter((a) => a.passed).length,
      applications: db.applications.length,
      upcomingInterviews: db.interviews.filter((i) => i.status === "scheduled").length,
      placements: db.placements.filter((p) => p.status !== "cancelled").length,
    },
    perStatus: Object.keys(APPLICATION_STATUSES).map((s) => ({ status: s, count: db.applications.filter((a) => a.status === s).length })),
    perPlan: Object.keys(PLANS).map((p) => ({ plan: p, count: db.candidates.filter((c) => c.plan === p).length })),
    activity: db.activity.slice(0, 8),
  }));
}

// ---- Companies ----

export function listCompanies() {
  return admin((db) =>
    db.companies.map((c) => ({
      ...c,
      jobs: db.jobs.filter((j) => j.companyId === c.id).length,
      profiles: db.profiles.filter((p) => p.companyId === c.id).length,
    })),
  );
}

export function saveCompany(input) {
  return admin((db) => {
    const name = input.name?.trim() ?? "";
    validate({
      name:
        (!name && "Enter the company name.") ||
        (db.companies.some((c) => c.id !== input.id && c.name.toLowerCase() === name.toLowerCase()) && "A company with this name already exists."),
      city: !input.city?.trim() && "Enter a city.",
      partnerStatus: !PARTNER_STATUSES[input.partnerStatus] && "Choose a partner status.",
      description: input.description?.length > 500 && "Keep the description under 500 characters.",
    });
    const fields = {
      name,
      sector: input.sector?.trim() ?? "",
      city: input.city.trim(),
      size: input.size?.trim() ?? "",
      website: input.website?.trim() ?? "",
      partnerStatus: input.partnerStatus,
      description: input.description?.trim() ?? "",
    };
    return mutate((draft) => {
      if (input.id) {
        const company = findOr404(draft.companies, input.id, "Company");
        Object.assign(company, fields);
        logActivity(draft, `Company updated: ${company.name}`);
        return company;
      }
      const company = { id: newId("comp"), ownerUsername: null, active: true, createdAt: new Date().toISOString(), ...fields };
      draft.companies.push(company);
      logActivity(draft, `Company added: ${company.name}`);
      return company;
    });
  });
}

export function setCompanyActive(companyId, active) {
  return admin(() =>
    mutate((draft) => {
      const company = findOr404(draft.companies, companyId, "Company");
      company.active = active;
      logActivity(draft, `${company.name} ${active ? "activated" : "deactivated"}`);
    }),
  );
}

export function deleteCompany(companyId) {
  return admin((db) => {
    const company = findOr404(db.companies, companyId, "Company");
    if (db.jobs.some((j) => j.companyId === companyId) || db.profiles.some((p) => p.companyId === companyId)) {
      blockDelete(`${company.name} still has job profiles or listings. Deactivate it instead.`);
    }
    mutate((draft) => {
      draft.companies = draft.companies.filter((c) => c.id !== companyId);
      logActivity(draft, `Company deleted: ${company.name}`);
    });
  });
}

// ---- Candidates & subscriptions ----

export function listCandidates() {
  return admin((db) => {
    const map = lookups(db);
    return db.candidates.map((c) => {
      const ctx = buildContext(db, c.id);
      return {
        id: c.id,
        name: c.name,
        email: c.email,
        headline: c.headline,
        location: c.location,
        plan: c.plan,
        createdAt: c.createdAt,
        targetTitle: map.profiles[c.targetProfileId]?.title ?? "—",
        hasResume: Boolean(c.resume),
        score: matchScore(db, c),
        testsPassed: ctx.passed.size,
        applications: db.applications.filter((a) => a.candidateId === c.id).length,
      };
    });
  });
}

export function getCandidate(candidateId) {
  return admin((db) => {
    const candidate = findOr404(db.candidates, candidateId, "Candidate");
    const map = lookups(db);
    const ctx = buildContext(db, candidate.id);
    const profile = map.profiles[candidate.targetProfileId];
    return {
      ...candidate,
      targetTitle: profile?.title,
      match: profile && candidate.resume ? computeMatch(profile, ctx) : null,
      evidence: candidate.evidence.map((e) => ({ ...e, name: map.skills[e.skillId]?.name ?? e.skillId })),
      attempts: ctx.attempts
        .map((a) => ({ ...a, title: map.tests[a.testId]?.title }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      learning: db.courses
        .filter((c) => ctx.progressByCourse[c.id])
        .map((c) => ({ id: c.id, title: c.title, progress: courseProgress(c, ctx.progressByCourse) })),
      applications: db.applications
        .filter((a) => a.candidateId === candidate.id)
        .map((a) => applicationRow(db, a, { respectConsent: false })),
      skillNames: Object.fromEntries(db.skills.map((s) => [s.id, s.name])),
    };
  });
}

export function setCandidatePlan(candidateId, plan) {
  return admin(() => {
    if (!PLANS[plan]) throw new ValidationError({ plan: "Unknown plan." });
    mutate((draft) => {
      const candidate = findOr404(draft.candidates, candidateId, "Candidate");
      candidate.plan = plan;
      logActivity(draft, `${candidate.name} moved to the ${PLANS[plan].label} plan by an administrator`);
    });
  });
}

// ---- Job profiles ----

export function listProfiles() {
  return admin((db) => {
    const map = lookups(db);
    return db.profiles.map((p) => ({
      ...p,
      companyName: map.companies[p.companyId]?.name,
      skills: p.skills.map((s) => ({ ...s, name: map.skills[s.skillId]?.name ?? s.skillId })),
      jobs: db.jobs.filter((j) => j.profileId === p.id).length,
    }));
  });
}

export function saveJobProfile(input) {
  return admin(() => mutate((draft) => saveProfile(draft, input)));
}

export function setProfileStatus(profileId, status) {
  return admin(() =>
    mutate((draft) => {
      const profile = findOr404(draft.profiles, profileId, "Job profile");
      profile.status = status;
      logActivity(draft, `Job profile ${profile.title} set to ${status}`);
    }),
  );
}

export function deleteProfile(profileId) {
  return admin((db) => {
    const profile = findOr404(db.profiles, profileId, "Job profile");
    if (db.jobs.some((j) => j.profileId === profileId)) blockDelete(`${profile.title} is used by job listings. Archive it instead.`);
    mutate((draft) => {
      draft.profiles = draft.profiles.filter((p) => p.id !== profileId);
      logActivity(draft, `Job profile deleted: ${profile.title}`);
    });
  });
}

// ---- Skills ----

export function listSkills() {
  return admin((db) =>
    db.skills.map((s) => ({
      ...s,
      profiles: db.profiles.filter((p) => p.skills.some((x) => x.skillId === s.id)).map((p) => p.title),
      courses: db.courses.filter((c) => c.skillId === s.id).length,
      tests: db.tests.filter((t) => t.skillId === s.id).length,
    })),
  );
}

export function saveSkill(input) {
  return admin((db) => {
    const name = input.name?.trim() ?? "";
    const slug = slugify(name);
    const duplicate = db.skills.find((s) => s.id !== input.id && (s.name.toLowerCase() === name.toLowerCase() || s.id === slug));
    validate({
      name: (!name && "Enter a skill name.") || (duplicate && `“${duplicate.name}” already exists.`),
      category: !input.category && "Choose a category.",
      description: (input.description?.trim().length ?? 0) < 10 && "Describe the skill in at least 10 characters.",
    });
    return mutate((draft) => {
      const fields = { name, category: input.category, description: input.description.trim(), dependsOn: input.dependsOn ?? [] };
      if (input.id) {
        const skill = findOr404(draft.skills, input.id, "Skill");
        Object.assign(skill, fields);
        logActivity(draft, `Skill updated: ${name}`);
        return skill;
      }
      const skill = { id: slug, ...fields };
      draft.skills.push(skill);
      logActivity(draft, `Skill added: ${name}`);
      return skill;
    });
  });
}

export function deleteSkill(skillId) {
  return admin((db) => {
    const skill = findOr404(db.skills, skillId, "Skill");
    const used =
      db.profiles.some((p) => p.skills.some((s) => s.skillId === skillId)) ||
      db.courses.some((c) => c.skillId === skillId) ||
      db.tests.some((t) => t.skillId === skillId) ||
      db.jobs.some((j) => j.requirements.some((r) => r.skillId === skillId));
    if (used) blockDelete(`${skill.name} is used by profiles, courses, tests or jobs. Remove those links first.`);
    mutate((draft) => {
      draft.skills = draft.skills.filter((s) => s.id !== skillId);
      logActivity(draft, `Skill deleted: ${skill.name}`);
    });
  });
}

// ---- Courses ----

export function listCourses() {
  return admin((db) => {
    const map = lookups(db);
    return db.courses.map((c) => ({
      ...c,
      skillName: map.skills[c.skillId]?.name ?? c.skillId,
      minutes: c.lessons.reduce((sum, l) => sum + l.minutes, 0),
      learners: db.progress.filter((p) => p.courseId === c.id).length,
    }));
  });
}

export function saveCourse(input) {
  return admin((db) => {
    const lessons = input.lessons ?? [];
    validate({
      title: !input.title?.trim() && "Enter a course title.",
      skillId: !db.skills.some((s) => s.id === input.skillId) && "Choose a skill.",
      difficulty: !DIFFICULTIES.includes(input.difficulty) && "Choose a difficulty.",
      order: !(Number(input.order) >= 1) && "Order must be 1 or more.",
      videoUrl: input.videoUrl?.trim() && !youtubeId(input.videoUrl) && "Use a YouTube link, or leave this empty.",
      lessons:
        (lessons.length === 0 && "Add at least one lesson.") ||
        (lessons.some((l) => !l.title.trim() || !(l.minutes > 0)) && "Each lesson needs a title and a duration in minutes."),
    });
    return mutate((draft) => {
      const id = input.id ?? newId("c");
      const fields = {
        title: input.title.trim(),
        skillId: input.skillId,
        difficulty: input.difficulty,
        order: Number(input.order),
        provider: input.provider?.trim() || "Link Academy",
        videoUrl: input.videoUrl?.trim() ?? "",
        description: input.description?.trim() ?? "",
        // Keep lesson ids stable when only titles change, so progress survives edits.
        lessons: lessons.map((l, i) => ({ id: l.id ?? `${id}-l${i + 1}-${Date.now().toString(36)}`, title: l.title.trim(), minutes: Number(l.minutes) })),
      };
      if (input.id) {
        const course = findOr404(draft.courses, input.id, "Course");
        Object.assign(course, fields);
        logActivity(draft, `Course updated: ${course.title}`);
        return course;
      }
      const course = { id, status: "draft", ...fields };
      draft.courses.push(course);
      logActivity(draft, `Course added: ${course.title}`);
      return course;
    });
  });
}

export function setCourseStatus(courseId, status) {
  return admin(() =>
    mutate((draft) => {
      const course = findOr404(draft.courses, courseId, "Course");
      course.status = status;
      logActivity(draft, `Course ${course.title} set to ${status}`);
    }),
  );
}

export function deleteCourse(courseId) {
  return admin((db) => {
    const course = findOr404(db.courses, courseId, "Course");
    mutate((draft) => {
      draft.courses = draft.courses.filter((c) => c.id !== courseId);
      draft.progress = draft.progress.filter((p) => p.courseId !== courseId);
      logActivity(draft, `Course deleted: ${course.title}`);
    });
  });
}

// ---- Tests ----

export function listTests() {
  return admin((db) => {
    const map = lookups(db);
    return db.tests.map((t) => {
      const attempts = db.attempts.filter((a) => a.testId === t.id);
      return {
        ...t,
        skillName: map.skills[t.skillId]?.name ?? t.skillId,
        attempts: attempts.length,
        passRate: attempts.length ? Math.round((100 * attempts.filter((a) => a.passed).length) / attempts.length) : null,
      };
    });
  });
}

export function getTest(testId) {
  return admin((db) => findOr404(db.tests, testId, "Skill test"));
}

export function saveTest(input) {
  return admin((db) => {
    const questions = input.questions ?? [];
    const badQuestion = questions.findIndex(
      (q) => !q.prompt.trim() || q.options.filter((o) => o.trim()).length < 2 || !q.options[q.correctIndex]?.trim(),
    );
    validate({
      title: !input.title?.trim() && "Enter a test title.",
      skillId: !db.skills.some((s) => s.id === input.skillId) && "Choose a skill.",
      passThreshold: !(Number(input.passThreshold) >= 1 && Number(input.passThreshold) <= 100) && "Use a value from 1 to 100.",
      questions:
        (questions.length === 0 && "Add at least one question.") ||
        (badQuestion !== -1 && `Question ${badQuestion + 1} needs a prompt, at least two options and a correct answer.`),
    });
    return mutate((draft) => {
      const id = input.id ?? newId("t");
      const fields = {
        title: input.title.trim(),
        skillId: input.skillId,
        passThreshold: Number(input.passThreshold),
        questions: questions.map((q, i) => {
          // Drop empty options while keeping the correct answer pointing at the same text.
          const options = q.options.map((o) => o.trim()).filter(Boolean);
          return {
            id: q.id ?? `${id}-q${i + 1}-${Date.now().toString(36)}`,
            prompt: q.prompt.trim(),
            code: q.code?.trim() ?? "",
            options,
            correctIndex: options.indexOf(q.options[q.correctIndex].trim()),
          };
        }),
      };
      if (input.id) {
        const test = findOr404(draft.tests, input.id, "Skill test");
        Object.assign(test, fields);
        logActivity(draft, `Skill test updated: ${test.title}`);
        return test;
      }
      const test = { id, status: "draft", ...fields };
      draft.tests.push(test);
      logActivity(draft, `Skill test created: ${test.title}`);
      return test;
    });
  });
}

export function setTestStatus(testId, status) {
  return admin(() =>
    mutate((draft) => {
      const test = findOr404(draft.tests, testId, "Skill test");
      test.status = status;
      logActivity(draft, `Skill test ${test.title} set to ${status}`);
    }),
  );
}

export function deleteTest(testId) {
  return admin((db) => {
    const test = findOr404(db.tests, testId, "Skill test");
    if (db.attempts.some((a) => a.testId === testId)) blockDelete(`${test.title} has recorded attempts. Archive it instead.`);
    mutate((draft) => {
      draft.tests = draft.tests.filter((t) => t.id !== testId);
      logActivity(draft, `Skill test deleted: ${test.title}`);
    });
  });
}

// ---- Jobs & applications ----

export function listJobs() {
  return admin((db) => {
    const map = lookups(db);
    return db.jobs
      .map((j) => ({
        ...j,
        companyName: map.companies[j.companyId]?.name,
        profileTitle: map.profiles[j.profileId]?.title,
        skills: j.requirements.map((r) => ({ ...r, name: map.skills[r.skillId]?.name ?? r.skillId })),
        applications: db.applications.filter((a) => a.jobId === j.id).length,
      }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export function saveAdminJob(input) {
  return admin(() => mutate((draft) => saveJob(draft, input)));
}

export function setAdminJobStatus(jobId, status) {
  return admin(() => mutate((draft) => setJobStatus(draft, jobId, status)));
}

export function deleteJob(jobId) {
  return admin((db) => {
    const job = findOr404(db.jobs, jobId, "Job");
    if (db.applications.some((a) => a.jobId === jobId)) blockDelete(`${job.title} has applications. Unpublish it instead.`);
    mutate((draft) => {
      draft.jobs = draft.jobs.filter((j) => j.id !== jobId);
      logActivity(draft, `Job deleted: ${job.title}`);
    });
  });
}

export function listApplications() {
  return admin((db) =>
    db.applications
      .map((a) => applicationRow(db, a, { respectConsent: false }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export function getApplication(appId) {
  return admin((db) => applicationDetail(db, findOr404(db.applications, appId, "Application"), { respectConsent: false, includeCommission: true }));
}

function actor() {
  return { role: "admin", name: getSession().name };
}

export function updateApplicationStatus(appId, status, note) {
  return admin(() => mutate((draft) => changeApplicationStatus(draft, appId, status, note, actor())));
}

// ---- Interviews, offers and hires ----

export function scheduleInterview(appId, input) {
  return admin(() => mutate((draft) => recruitment.scheduleInterview(draft, appId, input, actor())));
}

export function rescheduleInterview(interviewId, input) {
  return admin(() => mutate((draft) => recruitment.rescheduleInterview(draft, interviewId, input, actor())));
}

export function cancelInterview(interviewId, reason) {
  return admin(() => mutate((draft) => recruitment.cancelInterview(draft, interviewId, reason, actor())));
}

export function completeInterview(interviewId, feedback) {
  return admin(() => mutate((draft) => recruitment.completeInterview(draft, interviewId, feedback, actor())));
}

export function extendOffer(appId, input) {
  return admin(() => mutate((draft) => recruitment.extendOffer(draft, appId, input, actor())));
}

export function confirmHire(appId, input) {
  return admin(() => mutate((draft) => recruitment.confirmHire(draft, appId, input, actor())));
}

export function listInterviews() {
  return admin((db) => {
    const map = lookups(db);
    return db.interviews
      .map((i) => ({
        ...i,
        candidateName: map.candidates[i.candidateId]?.name,
        jobTitle: map.jobs[i.jobId]?.title,
        companyName: map.companies[i.companyId]?.name,
      }))
      .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  });
}

// ---- Placements and commission (illustrative demo figures) ----

export function listPlacements() {
  return admin((db) => {
    const map = lookups(db);
    const placements = db.placements
      .map((p) => {
        const app = db.applications.find((a) => a.id === p.applicationId);
        return {
          ...p,
          candidateName: map.candidates[p.candidateId]?.name,
          companyName: map.companies[p.companyId]?.name,
          jobTitle: map.jobs[p.jobId]?.title,
          applicationStatus: app?.status,
          offerSalary: app?.offer?.annualSalary ?? null,
        };
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const counted = placements.filter((p) => p.status !== "cancelled");
    return {
      settings: db.settings.commission,
      placements,
      totals: {
        count: counted.length,
        // Sum of illustrative calculations, grouped by currency; never presented as revenue.
        estimated: Object.entries(
          counted.reduce((sum, p) => ({ ...sum, [p.commission.currency]: (sum[p.commission.currency] ?? 0) + p.commission.amount }), {}),
        ).map(([currency, amount]) => ({ currency, amount })),
      },
    };
  });
}

export function saveCommissionSettings(input) {
  return admin(() => {
    validate(validateCommissionSettings(input));
    return mutate((draft) => {
      draft.settings.commission = {
        model: input.model,
        ratePercent: Number(input.ratePercent),
        fixedFee: Number(input.fixedFee),
        defaultReferenceAmount: Number(input.defaultReferenceAmount),
        currency: input.currency,
      };
      logActivity(draft, "Commission settings updated (demo)");
      return draft.settings.commission;
    });
  });
}

export function setPlacementStatus(placementId, status, note = "") {
  return admin((db) => {
    const placement = findOr404(db.placements, placementId, "Placement");
    if (!PLACEMENT_STATUSES[status]) throw new ValidationError({ status: "Unknown status." });
    if (!PLACEMENT_TRANSITIONS[placement.status].includes(status)) {
      throw new ValidationError({}, `A placement that is “${PLACEMENT_STATUSES[placement.status].label}” can't become “${PLACEMENT_STATUSES[status].label}”.`);
    }
    return mutate((draft) => {
      const record = draft.placements.find((p) => p.id === placementId);
      const at = new Date().toISOString();
      record.status = status;
      record.updatedAt = at;
      record.history.push({ status, at, by: getSession().name, note: note.trim() });
      const candidate = draft.candidates.find((c) => c.id === record.candidateId);
      logActivity(draft, `Placement for ${candidate?.name} set to ${PLACEMENT_STATUSES[status].label}`);
      return record;
    });
  });
}

// Reference data for admin forms.
export function getReferenceData() {
  return admin((db) => ({
    skills: db.skills,
    companies: db.companies.map((c) => ({ id: c.id, name: c.name })),
    profiles: db.profiles.map((p) => ({ id: p.id, title: p.title, companyId: p.companyId, status: p.status })),
  }));
}
