import { Link, useNavigate } from "react-router-dom";
import { Archive, Pencil, Plus, Send, Trash2 } from "lucide-react";
import Button, { buttonClasses } from "../../components/Button.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { PUBLISH_STATUSES } from "../../domain/constants.js";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { deleteTest, listTests, setTestStatus } from "../../services/adminApi.js";

export default function AdminAssessmentsPage() {
  const query = useQuery(listTests);
  const navigate = useNavigate();
  const [run] = useAction();
  const [askDelete, deleteDialog] = useConfirm({
    title: (t) => `Delete ${t.title}?`,
    message: (t) => `${t.title} will be removed permanently. Tests with recorded attempts can't be deleted — archive them instead.`,
    action: (t) => deleteTest(t.id),
    success: (t) => `${t.title} deleted.`,
  });

  const columns = [
    {
      key: "title",
      header: "Test",
      sortValue: (t) => t.title,
      render: (t) => (
        <Link to={`/admin/assessments/${t.id}`} className="font-medium text-gray-900 hover:underline">
          {t.title}
        </Link>
      ),
    },
    { key: "skill", header: "Skill", sortValue: (t) => t.skillName, render: (t) => <Badge tone="accent">{t.skillName}</Badge> },
    { key: "questions", header: "Questions", align: "right", sortValue: (t) => t.questions.length, render: (t) => t.questions.length },
    { key: "threshold", header: "Pass mark", align: "right", sortValue: (t) => t.passThreshold, render: (t) => `${t.passThreshold}%` },
    { key: "attempts", header: "Attempts", align: "right", sortValue: (t) => t.attempts, render: (t) => t.attempts },
    { key: "rate", header: "Pass rate", align: "right", sortValue: (t) => t.passRate ?? -1, render: (t) => (t.passRate === null ? "—" : `${t.passRate}%`) },
    { key: "status", header: "Status", sortValue: (t) => t.status, render: (t) => <StatusBadge map={PUBLISH_STATUSES} value={t.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (t) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="xs" aria-label={`Edit ${t.title}`} title="Edit and preview" onClick={() => navigate(`/admin/assessments/${t.id}`)}><Pencil size={15} /></Button>
          <Button
            variant="ghost"
            size="xs"
            title={t.status === "published" ? "Archive" : "Publish"}
            aria-label={`${t.status === "published" ? "Archive" : "Publish"} ${t.title}`}
            onClick={() => run(() => setTestStatus(t.id, t.status === "published" ? "archived" : "published"), { success: `${t.title} ${t.status === "published" ? "archived" : "published"}.` })}
          >
            {t.status === "published" ? <Archive size={15} /> : <Send size={15} />}
          </Button>
          <Button variant="ghost" size="xs" aria-label={`Delete ${t.title}`} title="Delete" onClick={() => askDelete(t)}><Trash2 size={15} /></Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Assessments and tests"
        description="Multiple-choice tests graded deterministically. A pass records validated evidence for the linked skill."
        actions={<Link to="/admin/assessments/new" className={buttonClasses("solid", "", "sm")}><Plus aria-hidden="true" size={16} /> New test</Link>}
      />
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(tests) => <DataTable columns={columns} rows={tests} caption="Skill tests" empty={<EmptyState title="No tests yet" />} />}
        </QueryBoundary>
      </Card>
      {deleteDialog}
    </div>
  );
}
