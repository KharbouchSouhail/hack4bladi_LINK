import { useMemo, useState } from "react";
import Card, { PageHeader, StatTile } from "../../components/ui/Card.jsx";
import DataTable, { Toolbar } from "../../components/ui/DataTable.jsx";
import { FilterSelect, SearchInput } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { PLAN_ORDER, PLANS } from "../../domain/permissions.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { listCandidates, setCandidatePlan } from "../../services/adminApi.js";

const PLAN_OPTIONS = PLAN_ORDER.map((p) => ({ value: p, label: PLANS[p].label }));

function SubscriptionTable({ candidates }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("");
  const [run, pending] = useAction();
  const rows = useMemo(
    () => candidates.filter((c) => (!plan || c.plan === plan) && c.name.toLowerCase().includes(search.trim().toLowerCase())),
    [candidates, plan, search],
  );

  const columns = [
    { key: "name", header: "Candidate", sortValue: (c) => c.name, render: (c) => <span className="font-medium text-gray-900">{c.name}</span> },
    { key: "target", header: "Target role", render: (c) => <span className="text-xs">{c.targetTitle}</span> },
    {
      key: "plan",
      header: "Plan",
      sortValue: (c) => PLAN_ORDER.indexOf(c.plan),
      render: (c) => (
        <FilterSelect
          label={`Plan for ${c.name}`}
          value={c.plan}
          disabled={pending}
          onChange={(e) => run(() => setCandidatePlan(c.id, e.target.value), { success: `${c.name} moved to ${PLANS[e.target.value].label}.` })}
          options={PLAN_OPTIONS}
        />
      ),
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput label="Search candidates" placeholder="Search candidates" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        <FilterSelect label="Filter by plan" value={plan} onChange={(e) => setPlan(e.target.value)} options={[{ value: "", label: "All plans" }, ...PLAN_OPTIONS]} />
      </Toolbar>
      <DataTable columns={columns} rows={rows} caption="Subscriptions" empty={<EmptyState title="No candidates match" />} />
    </>
  );
}

export default function AdminSubscriptionsPage() {
  const query = useQuery(listCandidates);

  return (
    <div>
      <PageHeader title="Subscriptions" description="Demo plans — no billing provider is connected. Changing a plan immediately changes what the candidate can access." />
      <QueryBoundary query={query} rows={6}>
        {(candidates) => (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {PLAN_ORDER.map((p) => (
                <StatTile key={p} label={`${PLANS[p].label} · ${PLANS[p].price}`} value={candidates.filter((c) => c.plan === p).length} hint={PLANS[p].tagline} />
              ))}
            </div>
            <Card bodyClassName="">
              <SubscriptionTable candidates={candidates} />
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
