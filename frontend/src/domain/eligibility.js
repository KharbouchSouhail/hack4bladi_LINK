import { bestStrength } from "./evidence.js";

export const ELIGIBILITY = {
  eligible: { label: "Eligible", tone: "success" },
  validate: { label: "Skills to validate", tone: "warning" },
  not_met: { label: "Requirements not yet met", tone: "neutral" },
};

// Based only on the job's configured requirements and recorded evidence, never on the match score.
export function checkEligibility(job, ctx) {
  const checklist = job.requirements.map((req) => {
    const strength = bestStrength(req.skillId, ctx);
    const met = req.rule === "test_passed" ? ctx.passed.has(req.skillId) : strength !== "none";
    return { ...req, met, hasEvidence: strength !== "none" || ctx.learning.has(req.skillId) };
  });

  const unmet = checklist.filter((c) => c.mandatory && !c.met);
  let status = "not_met";
  if (unmet.length === 0) status = "eligible";
  else if (unmet.every((c) => c.hasEvidence)) status = "validate";

  return { status, checklist };
}
