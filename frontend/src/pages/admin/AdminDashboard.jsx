import { Link } from "react-router-dom";
import { Activity, BookOpen, Briefcase, Building2, CalendarClock, ClipboardCheck, FileText, Handshake, ListChecks, Users } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import Card, { PageHeader, StatTile } from "../../components/ui/Card.jsx";
import { BarList } from "../../components/ui/Progress.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { PLANS } from "../../domain/permissions.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatRelative } from "../../lib/format.js";
import { getOverview } from "../../services/adminApi.js";

export default function AdminDashboard() {
  const query = useQuery(getOverview);

  return (
    <div>
      <PageHeader
        title="Platform overview"
        description="Every figure is calculated from the current demo dataset."
        actions={
          <>
            <Link to="/admin/placements" className={buttonClasses("secondary", "", "sm")}>
              Placements
            </Link>
            <Link to="/admin/job-profiles" className={buttonClasses("solid", "", "sm")}>
              Manage job profiles
            </Link>
          </>
        }
      />
      <QueryBoundary query={query} rows={8}>
        {({ metrics: m, perStatus, perPlan, activity }) => (
          <div className="space-y-6">
            <div className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatTile label="Candidates" value={m.candidates} icon={Users} />
              <StatTile label="Companies" value={m.companies} hint={`${m.activeCompanies} active`} icon={Building2} />
              <StatTile label="Published job profiles" value={m.publishedProfiles} icon={ListChecks} />
              <StatTile label="Active job listings" value={m.activeJobs} icon={Briefcase} />
              <StatTile label="Learning resources" value={m.courses} hint={`${m.tests} published skill tests`} icon={BookOpen} />
              <StatTile label="Completed assessments" value={m.attempts} hint={`${m.passedAttempts} passed`} icon={ClipboardCheck} />
              <StatTile label="Submitted applications" value={m.applications} icon={FileText} />
              <StatTile label="Upcoming interviews" value={m.upcomingInterviews} icon={CalendarClock} />
              <StatTile label="Placements" value={m.placements} hint="Hires confirmed through the platform" icon={Handshake} />
              <StatTile
                label="Test pass rate"
                value={m.attempts ? `${Math.round((100 * m.passedAttempts) / m.attempts)}%` : "—"}
                hint="Across all attempts"
                icon={Activity}
              />
            </div>

            <div className="stagger grid gap-6 lg:grid-cols-3">
              <Card title="Applications by status">
                <BarList items={perStatus.map((s) => ({ key: s.status, label: APPLICATION_STATUSES[s.status].label, value: s.count }))} total={Math.max(1, m.applications)} />
              </Card>
              <Card title="Candidates by plan">
                <BarList items={perPlan.map((p) => ({ key: p.plan, label: PLANS[p.plan].label, value: p.count }))} total={Math.max(1, m.candidates)} />
              </Card>
              <Card title="Recent activity" bodyClassName="">
                <ul className="divide-y divide-gray-100">
                  {activity.map((a) => (
                    <li key={a.id} className="px-5 py-2.5">
                      <p className="text-[13px] text-gray-800">{a.text}</p>
                      <p className="text-[11px] text-gray-500">{formatRelative(a.at)}</p>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
