// Shared vocabularies. Tones map to <Badge> styles; icons are chosen in the UI layer.

export const LEVELS = { 1: "Foundational", 2: "Intermediate", 3: "Advanced" };

export const SKILL_CATEGORIES = ["Programming", "Data", "Mathematics", "Machine Learning", "DevOps", "Tools", "Backend"];

export const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced"];

export const WORK_MODES = ["On-site", "Hybrid", "Remote"];

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Internship", "Contract"];

export const PARTNER_STATUSES = {
  partner: { label: "Partner", tone: "success" },
  pilot: { label: "Pilot", tone: "info" },
  prospect: { label: "Prospect", tone: "neutral" },
};

export const PUBLISH_STATUSES = {
  published: { label: "Published", tone: "success" },
  draft: { label: "Draft", tone: "neutral" },
  archived: { label: "Archived", tone: "warning" },
};

export const IMPORTANCE = {
  required: { label: "Required", tone: "accent" },
  preferred: { label: "Preferred", tone: "neutral" },
};

// Application statuses are the employer's workflow, not platform hiring decisions.
export const APPLICATION_STATUSES = {
  submitted: { label: "Submitted", tone: "neutral" },
  under_review: { label: "Under review", tone: "info" },
  shortlisted: { label: "Shortlisted", tone: "accent" },
  interview: { label: "Interview", tone: "warning" },
  rejected: { label: "Rejected", tone: "error" },
  hired: { label: "Hired", tone: "success" },
};

export const REQUIREMENT_RULES = {
  test_passed: "Skill test passed",
  evidence: "Evidence on profile",
};
