import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Briefcase, CalendarCheck2, CheckCircle2, Info, MapPin, PartyPopper } from "lucide-react";
import Button from "../../components/Button.jsx";
import { CompanyMark } from "../../components/candidate/shared.jsx";
import {
  ApplicationStatusBadge,
  InterviewDetails,
  InterviewStatusBadge,
  JoinInterviewButton,
  MeetingLinkNote,
  StageTracker,
} from "../../components/recruitment/shared.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { CANDIDATE_STAGE_TEXT, formatMoney } from "../../domain/recruitment.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDate, formatDateTime } from "../../lib/format.js";
import { confirmInterviewAttendance, getMyApplication } from "../../services/candidateApi.js";

function InvitationCard({ interview }) {
  const [run, pending] = useAction();
  return (
    <Card
      className="border-accent-200 ring-4 ring-accent-50"
      title={interview.rescheduleCount > 0 ? "Interview rescheduled" : "Interview invitation"}
      description={
        interview.rescheduleCount > 0 && interview.previousScheduledAt
          ? `Moved from ${formatDateTime(interview.previousScheduledAt, interview.timeZone)}`
          : `Round ${interview.round}`
      }
      action={<InterviewStatusBadge interview={interview} />}
    >
      <InterviewDetails interview={interview} />
      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <JoinInterviewButton interview={interview} />
        {interview.candidateConfirmedAt ? (
          <Badge tone="success" icon={CheckCircle2}>
            Attendance confirmed {formatDate(interview.candidateConfirmedAt)}
          </Badge>
        ) : (
          <Button
            variant="secondary"
            size="sm"
            loading={pending}
            onClick={() => run(() => confirmInterviewAttendance(interview.id), { success: "Thanks — the employer knows you'll attend." })}
          >
            <CalendarCheck2 aria-hidden="true" size={16} /> Confirm attendance
          </Button>
        )}
      </div>
      <div className="mt-3">
        <MeetingLinkNote interview={interview} />
      </div>
    </Card>
  );
}

function OutcomeCard({ app }) {
  if (app.status === "hired") {
    return (
      <Card className="border-success/30">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 animate-pop-in items-center justify-center rounded-full bg-success-bg text-success">
            <PartyPopper aria-hidden="true" size={20} />
          </span>
          <div>
            <p className="text-base font-semibold text-gray-900">You're hired!</p>
            <p className="mt-0.5 text-[13px] text-gray-700">
              {app.companyName} confirmed your hire for {app.job.title}
              {app.hireDate && ` on ${formatDate(app.hireDate)}`}.
              {app.offer?.startDate && ` Your start date is ${formatDate(app.offer.startDate)}.`}
            </p>
          </div>
        </div>
      </Card>
    );
  }
  if (app.status !== "offer_extended" || !app.offer) return null;
  return (
    <Card className="border-accent-200 ring-4 ring-accent-50" title="Job offer" description={`Received ${formatDate(app.offer.extendedAt)}`} action={<Badge tone="accent">Offer extended</Badge>}>
      <blockquote className="rounded-md bg-gray-50 px-3.5 py-3 text-[13px] whitespace-pre-line text-gray-800">{app.offer.message}</blockquote>
      <dl className="mt-4 grid gap-3 text-[13px] sm:grid-cols-2">
        {app.offer.startDate && (
          <div>
            <dt className="text-[11px] text-gray-500">Proposed start date</dt>
            <dd className="text-gray-900">{formatDate(app.offer.startDate)}</dd>
          </div>
        )}
        {app.offer.annualSalary && (
          <div>
            <dt className="text-[11px] text-gray-500">Annual salary</dt>
            <dd className="text-gray-900 tabular-nums">{formatMoney(app.offer.annualSalary, app.offer.currency)}</dd>
          </div>
        )}
      </dl>
      <p className="mt-4 text-xs text-gray-500">The employer will contact you to finalise the details and confirm your hire.</p>
    </Card>
  );
}

function PastInterviews({ interviews }) {
  if (interviews.length === 0) return null;
  return (
    <Card title="Past interviews" bodyClassName="">
      <ul className="divide-y divide-gray-100">
        {interviews.map((i) => (
          <li key={i.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-gray-900">
                Round {i.round} · {i.interviewer}
              </p>
              <p className="text-xs text-gray-500">
                {formatDateTime(i.scheduledAt, i.timeZone)} ({i.timeZone})
              </p>
              {i.status === "cancelled" && i.cancelReason && <p className="mt-1 text-xs text-gray-600">“{i.cancelReason}”</p>}
            </div>
            <InterviewStatusBadge interview={i} />
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function ApplicationDetailPage() {
  const { appId } = useParams();
  const query = useQuery(() => getMyApplication(appId), [appId]);

  return (
    <div>
      <Link to="/candidate/applications" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> My applications
      </Link>
      <QueryBoundary query={query} rows={8}>
        {(app) => {
          const upcoming = app.interviews.filter((i) => i.status === "scheduled").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
          const past = app.interviews.filter((i) => i.status !== "scheduled");
          return (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="stagger space-y-5">
                <div className="flex items-start gap-4">
                  <CompanyMark name={app.companyName} size="lg" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{app.job.title}</h1>
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                    <p className="text-sm text-gray-600">{app.companyName}</p>
                    <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <MapPin aria-hidden="true" size={13} /> {app.job.location} · {app.job.workMode}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Briefcase aria-hidden="true" size={13} /> {app.job.employmentType}
                      </span>
                    </p>
                  </div>
                </div>

                <Card title="Recruitment progress">
                  <StageTracker status={app.status} history={app.history} />
                  <p className="mt-4 flex items-start gap-2 rounded-md bg-info-bg px-3 py-2 text-xs text-info">
                    <Info aria-hidden="true" size={14} className="mt-px shrink-0" />
                    {CANDIDATE_STAGE_TEXT[app.status]}
                  </p>
                </Card>

                <OutcomeCard app={app} />
                {upcoming.map((i) => (
                  <InvitationCard key={i.id} interview={i} />
                ))}
                <PastInterviews interviews={past} />
              </div>

              <div className="space-y-5">
                <Card title="Your application">
                  <dl className="space-y-2 text-[13px]">
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Applied</dt>
                      <dd className="text-gray-900">{formatDate(app.createdAt)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-gray-500">Last update</dt>
                      <dd className="text-gray-900">{formatDate(app.updatedAt)}</dd>
                    </div>
                  </dl>
                  {app.note && <blockquote className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700">“{app.note}”</blockquote>}
                  <p className="mt-3 text-[11px] text-gray-500">
                    Shared with the employer: profile
                    {app.consent.evidence && ", résumé skills"}
                    {app.consent.tests && ", test results"}
                    {app.consent.learning && ", learning progress"}.
                  </p>
                  <Link to={`/candidate/jobs/${app.job.id}`} className="mt-3 inline-block text-xs font-semibold text-accent-600 hover:underline">
                    View job posting
                  </Link>
                </Card>
                <Card title="History">
                  <ol className="space-y-2.5">
                    {[...app.history].reverse().map((h, i) => (
                      <li key={i} className="text-[13px]">
                        <span className="font-medium text-gray-900">{APPLICATION_STATUSES[h.status]?.label ?? h.status}</span>
                        <span className="text-xs text-gray-500"> · {formatDate(h.at)}</span>
                      </li>
                    ))}
                  </ol>
                </Card>
              </div>
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
