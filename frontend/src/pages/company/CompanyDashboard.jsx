import { Link } from "react-router-dom";
import { AlertCircle, BadgeCheck, Briefcase, CalendarClock, Inbox, Plus, Star, Users } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import { CompanyMark, EligibilityBadge } from "../../components/candidate/shared.jsx";
import { JoinInterviewButton } from "../../components/recruitment/shared.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { StatTile } from "../../components/ui/Card.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import { BarList } from "../../components/ui/Progress.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { APPLICATION_STATUSES, PARTNER_STATUSES } from "../../domain/constants.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDate, formatDateTime, formatRelative } from "../../lib/format.js";
import { getOverview } from "../../services/companyApi.js";

const RECENT_COLUMNS = [
  {
    key: "candidate",
    header: "Candidate",
    render: (r) => (
      <Link to={`/company/candidates/${r.id}`} className="font-medium text-gray-900 hover:underline">
        {r.candidate.name}
      </Link>
    ),
  },
  { key: "job", header: "Position", render: (r) => r.job.title },
  { key: "eligibility", header: "Requirements", render: (r) => <EligibilityBadge status={r.eligibility} /> },
  { key: "date", header: "Applied", render: (r) => formatDate(r.createdAt) },
  { key: "status", header: "Status", render: (r) => <StatusBadge map={APPLICATION_STATUSES} value={r.status} /> },
];

export default function CompanyDashboard() {
  const query = useQuery(getOverview);

  return (
    <QueryBoundary query={query} rows={8}>
      {({ company, stats, statusCounts, attention, recent, upcomingInterviews }) => (
        <div className="space-y-6">
          <section className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <CompanyMark name={company.name} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                    <span className="mask-line">
                      <span className="block animate-rise">{company.name}</span>
                    </span>
                  </h1>
                  <StatusBadge map={PARTNER_STATUSES} value={company.partnerStatus} />
                </div>
                <p className="text-sm text-gray-600">{[company.sector, company.city].filter(Boolean).join(" · ") || "Complete your company profile"}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to="/company/candidates" className={buttonClasses("secondary", "", "sm")}>Review applications</Link>
              <Link to="/company/jobs?new=1" className={buttonClasses("solid", "", "sm")}>
                <Plus aria-hidden="true" size={16} /> Create job listing
              </Link>
            </div>
          </section>

          <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile label="Active job listings" value={stats.publishedJobs} hint={`${stats.draftJobs} in draft`} icon={Briefcase} />
            <StatTile label="Total applications" value={stats.totalApplications} hint={`${stats.awaitingReview} awaiting review`} icon={Inbox} />
            <StatTile label="Meeting job requirements" value={stats.meetingCriteria} hint="Based on configured eligibility rules" icon={BadgeCheck} />
            <StatTile label="Shortlisted or interviewing" value={stats.shortlisted} hint={`${stats.offers} offers out · ${stats.hired} hired`} icon={Star} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Card data-reveal="left" title="Hiring pipeline" description="Applications by status, across all your listings.">
              <BarList
                items={statusCounts.map((s) => ({ key: s.status, label: APPLICATION_STATUSES[s.status].label, value: s.count }))}
                total={Math.max(1, stats.totalApplications)}
              />
            </Card>
            <Card data-reveal="right" title="Needs attention" description="Published listings with applications to review or none yet." bodyClassName="">
              {attention.length === 0 ? (
                <EmptyState icon={BadgeCheck} title="Nothing waiting">Every application has been reviewed.</EmptyState>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {attention.map((j) => (
                    <li key={j.id} className="flex items-center justify-between gap-3 px-5 py-3">
                      <div className="flex min-w-0 items-start gap-2.5">
                        <AlertCircle aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-warning" />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-medium text-gray-900">{j.title}</p>
                          <p className="text-xs text-gray-500">
                            {j.total === 0 ? "No applications yet" : `${j.awaiting} of ${j.total} awaiting review`}
                          </p>
                        </div>
                      </div>
                      <Link to={`/company/candidates?job=${j.id}`} className={buttonClasses("secondary", "", "xs")}>
                        {j.total === 0 ? "View" : "Review"}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card
            data-reveal="up"
            title="Upcoming interviews"
            description="Times shown in each interview's own time zone."
            action={<Link to="/company/interviews" className={buttonClasses("secondary", "", "xs")}>All interviews</Link>}
            bodyClassName=""
          >
            {upcomingInterviews.length === 0 ? (
              <EmptyState icon={CalendarClock} title="No interviews scheduled">
                Shortlist a candidate, then schedule an interview from their page.
              </EmptyState>
            ) : (
              <ul className="divide-y divide-gray-100">
                {upcomingInterviews.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <CalendarClock aria-hidden="true" size={16} className="mt-0.5 shrink-0 text-accent-600" />
                      <div className="min-w-0">
                        <Link to={`/company/candidates/${i.applicationId}`} className="text-[13px] font-medium text-gray-900 hover:underline">
                          {i.candidateName} · {i.jobTitle}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(i.scheduledAt, i.timeZone)} ({i.timeZone}) · {formatRelative(i.scheduledAt)} · {i.interviewer}
                        </p>
                      </div>
                    </div>
                    <JoinInterviewButton interview={i} size="xs" />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card
            data-reveal="up"
            title="Recent applications"
            action={<Link to="/company/candidates" className={buttonClasses("secondary", "", "xs")}>Open pipeline</Link>}
            bodyClassName=""
          >
            <DataTable
              columns={RECENT_COLUMNS}
              rows={recent}
              caption="Recent applications"
              empty={<EmptyState icon={Users} title="No applications yet">Publish a job listing so eligible candidates can apply.</EmptyState>}
            />
          </Card>
        </div>
      )}
    </QueryBoundary>
  );
}
