import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Briefcase, Pencil, Plus, Power, Trash2 } from "lucide-react";
import Button from "../../components/Button.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import DataTable, { Toolbar } from "../../components/ui/DataTable.jsx";
import Dialog from "../../components/ui/Dialog.jsx";
import { FilterSelect, Input, SearchInput, Select, Textarea } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { PARTNER_STATUSES } from "../../domain/constants.js";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDate } from "../../lib/format.js";
import { deleteCompany, listCompanies, saveCompany, setCompanyActive } from "../../services/adminApi.js";

const EMPTY = { name: "", sector: "", city: "", size: "", website: "", partnerStatus: "prospect", description: "" };

function CompanyDialog({ company, onClose }) {
  const [form, setForm] = useState(company ?? EMPTY);
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => saveCompany(form), { success: company ? "Company saved." : "Company added." });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={company ? `Edit ${company.name}` : "Add company"}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="solid" size="sm" type="submit" form="company-form" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <form id="company-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Company name" value={form.name} onChange={set("name")} error={errors.name} />
        <Select label="Partner status" value={form.partnerStatus} onChange={set("partnerStatus")} error={errors.partnerStatus} options={Object.entries(PARTNER_STATUSES).map(([value, s]) => ({ value, label: s.label }))} />
        <Input label="Sector" value={form.sector} onChange={set("sector")} />
        <Input label="City" value={form.city} onChange={set("city")} error={errors.city} />
        <Input label="Size" value={form.size} onChange={set("size")} />
        <Input label="Website" value={form.website} onChange={set("website")} />
        <Textarea label="Description" rows={3} value={form.description} onChange={set("description")} error={errors.description} className="sm:col-span-2" />
      </form>
    </Dialog>
  );
}

function CompanyTable({ companies, onEdit }) {
  const [search, setSearch] = useState("");
  const [partner, setPartner] = useState("");
  const [run] = useAction();
  const [askDelete, deleteDialog] = useConfirm({
    title: (c) => `Delete ${c.name}?`,
    message: (c) => `${c.name} will be removed permanently. Companies with job profiles or listings can't be deleted — deactivate them instead.`,
    action: (c) => deleteCompany(c.id),
    success: (c) => `${c.name} deleted.`,
  });

  const rows = useMemo(
    () => companies.filter((c) => (!partner || c.partnerStatus === partner) && `${c.name} ${c.city} ${c.sector}`.toLowerCase().includes(search.trim().toLowerCase())),
    [companies, partner, search],
  );

  const columns = [
    {
      key: "name",
      header: "Company",
      sortValue: (c) => c.name,
      render: (c) => (
        <div>
          <p className="font-medium text-gray-900">{c.name}</p>
          <p className="text-xs text-gray-500">{[c.sector, c.city].filter(Boolean).join(" · ")}</p>
        </div>
      ),
    },
    { key: "partner", header: "Partner status", sortValue: (c) => c.partnerStatus, render: (c) => <StatusBadge map={PARTNER_STATUSES} value={c.partnerStatus} /> },
    { key: "active", header: "Account", sortValue: (c) => (c.active ? 0 : 1), render: (c) => <Badge tone={c.active ? "success" : "neutral"}>{c.active ? "Active" : "Inactive"}</Badge> },
    { key: "profiles", header: "Profiles", align: "right", sortValue: (c) => c.profiles, render: (c) => c.profiles },
    { key: "jobs", header: "Jobs", align: "right", sortValue: (c) => c.jobs, render: (c) => c.jobs },
    { key: "created", header: "Added", sortValue: (c) => c.createdAt, render: (c) => <span className="text-xs">{formatDate(c.createdAt)}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-0.5">
          <Link to={`/admin/jobs?company=${c.id}`} title="View jobs" aria-label={`Jobs of ${c.name}`} className="inline-flex h-8 items-center rounded-control px-2.5 text-gray-700 hover:bg-gray-100">
            <Briefcase size={15} />
          </Link>
          <Button variant="ghost" size="xs" title="Edit" aria-label={`Edit ${c.name}`} onClick={() => onEdit(c)}><Pencil size={15} /></Button>
          <Button
            variant="ghost"
            size="xs"
            title={c.active ? "Deactivate" : "Activate"}
            aria-label={`${c.active ? "Deactivate" : "Activate"} ${c.name}`}
            onClick={() => run(() => setCompanyActive(c.id, !c.active), { success: `${c.name} ${c.active ? "deactivated — its jobs are hidden from candidates" : "activated"}.` })}
          >
            <Power size={15} className={c.active ? "" : "text-success"} />
          </Button>
          <Button variant="ghost" size="xs" title="Delete" aria-label={`Delete ${c.name}`} onClick={() => askDelete(c)}><Trash2 size={15} /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput label="Search companies" placeholder="Search companies" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        <FilterSelect label="Partner status" value={partner} onChange={(e) => setPartner(e.target.value)} options={[{ value: "", label: "All partner statuses" }, ...Object.entries(PARTNER_STATUSES).map(([value, s]) => ({ value, label: s.label }))]} />
      </Toolbar>
      <DataTable columns={columns} rows={rows} caption="Companies" empty={<EmptyState title="No companies match" />} />
      {deleteDialog}
    </>
  );
}

export default function AdminCompaniesPage() {
  const query = useQuery(listCompanies);
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <PageHeader
        title="Companies"
        description="Partner companies define the job profiles and listings candidates work toward."
        actions={<Button variant="solid" size="sm" onClick={() => setEditing({})}><Plus aria-hidden="true" size={16} /> Add company</Button>}
      />
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(companies) => <CompanyTable companies={companies} onEdit={setEditing} />}
        </QueryBoundary>
      </Card>
      {editing && <CompanyDialog company={editing.id ? editing : null} onClose={() => setEditing(null)} />}
    </div>
  );
}
