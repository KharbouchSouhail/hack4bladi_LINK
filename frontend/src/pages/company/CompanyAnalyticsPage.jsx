import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Briefcase, CalendarCheck, CalendarClock, Inbox, PieChart as PieChartIcon, Users } from "lucide-react";
import { INTERVIEW_TYPE_ICONS } from "../../components/recruitment/shared.jsx";
import { APPLICATION_STATUS_COLORS, OTHER_STATUS_COLOR } from "../../components/recruitment/statusColors.js";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { KpiCard, PageHeader } from "../../components/ui/Card.jsx";
import ColumnChart, { periodItems } from "../../components/ui/ColumnChart.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PieChart from "../../components/ui/PieChart.jsx";
import { BarList } from "../../components/ui/Progress.jsx";
import { EmptyState, ErrorState } from "../../components/ui/states.jsx";
import ViewSwitcher from "../../components/ui/ViewSwitcher.jsx";
import { ANALYTICS_RANGES } from "../../domain/analytics.js";
import { APPLICATION_STATUSES, PUBLISH_STATUSES } from "../../domain/constants.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDateTime, formatRelative } from "../../lib/format.js";
import { getAnalytics } from "../../services/companyApi.js";

const RANGE_OPTIONS = Object.entries(ANALYTICS_RANGES).map(([value, { label }]) => ({ value, label }));

function percent(part, whole) {
  return whole ? `${Math.round((100 * part) / whole)}%` : "—";
}

// Same dataset as the KPIs: one entry per known status, plus "Other" if any application has a status
// the UI doesn't know, so the chart total always equals the applications received in the range.
function statusItems(a) {
  const items = a.perStatus.map((s) => ({
    key: s.status,
    label: APPLICATION_STATUSES[s.status].label,
    value: s.count,
    color: APPLICATION_STATUS_COLORS[s.status],
    to: `/company/candidates?status=${s.status}`,
  }));
  const other = a.totalApplicants - items.reduce((sum, i) => sum + i.value, 0);
  if (other > 0) items.push({ key: "other", label: "Other", value: other, color: OTHER_STATUS_COLOR });
  return items;
}

function UpcomingInterviews({ interviews }) {
  if (interviews.length === 0) {
    return (
      <EmptyState icon={CalendarClock} title="No upcoming interviews">
        Schedule one from a shortlisted candidate's application.
      </EmptyState>
    );
  }
  return (
    <ul className="divide-y divide-gray-100">
      {interviews.map((i) => {
        const Icon = INTERVIEW_TYPE_ICONS[i.type];
        return (
          <li key={i.id}>
            <Link
              to={`/company/candidates/${i.applicationId}`}
              className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 ease-standard hover:bg-gray-25 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-500"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-gray-50 text-gray-500">
                <Icon aria-hidden="true" size={16} strokeWidth={1.8} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-semibold text-gray-900">{i.candidateName}</span>
                <span className="block truncate text-xs text-gray-500">{i.jobTitle}</span>
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-xs font-medium text-gray-800">{formatRelative(i.scheduledAt)}</span>
                <span className="block text-[11px] text-gray-500">{formatDateTime(i.scheduledAt, i.timeZone)}</span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const LISTING_COLUMNS = [
  {
    key: "title",
    header: "Listing",
    sortValue: (j) => j.title.toLowerCase(),
    render: (j) => (
      <div className="flex min-w-[200px] items-center gap-2">
        <span className="truncate font-medium text-gray-900">{j.title}</span>
        <StatusBadge map={PUBLISH_STATUSES} value={j.status} />
      </div>
    ),
  },
  { key: "count", header: "Applications", align: "right", sortValue: (j) => j.count, render: (j) => j.count },
  { key: "active", header: "Active", align: "right", sortValue: (j) => j.active, render: (j) => j.active },
  { key: "interviewed", header: "Reached interview", align: "right", sortValue: (j) => j.interviewed, render: (j) => j.interviewed },
  { key: "hired", header: "Hired", align: "right", sortValue: (j) => j.hired, render: (j) => j.hired },
  { key: "rate", header: "Interview rate", align: "right", sortValue: (j) => (j.count ? j.interviewed / j.count : -1), render: (j) => percent(j.interviewed, j.count) },
];

function AnalyticsSkeleton() {
  const block = "animate-pulse rounded-lg border border-gray-200 bg-white";
  return (
    <div role="status" aria-label="Loading analytics" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className={`${block} h-[118px]`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className={`${block} h-80 lg:col-span-2`} />
        <div className={`${block} h-80`} />
      </div>
    </div>
  );
}

function Dashboard({ a }) {
  const k = a.kpis;
  const period = a.range === "all" ? "all time" : `the last ${ANALYTICS_RANGES[a.range].label}`;
  const applied = a.funnel[0]?.count ?? 0;

  return (
    <div className="space-y-6">
      <div className="stagger grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Applications received" value={k.totalApplicants} hint={`Over ${period}`} icon={Inbox} />
        <KpiCard label="Active in pipeline" value={k.active} hint="Not yet hired or rejected" icon={Users} />
        <KpiCard label="Interview rate" value={percent(k.reachedInterview, k.totalApplicants)} hint={`${k.reachedInterview} of ${k.totalApplicants} reached interview`} icon={CalendarCheck} />
        <KpiCard label="Hired" value={k.hired} hint={k.totalApplicants ? `${percent(k.hired, k.totalApplicants)} of applications` : "No applications yet"} icon={BadgeCheck} />
        <KpiCard label="Open positions" value={k.openPositions} hint={`Published now · ${k.draftPositions} draft${k.draftPositions === 1 ? "" : "s"}`} icon={Briefcase} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card title="Applications received" description={`Per ${a.timeline.unit}, over ${period}.`} className="lg:col-span-3">
          {k.totalApplicants === 0 ? (
            <EmptyState icon={Inbox} title="No applications in this period">
              Try a longer date range.
            </EmptyState>
          ) : (
            <ColumnChart items={periodItems(a.timeline)} caption={`Applications received per ${a.timeline.unit}`} />
          )}
        </Card>
        <Card title="Applications by status" description={`Current status of applications received over ${period}.`} className="lg:col-span-2">
          {a.totalApplicants === 0 ? (
            <EmptyState icon={PieChartIcon} title="No applications in this period">
              Try a longer date range.
            </EmptyState>
          ) : (
            <PieChart key={a.range} items={statusItems(a)} label="Applications by status" />
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card title="Hiring funnel" description="How far applications from this period progressed, rejected ones included at the stage they reached." className="lg:col-span-2">
          <BarList
            items={a.funnel.map((s) => ({ key: s.status, label: APPLICATION_STATUSES[s.status].label, value: s.count, display: `${s.count} · ${percent(s.count, applied)}` }))}
            total={Math.max(1, applied)}
          />
        </Card>
        <Card
          title="Upcoming interviews"
          description="All listings, soonest first."
          bodyClassName=""
          action={
            <Link to="/company/interviews?view=calendar" className="inline-flex items-center gap-1 rounded-xs text-xs font-semibold text-accent-600 hover:underline focus-visible:outline-2 focus-visible:outline-accent-500">
              Calendar <ArrowRight aria-hidden="true" size={13} />
            </Link>
          }
        >
          <UpcomingInterviews interviews={a.upcomingInterviews} />
        </Card>
      </div>

      <Card title="Listings performance" description={`Applications received over ${period}, per listing.`} bodyClassName="">
        <DataTable
          columns={LISTING_COLUMNS}
          rows={a.perJob}
          caption="Listings performance"
          initialSort={{ key: "count", dir: "desc" }}
          empty={<EmptyState icon={Briefcase} title="No listings yet">Publish a job to start receiving applications.</EmptyState>}
        />
      </Card>

      <Card title="Required skill tests passed by applicants" description={`Among the ${a.sharingCount} of ${a.totalApplicants} applicants who shared their test results.`}>
        <BarList
          items={a.skillValidation.map((s) => ({
            key: s.skillId,
            label: s.name,
            value: s.passed,
            display: `${s.passed} of ${s.total}`,
          }))}
          total={Math.max(1, a.sharingCount)}
          emptyLabel="None of your listings require a skill test yet."
        />
      </Card>
    </div>
  );
}

export default function CompanyAnalyticsPage() {
  const [range, setRange] = useState("all");
  const query = useQuery(() => getAnalytics({ range }), [range]);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Calculated live from your listings and applications."
        actions={<ViewSwitcher label="Date range" options={RANGE_OPTIONS} value={range} onChange={setRange} />}
      />
      {query.error ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : !query.data ? (
        <AnalyticsSkeleton />
      ) : (
        // While a new range loads, the previous figures stay in place, dimmed, instead of flashing a skeleton.
        <div aria-busy={query.loading} className={`animate-fade-in transition-opacity duration-200 ease-standard ${query.loading ? "opacity-60" : ""}`}>
          <Dashboard a={query.data} />
        </div>
      )}
    </div>
  );
}
