import { useState } from "react";
import { ListChecks, Plus } from "lucide-react";
import Button from "../../components/Button.jsx";
import ProfileEditorDialog from "../../components/editors/ProfileEditorDialog.jsx";
import ProfileList from "../../components/editors/ProfileList.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { listJobProfiles, listSkills, saveJobProfile, setJobProfileStatus } from "../../services/companyApi.js";

export default function CompanyJobProfilesPage() {
  const query = useQuery(listJobProfiles);
  const skills = useQuery(listSkills);
  const [editing, setEditing] = useState(null);
  const [run] = useAction();

  const newButton = (
    <Button variant="solid" size="sm" onClick={() => setEditing({})} disabled={!skills.data}>
      <Plus aria-hidden="true" size={16} /> New job profile
    </Button>
  );

  return (
    <div>
      <PageHeader
        title="Job profiles"
        description="Define the competencies, expected levels and weights for each role you hire for. Candidates are assessed against these — not a generic job title."
        actions={newButton}
      />
      <QueryBoundary query={query} rows={6}>
        {(profiles) =>
          profiles.length === 0 ? (
            <Card>
              <EmptyState icon={ListChecks} title="No job profiles yet" action={newButton}>
                Start by describing a role and the competencies it requires.
              </EmptyState>
            </Card>
          ) : (
            <ProfileList
              profiles={profiles}
              onEdit={setEditing}
              onStatus={(p, status) => run(() => setJobProfileStatus(p.id, status), { success: `${p.title} is now ${status}.` })}
            />
          )
        }
      </QueryBoundary>
      {editing && skills.data && (
        <ProfileEditorDialog profile={editing.id ? editing : null} skills={skills.data} onSave={saveJobProfile} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
