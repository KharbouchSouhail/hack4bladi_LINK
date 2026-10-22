import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, EyeOff, Pencil, Send, Trash2, Users } from "lucide-react";
import { PUBLISH_STATUSES } from "../../domain/constants.js";
import { formatDate } from "../../lib/format.js";
import Button from "../Button.jsx";
import Badge, { StatusBadge } from "../ui/Badge.jsx";
import DataTable, { Toolbar } from "../ui/DataTable.jsx";
import Dialog from "../ui/Dialog.jsx";
import { FilterSelect, SearchInput } from "../ui/form.jsx";
import { EmptyState } from "../ui/states.jsx";

function JobPreview({ job, onClose }) {
  return (
    <Dialog open onClose={onClose} title={job.title} description={`${job.companyName ? `${job.companyName} · ` : ""}${job.location} · ${job.workMode} · ${job.employmentType}`}>
      <div className="space-y-4 text-[13px] text-gray-700">
        <p>{job.description}</p>
        <p className="text-xs text-gray-500">Profile: {job.profileTitle} · created {formatDate(job.createdAt)}</p>
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-800">Eligibility requirements</p>
          <ul className="flex flex-wrap gap-1.5">
            {job.skills.map((s) => (
              <li key={s.skillId}>
                <Badge tone={s.mandatory ? "accent" : "neutral"}>
                  {s.name} · {s.rule === "test_passed" ? "test passed" : "evidence"}
                  {!s.mandatory && " · preferred"}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Dialog>
  );
}

// Job listings table with search, status filter and row actions. Used by companies and admins.
export default function JobTable({ jobs, onEdit, onStatus, onDelete, applicationsPath, showCompany = false, companyFilter }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [viewing, setViewing] = useState(null);

  const rows = useMemo(
    () =>
      jobs.filter(
        (j) =>
          (!status || j.status === status) &&
          (!companyFilter || j.companyId === companyFilter) &&
          `${j.title} ${j.location} ${j.companyName ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [jobs, status, search, companyFilter],
  );

  const columns = [
    {
      key: "title",
      header: "Job",
      sortValue: (j) => j.title,
      render: (j) => (
        <div className="min-w-[180px]">
          <p className="font-medium text-gray-900">{j.title}</p>
          <p className="text-xs text-gray-500">
            {showCompany && `${j.companyName} · `}
            {j.profileTitle}
          </p>
        </div>
      ),
    },
    { key: "location", header: "Location", render: (j) => <span className="text-xs">{j.location} · {j.workMode}<br />{j.employmentType}</span> },
    {
      key: "skills",
      header: "Required skills",
      render: (j) => (
        <div className="flex max-w-[220px] flex-wrap gap-1">
          {j.skills.filter((s) => s.mandatory).map((s) => <Badge key={s.skillId}>{s.name}</Badge>)}
        </div>
      ),
    },
    { key: "applications", header: "Applications", align: "right", sortValue: (j) => j.applications, render: (j) => j.applications },
    { key: "status", header: "Status", sortValue: (j) => j.status, render: (j) => <StatusBadge map={PUBLISH_STATUSES} value={j.status} /> },
    { key: "created", header: "Created", sortValue: (j) => j.createdAt, render: (j) => <span className="text-xs whitespace-nowrap">{formatDate(j.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (j) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="xs" aria-label={`View ${j.title}`} title="View" onClick={() => setViewing(j)}><Eye size={15} /></Button>
          <Button variant="ghost" size="xs" aria-label={`Edit ${j.title}`} title="Edit" onClick={() => onEdit(j)}><Pencil size={15} /></Button>
          <Button
            variant="ghost"
            size="xs"
            aria-label={`${j.status === "published" ? "Unpublish" : "Publish"} ${j.title}`}
            title={j.status === "published" ? "Unpublish" : "Publish"}
            onClick={() => onStatus(j, j.status === "published" ? "draft" : "published")}
          >
            {j.status === "published" ? <EyeOff size={15} /> : <Send size={15} />}
          </Button>
          <Link
            to={`${applicationsPath}?job=${j.id}`}
            aria-label={`Applications for ${j.title}`}
            title="View applications"
            className="inline-flex h-8 items-center rounded-control px-2.5 text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-accent-600"
          >
            <Users size={15} />
          </Link>
          {onDelete && (
            <Button variant="ghost" size="xs" aria-label={`Delete ${j.title}`} title="Delete" onClick={() => onDelete(j)}><Trash2 size={15} /></Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput label="Search jobs" placeholder="Search jobs" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        <FilterSelect
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[{ value: "", label: "All statuses" }, { value: "published", label: "Published" }, { value: "draft", label: "Draft" }]}
        />
      </Toolbar>
      <DataTable columns={columns} rows={rows} caption="Job listings" initialSort={{ key: "created", dir: "desc" }} empty={<EmptyState title="No job listings match" />} />
      {viewing && <JobPreview job={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
