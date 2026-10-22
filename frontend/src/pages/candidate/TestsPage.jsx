import { useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, BookOpen, RotateCcw } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import { FilterSelect } from "../../components/ui/form.jsx";
import { QueryBoundary, UpgradeCard } from "../../components/ui/states.jsx";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDate } from "../../lib/format.js";
import { listTests } from "../../services/candidateApi.js";

function status(t) {
  if (t.passed) return <Badge tone="success" icon={BadgeCheck}>Passed</Badge>;
  if (t.attempts) return <Badge tone="warning" icon={RotateCcw}>Retry needed</Badge>;
  if (t.learning) return <Badge tone="info" icon={BookOpen}>Learning</Badge>;
  return <Badge>Not taken</Badge>;
}

function columns(locked) {
  return [
    {
      key: "title",
      header: "Test",
      sortValue: (t) => t.title,
      render: (t) => (
        <div>
          <p className="font-medium text-gray-900">{t.title}</p>
          <p className="text-xs text-gray-500">
            {t.questions} questions · pass at {t.passThreshold}% {t.relevant && "· for your target role"}
          </p>
        </div>
      ),
    },
    { key: "status", header: "Status", sortValue: (t) => (t.passed ? 0 : t.attempts ? 1 : 2), render: status },
    { key: "best", header: "Best score", align: "right", sortValue: (t) => t.bestScore ?? -1, render: (t) => (t.bestScore === null ? "—" : `${t.bestScore}%`) },
    { key: "last", header: "Last attempt", sortValue: (t) => t.lastAttempt?.createdAt ?? "", render: (t) => formatDate(t.lastAttempt?.createdAt) },
    {
      key: "action",
      header: <span className="sr-only">Action</span>,
      align: "right",
      render: (t) =>
        locked ? (
          <span className="text-xs text-gray-500">Max</span>
        ) : t.passed ? (
          <Link to={`/candidate/tests/${t.id}`} className={buttonClasses("ghost", "", "xs")}>Retake</Link>
        ) : (
          <Link to={`/candidate/tests/${t.id}`} className={buttonClasses("solid", "", "xs")}>{t.attempts ? "Retry" : "Start"}</Link>
        ),
    },
  ];
}

export default function TestsPage() {
  const query = useQuery(listTests);
  const [scope, setScope] = useState("relevant");

  return (
    <div>
      <PageHeader title="Skill tests" description="Automatically graded tests. Passing one records validated evidence for that skill." />
      <QueryBoundary query={query} rows={6}>
        {({ locked, tests }) => {
          const rows = tests.filter((t) => scope === "all" || t.relevant);
          return (
            <div className="space-y-5">
              {locked && (
                <Card>
                  <UpgradeCard plan="max" compact title="Skill tests are part of Max">
                    Validate your skills with graded tests and show the results to employers.
                  </UpgradeCard>
                </Card>
              )}
              <Card
                title={`${rows.filter((t) => t.passed).length} of ${rows.length} passed`}
                action={
                  <FilterSelect label="Scope" value={scope} onChange={(e) => setScope(e.target.value)} options={[{ value: "relevant", label: "For my target role" }, { value: "all", label: "All tests" }]} />
                }
                bodyClassName=""
              >
                <DataTable columns={columns(locked)} rows={rows} caption="Skill tests" />
              </Card>
              <p className="text-xs text-gray-500">A passed test shows performance on that assessment; it isn't a guarantee of complete mastery.</p>
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
