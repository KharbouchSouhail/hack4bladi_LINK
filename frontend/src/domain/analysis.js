// Structured résumé analysis: the schema every analyser (AI or keyword) must satisfy,
// a deterministic section extractor, and skill-gap classification. Pure functions, no storage access.
import { bestStrength, evidenceFor } from "./evidence.js";
import { extractEvidence } from "./extraction.js";

export const ANALYSIS_SCHEMA_VERSION = 1;

const SECTION_KEYS = ["education", "experience", "projects", "certifications", "achievements"];
const SKILL_STRENGTHS = ["mentioned", "demonstrated", "professional"];
const MAX_ITEMS = 12;
const MAX_ITEM_LENGTH = 240;

function clip(text, max = MAX_ITEM_LENGTH) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

function normalize(text) {
  return String(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

// Validates analyser output against the schema. Anything not provably grounded in the résumé is dropped:
// unknown skill ids are removed and a quote that doesn't appear in the text is discarded (the skill is
// then kept only as "mentioned" if its name appears in the text). Returns { ok, value } or { ok, errors }.
export function parseAnalysis(raw, { skills, sourceText }) {
  const errors = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ok: false, errors: ["Analysis must be an object."] };

  const value = { schemaVersion: ANALYSIS_SCHEMA_VERSION };
  for (const key of SECTION_KEYS) {
    const list = raw[key] ?? [];
    if (!Array.isArray(list)) {
      errors.push(`${key} must be an array.`);
      continue;
    }
    value[key] = list
      .map((item) => (typeof item === "string" ? item : item?.text))
      .filter((text) => typeof text === "string" && text.trim())
      .slice(0, MAX_ITEMS)
      .map((text) => ({ text: clip(text) }));
  }

  const soft = raw.softSkills ?? [];
  if (!Array.isArray(soft)) errors.push("softSkills must be an array.");
  else value.softSkills = [...new Set(soft.filter((s) => typeof s === "string" && s.trim()).map((s) => clip(s, 40)))].slice(0, MAX_ITEMS);

  if (!Array.isArray(raw.skills)) {
    errors.push("skills must be an array.");
  } else {
    const byId = Object.fromEntries(skills.map((s) => [s.id, s]));
    const text = normalize(sourceText);
    const seen = new Set();
    value.skills = raw.skills.flatMap((s) => {
      const skill = byId[s?.skillId];
      if (!skill || seen.has(skill.id)) return [];
      seen.add(skill.id);
      const quote = typeof s.quote === "string" ? clip(s.quote, 160) : "";
      const grounded = quote && text.includes(normalize(quote.replace(/…$/, "")));
      if (!grounded && !text.includes(normalize(skill.name))) return [];
      const strength = grounded && SKILL_STRENGTHS.includes(s.strength) ? s.strength : "mentioned";
      const level = strength === "mentioned" ? 1 : Math.min(3, Math.max(1, Math.round(Number(s.level) || 2)));
      return [{ skillId: skill.id, strength, level, quote: grounded ? quote : "", confirmed: false }];
    });
  }

  return errors.length ? { ok: false, errors } : { ok: true, value };
}

const HEADINGS = {
  education: /^(education|academic background|formation|études|studies)\b/i,
  experience: /^(experience|work experience|professional experience|employment|expérience|internships?)\b/i,
  projects: /^(projects?|projets?|personal projects|academic projects)\b/i,
  certifications: /^(certifications?|certificates?|licen[cs]es)\b/i,
  achievements: /^(achievements?|awards?|honou?rs|accomplishments|distinctions)\b/i,
  skills: /^(skills|technical skills|compétences|tools|technologies)\b/i,
  other: /^(languages|langues|interests|hobbies|references|contact|summary|profile|about me)\b/i,
};

const SOFT_SKILLS = [
  "communication",
  "teamwork",
  "leadership",
  "problem solving",
  "problem-solving",
  "time management",
  "adaptability",
  "critical thinking",
  "collaboration",
  "creativity",
  "autonomy",
  "presentation",
];

// Splits résumé text into sections by recognised headings. Handles both "Heading" lines and
// inline "Heading: content" lines. Lines before any heading are ignored (usually name/contact).
export function extractSections(text) {
  const sections = Object.fromEntries(SECTION_KEYS.map((k) => [k, []]));
  let current = null;

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(/^[\s•\-–*·▪●]+/, "").trim();
    if (!line) continue;
    // A heading is a short line, or "Heading: content"; "Project management…" in a sentence is not.
    const heading = Object.entries(HEADINGS)
      .map(([key, pattern]) => [key, line.match(pattern)])
      .find(([, m]) => m && (line.length <= 40 || /^\s*:/.test(line.slice(m[0].length))));
    if (heading) {
      current = heading[0];
      const rest = line.slice(heading[1][0].length).replace(/^\s*[:\-–]\s*/, "").trim();
      if (rest && sections[current]) sections[current].push(rest);
      continue;
    }
    if (sections[current]) sections[current].push(line);
  }

  const lower = String(text).toLowerCase();
  return {
    ...Object.fromEntries(SECTION_KEYS.map((k) => [k, sections[k]])),
    softSkills: [...new Set(SOFT_SKILLS.filter((s) => lower.includes(s)).map((s) => s.replace("-", " ")))],
  };
}

// The deterministic analyser used when no AI service is configured or it fails.
// Its output goes through parseAnalysis like any other analyser's.
export function analyzeLocally(text) {
  return { ...extractSections(text), skills: extractEvidence(text) };
}

export const GAP_KINDS = {
  no_evidence: { label: "No evidence yet", tone: "neutral" },
  insufficient: { label: "Insufficient evidence", tone: "warning" },
  develop: { label: "Needs development", tone: "info" },
};

export const GAP_PRIORITIES = {
  high: { label: "High priority", tone: "error", rank: 0 },
  medium: { label: "Medium priority", tone: "warning", rank: 1 },
  low: { label: "Low priority", tone: "neutral", rank: 2 },
};

const PRIORITY = {
  required: { no_evidence: "high", insufficient: "high", develop: "medium" },
  preferred: { no_evidence: "medium", insufficient: "low", develop: "low" },
};

// Classifies each profile competency from a computeMatch() result. A skill counts as demonstrated when
// it's validated by a test, or shown in a project/job at the expected level. Everything else is a gap,
// and "no evidence" is kept distinct from "insufficient evidence": absence from a résumé isn't proof of absence.
export function identifyGaps(match, ctx) {
  const demonstrated = [];
  const gaps = [];

  for (const row of match.rows) {
    const strength = bestStrength(row.skillId, ctx);
    const evidenceLevel = evidenceFor(row.skillId, ctx)?.level ?? 0;
    let kind = null;
    if (strength === "none") kind = "no_evidence";
    else if (strength === "mentioned" || strength === "confirmed") kind = "insufficient";
    else if (strength !== "validated" && evidenceLevel < row.level) kind = "develop";

    if (kind) gaps.push({ ...row, kind, evidenceLevel, priority: PRIORITY[row.importance === "required" ? "required" : "preferred"][kind] });
    else demonstrated.push(row);
  }

  gaps.sort(
    (a, b) =>
      GAP_PRIORITIES[a.priority].rank - GAP_PRIORITIES[b.priority].rank || b.gain - a.gain || a.skillId.localeCompare(b.skillId),
  );
  return { demonstrated, gaps };
}

// Expected proficiency levels are a Pro feature, so they're only named when `levels` is passed.
export function gapExplanation(gap, skillName, levels = null) {
  if (gap.kind === "no_evidence") {
    return `We couldn't find ${skillName} in your résumé. That doesn't mean you lack it — add evidence or validate it with a test.`;
  }
  if (gap.kind === "insufficient") {
    return `${skillName} is listed, but without a project or work example showing how you used it.`;
  }
  return levels
    ? `Your résumé shows ${skillName} in practice at ${levels[gap.evidenceLevel] ?? "a basic"} level; this role expects ${levels[gap.level]}.`
    : `Your résumé shows ${skillName} in practice, but this role expects more depth.`;
}

export function relevanceText(gap, profileTitle) {
  const role = gap.importance === "required" ? "A required competency" : "A preferred competency";
  return `${role} for ${profileTitle}, worth ${gap.weight}% of the compatibility score.`;
}
