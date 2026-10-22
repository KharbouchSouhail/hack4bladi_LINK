import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import Button from "../../components/Button.jsx";
import JobEditorDialog from "../../components/editors/JobEditorDialog.jsx";
import JobTable from "../../components/editors/JobTable.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { FilterSelect } from "../../components/ui/form.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { deleteJob, getReferenceData, listJobs, listProfiles, saveAdminJob, setAdminJobStatus } from "../../services/adminApi.js";

export default function AdminJobsPage() {
  const query = useQuery(listJobs);
  const ref = useQuery(getReferenceData);
  const profiles = useQuery(listProfiles);
  const [params, setParams] = useSearchParams();
  const [editing, setEditing] = useState(null);
  const [run] = useAction();
  const company = params.get("company") ?? "";
  const ready = ref.data && profiles.data;
  const [askDelete, deleteDialog] = useConfirm({
    title: (j) => `Delete ${j.title}?`,
    message: (j) => `${j.title} will be removed permanently. Jobs with applications can't be deleted — unpublish them instead.`,
    action: (j) => deleteJob(j.id),
    success: (j) => `${j.title} deleted.`,
  });

  return (
    <div>
      <PageHeader
        title="Job listings"
        description="Every partner opening, its profile and its eligibility rules."
        actions={<Button variant="solid" size="sm" onClick={() => setEditing({})} disabled={!ready}><Plus aria-hidden="true" size={16} /> New job listing</Button>}
      />
      <div className="mb-4">
        <FilterSelect
          label="Company"
          value={company}
          onChange={(e) => setParams(e.target.value ? { company: e.target.value } : {}, { replace: true })}
          options={[{ value: "", label: "All companies" }, ...(ref.data?.companies ?? []).map((c) => ({ value: c.id, label: c.name }))]}
        />
      </div>
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(jobs) => (
            <JobTable
              jobs={jobs}
              showCompany
              companyFilter={company}
              applicationsPath="/admin/applications"
              onEdit={setEditing}
              onDelete={askDelete}
              onStatus={(j, status) => run(() => setAdminJobStatus(j.id, status), { success: `${j.title} ${status === "published" ? "published" : "unpublished"}.` })}
            />
          )}
        </QueryBoundary>
      </Card>
      {editing && ready && (
        <JobEditorDialog
          job={editing.id ? editing : null}
          profiles={profiles.data}
          skills={ref.data.skills}
          companies={ref.data.companies}
          onSave={saveAdminJob}
          onClose={() => setEditing(null)}
        />
      )}
      {deleteDialog}
    </div>
  );
}
