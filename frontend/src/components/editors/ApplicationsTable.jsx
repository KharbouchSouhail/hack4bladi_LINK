import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Users } from "lucide-react";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { ELIGIBILITY } from "../../domain/eligibility.js";
import { formatDate } from "../../lib/format.js";
import { buttonClasses } from "../Button.jsx";
import { EligibilityBadge } from "../candidate/shared.jsx";
import Badge, { StatusBadge } from "../ui/Badge.jsx";
import DataTable, { Toolbar } from "../ui/DataTable.jsx";
import { FilterSelect, SearchInput } from "../ui/form.jsx";
import { EmptyState } from "../ui/states.jsx";

// Filterable candidate pipeline. Filters live in the URL so dashboard links can preselect a job.
export default function ApplicationsTable({ rows, detailPath, skills, showCompany = false }) {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const job = params.get("job") ?? "";
  const status = params.get("status") ?? "";
  const skill = params.get("skill") ?? "";
  const eligibility = params.get("eligibility") ?? "";

  function setFilter(key, value) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const jobs = useMemo(() => [...new Map(rows.map((r) => [r.job.id, r.job])).values()], [rows]);
  const filtered = rows.filter(
    (r) =>
      (!job || r.job.id === job) &&
      (!status || r.status === status) &&
      (!eligibility || r.eligibility === eligibility) &&
      (!skill || r.skillIds.includes(skill)) &&
      r.candidate.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const columns = [
    {
      key: "candidate",
      header: "Candidate",
      sortValue: (r) => r.candidate.name,
      render: (r) => (
        <div className="min-w-[150px]">
          <p className="font-medium text-gray-900">{r.candidate.name}</p>
          <p className="max-w-[200px] truncate text-xs text-gray-500">{r.candidate.headline}</p>
        </div>
      ),
    },
    { key: "job", header: "Position", sortValue: (r) => r.job.title, render: (r) => <span className="text-xs">{r.job.title}{showCompany && <><br /><span className="text-gray-500">{r.job.companyName}</span></>}</span> },
    {
      key: "skills",
      header: "Relevant skills",
      render: (r) =>
        r.skills.length ? (
          <div className="flex max-w-[220px] flex-wrap gap-1">
            {r.skills.map((s) => (
              <Badge key={s.skillId} tone={s.passed ? "success" : "neutral"}>
                {s.name}
                {s.passed && " ✓"}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-gray-500">Not shared</span>
        ),
    },
    {
      key: "validated",
      header: "Required met",
      align: "right",
      sortValue: (r) => r.requiredMet.met / Math.max(1, r.requiredMet.total),
      render: (r) => `${r.requiredMet.met}/${r.requiredMet.total}`,
    },
    { key: "eligibility", header: "Requirements", render: (r) => <EligibilityBadge status={r.eligibility} /> },
    { key: "date", header: "Applied", sortValue: (r) => r.createdAt, render: (r) => <span className="text-xs whitespace-nowrap">{formatDate(r.createdAt)}</span> },
    { key: "status", header: "Status", sortValue: (r) => r.status, render: (r) => <StatusBadge map={APPLICATION_STATUSES} value={r.status} /> },
    {
      key: "action",
      header: <span className="sr-only">Action</span>,
      align: "right",
      render: (r) => (
        <Link to={`${detailPath}/${r.id}`} className={buttonClasses("secondary", "", "xs")}>
          View profile
        </Link>
      ),
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput label="Search candidates" placeholder="Search candidates" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-56" />
        <FilterSelect label="Job listing" value={job} onChange={(e) => setFilter("job", e.target.value)} options={[{ value: "", label: "All jobs" }, ...jobs.map((j) => ({ value: j.id, label: j.title }))]} />
        <FilterSelect
          label="Application status"
          value={status}
          onChange={(e) => setFilter("status", e.target.value)}
          options={[{ value: "", label: "All statuses" }, ...Object.entries(APPLICATION_STATUSES).map(([value, s]) => ({ value, label: s.label }))]}
        />
        <FilterSelect
          label="Requirements"
          value={eligibility}
          onChange={(e) => setFilter("eligibility", e.target.value)}
          options={[{ value: "", label: "Any requirements" }, ...Object.entries(ELIGIBILITY).map(([value, s]) => ({ value, label: s.label }))]}
        />
        <FilterSelect label="Competency" value={skill} onChange={(e) => setFilter("skill", e.target.value)} options={[{ value: "", label: "Any competency" }, ...skills.map((s) => ({ value: s.id, label: s.name }))]} />
      </Toolbar>
      <DataTable
        columns={columns}
        rows={filtered}
        caption="Candidate pipeline"
        initialSort={{ key: "date", dir: "desc" }}
        empty={
          <EmptyState icon={Users} title={rows.length ? "No candidates match these filters" : "No applications yet"}>
            {rows.length ? "Try clearing a filter." : "Eligible candidates can apply once a job listing is published."}
          </EmptyState>
        }
      />
    </>
  );
}
