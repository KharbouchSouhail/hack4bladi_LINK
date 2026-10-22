import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/Button.jsx";
import JobEditorDialog from "../../components/editors/JobEditorDialog.jsx";
import JobTable from "../../components/editors/JobTable.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { listJobProfiles, listJobs, listSkills, saveCompanyJob, setCompanyJobStatus } from "../../services/companyApi.js";

export default function CompanyJobsPage() {
  const query = useQuery(listJobs);
  const profiles = useQuery(listJobProfiles);
  const skills = useQuery(listSkills);
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(params.get("new") === "1" ? {} : null);
  const [run] = useAction();
  const ready = profiles.data && skills.data;

  function close() {
    setEditing(null);
    if (params.has("new")) setParams({}, { replace: true });
  }

  return (
    <div>
      <PageHeader
        title="Job listings"
        description="Publish openings linked to your job profiles. Only candidates who meet the mandatory requirements can apply."
        actions={
          <Button variant="solid" size="sm" onClick={() => setEditing({})} disabled={!ready}>
            <Plus aria-hidden="true" size={16} /> Create job listing
          </Button>
        }
      />
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(jobs) => (
            <JobTable
              jobs={jobs}
              applicationsPath="/company/candidates"
              onEdit={setEditing}
              onStatus={(j, status) => run(() => setCompanyJobStatus(j.id, status), { success: `${j.title} ${status === "published" ? "published" : "unpublished"}.` })}
            />
          )}
        </QueryBoundary>
      </Card>
      {editing && ready && (
        <JobEditorDialog job={editing.id ? editing : null} profiles={profiles.data} skills={skills.data} onSave={saveCompanyJob} onClose={close} />
      )}
    </div>
  );
}
