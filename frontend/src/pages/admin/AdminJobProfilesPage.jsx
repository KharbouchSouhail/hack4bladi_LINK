import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "../../components/Button.jsx";
import ProfileEditorDialog from "../../components/editors/ProfileEditorDialog.jsx";
import ProfileList from "../../components/editors/ProfileList.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { FilterSelect } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { PUBLISH_STATUSES } from "../../domain/constants.js";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { deleteProfile, getReferenceData, listProfiles, saveJobProfile, setProfileStatus } from "../../services/adminApi.js";

export default function AdminJobProfilesPage() {
  const query = useQuery(listProfiles);
  const ref = useQuery(getReferenceData);
  const [editing, setEditing] = useState(null);
  const [company, setCompany] = useState("");
  const [status, setStatus] = useState("");
  const [run] = useAction();
  const [askDelete, deleteDialog] = useConfirm({
    title: (p) => `Delete ${p.title}?`,
    message: (p) => `${p.title} will be removed permanently. Profiles used by job listings can't be deleted — archive them instead.`,
    action: (p) => deleteProfile(p.id),
    success: (p) => `${p.title} deleted.`,
  });

  return (
    <div>
      <PageHeader
        title="Job profiles"
        description="Employer-defined competencies, levels and weights. Every compatibility score is calculated against one of these."
        actions={
          <Button variant="solid" size="sm" onClick={() => setEditing({})} disabled={!ref.data}>
            <Plus aria-hidden="true" size={16} /> New job profile
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2">
        <FilterSelect label="Company" value={company} onChange={(e) => setCompany(e.target.value)} options={[{ value: "", label: "All companies" }, ...(ref.data?.companies ?? []).map((c) => ({ value: c.id, label: c.name }))]} />
        <FilterSelect label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "", label: "All statuses" }, ...Object.entries(PUBLISH_STATUSES).map(([value, s]) => ({ value, label: s.label }))]} />
      </div>
      <QueryBoundary query={query} rows={6}>
        {(profiles) => {
          const rows = profiles.filter((p) => (!company || p.companyId === company) && (!status || p.status === status));
          return rows.length === 0 ? (
            <Card><EmptyState title="No job profiles match" /></Card>
          ) : (
            <ProfileList
              profiles={rows}
              showCompany
              onEdit={setEditing}
              onDelete={askDelete}
              onStatus={(p, s) => run(() => setProfileStatus(p.id, s), { success: `${p.title} is now ${s}.` })}
            />
          );
        }}
      </QueryBoundary>
      {editing && ref.data && (
        <ProfileEditorDialog
          profile={editing.id ? editing : null}
          skills={ref.data.skills}
          companies={ref.data.companies}
          onSave={saveJobProfile}
          onClose={() => setEditing(null)}
        />
      )}
      {deleteDialog}
    </div>
  );
}
