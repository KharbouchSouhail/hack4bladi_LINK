import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Clock, Lock, Star, Table2, UserRound } from "lucide-react";
import { buttonClasses } from "../components/Button.jsx";
import Calendar from "../components/calendar/Calendar.jsx";
import { INTERVIEW_TYPE_ICONS, InterviewStatusBadge, JoinInterviewButton } from "../components/recruitment/shared.jsx";
import { StatusBadge } from "../components/ui/Badge.jsx";
import Card, { PageHeader, StatTile } from "../components/ui/Card.jsx";
import DataTable, { Toolbar } from "../components/ui/DataTable.jsx";
import { FilterSelect, SearchInput } from "../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../components/ui/states.jsx";
import ViewSwitcher, { CARD_CALENDAR_VIEWS, useViewParam } from "../components/ui/ViewSwitcher.jsx";
import { INTERVIEW_STATUSES, INTERVIEW_TYPES, RECOMMENDATIONS } from "../domain/recruitment.js";
import { useQuery } from "../hooks/useQuery.js";
import { formatDateTime, formatDuration, formatRelative } from "../lib/format.js";

const VIEWS = [
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past and cancelled" },
  { value: "all", label: "All interviews" },
];

function isUpcoming(i) {
  return i.status === "scheduled";
}

// The table stays available next to the cards and the calendar.
const LAYOUTS = [CARD_CALENDAR_VIEWS[0], { value: "table", label: "Table", icon: Table2 }, CARD_CALENDAR_VIEWS[1]];

const LEGEND = [
  { tone: "accent", label: "Scheduled" },
  { tone: "warning", label: "Rescheduled" },
  { tone: "success", label: "Completed" },
  { tone: "error", label: "Cancelled" },
];

// Same tones as <InterviewStatusBadge>, so the calendar and the table read alike.
function interviewTone(i) {
  if (i.status === "scheduled" && i.rescheduleCount > 0) return "warning";
  return INTERVIEW_STATUSES[i.status]?.tone ?? "neutral";
}

function Feedback({ interview: i }) {
  if (!i.feedback) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className="inline-flex items-center gap-1.5" title="Internal — not visible to the candidate">
      <Lock aria-hidden="true" size={12} className="text-gray-400" />
      <span className="inline-flex items-center gap-0.5 text-xs tabular-nums">
        <Star aria-hidden="true" size={12} className="fill-warning text-warning" /> {i.feedback.rating}/5
      </span>
      <StatusBadge map={RECOMMENDATIONS} value={i.feedback.recommendation} />
    </span>
  );
}

function InterviewCard({ interview: i, detailPath, showCompany }) {
  const Icon = INTERVIEW_TYPE_ICONS[i.type];
  return (
    <li className="flex flex-col rounded-lg border border-gray-200 bg-white shadow-subtle transition-colors duration-200 ease-standard hover:border-accent-200">
      <div className="flex items-start justify-between gap-3 px-4 pt-4">
        <div className="min-w-0">
          <Link to={`${detailPath}/${i.applicationId}`} className="block truncate text-sm font-semibold text-gray-900 hover:underline">
            {i.candidateName}
          </Link>
          <p className="truncate text-xs text-gray-500">
            {i.jobTitle}
            {showCompany && ` · ${i.companyName}`}
          </p>
        </div>
        <InterviewStatusBadge interview={i} />
      </div>
      <dl className="mt-3 flex-1 space-y-1.5 px-4 pb-4 text-xs text-gray-700">
        <div className="flex items-start gap-2">
          <dt className="shrink-0">
            <CalendarClock aria-hidden="true" size={14} className="mt-px shrink-0 text-accent-600" />
            <span className="sr-only">When</span>
          </dt>
          <dd>
            <span className="font-medium text-gray-900">{formatDateTime(i.scheduledAt, i.timeZone)}</span>
            <span className="text-gray-500">
              {" "}
              ({i.timeZone}){isUpcoming(i) && ` · ${formatRelative(i.scheduledAt)}`}
            </span>
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="shrink-0">
            <Icon aria-hidden="true" size={14} className="shrink-0 text-gray-400" />
            <span className="sr-only">Format</span>
          </dt>
          <dd>
            {INTERVIEW_TYPES[i.type].label} <span className="text-gray-400">·</span> <Clock aria-hidden="true" size={12} className="-mt-px inline text-gray-400" /> {formatDuration(i.durationMinutes)}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="shrink-0">
            <UserRound aria-hidden="true" size={14} className="shrink-0 text-gray-400" />
            <span className="sr-only">Interviewer</span>
          </dt>
          <dd className="truncate">{i.interviewer}</dd>
        </div>
        {(i.feedback || (i.candidateConfirmedAt && isUpcoming(i))) && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <dt className="sr-only">Feedback</dt>
            <dd className="flex flex-wrap items-center gap-2">
              {i.feedback && <Feedback interview={i} />}
              {i.candidateConfirmedAt && isUpcoming(i) && (
                <span className="inline-flex items-center gap-1 text-[11px] text-success">
                  <CheckCircle2 aria-hidden="true" size={12} /> Candidate confirmed
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>
      <div className="flex justify-end gap-1.5 border-t border-gray-100 px-4 py-2.5">
        <JoinInterviewButton interview={i} size="xs" />
        <Link to={`${detailPath}/${i.applicationId}`} className={buttonClasses("secondary", "", "xs")}>
          Open
        </Link>
      </div>
    </li>
  );
}

function interviewEvents(interviews, detailPath, showCompany) {
  return interviews.map((i) => ({
    id: i.id,
    start: new Date(i.scheduledAt),
    title: i.candidateName,
    subtitle: showCompany ? `${i.jobTitle} · ${i.companyName}` : i.jobTitle,
    kind: INTERVIEW_TYPES[i.type]?.label ?? "Interview",
    tone: interviewTone(i),
    muted: i.status === "cancelled",
    to: `${detailPath}/${i.applicationId}`,
    details: [
      `${formatDateTime(i.scheduledAt, i.timeZone)} (${i.timeZone})`,
      formatDuration(i.durationMinutes),
      i.interviewer && `With ${i.interviewer}`,
      i.rescheduleCount > 0 && i.status === "scheduled" ? "Rescheduled" : INTERVIEW_STATUSES[i.status]?.label,
    ].filter(Boolean),
    actions: <JoinInterviewButton interview={i} size="xs" />,
  }));
}

// Interviews across the recruiter's applications. `listInterviews` already scopes them to what the role may see.
export default function InterviewsPage({ listInterviews, detailPath, showCompany = false }) {
  const query = useQuery(listInterviews);
  const [view, setView] = useState("upcoming");
  const [layout, setLayout] = useViewParam("cards", LAYOUTS.map((l) => l.value));
  const [search, setSearch] = useState("");

  const columns = [
    {
      key: "when",
      header: "When",
      sortValue: (i) => i.scheduledAt,
      render: (i) => (
        <div className="min-w-[170px]">
          <p className="font-medium text-gray-900">{formatDateTime(i.scheduledAt, i.timeZone)}</p>
          <p className="text-xs text-gray-500">
            {i.timeZone} · {formatDuration(i.durationMinutes)}
            {isUpcoming(i) && ` · ${formatRelative(i.scheduledAt)}`}
          </p>
        </div>
      ),
    },
    {
      key: "candidate",
      header: "Candidate",
      sortValue: (i) => i.candidateName,
      render: (i) => (
        <div className="min-w-[150px]">
          <p className="font-medium text-gray-900">{i.candidateName}</p>
          <p className="text-xs text-gray-500">
            {i.jobTitle}
            {showCompany && ` · ${i.companyName}`}
          </p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (i) => {
        const Icon = INTERVIEW_TYPE_ICONS[i.type];
        return (
          <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
            <Icon aria-hidden="true" size={14} className="text-gray-400" /> {INTERVIEW_TYPES[i.type].label}
          </span>
        );
      },
    },
    { key: "interviewer", header: "Interviewer", render: (i) => <span className="text-xs">{i.interviewer}</span> },
    {
      key: "status",
      header: "Status",
      sortValue: (i) => i.status,
      render: (i) => (
        <div className="flex flex-col items-start gap-1">
          <InterviewStatusBadge interview={i} />
          {i.candidateConfirmedAt && isUpcoming(i) && (
            <span className="inline-flex items-center gap-1 text-[11px] text-success">
              <CheckCircle2 aria-hidden="true" size={12} /> Confirmed
            </span>
          )}
        </div>
      ),
    },
    {
      key: "feedback",
      header: "Feedback",
      render: (i) => <Feedback interview={i} />,
    },
    {
      key: "action",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (i) => (
        <div className="flex justify-end gap-1.5">
          <JoinInterviewButton interview={i} size="xs" />
          <Link to={`${detailPath}/${i.applicationId}`} className={buttonClasses("secondary", "", "xs")}>
            Open
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Interviews"
        description="Upcoming and past interviews. Open one to reschedule, cancel, complete it or record feedback."
        actions={<ViewSwitcher label="Interviews view" options={LAYOUTS} value={layout} onChange={setLayout} hideLabels />}
      />
      <QueryBoundary query={query} rows={6}>
        {(interviews) => {
          const now = Date.now();
          const upcoming = interviews.filter(isUpcoming);
          const rows = interviews
            .filter((i) => view === "all" || (view === "upcoming" ? isUpcoming(i) : !isUpcoming(i)))
            .filter((i) => `${i.candidateName} ${i.jobTitle} ${i.interviewer}`.toLowerCase().includes(search.trim().toLowerCase()));
          const emptyState = (
            <EmptyState icon={CalendarClock} title={view === "upcoming" ? "No upcoming interviews" : "No interviews here"}>
              Schedule an interview from a shortlisted candidate's application.
            </EmptyState>
          );
          return (
            <div className="space-y-6">
              <div className="stagger grid gap-4 sm:grid-cols-3">
                <StatTile label="Upcoming" value={upcoming.length} hint={`${upcoming.filter((i) => new Date(i.scheduledAt) - now < 7 * 86400000).length} in the next 7 days`} icon={CalendarClock} />
                <StatTile label="Completed" value={interviews.filter((i) => i.status === "completed").length} hint={`${interviews.filter((i) => i.feedback).length} with feedback`} icon={CheckCircle2} />
                <StatTile label="Awaiting feedback" value={upcoming.filter((i) => new Date(i.scheduledAt) <= now).length} hint="Started but not marked completed" icon={Star} />
              </div>
              <Card bodyClassName="">
                <Toolbar>
                  <SearchInput label="Search interviews" placeholder="Candidate, job or interviewer" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
                  <FilterSelect label="Show" value={view} onChange={(e) => setView(e.target.value)} options={VIEWS} />
                </Toolbar>
                {layout === "calendar" ? (
                  <Calendar
                    label="Interviews calendar"
                    events={interviewEvents(rows, detailPath, showCompany)}
                    legend={LEGEND}
                    emptyMessage={interviews.length === 0 ? "No interviews scheduled yet. Schedule one from a shortlisted candidate's application." : "No interviews match these filters."}
                  />
                ) : layout === "cards" ? (
                  rows.length === 0 ? (
                    emptyState
                  ) : (
                    <ul className="stagger grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                      {[...rows]
                        .sort((a, b) => (view === "upcoming" ? 1 : -1) * a.scheduledAt.localeCompare(b.scheduledAt))
                        .map((i) => (
                          <InterviewCard key={i.id} interview={i} detailPath={detailPath} showCompany={showCompany} />
                        ))}
                    </ul>
                  )
                ) : (
                  <DataTable
                    columns={columns}
                    rows={rows}
                    caption="Interviews"
                    initialSort={{ key: "when", dir: view === "upcoming" ? "asc" : "desc" }}
                    key={view}
                    empty={emptyState}
                  />
                )}
              </Card>
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
