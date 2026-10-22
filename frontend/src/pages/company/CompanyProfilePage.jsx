import { useState } from "react";
import Button from "../../components/Button.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { Input, Textarea } from "../../components/ui/form.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { PARTNER_STATUSES } from "../../domain/constants.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { getCompany, updateCompany } from "../../services/companyApi.js";

function CompanyForm({ company }) {
  const [form, setForm] = useState(company);
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => updateCompany(form), { success: "Company profile saved." });
    setErrors(result.ok ? {} : result.fieldErrors);
  }

  return (
    <Card title={company.name} action={<StatusBadge map={PARTNER_STATUSES} value={company.partnerStatus} />}>
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Company name" value={form.name} onChange={set("name")} error={errors.name} />
        <Input label="Sector" value={form.sector} onChange={set("sector")} />
        <Input label="City" value={form.city} onChange={set("city")} error={errors.city} />
        <Input label="Company size" value={form.size} onChange={set("size")} placeholder="e.g. 50–200 employees" />
        <Input label="Website" value={form.website} onChange={set("website")} className="sm:col-span-2" />
        <Textarea label="Description" rows={4} value={form.description} onChange={set("description")} error={errors.description} className="sm:col-span-2" hint={`${form.description.length}/500`} />
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" variant="solid" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
          <p className="text-xs text-gray-500">Partner status is managed by the Link team.</p>
        </div>
      </form>
    </Card>
  );
}

export default function CompanyProfilePage() {
  const query = useQuery(getCompany);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Company profile" description="Shown to candidates on your job listings." />
      <QueryBoundary query={query} rows={5}>
        {(company) => <CompanyForm key={company.id} company={company} />}
      </QueryBoundary>
    </div>
  );
}
