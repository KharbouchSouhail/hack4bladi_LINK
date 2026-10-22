import ApplicationsTable from "../../components/editors/ApplicationsTable.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { useQuery } from "../../hooks/useQuery.js";
import { listApplications, listSkills } from "../../services/companyApi.js";

export default function CompanyPipelinePage() {
  const query = useQuery(listApplications);
  const skills = useQuery(listSkills);

  return (
    <div>
      <PageHeader
        title="Candidate pipeline"
        description="Applicants to your listings. Résumé evidence and test results are shown separately, and only when the candidate shared them."
      />
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(rows) => <ApplicationsTable rows={rows} detailPath="/company/candidates" skills={skills.data ?? []} />}
        </QueryBoundary>
      </Card>
    </div>
  );
}
