// Single source of truth for what each subscription plan unlocks. Prices live in pricing.js.
// The demo service layer calls assertCan() before returning data; a real backend must do the same.

export const PLAN_ORDER = ["free", "pro", "max"];

export const PLANS = {
  free: {
    label: "Free",
    tagline: "See where you stand",
    features: [
      "Automatic résumé analysis",
      "Select a target role",
      "Overall compatibility score",
      "Basic assessment summary",
      "Your top 2 skill gaps in detail",
      "2 starter courses",
      "Browse 2 job opportunities",
    ],
  },
  pro: {
    label: "Pro",
    tagline: "Know exactly what to work on",
    features: ["Everything in Free", "Full skill-gap report: every missing skill", "Browse every course and job opportunity", "Skill priorities", "Expected proficiency levels", "Learning path overview"],
  },
  max: {
    label: "Max",
    tagline: "Learn, prove it and apply",
    features: [
      "Everything in Pro",
      "Full learning-path access",
      "Courses and practice",
      "Skill assessments",
      "Progress tracking",
      "Eligibility and applications to partner jobs",
    ],
  },
};

// What Free sees in full. Anything beyond is counted but never sent to the client.
// Higher plans inherit these: e.g. Pro can open the same starter courses as Free.
export const FREE_LIMITS = { gaps: 2, courses: 2, jobs: 2 };
export const FREE_VISIBLE_GAPS = FREE_LIMITS.gaps;

const MIN_PLAN = {
  "resume.upload": "free",
  "match.score": "free",
  "match.gaps": "pro",
  "path.overview": "pro",
  "path.content": "max",
  "courses.catalog": "pro",
  "courses.access": "max",
  "tests.take": "max",
  "jobs.browse": "pro",
  "jobs.eligibility": "max",
  "jobs.apply": "max",
};

export function requiredPlan(feature) {
  return MIN_PLAN[feature];
}

export function can(plan, feature) {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(MIN_PLAN[feature]);
}
