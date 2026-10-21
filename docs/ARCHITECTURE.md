# CareerBridge — Hackathon Technical Plan

Status: draft for team agreement. No application code is written until the scope (§2), data model (§5) and API (§6) are agreed.

---

## 1. Challenges to the business assumptions

These don't block the MVP, but judges will probably ask about them. Have an answer ready.

| # | Assumption | Problem | Recommendation |
|---|---|---|---|
| B1 | Job access is a **Max-only** feature | Making candidates pay to see or apply for jobs causes two problems. (a) Legal: many jurisdictions ban or restrict charging job seekers for placement. This includes countries that ratified ILO Convention 181, whose Art. 7 forbids charging workers fees. (b) Marketplace: companies pay for a large pipeline, and a paywall shrinks it. | Charge for the **learning and validation**, not for the job. Pitch it as "jobs are free to apply to once you're eligible. Max is how most people get eligible." Keep the Max gate in the demo, because the brief requires it, but describe it this way. Check local law before launch. |
| B2 | Free shows **only a score** | A bare number with no explanation feels arbitrary. Candidates won't trust it enough to upgrade. | Free shows the score, the evidence coverage, and the **name of the single biggest gap**. Pro unlocks the full breakdown. This makes for a better upgrade moment in the demo. |
| B3 | Companies will trust platform assessments | A multiple-choice quiz is weak evidence, and recruiters already distrust online certificates. | Use at least one **practical, deterministically graded task**: a SQL query run against a seeded dataset and compared by its result set. This is cheap to build and much more credible (§9, stretch S1). |
| B4 | The two sides will show up | This is a classic marketplace cold start: no jobs means no candidates, and no candidates means no companies. | Start with company-sponsored profiles. A company co-designs one profile and commits to interview the top N eligible candidates. Present this as the go-to-market plan. |
| B5 | Résumé evidence equals skill | The brief already notes this. LLMs also invent skills that aren't there. | Constrain extraction to the profile's canonical skills, require a quoted evidence snippet, verify the snippet against the source text, and let the candidate confirm or deny (§7). |
| B6 | Profiles are versioned | Full version tables are expensive to build. | Each assessment stores a **snapshot** of the profile's skills, weights and levels. Editing a profile bumps `version`. Old assessments keep working and reproduce their score. |

---

## 2. MVP scope

### 2.1 In scope, working for real

- **One deep profile:** *Junior Data Scientist* at the seeded company **"Atlas Analytics"**. It has 6 skills: Python, SQL, Statistics, ML Fundamentals, Model Evaluation, Docker (preferred).
- **One shallow profile:** *Data Analyst*. It appears in the catalog only, with skills defined but no courses or tests. This shows the catalog isn't hard-coded.
- **Two real tests:** SQL and Python, with 5–8 questions each, graded on the server. The other skills get one seeded test each, which can be short.
- **One job** from Atlas Analytics. Its eligibility rules are:
  - **Python:** evidence ≥ `demonstrated`. A résumé project or a passed test both count.
  - **SQL:** `test_passed`.
  - **Docker:** preferred only, so it doesn't block eligibility.

  With these rules, **one test pass during the demo flips eligibility**. That keeps the live demo short and shows that the rules are configurable, not "finish every course".
- Everything listed in brief §9 under "Features that should work".

### 2.2 Simulated

| Feature | How it's simulated |
|---|---|
| Auth | Preset users. The frontend sends an `X-Demo-User: <id>` header, and a user switcher sits in the top bar. |
| Payment | A plan switcher in the top bar calls `POST /api/demo/plan`. The backend still enforces the plan. |
| Company onboarding | Companies are seeded and editable in admin. |
| Video | YouTube embeds, plus a local `.mp4` fallback for one lesson in case the venue Wi-Fi fails. |
| Emails | A `notifications` table and an in-app bell. |
| Hiring decisions | The admin sets application status by hand. |

### 2.3 Explicitly out of scope

Real auth, billing, a company portal, DOCX support (unless it takes less than 30 minutes with `python-docx`), OCR of scanned PDFs, an AI-generated learning path, recommendation ML, background job queues, and multi-language content.

---

## 3. Architecture

```
React (Vite, Tailwind)  ──HTTP/JSON──►  FastAPI modular monolith  ──►  PostgreSQL
                                          ├─ api/        (routers, thin)
                                          ├─ services/   (pure business logic)
                                          │    scoring.py      deterministic
                                          │    permissions.py  deterministic
                                          │    grading.py      deterministic
                                          │    eligibility.py  deterministic
                                          │    learning_path.py deterministic
                                          │    extraction/     LLM + fallback + cache
                                          ├─ models/     (SQLAlchemy)
                                          └─ seed/       (idempotent seed + reset)
                                                   │
                                                   └──► LLM API (résumé extraction only)
```

- **AI's only job** is to turn résumé text into `SkillEvidence` candidates. Scoring, permissions, grading, eligibility and paths never call the LLM.
- Every function in `services/` except extraction is a **pure function over plain data**. That makes them unit-testable without a database, and these tests are what protect the live demo.
- **Infrastructure:** one `docker-compose.yml` with `db`, `api` and `web`. Uploaded files go to a local `./uploads` volume. Deploy to a single VM, or run on a laptop during the demo.

---

## 4. Domain rules (the important logic)

### 4.1 Evidence levels (ordered)

| Level | Source | Credit factor |
|---|---|---|
| `none` | no evidence found | 0.0, displayed as **"No evidence yet"**, never "missing" |
| `self_reported` | candidate ticked "I have this skill" | 0.3 |
| `mentioned` | résumé lists the skill, with no supporting context | 0.4 |
| `demonstrated` | résumé project or job uses it (with a verified snippet) | 0.8 |
| `validated` | platform test passed | 1.0 |

A user's effective level for a skill is the **maximum** across all their `skill_evidence` rows.

### 4.2 Compatibility score (`scoring_version = 1`)

For each skill `s` in the profile snapshot:

```
prof_ratio(s) = min(1, estimated_proficiency(s) / required_level(s))   # proficiency 1–3; validated ⇒ required_level
skill_score(s) = credit(level(s)) × prof_ratio(s)                       # 0..1
overall        = round(100 × Σ weight(s)·skill_score(s) / Σ weight(s))
coverage       = 100 × Σ weight(s where level ≠ none) / Σ weight(s)
potential(s)   = weight(s) × (1 − skill_score(s)) / Σ weight × 100      # points gained if validated
```

The result returns `overall`, `coverage`, a per-skill breakdown (level, credit, contribution, snippet) and the top 3 skills ranked by `potential`. Those top 3 become the "what would most improve your score" list.

**Determinism:** the score is a function of (profile snapshot, evidence set, scoring_version) only. Any later rescoring after a test pass creates a **new** assessment. It never mutates the old one.

### 4.3 Skill status shown to the candidate

`skill_status(user, skill)` is derived, not stored, and returns one of: `identified_in_resume`, `confirmed_by_candidate`, `learning` (a course is in progress), `assessment_passed`, `assessment_failed` (attempted, never passed), or `no_evidence`. Each state has its own UI badge, and states are never merged.

### 4.4 Eligibility

```
eligible(user, job) = all(rule_met(user, r) for r in job.requirements if r.mandatory)
rule_met: test_passed   → any passed attempt on a test for r.skill
          min_evidence  → effective_level(user, r.skill) ≥ r.min_level
```

The function returns `{eligible, met: [...], unmet: [...]}` so the UI can explain why a user is or isn't eligible. Applying stores this as `eligibility_snapshot`.

### 4.5 Learning path

1. Take the profile skills where `skill_score < 1`.
2. Topologically sort them by `skill.prerequisite_ids`.
3. Within the same depth, sort by `potential` in descending order.

Each step shows its courses (ordered by `order_index`) and its test. Skills already validated are shown as done, not removed, because watching progress fill in is part of the demo.

### 4.6 Plan permissions (`services/permissions.py`)

```python
PLAN_FEATURES = {
  "free": {"score", "summary", "top_gap_name"},
  "pro":  {..free, "gap_report", "path_overview"},
  "max":  {..pro, "path_full", "course_progress", "take_test", "job_eligibility", "apply"},
}
def require(feature): -> FastAPI dependency raising 403 {"error":"upgrade_required","feature":..,"required_plan":..}
def filter_assessment(view, plan) -> dict  # drops keys server-side
```

Locked data **never leaves the server**. A Free response contains no `breakdown` key at all. The frontend renders the locked teaser from `locked: ["gap_report", ...]`.

---

## 5. Data model

The model is cut down from brief §11. The merges are:

- `Subscription` becomes `users.plan`.
- `ModuleProgress` becomes `course_progress`.
- `CourseSkill` becomes `courses.skill_id`, so each course maps to one skill.
- Profile versioning becomes `version` plus a snapshot.

```
users            id, name, email, role[candidate|admin], plan[free|pro|max]
companies        id, name, description, logo_url, partner_status[prospect|partner]
skills           id, slug, name, description, aliases JSON[str], prerequisite_ids JSON[int]
job_profiles     id, company_id?, title, description, version int, status[draft|published|archived]
profile_skills   profile_id, skill_id, weight int, required_level 1-3, importance[required|preferred]
resumes          id, user_id, filename, path, text, extraction JSON,
                 extraction_source[llm|fallback|cache], created_at
skill_evidence   id, user_id, skill_id, level, est_proficiency 1-3, snippet?,
                 source[resume|self|test], resume_id?, test_attempt_id?, created_at
assessments      id, user_id, profile_id, profile_version, resume_id,
                 profile_snapshot JSON, result JSON, scoring_version, created_at
courses          id, skill_id, title, description, video_url, fallback_video_path?, order_index, duration_min
course_progress  user_id, course_id, status[not_started|in_progress|completed], updated_at
tests            id, skill_id, title, pass_threshold (0-100)
questions        id, test_id, kind[single|multi|sql], prompt, options JSON, answer JSON, points
test_attempts    id, user_id, test_id, answers JSON, score, passed, created_at
jobs             id, company_id, profile_id, title, description, location,
                 status[open|closed], apply_mode[internal|external], external_url?
job_requirements id, job_id, skill_id, rule[test_passed|min_evidence], min_level?, mandatory bool
applications     id, user_id, job_id, status[submitted|under_review|interview|rejected],
                 eligibility_snapshot JSON, created_at
notifications    id, user_id, text, read bool, created_at
```

`questions.answer` is never serialized to candidates. There is a separate `QuestionPublic` schema for that.

---

## 6. API

All routes are under `/api`. The current user comes from the `X-Demo-User` header. 🔒P means Pro or higher, 🔒M means Max, and 🛠 means admin role.

**Demo**

| Method | Path | Notes |
|---|---|---|
| GET | `/demo/users` | for the switcher |
| POST | `/demo/plan` `{plan}` | changes the current user's plan |
| POST | `/demo/reset` `{user_id}` | wipes that candidate's résumés, evidence, attempts, progress and applications. Run it before each rehearsal. |

**Catalog and résumé**

| Method | Path | Notes |
|---|---|---|
| GET | `/profiles` | published profiles |
| GET | `/profiles/{id}` | includes skills, weights and company |
| POST | `/resumes` (multipart) | extract text → LLM or fallback → evidence rows. Returns the extraction plus `source`. |
| POST | `/resumes/{id}/confirm` `{skill_id: bool}` | the candidate confirms or denies. Writes `self_reported` evidence or removes a résumé evidence row. |

**Assessment**

| Method | Path | Notes |
|---|---|---|
| POST | `/assessments` `{profile_id, resume_id?}` | computes and stores the assessment. Response is filtered by plan. |
| GET | `/assessments/{id}` | filtered by plan, with `locked: [...]` |
| GET | `/me/assessments/latest?profile_id=` | |

**Learning**

| Method | Path | Notes |
|---|---|---|
| GET | `/profiles/{id}/learning-path` 🔒P | Pro gets titles and order only. Max adds video URLs, progress and test ids. |
| POST | `/courses/{id}/progress` 🔒M | `{status}` |
| GET | `/tests/{id}` 🔒M | questions without answers |
| POST | `/tests/{id}/attempts` 🔒M | grades, then on pass writes `validated` evidence, creates a fresh assessment and a notification. Returns `{score, passed, per_question, new_assessment_id, eligibility_changes}`. |

**Jobs**

| Method | Path | Notes |
|---|---|---|
| GET | `/jobs?profile_id=` | Everyone sees the list. Max also gets per-job `eligibility`. |
| GET | `/jobs/{id}` | plus `eligibility` for Max |
| POST | `/jobs/{id}/applications` 🔒M | Re-checks eligibility on the server. Returns 409 with `unmet` if not eligible. |
| GET | `/me/applications`, `/me/progress`, `/me/notifications` | |

**Admin 🛠**

| Method | Path | Notes |
|---|---|---|
| CRUD | `/admin/companies`, `/admin/skills`, `/admin/courses`, `/admin/tests` (+ `/questions`), `/admin/jobs` (+ `/requirements`) | |
| CRUD | `/admin/profiles`, `PUT /admin/profiles/{id}/skills` | Replaces the skill set and bumps `version`. |
| POST | `/admin/profiles/{id}/publish` | |
| GET | `/admin/candidates`, `/admin/candidates/{id}` | assessments, skill statuses, attempts, applications |
| PATCH | `/admin/applications/{id}` `{status}` | notifies the candidate |

---

## 7. Résumé extraction pipeline

1. **Text:** `pypdf` (or `pdfplumber` if the layout is messy). If the text is empty, return 422 "scanned PDF not supported, paste text instead". The UI offers a paste-text box.
2. **Cache:** `sha256(text + profile_id + prompt_version)` maps to a stored extraction. A cache hit returns immediately with `source = cache`. **Pre-warm the demo résumé.**
3. **LLM:** one call, 20 s timeout, using tool/JSON-schema output.
   - **Input:** the résumé text plus the **profile's canonical skill list** (id, name, aliases).
   - **Output:** `education[]`, `experience[]`, `projects[]`, and `skills[]: {skill_id, level: mentioned|demonstrated, est_proficiency 1-3, snippet}`. Only ids from the given list are allowed.
4. **Verify:** if a snippet doesn't fuzzy-match the résumé text (`rapidfuzz.partial_ratio < 85`), downgrade the skill to `mentioned` or drop it. Unknown `skill_id`s are dropped. This is the anti-hallucination guard.
5. **Fallback** (an LLM error, timeout or invalid JSON): an alias regex over the text plus section heuristics. A match in a "Projects" or "Experience" section counts as `demonstrated`, and elsewhere as `mentioned`, with `est_proficiency = 1`. Mark it `source = fallback`. The UI then shows a **"Fallback analysis (AI unavailable)"** banner.
6. **Review:** the candidate sees the extracted skills with snippets and can confirm or deny them before scoring.

---

## 8. Frontend pages

**Global:** a top bar with the user switcher, plan switcher (Free / Pro / Max chips), a notifications bell, and an "Admin" link for the admin user.

| Route | Purpose | Key elements |
|---|---|---|
| `/` | Landing | value proposition, "Choose your target role" |
| `/profiles` | Catalog | cards with the company badge |
| `/profiles/:id` | Profile detail | required and preferred skills with levels, the company, the open job count, CTA "Check my fit" |
| `/profiles/:id/upload` | Upload and review | dropzone, extraction progress, skill list with snippets, confirm toggles, source banner |
| `/assessments/:id` | Result | score gauge, coverage, **breakdown table (Pro)**, top improvements, locked panels with an upgrade CTA |
| `/learn/:profileId` | Learning path | ordered steps, status badges, progress bar (Pro sees titles only) |
| `/learn/course/:id` | Lesson | video embed (with fallback), mark complete, "Take the test" |
| `/tests/:id` | Test | questions, submit, per-question result, a pass/fail banner, and the score delta after rescoring |
| `/jobs`, `/jobs/:id` | Jobs | eligibility checklist (met/unmet), apply button (disabled with a reason) |
| `/me` | Dashboard | skill statuses, attempts, applications with statuses |
| `/admin` | Admin home | counts and quick links |
| `/admin/profiles/:id` | **Profile editor** (shown in the demo) | an editable skills table with weight, level and importance, plus publish |
| `/admin/jobs/:id` | **Job editor** (shown in the demo) | a requirements table (skill, rule, min level, mandatory) |
| `/admin/{companies,skills,courses,tests}` | Basic CRUD | one generic `<ResourceTable>` + `<ResourceForm>` component |
| `/admin/candidates/:id` | Candidate review | assessments, skill statuses, attempts, applications, status dropdown |

Only the two admin editors marked "shown in the demo" need polish. Everything else uses the generic CRUD component.

---

## 9. Acceptance criteria

Each criterion is checkable with curl or a pytest test. Items marked ⭐ are on the demo path.

1. ⭐ Uploading `seed/demo_resume.pdf` returns an extraction in under 15 s (live) or under 1 s (cache). Python shows as `demonstrated` with a snippet, and SQL shows as `mentioned`.
2. If the LLM key is set to an invalid value, the same upload returns `source: "fallback"` in under 3 s, and the UI shows the banner.
3. ⭐ Scoring the same résumé against the same profile version twice gives an identical `result`. There's a unit test with fixed evidence and an expected score.
4. A skill with no evidence appears as `no_evidence` / "No evidence yet", never as "missing".
5. ⭐ As Free, the `GET /assessments/{id}` JSON has no `breakdown` key, and `GET /profiles/{id}/learning-path` returns 403 `upgrade_required` with `required_plan: "pro"`.
6. ⭐ As Pro, the breakdown is present. The learning path has titles but no `video_url`, and `POST /tests/{id}/attempts` returns 403 with `required_plan: "max"`.
7. ⭐ As Max, submitting the SQL test with at least the threshold correct gives `passed: true`. The test also:
   - writes `validated` evidence,
   - creates a new assessment with a higher score,
   - adds `eligibility_changes` that include the job.
8. Submitting below the threshold gives `passed: false`, and the skill status becomes `assessment_failed`. Retrying is allowed and every attempt is recorded.
9. ⭐ Applying while ineligible returns 409 with `unmet`. Applying while eligible returns 201, and the application appears in `/me/applications` and in admin.
10. ⭐ An admin changing the SQL weight from 20 to 40 bumps the profile version. A new assessment shows a different score, and the old assessment still shows its original score.
11. An admin changing the job's Docker requirement to mandatory makes a previously eligible candidate ineligible.
12. `POST /demo/reset` restores the demo candidate to a clean state in under 1 s.

**Stretch goals** (only after all ⭐ items pass):

- **S1:** a `sql`-kind question. Run the candidate's query against an in-memory SQLite copy of a seeded dataset, read-only with a 2 s limit, and compare its result set to the reference query.
- **S2:** DOCX upload.
- **S3:** a second deep profile.

---

## 10. Implementation plan

These are dependency-ordered phases. There are four parallel tracks once Phase 0 is done.

**Phase 0 — Foundation (everyone, about 2–3 h).** This blocks everything else.

- Repo, docker-compose, FastAPI skeleton, Vite and Tailwind skeleton.
- SQLAlchemy models (§5) and Alembic, or `create_all` with a reset.
- The `X-Demo-User` dependency, the `permissions.py` stub, and an idempotent `seed.py` with the full Data Scientist profile.
- Freeze the JSON shapes of the assessment `result` and the eligibility response, so the frontend can mock against them.

**Phase 1 — Parallel tracks**

| Track | Owner | Work | Depends on |
|---|---|---|---|
| A — Core logic | backend 1 | `scoring.py`, `eligibility.py`, `grading.py`, `learning_path.py`, `permissions.py`, each with pytest. Then the assessment, test and job endpoints. | Phase 0 |
| B — Extraction | backend 2 / AI | PDF text, LLM call with schema, snippet verification, fallback extractor, cache, the `/resumes` endpoints | Phase 0 |
| C — Candidate UI | frontend 1 | top bar and switchers, catalog, upload/review, result page, path, lesson, test, jobs (built against mocked JSON first) | the frozen shapes from Phase 0 |
| D — Admin and content | frontend 2 / PM | generic CRUD, the profile and job editors, candidate review. **Write the real content:** course list and video picks, 6 tests, the demo résumé PDF. | Phase 0 |

Content writing in Track D is real work and is the one most often underestimated. Start it at hour 0.

**Phase 2 — Integration (about 3 h).** Connect C to A and B, and run the §12 demo flow end to end. Fix the JSON contract mismatches that turn up.

**Phase 3 — Demo hardening (at least 3 h, not optional)**

- Pre-warm the cache for the demo résumé.
- Run `/demo/reset` before each run.
- Prepare the local video fallback.
- Run with the LLM disabled once to prove the fallback.
- Hold three timed rehearsals, with a target under 5 minutes.
- Keep a written click script.
- Keep a screen recording of a successful run as the final fallback.

---

## 11. Technical risks and fallbacks

| Risk | Likelihood | Fallback |
|---|---|---|
| LLM is slow or down during the demo | Medium | cache, then the deterministic fallback with a visible banner |
| LLM invents skills | High | canonical-id constraint, snippet verification, candidate review |
| PDF text comes out garbled | Medium | test the actual demo PDF early, plus the paste-text alternative |
| Venue Wi-Fi blocks YouTube | Medium | local mp4 for the demo lesson |
| Demo data is left dirty from rehearsal | High | `/demo/reset` |
| Score looks arbitrary to judges | Medium | the breakdown table shows the formula inputs, and the "How is this calculated?" modal reproduces §4.2 |
| Frontend and backend contracts drift | Medium | shapes frozen in Phase 0, plus Pydantic response models |
| Admin scope balloons | High | one generic CRUD component, with only 2 polished editors |

---

## 12. Open questions for the team

1. How long is the hackathon, and how many developers (and of which kind) are on the team? Phase sizing assumes about 4 people and about 36–48 h.
2. Which LLM provider is available, and is there a key with enough quota?
3. What language is the UI in for judges (French, Arabic or English)? This affects seed content and the demo résumé.
4. Is the demo run on a laptop or on a deployed URL?
5. Is a real partner company willing to be named, or do we use the fictional "Atlas Analytics"?
