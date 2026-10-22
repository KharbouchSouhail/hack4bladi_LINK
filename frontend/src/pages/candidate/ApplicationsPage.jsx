import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarClock, FileText, PartyPopper, SearchX, Send } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import Calendar from "../../components/calendar/Calendar.jsx";
import { ApplicationStatusBadge, JoinInterviewButton, StageTracker } from "../../components/recruitment/shared.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { Toolbar } from "../../components/ui/DataTable.jsx";
import { FilterSelect, SearchInput } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import ViewSwitcher, { CARD_CALENDAR_VIEWS, useViewParam } from "../../components/ui/ViewSwitcher.jsx";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { CANDIDATE_STAGE_TEXT, INTERVIEW_STATUSES, INTERVIEW_TYPES } from "../../domain/recruitment.js";
import { useQuery } from "../../hooks/useQuery.js";
import { parseDateOnly } from "../../lib/calendar.js";
import { formatDate, formatDateTime, formatDuration } from "../../lib/format.js";
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

const STATUS_FILTERS = [{ value: "all", label: "All statuses" }, ...Object.entries(APPLICATION_STATUSES).map(([value, { label }]) => ({ value, label }))];

const INTERVIEW_TONES = { scheduled: "accent", completed: "success", cancelled: "error" };

const LEGEND = [
  { tone: "neutral", label: "Application sent" },
  { tone: "accent", label: "Interview" },
  { tone: "success", label: "Completed interview" },
  { tone: "error", label: "Cancelled interview" },
  { tone: "cyan", label: "Start or hire date" },
];

// Only dates the application actually records: when it was sent, its interviews, a pending offer's
// proposed start date and a confirmed hire date. Nothing is inferred from other timestamps.
function applicationEvents(apps) {
  return apps.flatMap((app) => {
    const to = `/candidate/applications/${app.id}`;
    const base = { title: app.companyName, subtitle: app.job.title, to };
    const status = APPLICATION_STATUSES[app.status].label;
    const events = [{ ...base, id: `${app.id}-applied`, start: new Date(app.createdAt), allDay: true, kind: "Application sent", tone: "neutral", details: [`Status: ${status}`] }];
    for (const i of app.interviews) {
      events.push({
        ...base,
        id: i.id,
        start: new Date(i.scheduledAt),
        kind: `${INTERVIEW_TYPES[i.type]?.label ?? "Interview"} interview`,
        tone: INTERVIEW_TONES[i.status] ?? "accent",
        muted: i.status === "cancelled",
        details: [`${formatDateTime(i.scheduledAt, i.timeZone)} (${i.timeZone})`, formatDuration(i.durationMinutes), INTERVIEW_STATUSES[i.status]?.label].filter(Boolean),
        actions: i.status === "scheduled" ? <JoinInterviewButton interview={i} size="xs" /> : null,
      });
    }
    if (app.offer?.status === "extended" && app.offer.startDate) {
      events.push({ ...base, id: `${app.id}-start`, start: parseDateOnly(app.offer.startDate), allDay: true, kind: "Proposed start date", tone: "cyan", details: ["From the offer you received"] });
    }
    if (app.hireDate) {
      events.push({ ...base, id: `${app.id}-hire`, start: parseDateOnly(app.hireDate), allDay: true, kind: "Hire date", tone: "cyan", details: [status] });
    }
    return events;
  });
}

export default function ApplicationsPage() {
  const query = useQuery(listMyApplications);
  const [view, setView] = useViewParam();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  return (
    <div>
      <PageHeader
        title="My applications"
        description="Statuses are updated by each employer. CareerBridge records them; it doesn't make hiring decisions."
        actions={<ViewSwitcher label="Applications view" options={CARD_CALENDAR_VIEWS} value={view} onChange={setView} />}
      />
      <QueryBoundary query={query} rows={4}>
        {(all) => {
          if (all.length === 0) {
            return (
              <Card>
                <EmptyState icon={FileText} title="No applications yet" action={<Link to="/candidate/jobs" className={buttonClasses("solid", "", "sm")}>Find jobs</Link>}>
                  Once you're eligible for a job, you can apply from its page.
                </EmptyState>
              </Card>
            );
          }
          const term = search.trim().toLowerCase();
          const apps = all.filter((a) => (status === "all" || a.status === status) && `${a.job.title} ${a.companyName} ${a.job.location}`.toLowerCase().includes(term));
          const filters = (
            <>
              <SearchInput label="Search applications" placeholder="Job, company or location" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
              <FilterSelect label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={STATUS_FILTERS} />
              {apps.length !== all.length && <span className="text-xs text-gray-500">{apps.length} of {all.length} shown</span>}
            </>
          );

          if (view === "calendar") {
            return (
              <Card bodyClassName="" className="animate-enter">
                <Toolbar>{filters}</Toolbar>
                <Calendar
                  label="Applications calendar"
                  events={applicationEvents(apps)}
                  legend={LEGEND}
                  emptyMessage={apps.length === 0 ? "No applications match these filters." : "No dated events yet."}
                />
              </Card>
            );
          }

          return (
            <div className="animate-enter space-y-4">
              <div className="flex flex-wrap items-center gap-2">{filters}</div>
              {apps.length === 0 ? (
                <Card>
                  <EmptyState icon={SearchX} title="No matching applications">
                    Try another search or status.
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
              )}
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
