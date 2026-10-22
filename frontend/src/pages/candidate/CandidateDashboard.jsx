import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, Briefcase, FileSearch, FileUp, Info, RefreshCw, Route, Target } from "lucide-react";
import Button, { buttonClasses } from "../../components/Button.jsx";
import { JobCard, LearningCard, ResumeUploadDialog, SkillStateBadge, TargetRoleDialog } from "../../components/candidate/shared.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import { ScoreRing } from "../../components/ui/Progress.jsx";
import { EmptyState, ErrorState, LoadingState, QueryBoundary, UpgradeCard } from "../../components/ui/states.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDate, formatRelative, plural } from "../../lib/format.js";
import { getAssessment, getLearningPath, getMe, listJobs, listTests, reanalyze } from "../../services/candidateApi.js";

function QuickActions({ hasResume, onUpload }) {
  const navigate = useNavigate();
  const [run, pending] = useAction();

  async function analyze() {
    if (!hasResume) return onUpload();
    const { ok } = await run(reanalyze, { success: "Analysis refreshed against the latest role requirements." });
    if (ok) navigate("/candidate/assessments");
  }

  const action = "flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-[13px] font-medium text-gray-800 shadow-subtle transition hover:border-accent-200 hover:bg-accent-50/40 focus-visible:outline-2 focus-visible:outline-accent-600";
  const icon = "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600";

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <button type="button" onClick={onUpload} className={action}>
        <span className={icon}><FileUp aria-hidden="true" size={16} /></span> Upload résumé
      </button>
      <button type="button" onClick={analyze} disabled={pending} className={action}>
        <span className={icon}><RefreshCw aria-hidden="true" size={16} className={pending ? "animate-spin" : ""} /></span>
        {pending ? "Analysing…" : "Analyze my résumé"}
      </button>
      <Link to="/candidate/learning" className={action}>
        <span className={icon}><Route aria-hidden="true" size={16} /></span> Explore learning path
      </Link>
      <Link to="/candidate/jobs" className={action}>
        <span className={icon}><Briefcase aria-hidden="true" size={16} /></span> Find jobs
      </Link>
    </div>
  );
}

function Readiness({ assessment, onUpload }) {
  if (!assessment.hasResume) {
    return (
      <Card>
        <EmptyState icon={FileSearch} title="Upload your résumé to get your readiness score" action={<Button variant="solid" size="sm" onClick={onUpload}>Upload résumé</Button>}>
          We'll compare your experience with {assessment.profile?.title ?? "your target role"} and show where you stand.
        </EmptyState>
      </Card>
    );
  }

  const stats = [
    { label: "Skills found in résumé", value: assessment.counts.identified },
    { label: "Need evidence or development", value: assessment.counts.needsWork },
    { label: "Skill tests passed", value: assessment.counts.testsPassed },
  ];

  return (
    <Card bodyClassName="p-5 sm:p-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        <ScoreRing value={assessment.score} size={128} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500">Compatibility with</p>
          <p className="text-lg font-semibold text-gray-900">
            {assessment.profile.title} <span className="font-normal text-gray-500">· {assessment.profile.companyName}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Analysed {formatDate(assessment.analyzedAt)} · evidence for {assessment.coverage.withEvidence} of {assessment.coverage.total} skills
          </p>
          <dl className="mt-4 grid grid-cols-3 gap-3">
            {stats.map((s) => (
              <div key={s.label} className="rounded-md bg-gray-50 px-3 py-2.5">
                <dt className="text-[11px] leading-tight text-gray-500">{s.label}</dt>
                <dd className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <Link to="/candidate/assessments" className={buttonClasses("solid", "self-start md:self-center", "sm")}>
          View detailed assessment <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
      <p className="mt-5 flex items-start gap-2 rounded-md bg-info-bg px-3 py-2 text-xs text-info">
        <Info aria-hidden="true" size={14} className="mt-px shrink-0" />
        This score estimates how well your evidence aligns with this role's requirements. It is not a probability of being hired.
      </p>
    </Card>
  );
}

function SkillOverview({ assessment }) {
  return (
    <Card
      title="Skill-gap overview"
      description="Missing evidence isn't proof you lack a skill — it means we couldn't find it yet."
      action={<Link to="/candidate/skill-gaps" className={buttonClasses("secondary", "", "xs")}>Explore my skill gaps</Link>}
      bodyClassName=""
    >
      {assessment.gapsLocked ? (
        <UpgradeCard plan="pro" compact title="Your top 2 skill gaps are ready">
          Open your skill gaps to see them with their courses. Pro shows all {assessment.counts.needsWork} competencies that need work, with
          priorities and expected levels.
        </UpgradeCard>
      ) : (
        <ul className="divide-y divide-gray-100">
          {assessment.rows.map((r) => (
            <li key={r.skillId} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-gray-900">
                  {r.name} {r.importance === "preferred" && <span className="text-xs font-normal text-gray-500">(preferred)</span>}
                </p>
                <p className="text-xs text-gray-500">{r.evidenceLabel}</p>
              </div>
              <SkillStateBadge state={r.state} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function LearningSection() {
  const query = useQuery(getLearningPath);
  const courses = (query.data?.modules ?? []).flatMap((m) => m.courses.map((c) => ({ ...c, skillName: m.name }))).filter((c) => c.progress !== 100);

  return (
    <Card
      title="Recommended learning"
      description="Based on your target role and the skills with the biggest gap."
      action={query.data && <Link to="/candidate/learning" className={buttonClasses("secondary", "", "xs")}>Open learning path</Link>}
      bodyClassName={query.data && !query.data.contentLocked && courses.length ? "p-4" : ""}
    >
      <QueryBoundary query={query} upgradeText="Get a personalised learning path built from your skill gaps with Pro.">
        {(path) =>
          courses.length === 0 ? (
            <EmptyState icon={Route} title="Nothing to learn right now">Upload a résumé, or you've already completed the recommended courses.</EmptyState>
          ) : path.contentLocked ? (
            <div>
              <ol className="divide-y divide-gray-100">
                {courses.slice(0, 3).map((c, i) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                    {c.accessible ? (
                      <Link to={`/candidate/courses/${c.id}`} className="font-medium text-accent-700 hover:underline">{i + 1}. {c.title}</Link>
                    ) : (
                      <span className="text-gray-800">{i + 1}. {c.title}</span>
                    )}
                    <Badge tone="accent">{c.skillName}</Badge>
                  </li>
                ))}
              </ol>
              <UpgradeCard plan="max" compact title="Start these courses with Max">Max unlocks courses, practice and progress tracking.</UpgradeCard>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {courses.slice(0, 3).map((c) => (
                <LearningCard key={c.id} course={c} />
              ))}
            </div>
          )
        }
      </QueryBoundary>
    </Card>
  );
}

function ValidationSection() {
  const query = useQuery(listTests);

  return (
    <Card title="Skill validation" description="Completing a course is learning; passing a test is evidence." bodyClassName="">
      <QueryBoundary query={query}>
        {({ locked, tests }) => {
          if (locked) return <UpgradeCard plan="max" compact>Prove your skills with graded tests employers can see.</UpgradeCard>;
          const relevant = tests.filter((t) => t.relevant);
          const recent = tests.filter((t) => t.lastAttempt).sort((a, b) => b.lastAttempt.createdAt.localeCompare(a.lastAttempt.createdAt)).slice(0, 3);
          const next = relevant.find((t) => !t.passed && t.learning) ?? relevant.find((t) => !t.passed);
          return (
            <div>
              {next && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-accent-50/40 px-5 py-4">
                  <div>
                    <p className="text-[11px] font-semibold tracking-wide text-accent-700 uppercase">Next recommended</p>
                    <p className="text-[13px] font-medium text-gray-900">{next.title}</p>
                    <p className="text-xs text-gray-500">{next.questions} questions · pass at {next.passThreshold}%</p>
                  </div>
                  <Link to={`/candidate/tests/${next.id}`} className={buttonClasses("solid", "", "xs")}>
                    Take test
                  </Link>
                </div>
              )}
              {recent.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-gray-500">No tests taken yet.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {recent.map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-gray-900">{t.skillName}</p>
                        <p className="text-xs text-gray-500">{formatRelative(t.lastAttempt.createdAt)} · {t.lastAttempt.score}%</p>
                      </div>
                      {t.passed ? (
                        <Badge tone="success" icon={BadgeCheck}>Passed</Badge>
                      ) : (
                        <Link to={`/candidate/tests/${t.id}`} className={buttonClasses("secondary", "", "xs")}>Retry</Link>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="border-t border-gray-100 px-5 py-3 text-xs text-gray-500">
                {tests.filter((t) => !t.attempts).length} tests available ·{" "}
                <Link to="/candidate/tests" className="font-medium text-accent-600 hover:underline">See all tests</Link>
              </p>
            </div>
          );
        }}
      </QueryBoundary>
    </Card>
  );
}

function JobsSection() {
  const query = useQuery(listJobs);
  return (
    <Card
      title="Job opportunities"
      description="Eligibility follows each employer's configured requirements."
      action={<Link to="/candidate/jobs" className={buttonClasses("secondary", "", "xs")}>All jobs</Link>}
      bodyClassName="p-4"
    >
      <QueryBoundary query={query}>
        {({ jobs, eligibilityLocked, lockedCount }) => {
          const order = { eligible: 0, validate: 1, not_met: 2 };
          const sorted = [...jobs].sort((a, b) => (order[a.eligibility?.status] ?? 0) - (order[b.eligibility?.status] ?? 0));
          return (
            <>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {sorted.slice(0, 3).map((job) => (
                  <JobCard key={job.id} job={job} eligibilityLocked={eligibilityLocked} />
                ))}
              </div>
              {lockedCount > 0 && (
                <p className="mt-3 text-xs text-gray-600">
                  {plural(lockedCount, "more opportunity", "more opportunities")} locked on your plan.{" "}
                  <Link to="/candidate/subscription" className="font-semibold text-accent-600 hover:underline">Upgrade to see them</Link>
                </p>
              )}
            </>
          );
        }}
      </QueryBoundary>
    </Card>
  );
}

export default function CandidateDashboard() {
  const me = useQuery(getMe);
  const assessment = useQuery(getAssessment);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);

  if (me.loading) return <LoadingState rows={6} />;
  if (me.error) return <ErrorState error={me.error} onRetry={me.reload} />;
  const firstName = me.data.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Welcome back, {firstName}</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Build the skills employers are looking for and take your next step toward your career goals.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white py-1.5 pr-1.5 pl-3 shadow-subtle">
          <Target aria-hidden="true" size={16} className="text-accent-600" />
          <span className="text-[13px] text-gray-600">
            Target role: <span className="font-semibold text-gray-900">{me.data.targetProfile?.title ?? "None selected"}</span>
          </span>
          <Button variant="ghost" size="xs" onClick={() => setRoleOpen(true)}>
            Change
          </Button>
        </div>
      </section>

      <QuickActions hasResume={Boolean(me.data.resume)} onUpload={() => setUploadOpen(true)} />

      {assessment.loading ? (
        <Card><LoadingState rows={4} /></Card>
      ) : assessment.error ? (
        <Card><ErrorState error={assessment.error} onRetry={assessment.reload} /></Card>
      ) : (
        <>
          <Readiness assessment={assessment.data} onUpload={() => setUploadOpen(true)} />
          {assessment.data.hasResume && (
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <SkillOverview assessment={assessment.data} />
              <ValidationSection />
            </div>
          )}
        </>
      )}

      <LearningSection />
      <JobsSection />

      <ResumeUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      <TargetRoleDialog open={roleOpen} onClose={() => setRoleOpen(false)} currentId={me.data.targetProfileId} />
    </div>
  );
}
