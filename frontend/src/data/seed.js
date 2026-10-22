// Demo dataset. Every company, person and job here is fictional.
import { extractEvidence } from "../domain/extraction.js";

function daysAgo(days) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

const yt = (id) => `https://www.youtube.com/watch?v=${id}`;

const SKILLS = [
  { id: "python", name: "Python", category: "Programming", description: "Writing clean Python for data work: data structures, functions, pandas and NumPy.", dependsOn: [] },
  { id: "sql", name: "SQL", category: "Data", description: "Querying relational data: joins, aggregation, subqueries and window functions.", dependsOn: [] },
  { id: "statistics", name: "Statistics", category: "Mathematics", description: "Descriptive statistics, distributions, hypothesis testing and exploratory data analysis.", dependsOn: [] },
  { id: "ml", name: "Machine Learning", category: "Machine Learning", description: "Supervised learning, feature engineering, model evaluation and validation.", dependsOn: ["python", "statistics"] },
  { id: "docker", name: "Docker", category: "DevOps", description: "Packaging applications and models into reproducible containers.", dependsOn: ["python"] },
  { id: "data-viz", name: "Data Visualization", category: "Data", description: "Choosing and building clear charts with matplotlib, seaborn or BI tools.", dependsOn: [] },
  { id: "power-bi", name: "Power BI", category: "Tools", description: "Building reports and dashboards, data modelling and DAX basics.", dependsOn: [] },
  { id: "excel", name: "Excel", category: "Tools", description: "Formulas, pivot tables and data cleaning in spreadsheets.", dependsOn: [] },
  { id: "git", name: "Git", category: "Tools", description: "Version control: branching, merging and pull requests.", dependsOn: [] },
  { id: "rest-apis", name: "REST APIs", category: "Backend", description: "Designing and building HTTP APIs, e.g. with FastAPI.", dependsOn: ["python"] },
];

const COMPANIES = [
  {
    id: "comp-atlas",
    name: "Atlas Analytics",
    ownerUsername: "atlas",
    sector: "Data & AI consulting",
    city: "Casablanca",
    size: "50–200 employees",
    website: "atlas-analytics.example",
    partnerStatus: "partner",
    active: true,
    description: "Data consultancy helping retailers and banks turn their data into decisions.",
    createdAt: daysAgo(120),
  },
  {
    id: "comp-nordwave",
    name: "Nordwave Fintech",
    ownerUsername: null,
    sector: "Financial technology",
    city: "Rabat",
    size: "200–500 employees",
    website: "nordwave.example",
    partnerStatus: "partner",
    active: true,
    description: "Digital payments and lending platform for small businesses.",
    createdAt: daysAgo(90),
  },
  {
    id: "comp-medina",
    name: "Medina Health Labs",
    ownerUsername: null,
    sector: "Health tech",
    city: "Marrakech",
    size: "10–50 employees",
    website: "medinahealth.example",
    partnerStatus: "pilot",
    active: true,
    description: "Start-up building ML tools for clinical triage.",
    createdAt: daysAgo(45),
  },
  {
    id: "comp-sahara",
    name: "Sahara Logistics",
    ownerUsername: null,
    sector: "Logistics",
    city: "Tangier",
    size: "500+ employees",
    website: "saharalogistics.example",
    partnerStatus: "prospect",
    active: false,
    description: "Freight and warehousing operator exploring data roles.",
    createdAt: daysAgo(12),
  },
];

const PROFILES = [
  {
    id: "prof-ds-atlas",
    companyId: "comp-atlas",
    title: "Junior Data Scientist",
    description: "Builds and evaluates predictive models for retail and banking clients, working with senior data scientists.",
    education: "Bachelor's or engineering degree in computer science, statistics or a related field.",
    experience: "0–2 years. Internships and substantial projects count.",
    status: "published",
    version: 2,
    updatedAt: daysAgo(20),
    skills: [
      { skillId: "python", weight: 25, level: 2, importance: "required" },
      { skillId: "sql", weight: 20, level: 2, importance: "required" },
      { skillId: "statistics", weight: 20, level: 2, importance: "required" },
      { skillId: "ml", weight: 20, level: 2, importance: "required" },
      { skillId: "docker", weight: 10, level: 1, importance: "preferred" },
      { skillId: "data-viz", weight: 5, level: 1, importance: "preferred" },
    ],
  },
  {
    id: "prof-da-nordwave",
    companyId: "comp-nordwave",
    title: "Data Analyst",
    description: "Turns payments data into dashboards and recommendations for product and risk teams.",
    education: "Degree in business analytics, economics, statistics or computer science.",
    experience: "0–2 years.",
    status: "published",
    version: 1,
    updatedAt: daysAgo(30),
    skills: [
      { skillId: "sql", weight: 30, level: 3, importance: "required" },
      { skillId: "power-bi", weight: 20, level: 2, importance: "required" },
      { skillId: "statistics", weight: 20, level: 2, importance: "required" },
      { skillId: "excel", weight: 15, level: 2, importance: "required" },
      { skillId: "python", weight: 15, level: 1, importance: "preferred" },
    ],
  },
  {
    id: "prof-mle-medina",
    companyId: "comp-medina",
    title: "Junior ML Engineer",
    description: "Trains, packages and monitors triage models in production.",
    education: "Engineering or master's degree in computer science or applied mathematics.",
    experience: "0–2 years, including at least one deployed ML project.",
    status: "published",
    version: 1,
    updatedAt: daysAgo(15),
    skills: [
      { skillId: "python", weight: 25, level: 2, importance: "required" },
      { skillId: "ml", weight: 30, level: 2, importance: "required" },
      { skillId: "docker", weight: 20, level: 2, importance: "required" },
      { skillId: "statistics", weight: 15, level: 2, importance: "required" },
      { skillId: "sql", weight: 10, level: 1, importance: "preferred" },
    ],
  },
  {
    id: "prof-be-nordwave",
    companyId: "comp-nordwave",
    title: "Junior Backend Developer",
    description: "Builds internal APIs for the lending platform.",
    education: "Degree in computer science or software engineering.",
    experience: "0–2 years.",
    status: "draft",
    version: 1,
    updatedAt: daysAgo(5),
    skills: [
      { skillId: "python", weight: 25, level: 2, importance: "required" },
      { skillId: "rest-apis", weight: 25, level: 2, importance: "required" },
      { skillId: "sql", weight: 20, level: 2, importance: "required" },
      { skillId: "git", weight: 15, level: 2, importance: "required" },
      { skillId: "docker", weight: 15, level: 1, importance: "preferred" },
    ],
  },
];

function lessons(courseId, items) {
  return items.map(([title, minutes], i) => ({ id: `${courseId}-l${i + 1}`, title, minutes }));
}

const COURSES = [
  {
    id: "c-python-1",
    title: "Python for Data Science",
    skillId: "python",
    difficulty: "Beginner",
    order: 1,
    status: "published",
    provider: "freeCodeCamp (YouTube)",
    videoUrl: yt("rfscVS0vtbw"),
    description: "Core Python syntax, data structures and functions, then pandas for tabular data.",
    lessons: lessons("c-python-1", [["Variables, types and control flow", 40], ["Lists, dicts and comprehensions", 45], ["Functions and modules", 35], ["Pandas DataFrames", 60]]),
  },
  {
    id: "c-sql-1",
    title: "SQL for Data Analysis",
    skillId: "sql",
    difficulty: "Beginner",
    order: 1,
    status: "published",
    provider: "freeCodeCamp (YouTube)",
    videoUrl: yt("HXV3zeQKqGY"),
    description: "SELECT, filtering, joins and aggregation on realistic sales data.",
    lessons: lessons("c-sql-1", [["Selecting and filtering rows", 30], ["Aggregation and GROUP BY", 35], ["Joins in practice", 45], ["Subqueries", 30]]),
  },
  {
    id: "c-sql-2",
    title: "Advanced SQL: Window Functions",
    skillId: "sql",
    difficulty: "Intermediate",
    order: 2,
    status: "published",
    provider: "Link Academy",
    videoUrl: yt("HXV3zeQKqGY"),
    description: "Ranking, running totals and cohort analysis with window functions.",
    lessons: lessons("c-sql-2", [["OVER and PARTITION BY", 30], ["RANK vs DENSE_RANK", 25], ["Running totals and moving averages", 35]]),
  },
  {
    id: "c-stats-1",
    title: "Statistics & Exploratory Data Analysis",
    skillId: "statistics",
    difficulty: "Beginner",
    order: 1,
    status: "published",
    provider: "freeCodeCamp (YouTube)",
    videoUrl: yt("xxpc-HPKN28"),
    description: "Distributions, summary statistics, sampling and hypothesis tests.",
    lessons: lessons("c-stats-1", [["Describing data", 35], ["Distributions", 40], ["Sampling and confidence intervals", 45], ["Hypothesis testing", 50]]),
  },
  {
    id: "c-ml-1",
    title: "Machine Learning Fundamentals",
    skillId: "ml",
    difficulty: "Intermediate",
    order: 1,
    status: "published",
    provider: "freeCodeCamp (YouTube)",
    videoUrl: yt("i_LwzRVP7bg"),
    description: "Supervised learning with scikit-learn: regression, classification and trees.",
    lessons: lessons("c-ml-1", [["The ML workflow", 30], ["Linear and logistic regression", 50], ["Decision trees and ensembles", 50], ["Feature engineering", 40]]),
  },
  {
    id: "c-ml-2",
    title: "Model Evaluation & Validation",
    skillId: "ml",
    difficulty: "Intermediate",
    order: 2,
    status: "published",
    provider: "Link Academy",
    videoUrl: yt("i_LwzRVP7bg"),
    description: "Train/validation/test splits, cross-validation and choosing the right metric.",
    lessons: lessons("c-ml-2", [["Splits and cross-validation", 35], ["Precision, recall and ROC", 40], ["Overfitting and regularisation", 35]]),
  },
  {
    id: "c-docker-1",
    title: "Docker Fundamentals for Data Projects",
    skillId: "docker",
    difficulty: "Beginner",
    order: 1,
    status: "published",
    provider: "freeCodeCamp (YouTube)",
    videoUrl: yt("fqMOX6JJhGo"),
    description: "Images, containers and Dockerfiles; packaging a model API.",
    lessons: lessons("c-docker-1", [["Images and containers", 30], ["Writing a Dockerfile", 40], ["Ports, volumes and compose", 40]]),
  },
  {
    id: "c-viz-1",
    title: "Data Visualization with Python",
    skillId: "data-viz",
    difficulty: "Beginner",
    order: 1,
    status: "published",
    provider: "Link Academy",
    videoUrl: "",
    description: "Choosing the right chart and building it with matplotlib and seaborn.",
    lessons: lessons("c-viz-1", [["Choosing a chart", 20], ["matplotlib basics", 35], ["seaborn for statistics", 30]]),
  },
  {
    id: "c-pbi-1",
    title: "Power BI Essentials",
    skillId: "power-bi",
    difficulty: "Beginner",
    order: 1,
    status: "draft",
    provider: "Link Academy",
    videoUrl: "",
    description: "Data modelling, visuals and DAX basics for business reports.",
    lessons: lessons("c-pbi-1", [["Loading and modelling data", 40], ["Building visuals", 35], ["DAX basics", 45]]),
  },
];

function questions(testId, items) {
  return items.map(([prompt, code, options, correctIndex], i) => ({ id: `${testId}-q${i + 1}`, prompt, code, options, correctIndex }));
}

const TESTS = [
  {
    id: "t-python",
    skillId: "python",
    title: "Python for Data Science — Skill Test",
    passThreshold: 70,
    status: "published",
    questions: questions("t-python", [
      ["What does this expression return?", "len([x for x in range(10) if x % 3 == 0])", ["3", "4", "10", "0"], 1],
      ["Which expression keeps only the rows where `age` is above 30?", "", ['df[df["age"] > 30]', "df.filter(age > 30)", 'df.where("age" > 30)', 'df.loc["age" > 30]'], 0],
      ["What is printed?", 'd = {"a": 1}\nprint(d.get("b", 0) + d["a"])', ["1", "KeyError", "None", "0"], 0],
      ["What is printed?", "def f(x, acc=[]):\n    acc.append(x)\n    return acc\n\nf(1)\nprint(f(2))", ["[2]", "[1, 2]", "[1]", "TypeError"], 1],
      ["Which built-in type gives the fastest average membership test (`x in items`)?", "", ["list", "tuple", "set", "str"], 2],
    ]),
  },
  {
    id: "t-sql",
    skillId: "sql",
    title: "SQL for Data Analysis — Skill Test",
    passThreshold: 70,
    status: "published",
    questions: questions("t-sql", [
      ["Which clause filters groups after aggregation?", "", ["WHERE", "HAVING", "GROUP BY", "ORDER BY"], 1],
      ["What does this query count?", "SELECT COUNT(*)\nFROM orders o\nLEFT JOIN refunds r ON r.order_id = o.id\nWHERE r.id IS NULL;", ["Orders that have no refund", "Orders that have a refund", "All orders", "Refunds without an order"], 0],
      ["Which window function returns 1, 2, 2, 4 for a column with one tie?", "", ["ROW_NUMBER()", "RANK()", "DENSE_RANK()", "NTILE(4)"], 1],
      ["How does COUNT(email) differ from COUNT(*)?", "", ["COUNT(email) ignores rows where email is NULL", "They always return the same value", "COUNT(email) counts distinct emails", "COUNT(*) ignores NULL rows"], 0],
      ["Which of these clauses is evaluated first?", "", ["SELECT", "ORDER BY", "WHERE", "LIMIT"], 2],
    ]),
  },
  {
    id: "t-stats",
    skillId: "statistics",
    title: "Statistics & EDA — Skill Test",
    passThreshold: 70,
    status: "published",
    questions: questions("t-stats", [
      ["What is the median of this list?", "[2, 9, 4, 7, 100]", ["7", "24.4", "4", "9"], 0],
      ["A test gives p = 0.03. What does that mean?", "", ["If the null hypothesis were true, data this extreme would occur about 3% of the time", "There is a 3% chance the null hypothesis is true", "The effect size is 3%", "There is a 97% chance the alternative is true"], 0],
      ["Which measure of spread is most robust to outliers?", "", ["Standard deviation", "Range", "Interquartile range", "Variance"], 2],
      ["Ice-cream sales and drownings have a correlation of 0.9. What can you conclude?", "", ["Ice cream causes drowning", "There is a strong association, not necessarily causation", "Drowning causes ice-cream sales", "The data must be wrong"], 1],
      ["In a right-skewed distribution, which is usually true?", "", ["Mean > median", "Mean < median", "Mean = median", "The mode is the largest"], 0],
    ]),
  },
  {
    id: "t-ml",
    skillId: "ml",
    title: "Machine Learning Fundamentals — Skill Test",
    passThreshold: 70,
    status: "published",
    questions: questions("t-ml", [
      ["A model scores 99% accuracy on training data and 70% on validation data. What is most likely happening?", "", ["Underfitting", "Overfitting", "The model is perfect", "The validation set is too large"], 1],
      ["For fraud detection where 1% of transactions are fraud, which is more informative than accuracy?", "", ["Accuracy", "Mean squared error", "Precision and recall", "R²"], 2],
      ["What is the validation set used for?", "", ["Tuning hyperparameters without touching the test set", "Training the final model", "Replacing the test set", "Cleaning the data"], 0],
      ["Why does feature scaling matter for k-nearest neighbours?", "", ["It makes training faster only", "k-NN relies on distances, so large-scale features dominate", "It removes outliers", "It is required by every model"], 1],
      ["Which of these is a supervised learning task?", "", ["Predicting house prices from past labelled sales", "Clustering customers", "Reducing dimensions with PCA", "Finding topics in unlabelled text"], 0],
    ]),
  },
  {
    id: "t-docker",
    skillId: "docker",
    title: "Docker Fundamentals — Skill Test",
    passThreshold: 60,
    status: "published",
    questions: questions("t-docker", [
      ["What is a container?", "", ["A running instance of an image", "A file that describes how to build an image", "A virtual machine", "A Docker registry"], 0],
      ["Which Dockerfile instruction sets the default command when the container starts?", "", ["RUN", "CMD", "COPY", "FROM"], 1],
      ["Why copy requirements.txt and install dependencies before copying the source code?", "", ["It is required by Python", "It makes the image smaller", "Docker can reuse the cached dependency layer when only code changes", "It hides the source code"], 2],
      ["What does this command do?", "docker run -p 8000:80 my-api", ["Maps host port 8000 to container port 80", "Maps container port 8000 to host port 80", "Limits the container to 80 MB", "Runs 8000 copies"], 0],
    ]),
  },
];

const JOBS = [
  {
    id: "job-atlas-ds",
    companyId: "comp-atlas",
    profileId: "prof-ds-atlas",
    title: "Junior Data Scientist",
    location: "Casablanca",
    workMode: "Hybrid",
    employmentType: "Full-time",
    status: "published",
    createdAt: daysAgo(18),
    description: "Join a team of 8 data scientists building churn, pricing and demand models for retail clients. You will own features end to end with mentoring from a senior.",
    requirements: [
      { skillId: "python", rule: "test_passed", mandatory: true },
      { skillId: "sql", rule: "test_passed", mandatory: true },
      { skillId: "statistics", rule: "evidence", mandatory: true },
      { skillId: "docker", rule: "evidence", mandatory: false },
    ],
  },
  {
    id: "job-atlas-intern",
    companyId: "comp-atlas",
    profileId: "prof-ds-atlas",
    title: "Data Science Intern (6 months)",
    location: "Casablanca",
    workMode: "Remote",
    employmentType: "Internship",
    status: "published",
    createdAt: daysAgo(9),
    description: "A six-month end-of-studies internship on a forecasting project for a grocery chain.",
    requirements: [
      { skillId: "python", rule: "test_passed", mandatory: true },
      { skillId: "sql", rule: "evidence", mandatory: true },
    ],
  },
  {
    id: "job-nordwave-da",
    companyId: "comp-nordwave",
    profileId: "prof-da-nordwave",
    title: "Data Analyst — Risk",
    location: "Rabat",
    workMode: "On-site",
    employmentType: "Full-time",
    status: "published",
    createdAt: daysAgo(25),
    description: "Build risk dashboards and analyses that help the credit team approve loans faster.",
    requirements: [
      { skillId: "sql", rule: "test_passed", mandatory: true },
      { skillId: "power-bi", rule: "evidence", mandatory: true },
      { skillId: "statistics", rule: "evidence", mandatory: false },
    ],
  },
  {
    id: "job-medina-ml",
    companyId: "comp-medina",
    profileId: "prof-mle-medina",
    title: "Junior ML Engineer",
    location: "Marrakech",
    workMode: "Hybrid",
    employmentType: "Full-time",
    status: "published",
    createdAt: daysAgo(14),
    description: "Help ship and monitor the models behind our triage assistant.",
    requirements: [
      { skillId: "python", rule: "test_passed", mandatory: true },
      { skillId: "ml", rule: "test_passed", mandatory: true },
      { skillId: "docker", rule: "test_passed", mandatory: true },
    ],
  },
  {
    id: "job-nordwave-be",
    companyId: "comp-nordwave",
    profileId: "prof-be-nordwave",
    title: "Junior Backend Developer",
    location: "Rabat",
    workMode: "Hybrid",
    employmentType: "Full-time",
    status: "draft",
    createdAt: daysAgo(4),
    description: "Build and maintain FastAPI services for the lending platform.",
    requirements: [
      { skillId: "python", rule: "test_passed", mandatory: true },
      { skillId: "rest-apis", rule: "evidence", mandatory: true },
    ],
  },
];

export const SAMPLE_RESUME_TEXT = `Yassine Jahjah — Engineering student, Computer Science
Education: Engineering degree in Computer Science (2022–2027)
Projects
- Customer churn prediction: built a classification model in Python with pandas and scikit-learn (final-year project).
- Sales dashboard: created charts with matplotlib and seaborn for a student association.
Experience
- Data intern at a retail start-up (2025 - 2025): cleaned weekly sales files in Excel and wrote reports.
Skills: SQL, Excel, Git, statistics basics`;

function candidate(id, username, name, extra) {
  return {
    id,
    username,
    name,
    email: `${username.split(" ")[0]}@example.com`,
    location: "Morocco",
    headline: "",
    plan: "free",
    targetProfileId: "prof-ds-atlas",
    resume: null,
    evidence: [],
    analyzedAt: null,
    createdAt: daysAgo(30),
    ...extra,
  };
}

function resume(fileName, days, source = "sample") {
  return { fileName, size: 182000, uploadedAt: daysAgo(days), source };
}

const ev = (skillId, strength, quote, level = 2) => ({ skillId, strength, level, quote, confirmed: false });

const CANDIDATES = [
  candidate("cand-yassine", "yassine jahjah", "Yassine Jahjah", {
    headline: "Engineering student, Computer Science",
    location: "Rabat",
    resume: resume("Yassine_Jahjah_CV.pdf", 3),
    evidence: extractEvidence(SAMPLE_RESUME_TEXT),
    analyzedAt: daysAgo(3),
  }),
  candidate("cand-salma", "salma", "Salma Benali", {
    headline: "MSc Data Science graduate",
    location: "Casablanca",
    plan: "max",
    resume: resume("Salma_Benali_Resume.pdf", 40),
    analyzedAt: daysAgo(40),
    evidence: [
      ev("python", "professional", "Data science intern at a bank (2024 - 2025): Python credit-scoring models."),
      ev("sql", "professional", "Wrote SQL pipelines on PostgreSQL during internship."),
      ev("statistics", "demonstrated", "Thesis project: statistical analysis of loan defaults."),
      ev("ml", "demonstrated", "Built gradient-boosting classification models (XGBoost)."),
      ev("docker", "mentioned", "Tools: Docker, Git", 1),
    ],
  }),
  candidate("cand-imane", "imane", "Imane Chraibi", {
    headline: "Final-year engineering student",
    location: "Fès",
    plan: "max",
    resume: resume("Imane_Chraibi_CV.pdf", 20),
    analyzedAt: daysAgo(20),
    evidence: [
      ev("python", "demonstrated", "Developed a recommendation project in Python and pandas."),
      ev("sql", "mentioned", "Skills: SQL, MongoDB", 1),
      ev("data-viz", "demonstrated", "Created Tableau dashboards for a hackathon."),
    ],
  }),
  candidate("cand-youssef", "youssef", "Youssef Amrani", {
    headline: "ML engineer, 1 year of experience",
    location: "Marrakech",
    plan: "max",
    targetProfileId: "prof-mle-medina",
    resume: resume("Youssef_Amrani.pdf", 30),
    analyzedAt: daysAgo(30),
    evidence: [
      ev("python", "professional", "ML engineer at a start-up (2024 - present): Python services."),
      ev("ml", "professional", "Trained and deployed random forest models in production."),
      ev("docker", "professional", "Containerized model APIs with Docker."),
      ev("statistics", "mentioned", "Coursework: statistics, probability", 1),
    ],
  }),
  candidate("cand-omar", "omar", "Omar El Idrissi", {
    headline: "Business analytics graduate",
    location: "Rabat",
    plan: "max",
    targetProfileId: "prof-da-nordwave",
    resume: resume("Omar_ElIdrissi_CV.pdf", 26),
    analyzedAt: daysAgo(26),
    evidence: [
      ev("sql", "demonstrated", "Built SQL reports for a student-run shop project."),
      ev("power-bi", "demonstrated", "Designed Power BI dashboards for a capstone project."),
      ev("excel", "professional", "Finance intern (2024 - 2024): Excel models and pivot tables."),
      ev("statistics", "mentioned", "Skills: statistics, Excel", 1),
    ],
  }),
  candidate("cand-karim", "karim", "Karim Alaoui", {
    headline: "Self-taught data enthusiast",
    location: "Agadir",
    plan: "max",
    resume: resume("Karim_Alaoui_CV.pdf", 35),
    analyzedAt: daysAgo(35),
    evidence: [ev("python", "mentioned", "Skills: Python, Excel", 1), ev("excel", "mentioned", "Skills: Python, Excel", 1)],
  }),
  candidate("cand-hiba", "hiba", "Hiba Tazi", {
    headline: "Second-year computer science student",
    location: "Tangier",
    createdAt: daysAgo(2),
  }),
];

function attempt(id, candidateId, testId, score, passed, days) {
  return { id, candidateId, testId, score, passed, answers: {}, createdAt: daysAgo(days) };
}

const ATTEMPTS = [
  attempt("att-1", "cand-salma", "t-python", 100, true, 34),
  attempt("att-2", "cand-salma", "t-sql", 80, true, 33),
  attempt("att-3", "cand-salma", "t-stats", 80, true, 31),
  attempt("att-4", "cand-imane", "t-python", 80, true, 15),
  attempt("att-5", "cand-imane", "t-sql", 40, false, 14),
  attempt("att-6", "cand-youssef", "t-python", 100, true, 25),
  attempt("att-7", "cand-youssef", "t-ml", 80, true, 24),
  attempt("att-8", "cand-youssef", "t-docker", 75, true, 24),
  attempt("att-9", "cand-omar", "t-sql", 80, true, 21),
  attempt("att-10", "cand-karim", "t-python", 80, true, 30),
  attempt("att-11", "cand-karim", "t-sql", 80, true, 29),
];

const PROGRESS = [
  { candidateId: "cand-salma", courseId: "c-docker-1", completedLessonIds: ["c-docker-1-l1"], updatedAt: daysAgo(6) },
  { candidateId: "cand-imane", courseId: "c-sql-1", completedLessonIds: ["c-sql-1-l1", "c-sql-1-l2"], updatedAt: daysAgo(4) },
];

const consent = (learning) => ({ profile: true, evidence: true, tests: true, learning });

function application(id, candidateId, jobId, status, days, learning = true) {
  const history = [{ status: "submitted", at: daysAgo(days) }];
  if (status !== "submitted") history.push({ status, at: daysAgo(Math.max(days - 3, 0)) });
  return { id, candidateId, jobId, status, note: "", consent: consent(learning), createdAt: daysAgo(days), updatedAt: history.at(-1).at, history };
}

const APPLICATIONS = [
  application("app-1", "cand-salma", "job-atlas-ds", "shortlisted", 12),
  application("app-2", "cand-karim", "job-atlas-ds", "rejected", 20, false),
  application("app-3", "cand-imane", "job-atlas-intern", "submitted", 2),
  application("app-4", "cand-salma", "job-atlas-intern", "under_review", 8),
  application("app-5", "cand-youssef", "job-medina-ml", "interview", 10),
  application("app-6", "cand-omar", "job-nordwave-da", "under_review", 6, false),
];

const ACTIVITY = [
  { id: "act-1", at: daysAgo(2), text: "Imane Chraibi applied to Data Science Intern (Atlas Analytics)" },
  { id: "act-2", at: daysAgo(2), text: "Hiba Tazi created a candidate account" },
  { id: "act-3", at: daysAgo(4), text: "Nordwave Fintech drafted Junior Backend Developer" },
  { id: "act-4", at: daysAgo(9), text: "Atlas Analytics published Data Science Intern (6 months)" },
  { id: "act-5", at: daysAgo(12), text: "Sahara Logistics added as a prospect company" },
];

const NOTIFICATIONS = [
  { id: "n-1", to: "company:comp-atlas", text: "Imane Chraibi applied to Data Science Intern (6 months).", link: "/company/candidates/app-3", at: daysAgo(2), read: false },
  { id: "n-2", to: "candidate:cand-yassine", text: "Your résumé was analysed for Junior Data Scientist.", link: "/candidate/assessments", at: daysAgo(3), read: false },
];

export function createSeed() {
  return structuredClone({
    seededAt: new Date().toISOString(),
    skills: SKILLS,
    companies: COMPANIES,
    profiles: PROFILES,
    courses: COURSES,
    tests: TESTS,
    jobs: JOBS,
    candidates: CANDIDATES,
    attempts: ATTEMPTS,
    progress: PROGRESS,
    applications: APPLICATIONS,
    activity: ACTIVITY,
    notifications: NOTIFICATIONS,
    // One record per résumé analysis run (history); the candidate's résumé points at the latest.
    analyses: [],
  });
}
