import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BadgeCheck, CheckCircle2, Circle, ClipboardCheck, Lock, PlayCircle } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import { ProgressBar } from "../../components/ui/Progress.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDuration, youtubeId } from "../../lib/format.js";
import { getCourse, setLessonComplete } from "../../services/candidateApi.js";

function Video({ url, title }) {
  const id = youtubeId(url);
  if (!id) {
    return (
      <div className="flex aspect-video max-w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-center">
        <PlayCircle aria-hidden="true" size={28} className="text-gray-400" />
        <p className="mt-2 text-sm font-medium text-gray-700">Video coming soon</p>
        <p className="text-xs text-gray-500">Work through the lessons below in the meantime.</p>
      </div>
    );
  }
  return (
    <div className="aspect-video max-w-full overflow-hidden rounded-lg bg-navy-950">
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${id}`}
        title={title}
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const query = useQuery(() => getCourse(courseId), [courseId]);
  const [run, pending] = useAction();

  return (
    <div>
      <Link to="/candidate/courses" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> Courses
      </Link>
      <QueryBoundary query={query} rows={6} upgradeText="This course is part of Max. Your plan includes two starter courses — find them on the Courses page.">
        {(course) => (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge tone="accent">{course.skillName}</Badge>
                  <Badge>{course.difficulty}</Badge>
                  <Badge>{formatDuration(course.minutes)}</Badge>
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900">{course.title}</h1>
                <p className="mt-1 text-sm text-gray-600">{course.description}</p>
                <p className="mt-1 text-xs text-gray-500">Source: {course.provider}</p>
              </div>
              <Video url={course.videoUrl} title={course.title} />
            </div>

            <div className="space-y-5">
              <Card title="Lessons" description={`${course.completedLessonIds.length} of ${course.lessons.length} completed`}>
                <ProgressBar value={course.progress} label="Course progress" />
                <ul className="mt-4 space-y-1">
                  {course.lessons.map((lesson) => {
                    const done = course.completedLessonIds.includes(lesson.id);
                    return (
                      <li key={lesson.id}>
                        <button
                          type="button"
                          disabled={pending}
                          aria-pressed={done}
                          onClick={() => run(() => setLessonComplete(course.id, lesson.id, !done))}
                          className="flex w-full items-start gap-2.5 rounded-control px-2 py-2 text-left hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-accent-600"
                        >
                          {done ? (
                            <CheckCircle2 aria-hidden="true" size={18} className="mt-px shrink-0 text-success" />
                          ) : (
                            <Circle aria-hidden="true" size={18} className="mt-px shrink-0 text-gray-300" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[13px] ${done ? "text-gray-500" : "font-medium text-gray-900"}`}>{lesson.title}</span>
                            <span className="text-[11px] text-gray-500">
                              {formatDuration(lesson.minutes)} · {done ? "Completed — click to undo" : "Mark as complete"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>

              {course.test && (
                <Card title="Validate this skill">
                  {course.test.locked ? (
                    <>
                      <p className="text-[13px] text-gray-600">Skill tests record evidence employers can see. They're part of Max.</p>
                      <Link to="/candidate/subscription" className={buttonClasses("secondary", "mt-3 w-full", "sm")}>
                        <Lock aria-hidden="true" size={14} /> Unlock the {course.skillName} test with Max
                      </Link>
                    </>
                  ) : course.test.passed ? (
                    <p className="flex items-center gap-2 text-[13px] text-success">
                      <BadgeCheck aria-hidden="true" size={16} /> You've passed the {course.skillName} test.
                    </p>
                  ) : (
                    <>
                      <p className="text-[13px] text-gray-600">
                        Completing this course records learning progress. Passing the test records evidence employers can see.
                      </p>
                      <Link to={`/candidate/tests/${course.test.id}`} className={buttonClasses(course.progress === 100 ? "solid" : "secondary", "mt-3 w-full", "sm")}>
                        <ClipboardCheck aria-hidden="true" size={16} /> Take the {course.skillName} test
                      </Link>
                    </>
                  )}
                </Card>
              )}
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
