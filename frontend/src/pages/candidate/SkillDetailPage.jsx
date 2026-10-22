import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, BookOpen, CheckCircle2, Circle, ClipboardCheck, Clock, Lock, Target } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import { SkillStateBadge } from "../../components/candidate/shared.jsx";
import { GapKindBadge, GapPriorityBadge } from "../../components/candidate/skillGaps.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import { ProgressBar } from "../../components/ui/Progress.jsx";
import { EmptyState, QueryBoundary, UpgradeCard } from "../../components/ui/states.jsx";
import { IMPORTANCE, LEVELS } from "../../domain/constants.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDuration, plural, youtubeId } from "../../lib/format.js";
import { getSkillDetail } from "../../services/candidateApi.js";

function progressLabel(progress) {
  return progress === 100 ? "Completed" : progress > 0 ? "In progress" : "Not started";
}

function CourseItem({ course, step, unlocked }) {
  const video = unlocked && youtubeId(course.videoUrl);
  return (
    <li>
      <Card bodyClassName="">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wide text-accent-700 uppercase">Step {step}</p>
            <h3 className="mt-0.5 text-sm font-semibold text-gray-900">{course.title}</h3>
            <p className="mt-1 text-[13px] text-gray-600">{course.description}</p>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
              <Badge>{course.difficulty}</Badge>
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" size={12} /> {formatDuration(course.minutes)}
              </span>
              · {plural(course.lessonCount, "lesson")} · {course.provider}
            </p>
          </div>
          {unlocked ? (
            <div className="w-full sm:w-40">
              <div className="mb-1 flex justify-between text-[11px] text-gray-600">
                <span>{progressLabel(course.progress)}</span>
                <span className="tabular-nums">{course.progress}%</span>
              </div>
              <ProgressBar value={course.progress} label={`${course.title} progress`} />
              <Link to={`/candidate/courses/${course.id}`} className={buttonClasses(course.progress === 100 ? "secondary" : "solid", "mt-2 w-full", "xs")}>
                {course.progress === 100 ? "Review course" : course.progress > 0 ? "Continue" : "Start course"}
              </Link>
            </div>
          ) : (
            <Link to="/candidate/subscription" className={buttonClasses("secondary", "", "xs")}>
              <Lock aria-hidden="true" size={14} /> Unlock with Max
            </Link>
          )}
        </div>
        {unlocked && (
          <div className="grid gap-4 border-t border-gray-100 px-5 py-4 md:grid-cols-2">
            {video ? (
              <div className="aspect-video overflow-hidden rounded-lg bg-navy-950">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${video}`}
                  title={`${course.title} video`}
                  loading="lazy"
                  allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <p className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-500">
                No video for this course yet
              </p>
            )}
            <ul className="space-y-1.5" aria-label={`${course.title} lessons`}>
              {course.lessons.map((l) => (
                <li key={l.id} className="flex items-start gap-2 text-[13px]">
                  {l.done ? (
                    <CheckCircle2 aria-label="Completed" size={16} className="mt-px shrink-0 text-success" />
                  ) : (
                    <Circle aria-label="Not completed" size={16} className="mt-px shrink-0 text-gray-300" />
                  )}
                  <span className={l.done ? "text-gray-500" : "text-gray-800"}>
                    {l.title} <span className="text-xs text-gray-400">· {formatDuration(l.minutes)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>
    </li>
  );
}

function TestCard({ test, unlocked, skillName }) {
  if (!test) return null;
  return (
    <Card title="Validate this skill" description={`${plural(test.questionCount, "question")} · pass mark ${test.passThreshold}%`}>
      <p className="text-[13px] font-medium text-gray-900">{test.title}</p>
      {!unlocked ? (
        <>
          <p className="mt-1 text-xs text-gray-600">Skill tests record evidence employers can see. They're part of Max.</p>
          <Link to="/candidate/subscription" className={buttonClasses("secondary", "mt-3 w-full", "sm")}>
            <Lock aria-hidden="true" size={14} /> Unlock with Max
          </Link>
        </>
      ) : test.passed ? (
        <p className="mt-2 flex items-center gap-2 text-[13px] text-success">
          <BadgeCheck aria-hidden="true" size={16} /> You've passed the {skillName} test.
        </p>
      ) : (
        <>
          {test.lastAttempt && <p className="mt-1 text-xs text-gray-600">Last attempt: {test.lastAttempt.score}% (not passed)</p>}
          <Link to={`/candidate/tests/${test.id}`} className={buttonClasses("solid", "mt-3 w-full", "sm")}>
            <ClipboardCheck aria-hidden="true" size={16} /> {test.lastAttempt ? "Retry the test" : "Take the test"}
          </Link>
        </>
      )}
    </Card>
  );
}

function SkillDetail({ d }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        <div>
          <div className="flex flex-wrap gap-1.5">
            {d.gap && <GapPriorityBadge priority={d.gap.priority} />}
            {d.gap ? <GapKindBadge kind={d.gap.kind} /> : <SkillStateBadge state={d.state} />}
            <Badge>{d.skill.category}</Badge>
          </div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{d.skill.name}</h1>
          <p className="mt-1 text-sm text-gray-600">{d.skill.description}</p>
        </div>

        <section aria-labelledby="courses-heading">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="courses-heading" className="text-sm font-semibold text-gray-900">
                Courses for {d.skill.name}
              </h2>
              {d.courses.length > 0 && (
                <p className="text-xs text-gray-500">
                  {plural(d.courses.length, "course")} in learning order · about {formatDuration(d.totalMinutes)} in total
                </p>
              )}
            </div>
          </div>
          {d.courses.length === 0 ? (
            <Card>
              <EmptyState icon={BookOpen} title={`No course for ${d.skill.name} yet`}>
                We haven't published a course for this skill. You can still add evidence of it on your assessment page
                {d.test ? " or validate it with the skill test" : ""}.
              </EmptyState>
            </Card>
          ) : (
            <>
              {d.courses.some((c) => !c.accessible) && (
                <Card className="mb-4">
                  <UpgradeCard plan="max" compact title="Some of these courses are part of Max">
                    You can see which courses close this gap. Max opens every course, with practice tests and progress tracking.
                  </UpgradeCard>
                </Card>
              )}
              <ol className="space-y-4">
                {d.courses.map((c, i) => (
                  <CourseItem key={c.id} course={c} step={i + 1} unlocked={c.accessible} />
                ))}
              </ol>
            </>
          )}
        </section>
      </div>

      <aside className="space-y-5">
        <Card title="Why it matters">
          <p className="text-[13px] text-gray-700">{d.why}</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[13px]">
            <div>
              <dt className="text-xs text-gray-500">Importance</dt>
              <dd className="mt-0.5">
                <StatusBadge map={IMPORTANCE} value={d.requirement.importance} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Expected level</dt>
              <dd className="mt-0.5 font-medium text-gray-900">
                {d.requirement.level ? (
                  LEVELS[d.requirement.level]
                ) : (
                  <Link to="/candidate/subscription" className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:underline">
                    <Lock aria-hidden="true" size={12} /> Pro
                  </Link>
                )}
              </dd>
            </div>
          </dl>
          <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-500">
            <Target aria-hidden="true" size={13} /> {d.profile.title} · {d.profile.companyName}
          </p>
        </Card>

        <Card title="Your current gap">
          {d.gap ? (
            <p className="text-[13px] text-gray-700">{d.gap.explanation}</p>
          ) : (
            <p className="flex items-start gap-2 text-[13px] text-success">
              <BadgeCheck aria-hidden="true" size={16} className="mt-px shrink-0" /> You've demonstrated this skill at the expected level.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">Evidence: {d.evidence.label}</p>
          {d.evidence.quote && <blockquote className="mt-1.5 border-l-2 border-gray-200 pl-2.5 text-xs text-gray-600 italic">“{d.evidence.quote}”</blockquote>}
        </Card>

        {d.objectives.length > 0 && (
          <Card title="What you'll learn">
            <ul className="list-disc space-y-1 pl-4 text-[13px] text-gray-700">
              {d.objectives.map((o) => (
                <li key={o}>{o}</li>
              ))}
            </ul>
          </Card>
        )}

        <TestCard test={d.test} unlocked={d.testsUnlocked} skillName={d.skill.name} />
      </aside>
    </div>
  );
}

export default function SkillDetailPage() {
  const { skillId } = useParams();
  const query = useQuery(() => getSkillDetail(skillId), [skillId]);

  return (
    <div>
      <Link to="/candidate/skill-gaps" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> Skill gaps
      </Link>
      <QueryBoundary query={query} rows={6} upgradeText="Upgrade to Pro to see this skill gap and the rest of your skill-gap report.">
        {(d) => <SkillDetail d={d} />}
      </QueryBoundary>
    </div>
  );
}
