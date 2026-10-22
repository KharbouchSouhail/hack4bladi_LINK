import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, FileText, PartyPopper, Send } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import { ApplicationStatusBadge, JoinInterviewButton, StageTracker } from "../../components/recruitment/shared.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { CANDIDATE_STAGE_TEXT } from "../../domain/recruitment.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDate, formatDateTime } from "../../lib/format.js";
import { listMyApplications } from "../../services/candidateApi.js";

function Highlight({ app }) {
  if (app.nextInterview) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 bg-accent-50/40 px-5 py-3">
        <p className="flex items-center gap-2 text-[13px] text-gray-800">
          <CalendarClock aria-hidden="true" size={16} className="text-accent-600" />
          Interview {formatDateTime(app.nextInterview.scheduledAt, app.nextInterview.timeZone)} ({app.nextInterview.timeZone})
        </p>
        <JoinInterviewButton interview={app.nextInterview} size="xs" />
      </div>
    );
  }
  if (app.status === "offer_extended") {
    return (
      <p className="flex items-center gap-2 border-t border-gray-100 bg-accent-50/40 px-5 py-3 text-[13px] text-gray-800">
        <Send aria-hidden="true" size={16} className="text-accent-600" /> You've received an offer. Open the application to read it.
      </p>
    );
  }
  if (app.status === "hired") {
    return (
      <p className="flex items-center gap-2 border-t border-gray-100 bg-success-bg px-5 py-3 text-[13px] text-success">
        <PartyPopper aria-hidden="true" size={16} /> Hire confirmed{app.hireDate && ` on ${formatDate(app.hireDate)}`}.
      </p>
    );
  }
  return null;
}

export default function ApplicationsPage() {
  const query = useQuery(listMyApplications);

  return (
    <div>
      <PageHeader title="My applications" description="Statuses are updated by each employer. CareerBridge records them; it doesn't make hiring decisions." />
      <QueryBoundary query={query} rows={4}>
        {(apps) =>
          apps.length === 0 ? (
            <Card>
              <EmptyState icon={FileText} title="No applications yet" action={<Link to="/candidate/jobs" className={buttonClasses("solid", "", "sm")}>Find jobs</Link>}>
                Once you're eligible for a job, you can apply from its page.
              </EmptyState>
            </Card>
          ) : (
            <ul className="stagger space-y-4">
              {apps.map((app) => (
                <li key={app.id}>
                  <Card bodyClassName="">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                      <div className="min-w-0">
                        <Link to={`/candidate/applications/${app.id}`} className="text-sm font-semibold text-gray-900 hover:underline">
                          {app.job.title}
                        </Link>
                        <p className="text-xs text-gray-600">
                          {app.companyName} · {app.job.location} · applied {formatDate(app.createdAt)}
                        </p>
                      </div>
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                    <div className="px-5 pb-4">
                      <StageTracker status={app.status} history={app.history} compact />
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-gray-600">{CANDIDATE_STAGE_TEXT[app.status]}</p>
                        <Link to={`/candidate/applications/${app.id}`} className={buttonClasses("secondary", "", "xs")}>
                          View details <ArrowRight aria-hidden="true" size={14} />
                        </Link>
                      </div>
                    </div>
                    <Highlight app={app} />
                  </Card>
                </li>
              ))}
            </ul>
          )
        }
      </QueryBoundary>
    </div>
  );
}
