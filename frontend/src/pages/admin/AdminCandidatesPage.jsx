import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { buttonClasses } from "../../components/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import DataTable, { Toolbar } from "../../components/ui/DataTable.jsx";
import { FilterSelect, SearchInput } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { PLANS } from "../../domain/permissions.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDate } from "../../lib/format.js";
import { listCandidates } from "../../services/adminApi.js";

const COLUMNS = [
  {
    key: "name",
    header: "Candidate",
    sortValue: (c) => c.name,
    render: (c) => (
      <div>
        <p className="font-medium text-gray-900">{c.name}</p>
        <p className="text-xs text-gray-500">{c.headline || c.email || "—"}</p>
      </div>
    ),
  },
  { key: "plan", header: "Plan", sortValue: (c) => c.plan, render: (c) => <Badge tone={c.plan === "free" ? "neutral" : "accent"}>{PLANS[c.plan].label}</Badge> },
  { key: "target", header: "Target role", sortValue: (c) => c.targetTitle, render: (c) => <span className="text-xs">{c.targetTitle}</span> },
  { key: "score", header: "Alignment", align: "right", sortValue: (c) => c.score ?? -1, render: (c) => (c.score === null ? <span className="text-xs text-gray-500">No résumé</span> : `${c.score}/100`) },
  { key: "tests", header: "Tests passed", align: "right", sortValue: (c) => c.testsPassed, render: (c) => c.testsPassed },
  { key: "apps", header: "Applications", align: "right", sortValue: (c) => c.applications, render: (c) => c.applications },
  { key: "joined", header: "Joined", sortValue: (c) => c.createdAt, render: (c) => <span className="text-xs">{formatDate(c.createdAt)}</span> },
  { key: "action", header: <span className="sr-only">Action</span>, align: "right", render: (c) => <Link to={`/admin/candidates/${c.id}`} className={buttonClasses("secondary", "", "xs")}>View</Link> },
];

function CandidateTable({ candidates }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const rows = useMemo(
    () => candidates.filter((c) => (!plan || c.plan === plan) && `${c.name} ${c.email}`.toLowerCase().includes(search.trim().toLowerCase())),
    [candidates, plan, search],
  );
  return (
    <>
      <Toolbar>
        <SearchInput label="Search candidates" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        <FilterSelect label="Plan" value={plan} onChange={(e) => setPlan(e.target.value)} options={[{ value: "", label: "All plans" }, ...Object.entries(PLANS).map(([value, p]) => ({ value, label: p.label }))]} />
      </Toolbar>
      <DataTable columns={COLUMNS} rows={rows} caption="Candidates" empty={<EmptyState title="No candidates match" />} />
    </>
  );
}

export default function AdminCandidatesPage() {
  const query = useQuery(listCandidates);
  return (
    <div>
      <PageHeader title="Candidates" description="Assessments, validated skills and applications for every candidate." />
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(candidates) => <CandidateTable candidates={candidates} />}
        </QueryBoundary>
      </Card>
    </div>
  );
}
