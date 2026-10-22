import { Link } from "react-router-dom";
import { FileText } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDate } from "../../lib/format.js";
import { listMyApplications } from "../../services/candidateApi.js";

export default function ApplicationsPage() {
  const query = useQuery(listMyApplications);

  return (
    <div>
      <PageHeader title="My applications" description="Statuses are updated by each employer. Link records them; it doesn't make hiring decisions." />
      <QueryBoundary query={query} rows={4}>
        {(apps) =>
          apps.length === 0 ? (
            <Card>
              <EmptyState icon={FileText} title="No applications yet" action={<Link to="/candidate/jobs" className={buttonClasses("solid", "", "sm")}>Find jobs</Link>}>
                Once you're eligible for a job, you can apply from its page.
              </EmptyState>
            </Card>
          ) : (
            <ul className="space-y-4">
              {apps.map((app) => (
                <li key={app.id}>
                  <Card bodyClassName="">
                    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                      <div>
                        <Link to={`/candidate/jobs/${app.job.id}`} className="text-sm font-semibold text-gray-900 hover:underline">
                          {app.job.title}
                        </Link>
                        <p className="text-xs text-gray-600">
                          {app.companyName} · {app.job.location} · applied {formatDate(app.createdAt)}
                        </p>
                      </div>
                      <StatusBadge map={APPLICATION_STATUSES} value={app.status} />
                    </div>
                    <ol className="flex flex-wrap gap-x-6 gap-y-2 border-t border-gray-100 px-5 py-3" aria-label="Status history">
                      {app.history.map((h, i) => (
                        <li key={i} className="text-xs text-gray-600">
                          <span className="font-medium text-gray-900">{APPLICATION_STATUSES[h.status].label}</span> · {formatDate(h.at)}
                        </li>
                      ))}
                    </ol>
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
