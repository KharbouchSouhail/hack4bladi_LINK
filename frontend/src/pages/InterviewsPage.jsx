import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock, CheckCircle2, Lock, Star } from "lucide-react";
import { buttonClasses } from "../components/Button.jsx";
import { INTERVIEW_TYPE_ICONS, InterviewStatusBadge, JoinInterviewButton } from "../components/recruitment/shared.jsx";
import { StatusBadge } from "../components/ui/Badge.jsx";
import Card, { PageHeader, StatTile } from "../components/ui/Card.jsx";
import DataTable, { Toolbar } from "../components/ui/DataTable.jsx";
import { FilterSelect, SearchInput } from "../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../components/ui/states.jsx";
import { INTERVIEW_TYPES, RECOMMENDATIONS } from "../domain/recruitment.js";
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

// Interviews across the recruiter's applications. `listInterviews` already scopes them to what the role may see.
export default function InterviewsPage({ listInterviews, detailPath, showCompany = false }) {
  const query = useQuery(listInterviews);
  const [view, setView] = useState("upcoming");
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
      render: (i) =>
        i.feedback ? (
          <span className="inline-flex items-center gap-1.5" title="Internal — not visible to the candidate">
            <Lock aria-hidden="true" size={12} className="text-gray-400" />
            <span className="inline-flex items-center gap-0.5 text-xs tabular-nums">
              <Star aria-hidden="true" size={12} className="fill-warning text-warning" /> {i.feedback.rating}/5
            </span>
            <StatusBadge map={RECOMMENDATIONS} value={i.feedback.recommendation} />
          </span>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        ),
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
      <PageHeader title="Interviews" description="Upcoming and past interviews. Open one to reschedule, cancel, complete it or record feedback." />
      <QueryBoundary query={query} rows={6}>
        {(interviews) => {
          const now = Date.now();
          const upcoming = interviews.filter(isUpcoming);
          const rows = interviews
            .filter((i) => view === "all" || (view === "upcoming" ? isUpcoming(i) : !isUpcoming(i)))
            .filter((i) => `${i.candidateName} ${i.jobTitle} ${i.interviewer}`.toLowerCase().includes(search.trim().toLowerCase()));
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
                <DataTable
                  columns={columns}
                  rows={rows}
                  caption="Interviews"
                  initialSort={{ key: "when", dir: view === "upcoming" ? "asc" : "desc" }}
                  key={view}
                  empty={
                    <EmptyState icon={CalendarClock} title={view === "upcoming" ? "No upcoming interviews" : "No interviews here"}>
                      Schedule an interview from a shortlisted candidate's application.
                    </EmptyState>
                  }
                />
              </Card>
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
