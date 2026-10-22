import { bestStrength, skillState, STRENGTHS } from "./evidence.js";

// Deterministic: the same profile version + evidence + SCORING_VERSION always gives the same score.
// A skill with no evidence earns 0 credit but is reported as "unknown", not as a proven gap.
export const SCORING_VERSION = "v1";

export function computeMatch(profile, ctx) {
  const totalWeight = profile.skills.reduce((sum, s) => sum + s.weight, 0) || 1;

  const rows = profile.skills.map((ps) => {
    const strength = bestStrength(ps.skillId, ctx);
    const credit = STRENGTHS[strength].credit;
    return {
      ...ps,
      strength,
      credit,
      state: skillState(ps.skillId, ctx),
      points: (100 * ps.weight * credit) / totalWeight,
      // Score points this skill would add if fully validated.
      gain: (100 * ps.weight * (1 - credit)) / totalWeight,
    };
  });

  const score = Math.round(rows.reduce((sum, r) => sum + r.points, 0));
  const improvements = rows
    .filter((r) => r.gain > 0)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);

  return {
    score,
    profileVersion: profile.version,
    scoringVersion: SCORING_VERSION,
    coverage: { withEvidence: rows.filter((r) => r.strength !== "none").length, total: rows.length },
    rows,
    improvements,
  };
}
