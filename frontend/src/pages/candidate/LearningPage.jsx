import { Link } from "react-router-dom";
import { BadgeCheck, ClipboardCheck, Clock, Lock, Route } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import { SkillStateBadge } from "../../components/candidate/shared.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { ProgressBar } from "../../components/ui/Progress.jsx";
import { EmptyState, QueryBoundary, UpgradeCard } from "../../components/ui/states.jsx";
import { IMPORTANCE, LEVELS } from "../../domain/constants.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDuration } from "../../lib/format.js";
import { getLearningPath } from "../../services/candidateApi.js";

function Module({ module, index, locked }) {
  const done = module.courses.filter((c) => c.progress === 100).length;
  return (
    <li className="relative pl-12">
      <span
        aria-hidden="true"
        className={`absolute top-4 left-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
          module.state === "passed" ? "bg-success-bg text-success" : "bg-accent-600 text-white shadow-card"
        }`}
      >
        {module.state === "passed" ? <BadgeCheck size={16} /> : index + 1}
      </span>
      <Card bodyClassName="">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">{module.name}</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Expected level: {LEVELS[module.level]} · up to +{module.gain} pts when validated
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge map={IMPORTANCE} value={module.importance} />
            <SkillStateBadge state={module.state} />
          </div>
        </div>
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {module.courses.length === 0 && <li className="px-5 py-3 text-xs text-gray-500">No course published for this skill yet.</li>}
          {module.courses.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-gray-900">{c.title}</p>
                <p className="flex items-center gap-1 text-xs text-gray-500">
                  {c.difficulty} · <Clock aria-hidden="true" size={12} /> {formatDuration(c.minutes)}
                </p>
              </div>
              {!c.accessible ? (
                <Lock aria-label="Locked" size={16} className="text-gray-400" />
              ) : (
                <>
                  <div className="w-28">
                    <ProgressBar value={c.progress} label={`${c.title} progress`} />
                    <p className="mt-1 text-right text-[11px] text-gray-500 tabular-nums">{c.progress}%</p>
                  </div>
                  <Link to={`/candidate/courses/${c.id}`} className={buttonClasses(c.progress === 100 ? "secondary" : "solid", "", "xs")}>
                    {c.progress === 100 ? "Review" : c.progress > 0 ? "Continue" : "Start"}
                  </Link>
                </>
              )}
            </li>
          ))}
          {module.test && (
            <li className="flex flex-wrap items-center gap-3 bg-gray-50/60 px-5 py-3">
              <ClipboardCheck aria-hidden="true" size={16} className="text-accent-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-gray-900">{module.test.title}</p>
                <p className="text-xs text-gray-500">
                  {module.test.lastAttempt
                    ? `Last attempt: ${module.test.lastAttempt.score}% (${module.test.lastAttempt.passed ? "passed" : "not passed"})`
                    : `Validate the skill after the courses (${done}/${module.courses.length} completed)`}
                </p>
              </div>
              {locked ? (
                <Lock aria-label="Locked" size={16} className="text-gray-400" />
              ) : (
                module.state !== "passed" && (
                  <Link to={`/candidate/tests/${module.test.id}`} className={buttonClasses("secondary", "", "xs")}>
                    {module.test.lastAttempt ? "Retry test" : "Take test"}
                  </Link>
                )
              )}
            </li>
          )}
        </ul>
      </Card>
    </li>
  );
}

export default function LearningPage() {
  const query = useQuery(getLearningPath);

  return (
    <div>
      <PageHeader title="Learning path" description="Ordered by prerequisites, then by how much each skill improves your alignment." />
      <QueryBoundary query={query} rows={6} upgradeText="Pro shows a learning path built from your skill gaps; Max unlocks the courses and tests.">
        {(path) => {
          if (!path.profile) {
            return (
              <Card>
                <EmptyState icon={Route} title="Upload a résumé to build your path" action={<Link to="/candidate/assessments?upload=1" className={buttonClasses("solid", "", "sm")}>Upload résumé</Link>} />
              </Card>
            );
          }
          if (path.modules.length === 0) {
            return (
              <Card>
                <EmptyState icon={BadgeCheck} title="Every competency is validated">
                  You've passed the tests for all skills in {path.profile.title}.
                </EmptyState>
              </Card>
            );
          }
          return (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-gray-600">
                Path for <Badge tone="accent">{path.profile.title}</Badge> · {path.modules.length} competencies to develop or validate
              </div>
              {path.contentLocked && (
                <Card>
                  <UpgradeCard plan="max" compact title="You're viewing the path overview">
                    Your starter courses are open below. Max unlocks every course, practice activity and skill test, with progress tracking.
                  </UpgradeCard>
                </Card>
              )}
              <ol className="stagger space-y-4">
                {path.modules.map((m, i) => (
                  <Module key={m.skillId} module={m} index={i} locked={path.contentLocked} />
                ))}
              </ol>
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
