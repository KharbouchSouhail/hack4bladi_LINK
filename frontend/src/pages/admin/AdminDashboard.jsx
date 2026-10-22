import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Handshake,
  Inbox,
  ListChecks,
  PieChart as PieChartIcon,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import { APPLICATION_STATUS_COLORS } from "../../components/recruitment/statusColors.js";
import Card, { KpiCard, PageHeader } from "../../components/ui/Card.jsx";
import ColumnChart, { periodItems } from "../../components/ui/ColumnChart.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import PieChart from "../../components/ui/PieChart.jsx";
import { BarList, ProgressBar } from "../../components/ui/Progress.jsx";
import { EmptyState, ErrorState } from "../../components/ui/states.jsx";
import ViewSwitcher from "../../components/ui/ViewSwitcher.jsx";
import { ANALYTICS_RANGES } from "../../domain/analytics.js";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { PLANS } from "../../domain/permissions.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDateTime, formatRelative, plural } from "../../lib/format.js";
import { getOverview } from "../../services/adminApi.js";

const RANGE_OPTIONS = Object.entries(ANALYTICS_RANGES).map(([value, { label }]) => ({ value, label }));

// The activity chart shows one series at a time, so each keeps a readable scale.
const SERIES = [
  { value: "applications", label: "Applications", unit: "applications", empty: "No applications in this period." },
  { value: "attempts", label: "Test attempts", unit: "attempts", empty: "No skill tests taken in this period." },
  { value: "jobs", label: "New listings", unit: "listings", empty: "No job listings created in this period." },
];

const ACTIVITY_COLUMNS = [
  {
    key: "text",
    header: "Event",
    render: (a) => (
      <span className="flex items-start gap-2.5">
        <span aria-hidden="true" className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
        <span className="text-gray-800">{a.text}</span>
      </span>
    ),
  },
  {
    key: "at",
    header: "When",
    align: "right",
    sortValue: (a) => a.at,
    render: (a) => (
      <span className="block min-w-[120px] whitespace-nowrap">
        <span className="block text-xs text-gray-800">{formatRelative(a.at)}</span>
        <span className="block text-[11px] text-gray-500">{formatDateTime(a.at)}</span>
      </span>
    ),
  },
];

function percent(part, whole) {
  return whole ? Math.round((100 * part) / whole) : null;
}

// A labelled count that links to the page where it can be acted on.
function LinkRow({ to, icon: Icon, label, value, tone = "text-gray-400" }) {
  return (
    <li>
      <Link
        to={to}
        className="group flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors duration-150 ease-standard hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-accent-500"
      >
        <Icon aria-hidden="true" size={16} strokeWidth={1.9} className={`shrink-0 ${tone}`} />
        <span className="min-w-0 flex-1 truncate text-[13px] text-gray-700">{label}</span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">{value}</span>
        <ArrowUpRight aria-hidden="true" size={14} className="shrink-0 text-gray-300 transition-colors duration-150 group-hover:text-accent-600" />
      </Link>
    </li>
  );
}

function ActivityChart({ timeline, period }) {
  const [series, setSeries] = useState("applications");
  const current = SERIES.find((s) => s.value === series);
  const data = timeline[series];
  const total = data.buckets.reduce((sum, b) => sum + b.count, 0);

  return (
    <Card
      title="Platform activity"
      description={`${current.label} per ${data.unit}, over ${period}.`}
      action={<ViewSwitcher label="Activity series" options={SERIES} value={series} onChange={setSeries} />}
      className="lg:col-span-8"
    >
      <p className="mb-4 flex items-baseline gap-2">
        <span className="text-[28px] leading-none font-semibold tracking-tight text-gray-900 tabular-nums">{total}</span>
        <span className="text-xs text-gray-500">{current.unit} in total</span>
      </p>
      {total === 0 ? (
        <EmptyState icon={Activity} title="Nothing to chart">
          {current.empty}
        </EmptyState>
      ) : (
        <ColumnChart key={series} items={periodItems(data)} unit={current.unit} caption={`${current.label} per ${data.unit}`} height={220} />
      )}
    </Card>
  );
}

function DashboardSkeleton() {
  const block = "animate-pulse rounded-lg border border-gray-200 bg-white";
  return (
    <div role="status" aria-label="Loading overview" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className={`${block} h-[118px]`} />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className={`${block} h-96 lg:col-span-8`} />
        <div className={`${block} h-96 lg:col-span-4`} />
      </div>
    </div>
  );
}

function Overview({ data }) {
  const { metrics: m, timeline, pending, perStatus, perPlan, activity } = data;
  const period = data.range === "all" ? "all time" : `the last ${ANALYTICS_RANGES[data.range].label}`;
  const passRate = percent(m.passedAttempts, m.attempts);
  const statusItems = perStatus.map((s) => ({
    key: s.status,
    label: APPLICATION_STATUSES[s.status].label,
    value: s.count,
    color: APPLICATION_STATUS_COLORS[s.status],
    to: `/admin/applications?status=${s.status}`,
  }));

  return (
    <div className="space-y-6">
      <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Candidates" value={m.candidates} hint="Registered accounts" icon={Users} to="/admin/candidates" />
        <KpiCard label="Companies" value={m.companies} hint={`${m.activeCompanies} active`} icon={Building2} to="/admin/companies" />
        <KpiCard label="Active job listings" value={m.activeJobs} hint={`${m.newJobs} created over ${period}`} icon={Briefcase} to="/admin/jobs" />
        <KpiCard label="Applications" value={m.applications} hint={`Submitted over ${period}`} icon={FileText} to="/admin/applications" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ActivityChart timeline={timeline} period={period} />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
          <Card title="Skill test pass rate" description={`Attempts over ${period}.`}>
            <p className="text-[28px] leading-none font-semibold tracking-tight text-gray-900 tabular-nums">{passRate === null ? "—" : `${passRate}%`}</p>
            <ProgressBar value={passRate ?? 0} label="Skill test pass rate" className="mt-4" />
            <p className="mt-2 text-xs text-gray-500">{m.attempts ? `${m.passedAttempts} of ${m.attempts} attempts passed` : "No attempts in this period"}</p>
          </Card>
          <Card
            title="Placements"
            description={`Hires confirmed over ${period}.`}
            action={
              <Link to="/admin/placements" aria-label="Open placements" className={buttonClasses("secondary", "", "xs")}>
                <ArrowUpRight aria-hidden="true" size={14} />
              </Link>
            }
          >
            <p className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-success-bg text-success">
                <Handshake aria-hidden="true" size={18} strokeWidth={1.9} />
              </span>
              <span className="text-[28px] leading-none font-semibold tracking-tight text-gray-900 tabular-nums">{m.placements}</span>
            </p>
            <p className="mt-3 text-xs text-gray-500">{plural(m.upcomingInterviews, "interview")} scheduled across the platform</p>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card title="Applications by status" description={`Current status of applications submitted over ${period}.`} className="lg:col-span-7">
          {m.applications === 0 ? (
            <EmptyState icon={PieChartIcon} title="No applications in this period">
              Try a longer date range.
            </EmptyState>
          ) : (
            <PieChart key={data.range} items={statusItems} label="Applications by status" size={184} />
          )}
        </Card>
        <Card title="Needs attention" description="Open items across all companies, today." className="lg:col-span-5" bodyClassName="p-3">
          <ul className="space-y-0.5">
            <LinkRow to="/admin/applications?status=submitted" icon={Inbox} label="Applications awaiting review" value={pending.awaitingReview} tone="text-accent-600" />
            <LinkRow to="/admin/interviews" icon={CalendarClock} label="Upcoming interviews" value={pending.upcomingInterviews} tone="text-accent-600" />
            <LinkRow
              to="/admin/interviews"
              icon={AlertCircle}
              label="Interviews past their time, not completed"
              value={pending.overdueInterviews}
              tone={pending.overdueInterviews ? "text-warning" : "text-gray-400"}
            />
            <LinkRow to="/admin/applications?status=offer_extended" icon={Send} label="Offers awaiting a hire decision" value={pending.offersOpen} tone="text-accent-600" />
            <LinkRow
              to="/admin/companies"
              icon={Building2}
              label="Inactive companies"
              value={pending.inactiveCompanies}
              tone={pending.inactiveCompanies ? "text-warning" : "text-gray-400"}
            />
          </ul>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <Card title="Recent activity" description={`Platform events over ${period}.`} className="lg:col-span-8" bodyClassName="">
          <DataTable
            columns={ACTIVITY_COLUMNS}
            rows={activity}
            caption="Recent activity"
            pageSize={6}
            initialSort={{ key: "at", dir: "desc" }}
            empty={
              <EmptyState icon={Activity} title="No activity in this period">
                Try a longer date range.
              </EmptyState>
            }
          />
        </Card>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:col-span-4 lg:grid-cols-1">
          <Card title="Candidates by plan" description="All registered candidates.">
            <BarList items={perPlan.map((p) => ({ key: p.plan, label: PLANS[p.plan].label, value: p.count }))} total={Math.max(1, m.candidates)} />
          </Card>
          <Card title="Platform content" description="Published today." bodyClassName="p-3">
            <ul className="space-y-0.5">
              <LinkRow to="/admin/job-profiles" icon={ListChecks} label="Job profiles" value={m.publishedProfiles} />
              <LinkRow to="/admin/courses" icon={BookOpen} label="Learning resources" value={m.courses} />
              <LinkRow to="/admin/assessments" icon={ClipboardCheck} label="Skill tests" value={m.tests} />
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [range, setRange] = useState("all");
  const query = useQuery(() => getOverview({ range }), [range]);
  // A reload keeps the same query key, so track it here to spin the icon until fresh data arrives.
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => setRefreshing(false), [query.data, query.error]);

  function refresh() {
    setRefreshing(true);
    query.reload();
  }

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Calculated live from the platform's data. Activity figures follow the selected period."
        actions={
          <>
            <ViewSwitcher label="Date range" options={RANGE_OPTIONS} value={range} onChange={setRange} />
            <button
              type="button"
              onClick={refresh}
              disabled={query.loading || refreshing}
              aria-label="Refresh figures"
              title="Refresh figures"
              className="flex h-9 w-9 items-center justify-center rounded-control border border-gray-200 bg-white text-gray-600 transition duration-150 ease-standard hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-accent-500 active:scale-95 disabled:opacity-60"
            >
              <RefreshCw aria-hidden="true" size={16} className={query.loading || refreshing ? "animate-spin" : ""} />
            </button>
            <Link to="/admin/placements" className={buttonClasses("secondary", "", "sm")}>
              Placements
            </Link>
            <Link to="/admin/job-profiles" className={buttonClasses("solid", "", "sm")}>
              Manage job profiles
            </Link>
          </>
        }
      />
      {query.error ? (
        <ErrorState error={query.error} onRetry={query.reload} />
      ) : !query.data ? (
        <DashboardSkeleton />
      ) : (
        // While new figures load, the previous ones stay in place, dimmed, instead of flashing a skeleton.
        <div aria-busy={query.loading} className={`animate-fade-in transition-opacity duration-200 ease-standard ${query.loading ? "opacity-60" : ""}`}>
          <Overview data={query.data} />
        </div>
      )}
    </div>
  );
}
