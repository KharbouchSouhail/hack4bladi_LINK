import ApplicationsTable from "../../components/editors/ApplicationsTable.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { useQuery } from "../../hooks/useQuery.js";
import { getReferenceData, listApplications } from "../../services/adminApi.js";

export default function AdminApplicationsPage() {
  const query = useQuery(listApplications);
  const ref = useQuery(getReferenceData);

  return (
    <div>
      <PageHeader title="Applications" description="All applications across partner companies. Statuses are normally managed by each employer." />
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(rows) => <ApplicationsTable rows={rows} detailPath="/admin/applications" skills={ref.data?.skills ?? []} showCompany />}
        </QueryBoundary>
      </Card>
    </div>
  );
}
