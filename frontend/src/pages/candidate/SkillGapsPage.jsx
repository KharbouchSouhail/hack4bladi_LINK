import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BadgeCheck, FileUp, Info, Loader2, Lock, Target, TrendingUp } from "lucide-react";
import Button, { buttonClasses } from "../../components/Button.jsx";
import { ResumeUploadDialog, SkillStateBadge } from "../../components/candidate/shared.jsx";
import { GapCard, GapUpgradeDialog, LockedGapCard } from "../../components/candidate/skillGaps.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import { ProgressBar, ScoreRing } from "../../components/ui/Progress.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { IMPORTANCE, LEVELS } from "../../domain/constants.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDate, plural } from "../../lib/format.js";
import { getAssessment, getLatestAnalysis, getSkillGaps } from "../../services/candidateApi.js";

const COLUMNS = [
  {
    key: "name",
    header: "Competency",
    sortValue: (r) => r.name,
    render: (r) => (
      <div>
        <p className="font-medium text-gray-900">{r.name}</p>
        {r.quote && <p className="mt-0.5 max-w-xs truncate text-xs text-gray-500" title={r.quote}>“{r.quote}”</p>}
      </div>
    ),
  },
  { key: "importance", header: "Priority", sortValue: (r) => (r.importance === "required" ? 0 : 1), render: (r) => <StatusBadge map={IMPORTANCE} value={r.importance} /> },
  { key: "weight", header: "Weight", align: "right", sortValue: (r) => r.weight, render: (r) => `${r.weight}%` },
  { key: "level", header: "Expected level", sortValue: (r) => r.level, render: (r) => LEVELS[r.level] },
  {
    key: "evidence",
    header: "Evidence",
    sortValue: (r) => r.credit,
    render: (r) => (
      <div className="w-32">
        <p className="mb-1 text-xs text-gray-600">{r.evidenceLabel}</p>
        <ProgressBar value={r.credit * 100} label={`${r.name} evidence strength`} />
      </div>
    ),
  },
  { key: "state", header: "Status", render: (r) => <SkillStateBadge state={r.state} /> },
  { key: "gain", header: "Potential gain", align: "right", sortValue: (r) => r.gain, render: (r) => (r.gain > 0 ? `+${Math.round(r.gain)} pts` : "—") },
];

// Shows a running or failed analysis. Earlier results stay visible below a failed one.
function AnalysisStatus({ analysis, onRetry }) {
  if (!analysis || analysis.status === "completed") return null;
  if (analysis.status === "processing") {
    return (
      <div role="status" className="mb-5 flex items-center gap-3 rounded-lg border border-accent-100 bg-accent-50/60 px-4 py-3 text-[13px] text-accent-800">
        <Loader2 aria-hidden="true" size={18} className="shrink-0 animate-spin" />
        <span>
          Analysing <span className="font-semibold">{analysis.fileName}</span>… Your results will appear here automatically.
        </span>
      </div>
    );
  }
  return (
    <div role="alert" className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-error/20 bg-error-bg px-4 py-3 text-[13px] text-error">
      <AlertTriangle aria-hidden="true" size={18} className="shrink-0" />
      <span className="min-w-0 flex-1">
        We couldn't analyse <span className="font-semibold">{analysis.fileName}</span>. {analysis.error}
      </span>
      <Button variant="secondary" size="xs" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function FullReport() {
  const query = useQuery(getAssessment);
  return (
    <QueryBoundary query={query} rows={4}>
      {(a) =>
        a.rows && (
          <Card title="Full competency breakdown" description={`Profile version ${a.profile.version}. Weights and levels are set by the employer.`} bodyClassName="">
            <DataTable columns={COLUMNS} rows={a.rows} rowKey="skillId" caption="Skill gaps" />
          </Card>
        )
      }
    </QueryBoundary>
  );
}

function Summary({ data }) {
  return (
    <Card bodyClassName="p-5">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ScoreRing value={data.score} size={96} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-gray-500">Compatibility with</p>
          <p className="text-base font-semibold text-gray-900">
            {data.profile.title} <span className="font-normal text-gray-500">· {data.profile.companyName}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Evidence for {data.coverage.withEvidence} of {data.coverage.total} competencies · analysed {formatDate(data.analyzedAt)}
          </p>
          {data.analyzedForProfileId && data.analyzedForProfileId !== data.profile.id && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-600">
              <Target aria-hidden="true" size={14} className="mt-px shrink-0 text-accent-600" />
              You changed your target role since your last upload; these gaps are recalculated for {data.profile.title}.
            </p>
          )}
        </div>
        <Link to="/candidate/assessments" className={buttonClasses("secondary", "self-start sm:self-center", "sm")}>
          Assessment details
        </Link>
      </div>
    </Card>
  );
}

function GapsContent({ data, onUpload }) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!data.hasResume) {
    return (
      <Card>
        <EmptyState icon={FileUp} title="Upload a résumé to find your skill gaps" action={<Button variant="solid" size="sm" onClick={onUpload}>Upload résumé</Button>}>
          We'll analyse it automatically and compare it with {data.profile?.title ?? "your target role"}.
        </EmptyState>
      </Card>
    );
  }
  if (!data.profile) {
    return (
      <Card>
        <EmptyState icon={Target} title="Choose a target role" action={<Link to="/candidate/assessments" className={buttonClasses("solid", "", "sm")}>Choose a role</Link>}>
          Skill gaps are calculated against the requirements of the role you're aiming for.
        </EmptyState>
      </Card>
    );
  }
  if (data.coverage.total === 0) {
    return (
      <Card>
        <EmptyState icon={Info} title="This role has no competencies configured yet">
          The employer hasn't defined the skills for {data.profile.title}. Choose another role or check back later.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Summary data={data} />

      {data.total === 0 ? (
        <Card>
          <EmptyState icon={BadgeCheck} title="No skill gaps found">
            Your résumé and test results show every competency {data.profile.title} requires at the expected level.
          </EmptyState>
        </Card>
      ) : (
        <section aria-labelledby="gaps-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="gaps-heading" className="text-sm font-semibold text-gray-900">
                {plural(data.total, "skill gap")} found
              </h2>
              <p className="text-xs text-gray-500">Highest priority first. Open a skill to see the courses for it.</p>
            </div>
            {data.lockedCount > 0 && (
              <Badge tone="accent" icon={Lock}>
                {data.lockedCount} locked
              </Badge>
            )}
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.gaps.map((g) => (
              <li key={g.skillId}>
                <GapCard gap={g} />
              </li>
            ))}
            {Array.from({ length: data.lockedCount }, (_, i) => (
              <li key={`locked-${i}`}>
                <LockedGapCard index={i + 1} onClick={() => setUpgradeOpen(true)} />
              </li>
            ))}
          </ul>
          {data.lockedCount > 0 && (
            <div className="mt-4 flex flex-col gap-3 rounded-lg border border-accent-100 bg-accent-50/60 px-4 py-3.5 sm:flex-row sm:items-center">
              <TrendingUp aria-hidden="true" size={18} className="shrink-0 text-accent-600" />
              <p className="flex-1 text-[13px] text-gray-700">
                <span className="font-semibold text-gray-900">{plural(data.lockedCount, "more skill gap")} found.</span> Upgrade to Pro for the
                complete report with priorities and expected levels, or Max for the courses to close each gap.
              </p>
              <Button variant="solid" size="sm" onClick={() => setUpgradeOpen(true)}>
                Unlock full analysis
              </Button>
            </div>
          )}
        </section>
      )}

      {data.demonstrated.length > 0 && (
        <Card title="Skills you've demonstrated" description="Shown in a project or job at the expected level, or validated by a test.">
          <ul className="flex flex-wrap gap-1.5">
            {data.demonstrated.map((s) => (
              <li key={s.skillId}>
                <Badge tone="success" icon={BadgeCheck}>
                  {s.name}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {data.full && <FullReport />}

      <p className="flex items-start gap-2 text-xs text-gray-600">
        <Info aria-hidden="true" size={14} className="mt-px shrink-0 text-info" />
        <span>
          <Badge>No evidence yet</Badge> means your résumé didn't show this skill — not that you don't have it. Confirm it on your assessment page
          or validate it with a test.
        </span>
      </p>

      <GapUpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} lockedCount={data.lockedCount} />
    </div>
  );
}

export default function SkillGapsPage() {
  const query = useQuery(getSkillGaps);
  const latest = useQuery(getLatestAnalysis);
  const [uploadOpen, setUploadOpen] = useState(false);
  const processingFirst = latest.data?.status === "processing" && query.data && !query.data.hasResume;

  return (
    <div>
      <PageHeader
        title="Skill gaps"
        description="What your résumé shows against your target role's requirements, and where to focus next."
        actions={
          <Button variant="solid" size="sm" onClick={() => setUploadOpen(true)}>
            <FileUp aria-hidden="true" size={16} /> Upload new résumé
          </Button>
        }
      />
      <AnalysisStatus analysis={latest.data} onRetry={() => setUploadOpen(true)} />
      {!processingFirst && (
        <QueryBoundary query={query} rows={6}>
          {(data) => <GapsContent data={data} onUpload={() => setUploadOpen(true)} />}
        </QueryBoundary>
      )}
      <ResumeUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
    </div>
  );
}
