// Keyword-based résumé extraction, used while no AI service is connected.
// It only reads text the candidate provides; it does not parse PDF/DOCX files.

const ALIASES = {
  python: ["python", "pandas", "numpy"],
  sql: ["sql", "postgresql", "mysql", "sqlite"],
  statistics: ["statistics", "statistical", "hypothesis test", "regression analysis"],
  ml: ["machine learning", "scikit-learn", "classification model", "xgboost", "random forest"],
  docker: ["docker", "containeri[sz]ed"],
  "data-viz": ["matplotlib", "seaborn", "plotly", "tableau", "data visuali[sz]ation"],
  "power-bi": ["power bi", "powerbi"],
  excel: ["excel"],
  git: ["git", "github", "gitlab"],
  "rest-apis": ["rest api", "fastapi", "flask", "django rest"],
};

const PROFESSIONAL = /\b(intern|internship|worked|engineer at|analyst at|\d{4}\s*[-–]\s*(\d{4}|present))\b/i;
const DEMONSTRATED = /\b(project|built|developed|implemented|created|trained|deployed|designed)\b/i;

export function extractEvidence(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return Object.entries(ALIASES).flatMap(([skillId, words]) => {
    const pattern = new RegExp(`\\b(${words.join("|")})\\b`, "i");
    const matching = lines.filter((l) => pattern.test(l));
    if (matching.length === 0) return [];

    // Prefer the line that shows the strongest use of the skill.
    const line =
      matching.find((l) => PROFESSIONAL.test(l)) ?? matching.find((l) => DEMONSTRATED.test(l)) ?? matching[0];
    const strength = PROFESSIONAL.test(line) ? "professional" : DEMONSTRATED.test(line) ? "demonstrated" : "mentioned";
    return [
      {
        skillId,
        strength,
        level: strength === "mentioned" ? 1 : 2,
        quote: line.length > 160 ? `${line.slice(0, 157)}…` : line,
        confirmed: false,
      },
    ];
  });
}
