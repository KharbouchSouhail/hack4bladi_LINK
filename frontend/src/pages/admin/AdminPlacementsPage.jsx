import { useState } from "react";
import { Link } from "react-router-dom";
import { Calculator, FlaskConical, Handshake, Percent } from "lucide-react";
import Button, { buttonClasses } from "../../components/Button.jsx";
import { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { PageHeader, StatTile } from "../../components/ui/Card.jsx";
import DataTable from "../../components/ui/DataTable.jsx";
import Dialog from "../../components/ui/Dialog.jsx";
import { Input, Select } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { COMMISSION_MODELS, computeCommission, formatMoney, PLACEMENT_STATUSES, PLACEMENT_TRANSITIONS } from "../../domain/recruitment.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDate } from "../../lib/format.js";
import { listPlacements, saveCommissionSettings, setPlacementStatus } from "../../services/adminApi.js";

const STATUS_ACTIONS = { started: "Mark as started", cancelled: "Cancel placement" };

function DemoBanner() {
  return (
    <p className="mb-6 flex items-start gap-2 rounded-control border border-cyan-100 bg-cyan-50 px-3.5 py-3 text-[13px] text-cyan-700">
      <FlaskConical aria-hidden="true" size={18} className="mt-px shrink-0" />
      <span>
        <strong className="font-semibold">Demonstration data.</strong> Rates, reference amounts and commissions are sample values for the hackathon
        MVP. No invoice is issued, no payment is processed and no commission has been earned.
      </span>
    </p>
  );
}

function describeRule(c) {
  return c.model === "fixed" ? `Fixed fee of ${formatMoney(c.fixedFee, c.currency)}` : `${c.ratePercent}% of ${formatMoney(c.referenceAmount, c.currency)}`;
}

function SettingsCard({ settings }) {
  const [form, setForm] = useState(settings);
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const changed = JSON.stringify(form) !== JSON.stringify(settings);
  const numeric = { ...form, ratePercent: Number(form.ratePercent), fixedFee: Number(form.fixedFee), defaultReferenceAmount: Number(form.defaultReferenceAmount) };
  const preview = computeCommission(numeric, null);

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => saveCommissionSettings(form), { success: "Commission settings saved. They apply to new placements." });
    setErrors(result.ok ? {} : result.fieldErrors);
  }

  return (
    <Card title="Commission model" description="Applied when a hire is confirmed. Existing placements keep the settings they were calculated with.">
      <form onSubmit={submit} noValidate className="space-y-4">
        <Select
          label="Model"
          value={form.model}
          onChange={update("model")}
          error={errors.model}
          options={Object.entries(COMMISSION_MODELS).map(([value, m]) => ({ value, label: m.label }))}
        />
        {form.model === "percentage" ? (
          <Input label="Rate (%)" type="number" step="0.5" min="0" max="50" value={form.ratePercent} onChange={update("ratePercent")} error={errors.ratePercent} />
        ) : (
          <Input label={`Fixed fee (${form.currency})`} type="number" min="0" value={form.fixedFee} onChange={update("fixedFee")} error={errors.fixedFee} />
        )}
        <Input
          label={`Default reference amount (${form.currency})`}
          type="number"
          min="0"
          value={form.defaultReferenceAmount}
          onChange={update("defaultReferenceAmount")}
          error={errors.defaultReferenceAmount}
          hint="Used when the offer has no annual salary. Sample figure."
        />
        <Input label="Currency" maxLength={3} value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} error={errors.currency} />
        {Number.isFinite(preview.amount) && (
          <p className="rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600">
            Example with the default reference: {describeRule(preview)} = <strong className="text-gray-900">{formatMoney(preview.amount, preview.currency)}</strong>
          </p>
        )}
        <Button type="submit" variant="solid" size="sm" loading={pending} disabled={pending || !changed}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </Card>
  );
}

function CalculationDialog({ placement, onClose }) {
  const c = placement.commission;
  const [run, pending] = useAction();
  const rows = [
    ["Candidate", placement.candidateName],
    ["Employer", placement.companyName],
    ["Job", placement.jobTitle],
    ["Hire date", formatDate(placement.hireDate)],
    ["Start date", placement.startDate ? formatDate(placement.startDate) : "—"],
    ["Confirmed by", placement.confirmedBy],
  ];

  return (
    <Dialog
      open
      onClose={onClose}
      title="Placement and commission"
      description={`${placement.candidateName} · ${placement.companyName}`}
      footer={
        <>
          {PLACEMENT_TRANSITIONS[placement.status].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={status === "cancelled" ? "danger" : "solid"}
              loading={pending}
              onClick={async () => {
                const { ok } = await run(() => setPlacementStatus(placement.id, status), { success: `Placement set to ${PLACEMENT_STATUSES[status].label}.` });
                if (ok) onClose();
              }}
            >
              {STATUS_ACTIONS[status]}
            </Button>
          ))}
          <Link to={`/admin/applications/${placement.applicationId}`} className={buttonClasses("secondary", "", "sm")}>
            Open application
          </Link>
        </>
      }
    >
      <div className="space-y-5">
        <dl className="grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-gray-500">{label}</dt>
              <dd className="text-gray-900">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-[11px] text-gray-500">Status</dt>
            <dd>
              <StatusBadge map={PLACEMENT_STATUSES} value={placement.status} />
            </dd>
          </div>
        </dl>
        <div className="rounded-lg border border-gray-200">
          <p className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 text-xs font-semibold text-gray-800">
            <Calculator aria-hidden="true" size={14} /> Calculation (illustrative)
          </p>
          <dl className="space-y-2 px-4 py-3 text-[13px]">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Model</dt>
              <dd className="text-gray-900">{COMMISSION_MODELS[c.model].label}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">Reference amount</dt>
              <dd className="text-right text-gray-900 tabular-nums">
                {formatMoney(c.referenceAmount, c.currency)}
                <span className="block text-[11px] text-gray-500">{c.referenceSource === "offer" ? "Annual salary in the offer" : "Default reference (sample)"}</span>
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-500">{c.model === "fixed" ? "Fixed fee" : "Rate"}</dt>
              <dd className="text-gray-900 tabular-nums">{c.model === "fixed" ? formatMoney(c.fixedFee, c.currency) : `${c.ratePercent}%`}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t border-gray-100 pt-2">
              <dt className="font-medium text-gray-900">Commission</dt>
              <dd className="font-semibold text-gray-900 tabular-nums">{formatMoney(c.amount, c.currency)}</dd>
            </div>
          </dl>
          <p className="border-t border-gray-100 px-4 py-2.5 text-[11px] text-gray-500">
            {describeRule(c)}. Demo figure: not invoiced and not earned revenue.
          </p>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-800">History</p>
          <ol className="space-y-1.5">
            {[...placement.history].reverse().map((h, i) => (
              <li key={i} className="text-xs text-gray-600">
                <span className="font-medium text-gray-900">{PLACEMENT_STATUSES[h.status].label}</span> · {formatDate(h.at)} · {h.by}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Dialog>
  );
}

export default function AdminPlacementsPage() {
  const query = useQuery(listPlacements);
  const [viewingId, setViewingId] = useState(null);

  const columns = [
    {
      key: "candidate",
      header: "Candidate",
      sortValue: (p) => p.candidateName,
      render: (p) => (
        <div className="min-w-[150px]">
          <p className="font-medium text-gray-900">{p.candidateName}</p>
          <p className="text-xs text-gray-500">
            {p.jobTitle} · {p.companyName}
          </p>
        </div>
      ),
    },
    { key: "hire", header: "Hire date", sortValue: (p) => p.hireDate, render: (p) => <span className="text-xs whitespace-nowrap">{formatDate(p.hireDate)}</span> },
    { key: "status", header: "Status", sortValue: (p) => p.status, render: (p) => <StatusBadge map={PLACEMENT_STATUSES} value={p.status} /> },
    {
      key: "reference",
      header: "Reference",
      align: "right",
      sortValue: (p) => p.commission.referenceAmount,
      render: (p) => (
        <span className="text-xs whitespace-nowrap">
          {formatMoney(p.commission.referenceAmount, p.commission.currency)}
          <span className="block text-[11px] text-gray-500">{p.commission.referenceSource === "offer" ? "offer salary" : "default"}</span>
        </span>
      ),
    },
    {
      key: "commission",
      header: "Commission (demo)",
      align: "right",
      sortValue: (p) => p.commission.amount,
      render: (p) => (
        <span className="whitespace-nowrap">
          <span className={`font-semibold ${p.status === "cancelled" ? "text-gray-400 line-through" : "text-gray-900"}`}>{formatMoney(p.commission.amount, p.commission.currency)}</span>
          <span className="block text-[11px] text-gray-500">{p.commission.model === "fixed" ? "fixed fee" : `${p.commission.ratePercent}% rate`}</span>
        </span>
      ),
    },
    {
      key: "action",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (p) => (
        <Button variant="secondary" size="xs" aria-label={`View the calculation for ${p.candidateName}`} onClick={() => setViewingId(p.id)}>
          Details
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Placements" description="Hires confirmed through CareerBridge and the commission each would generate under the business model." />
      <DemoBanner />
      <QueryBoundary query={query} rows={6}>
        {({ settings, placements, totals }) => {
          const viewing = placements.find((p) => p.id === viewingId);
          return (
            <div className="space-y-6">
              <div className="stagger grid gap-4 sm:grid-cols-3">
                <StatTile label="Active placements" value={totals.count} hint={`${placements.length - totals.count} cancelled`} icon={Handshake} />
                <StatTile
                  label="Illustrative commission"
                  value={totals.estimated.map((t) => formatMoney(t.amount, t.currency)).join(" + ") || "—"}
                  hint="Demo total, not revenue"
                  icon={Calculator}
                />
                <StatTile
                  label="Current model"
                  value={settings.model === "fixed" ? formatMoney(settings.fixedFee, settings.currency) : `${settings.ratePercent}%`}
                  hint={COMMISSION_MODELS[settings.model].label}
                  icon={Percent}
                />
              </div>
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <Card title="Placement records" description="One per hired application. Created only when a recruiter or administrator confirms the hire." bodyClassName="">
                  <DataTable
                    columns={columns}
                    rows={placements}
                    caption="Placements"
                    initialSort={{ key: "hire", dir: "desc" }}
                    empty={
                      <EmptyState icon={Handshake} title="No placements yet">
                        A placement is recorded when a hire is confirmed on an application with an extended offer.
                      </EmptyState>
                    }
                  />
                </Card>
                <SettingsCard key={JSON.stringify(settings)} settings={settings} />
              </div>
              {viewing && <CalculationDialog placement={viewing} onClose={() => setViewingId(null)} />}
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
