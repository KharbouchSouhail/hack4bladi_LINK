import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { BarList } from "../../components/ui/Progress.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { useQuery } from "../../hooks/useQuery.js";
import { getAnalytics } from "../../services/companyApi.js";

export default function CompanyAnalyticsPage() {
  const query = useQuery(getAnalytics);

  return (
    <div>
      <PageHeader title="Analytics" description="Calculated live from your listings and applications." />
      <QueryBoundary query={query} rows={6}>
        {(a) => (
          <div className="stagger grid gap-6 lg:grid-cols-2">
            <Card title="Applications per listing">
              <BarList items={a.perJob.map((j) => ({ key: j.id, label: j.title, value: j.count }))} emptyLabel="No listings yet." />
            </Card>
            <Card title="Applications by status">
              <BarList
                items={a.perStatus.map((s) => ({ key: s.status, label: APPLICATION_STATUSES[s.status].label, value: s.count }))}
                total={Math.max(1, a.totalApplicants)}
              />
            </Card>
            <Card
              title="Required skill tests passed by applicants"
              description={`Among the ${a.sharingCount} of ${a.totalApplicants} applicants who shared their test results.`}
              className="lg:col-span-2"
            >
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
        )}
      </QueryBoundary>
    </div>
  );
}
