// Company API (demo). A company only ever reads or changes its own profiles, jobs and applications,
// and only sees the candidate data each applicant agreed to share.
import { APPLICATION_STATUSES } from "../domain/constants.js";
import { buildContext } from "../domain/evidence.js";
import { applicationDetail, applicationRow, changeApplicationStatus, saveJob, saveProfile, setJobStatus } from "./shared.js";
import { findOr404, getDb, logActivity, lookups, mutate, newId, request, requireRole, validate } from "./core.js";
import { AccessError, ValidationError } from "./errors.js";

function currentCompany() {
  const session = requireRole("company");
  const existing = getDb().companies.find((c) => c.ownerUsername === session.username);
  if (existing) return existing;

  // First visit of a self-registered company.
  return mutate((draft) => {
    const record = {
      id: newId("comp"),
      name: session.name,
      ownerUsername: session.username,
      sector: "",
      city: "",
      size: "",
      website: "",
      partnerStatus: "prospect",
      active: true,
      description: "",
      createdAt: new Date().toISOString(),
    };
    draft.companies.push(record);
    logActivity(draft, `${record.name} registered as a company`);
    return record;
  });
}

function assertOwn(record, company) {
  if (record.companyId !== company.id) throw new AccessError("This item belongs to another company.");
}

function ownApplications(db, company) {
  const jobIds = new Set(db.jobs.filter((j) => j.companyId === company.id).map((j) => j.id));
  return db.applications.filter((a) => jobIds.has(a.jobId));
}

function withSkillNames(db, profile) {
  const map = lookups(db);
  return { ...profile, skills: profile.skills.map((s) => ({ ...s, name: map.skills[s.skillId]?.name ?? s.skillId })) };
}

export function getCompany() {
  return request(() => currentCompany());
}

export function updateCompany(fields) {
  return request(() => {
    const company = currentCompany();
    validate({
      name: !fields.name?.trim() && "Enter the company name.",
      city: !fields.city?.trim() && "Enter a city.",
      description: fields.description?.length > 500 && "Keep the description under 500 characters.",
    });
    mutate((draft) => {
      const record = draft.companies.find((c) => c.id === company.id);
      for (const key of ["name", "sector", "city", "size", "website", "description"]) record[key] = (fields[key] ?? "").trim();
    });
  });
}

export function getOverview() {
  return request(() => {
    const company = currentCompany();
    const db = getDb();
    const jobs = db.jobs.filter((j) => j.companyId === company.id);
    const apps = ownApplications(db, company);
    const rows = apps.map((a) => applicationRow(db, a, { respectConsent: true }));
    const statusCounts = Object.keys(APPLICATION_STATUSES).map((status) => ({
      status,
      count: apps.filter((a) => a.status === status).length,
    }));

    return {
      company,
      stats: {
        publishedJobs: jobs.filter((j) => j.status === "published").length,
        draftJobs: jobs.filter((j) => j.status !== "published").length,
        totalApplications: apps.length,
        awaitingReview: apps.filter((a) => a.status === "submitted").length,
        meetingCriteria: rows.filter((r) => r.eligibility === "eligible").length,
        shortlisted: apps.filter((a) => ["shortlisted", "interview"].includes(a.status)).length,
      },
      statusCounts,
      attention: jobs
        .filter((j) => j.status === "published")
        .map((j) => ({
          id: j.id,
          title: j.title,
          awaiting: apps.filter((a) => a.jobId === j.id && a.status === "submitted").length,
          total: apps.filter((a) => a.jobId === j.id).length,
        }))
        .filter((j) => j.awaiting > 0 || j.total === 0),
      recent: rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    };
  });
}

export function listJobProfiles() {
  return request(() => {
    const company = currentCompany();
    const db = getDb();
    return db.profiles
      .filter((p) => p.companyId === company.id)
      .map((p) => ({ ...withSkillNames(db, p), jobs: db.jobs.filter((j) => j.profileId === p.id).length }));
  });
}

export function saveJobProfile(input) {
  return request(() => {
    const company = currentCompany();
    if (input.id) assertOwn(findOr404(getDb().profiles, input.id, "Job profile"), company);
    return mutate((draft) => saveProfile(draft, { ...input, companyId: company.id }));
  });
}

export function setJobProfileStatus(profileId, status) {
  return request(() => {
    const company = currentCompany();
    assertOwn(findOr404(getDb().profiles, profileId, "Job profile"), company);
    if (!["published", "draft", "archived"].includes(status)) throw new ValidationError({ status: "Unknown status." });
    mutate((draft) => {
      const profile = draft.profiles.find((p) => p.id === profileId);
      profile.status = status;
      logActivity(draft, `${company.name} set ${profile.title} to ${status}`);
    });
  });
}

export function listJobs() {
  return request(() => {
    const company = currentCompany();
    const db = getDb();
    const map = lookups(db);
    return db.jobs
      .filter((j) => j.companyId === company.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((j) => ({
        ...j,
        profileTitle: map.profiles[j.profileId]?.title,
        skills: j.requirements.map((r) => ({ ...r, name: map.skills[r.skillId]?.name ?? r.skillId })),
        applications: db.applications.filter((a) => a.jobId === j.id).length,
      }));
  });
}

export function saveCompanyJob(input) {
  return request(() => {
    const company = currentCompany();
    if (input.id) assertOwn(findOr404(getDb().jobs, input.id, "Job"), company);
    return mutate((draft) => saveJob(draft, { ...input, companyId: company.id }));
  });
}

export function setCompanyJobStatus(jobId, status) {
  return request(() => {
    const company = currentCompany();
    assertOwn(findOr404(getDb().jobs, jobId, "Job"), company);
    return mutate((draft) => setJobStatus(draft, jobId, status));
  });
}

export function listApplications() {
  return request(() => {
    const company = currentCompany();
    const db = getDb();
    return ownApplications(db, company)
      .map((a) => applicationRow(db, a, { respectConsent: true }))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  });
}

export function getApplication(appId) {
  return request(() => {
    const company = currentCompany();
    const db = getDb();
    const app = findOr404(ownApplications(db, company), appId, "Application");
    return applicationDetail(db, app, { respectConsent: true });
  });
}

export function updateApplicationStatus(appId, status, note) {
  return request(() => {
    const company = currentCompany();
    findOr404(ownApplications(getDb(), company), appId, "Application");
    mutate((draft) => changeApplicationStatus(draft, appId, status, note));
  });
}

export function getAnalytics() {
  return request(() => {
    const company = currentCompany();
    const db = getDb();
    const map = lookups(db);
    const jobs = db.jobs.filter((j) => j.companyId === company.id);
    const apps = ownApplications(db, company);

    // Share of applicants (who shared their test results) that passed each required skill test.
    const skillIds = [...new Set(jobs.flatMap((j) => j.requirements.filter((r) => r.rule === "test_passed").map((r) => r.skillId)))];
    const sharing = apps.filter((a) => a.consent.tests);
    const contexts = sharing.map((a) => buildContext(db, a.candidateId));

    return {
      perJob: jobs.map((j) => ({ id: j.id, title: j.title, count: apps.filter((a) => a.jobId === j.id).length })),
      perStatus: Object.keys(APPLICATION_STATUSES).map((s) => ({ status: s, count: apps.filter((a) => a.status === s).length })),
      skillValidation: skillIds.map((id) => ({
        skillId: id,
        name: map.skills[id]?.name ?? id,
        passed: contexts.filter((ctx) => ctx.passed.has(id)).length,
        total: contexts.length,
      })),
      sharingCount: sharing.length,
      totalApplicants: apps.length,
    };
  });
}

export function listSkills() {
  return request(() => {
    requireRole("company");
    return getDb().skills;
  });
}
