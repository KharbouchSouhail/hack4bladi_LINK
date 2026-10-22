import { describe, expect, it } from "vitest";
import { SAMPLE_RESUME_TEXT } from "../data/seed.js";
import { analyzeLocally, extractSections, gapExplanation, identifyGaps, parseAnalysis } from "./analysis.js";
import { LEVELS } from "./constants.js";
import { computeMatch } from "./scoring.js";

const SKILLS = [
  { id: "python", name: "Python" },
  { id: "sql", name: "SQL" },
  { id: "docker", name: "Docker" },
];

const TEXT = "Projects\n- Built a churn model in Python with pandas.\nSkills: SQL";

describe("parseAnalysis", () => {
  it("accepts valid output and keeps grounded skills", () => {
    const raw = {
      education: [{ text: "BSc Computer Science" }],
      experience: [],
      projects: ["Built a churn model in Python with pandas."],
      certifications: [],
      achievements: [],
      softSkills: ["teamwork"],
      skills: [{ skillId: "python", strength: "demonstrated", level: 2, quote: "Built a churn model in Python with pandas." }],
    };
    const result = parseAnalysis(raw, { skills: SKILLS, sourceText: TEXT });
    expect(result.ok).toBe(true);
    expect(result.value.projects).toEqual([{ text: "Built a churn model in Python with pandas." }]);
    expect(result.value.skills).toEqual([
      { skillId: "python", strength: "demonstrated", level: 2, quote: "Built a churn model in Python with pandas.", confirmed: false },
    ]);
  });

  it("drops unknown skill ids and skills absent from the text", () => {
    const raw = {
      skills: [
        { skillId: "cobol", strength: "professional", quote: "COBOL" },
        { skillId: "docker", strength: "professional", quote: "Deployed with Docker" },
      ],
    };
    const result = parseAnalysis(raw, { skills: SKILLS, sourceText: TEXT });
    expect(result.ok).toBe(true);
    expect(result.value.skills).toEqual([]);
  });

  it("downgrades a skill with an invented quote to 'mentioned'", () => {
    const raw = { skills: [{ skillId: "sql", strength: "professional", level: 3, quote: "Led a SQL migration at a bank" }] };
    const result = parseAnalysis(raw, { skills: SKILLS, sourceText: TEXT });
    expect(result.value.skills).toEqual([{ skillId: "sql", strength: "mentioned", level: 1, quote: "", confirmed: false }]);
  });

  it("rejects malformed output", () => {
    expect(parseAnalysis(null, { skills: SKILLS, sourceText: TEXT }).ok).toBe(false);
    expect(parseAnalysis({ skills: "python" }, { skills: SKILLS, sourceText: TEXT }).ok).toBe(false);
    expect(parseAnalysis({ skills: [], education: "BSc" }, { skills: SKILLS, sourceText: TEXT }).ok).toBe(false);
  });
});

describe("extractSections", () => {
  it("reads headed and inline sections from the sample résumé", () => {
    const sections = extractSections(SAMPLE_RESUME_TEXT);
    expect(sections.education).toEqual(["Engineering degree in Computer Science (2022–2027)"]);
    expect(sections.projects).toHaveLength(2);
    expect(sections.experience[0]).toMatch(/^Data intern/);
  });

  it("doesn't treat a sentence starting with a heading word as a heading", () => {
    const sections = extractSections("Experience\nProject management of a 6-person student team for a full year");
    expect(sections.experience).toEqual(["Project management of a 6-person student team for a full year"]);
    expect(sections.projects).toEqual([]);
  });

  it("the local analyser satisfies the schema", () => {
    const skills = [{ id: "python", name: "Python" }, { id: "sql", name: "SQL" }, { id: "excel", name: "Excel" }];
    expect(parseAnalysis(analyzeLocally(SAMPLE_RESUME_TEXT), { skills, sourceText: SAMPLE_RESUME_TEXT }).ok).toBe(true);
  });
});

describe("identifyGaps", () => {
  const profile = {
    version: 1,
    skills: [
      { skillId: "python", weight: 30, level: 2, importance: "required" },
      { skillId: "sql", weight: 30, level: 3, importance: "required" },
      { skillId: "stats", weight: 20, level: 2, importance: "required" },
      { skillId: "docker", weight: 10, level: 1, importance: "preferred" },
      { skillId: "git", weight: 10, level: 1, importance: "preferred" },
    ],
  };
  const ctx = {
    evidence: [
      { skillId: "python", strength: "demonstrated", level: 2, confirmed: false },
      { skillId: "sql", strength: "professional", level: 2, confirmed: false },
      { skillId: "docker", strength: "mentioned", level: 1, confirmed: false },
    ],
    passed: new Set(["git"]),
    failed: new Set(),
    learning: new Set(),
  };

  it("separates demonstrated skills from gaps of each kind", () => {
    const { demonstrated, gaps } = identifyGaps(computeMatch(profile, ctx), ctx);
    expect(demonstrated.map((r) => r.skillId)).toEqual(["python", "git"]);
    expect(Object.fromEntries(gaps.map((g) => [g.skillId, g.kind]))).toEqual({ sql: "develop", stats: "no_evidence", docker: "insufficient" });
  });

  it("orders by priority, then by potential score gain", () => {
    const { gaps } = identifyGaps(computeMatch(profile, ctx), ctx);
    expect(gaps.map((g) => [g.skillId, g.priority])).toEqual([
      ["stats", "high"],
      ["sql", "medium"],
      ["docker", "low"],
    ]);
  });

  it("only names expected levels when asked to", () => {
    const { gaps } = identifyGaps(computeMatch(profile, ctx), ctx);
    const sql = gaps.find((g) => g.skillId === "sql");
    expect(gapExplanation(sql, "SQL")).not.toMatch(/Advanced/);
    expect(gapExplanation(sql, "SQL", LEVELS)).toMatch(/expects Advanced/);
    expect(gapExplanation(gaps[0], "Statistics")).toMatch(/doesn't mean you lack it/);
  });
});
