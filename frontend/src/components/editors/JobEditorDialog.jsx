import { useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { EMPLOYMENT_TYPES, REQUIREMENT_RULES, WORK_MODES } from "../../domain/constants.js";
import { useAction } from "../../hooks/useQuery.js";
import Button from "../Button.jsx";
import Dialog from "../ui/Dialog.jsx";
import { Checkbox, Input, Select, Textarea } from "../ui/form.jsx";

const NEW_REQ = { skillId: "", rule: "test_passed", mandatory: true };
const toOptions = (list) => list.map((v) => ({ value: v, label: v }));

function initialForm(job, companies, profiles) {
  if (job) return { ...job, requirements: job.requirements.map(({ skillId, rule, mandatory }) => ({ skillId, rule, mandatory })) };
  const companyId = companies?.[0]?.id ?? profiles[0]?.companyId ?? "";
  return {
    companyId,
    profileId: profiles.find((p) => p.companyId === companyId && p.status !== "archived")?.id ?? "",
    title: "",
    location: "",
    workMode: "Hybrid",
    employmentType: "Full-time",
    description: "",
    requirements: [{ ...NEW_REQ }],
  };
}

// Create or edit a job listing and its eligibility rules. `companies` is only passed by admins.
export default function JobEditorDialog({ job, profiles, skills, companies, onSave, onClose }) {
  const [form, setForm] = useState(() => initialForm(job, companies, profiles));
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();

  const companyProfiles = profiles.filter((p) => p.companyId === form.companyId && p.status !== "archived");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setReq = (index, key, value) =>
    setForm((f) => ({ ...f, requirements: f.requirements.map((r, i) => (i === index ? { ...r, [key]: value } : r)) }));

  function changeCompany(e) {
    const companyId = e.target.value;
    setForm((f) => ({ ...f, companyId, profileId: profiles.find((p) => p.companyId === companyId && p.status !== "archived")?.id ?? "" }));
  }

  // Required profile skills become mandatory test requirements; preferred ones become optional evidence.
  function copyFromProfile() {
    const profile = profiles.find((p) => p.id === form.profileId);
    if (!profile?.skills) return;
    setForm((f) => ({
      ...f,
      requirements: profile.skills.map((s) => ({
        skillId: s.skillId,
        rule: s.importance === "required" ? "test_passed" : "evidence",
        mandatory: s.importance === "required",
      })),
    }));
  }

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => onSave(form), { success: job ? "Job listing saved." : "Job listing created as a draft." });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={job ? `Edit ${job.title}` : "New job listing"}
      description="Eligibility is checked against these requirements and each candidate's recorded evidence."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button loading={pending} variant="solid" size="sm" type="submit" form="job-form" disabled={pending}>
            {pending ? "Saving…" : "Save job"}
          </Button>
        </>
      }
    >
      <form id="job-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {companies && (
            <Select label="Company" value={form.companyId} onChange={changeCompany} error={errors.companyId} options={companies.map((c) => ({ value: c.id, label: c.name }))} />
          )}
          <Select
            label="Job profile"
            value={form.profileId}
            onChange={set("profileId")}
            error={errors.profileId}
            placeholder={companyProfiles.length ? "Choose a profile" : "Create a job profile first"}
            options={companyProfiles.map((p) => ({ value: p.id, label: `${p.title}${p.status === "draft" ? " (draft)" : ""}` }))}
          />
          <Input label="Job title" value={form.title} onChange={set("title")} error={errors.title} placeholder="e.g. Junior Data Scientist" />
          <Input label="Location" value={form.location} onChange={set("location")} error={errors.location} placeholder="e.g. Casablanca" />
          <Select label="Work arrangement" value={form.workMode} onChange={set("workMode")} error={errors.workMode} options={toOptions(WORK_MODES)} />
          <Select label="Employment type" value={form.employmentType} onChange={set("employmentType")} error={errors.employmentType} options={toOptions(EMPLOYMENT_TYPES)} />
        </div>
        <Textarea label="Description" rows={4} value={form.description} onChange={set("description")} error={errors.description} />

        <fieldset>
          <legend className="mb-2 flex w-full flex-wrap items-center justify-between gap-2 text-xs font-medium text-gray-800">
            Eligibility requirements
            <Button variant="ghost" size="xs" onClick={copyFromProfile} disabled={!form.profileId}>
              <Copy aria-hidden="true" size={14} /> Copy from profile
            </Button>
          </legend>
          <ul className="space-y-2">
            {form.requirements.map((r, i) => (
              <li key={i} className="grid items-center gap-2 rounded-md border border-gray-200 p-2.5 sm:grid-cols-[1fr_1fr_auto_auto]">
                <Select aria-label={`Requirement ${i + 1} skill`} value={r.skillId} onChange={(e) => setReq(i, "skillId", e.target.value)} placeholder="Choose a skill" options={skills.map((s) => ({ value: s.id, label: s.name }))} />
                <Select aria-label={`Requirement ${i + 1} rule`} value={r.rule} onChange={(e) => setReq(i, "rule", e.target.value)} options={Object.entries(REQUIREMENT_RULES).map(([value, label]) => ({ value, label }))} />
                <Checkbox label="Mandatory" checked={r.mandatory} onChange={(e) => setReq(i, "mandatory", e.target.checked)} />
                <Button
                  variant="ghost"
                  size="xs"
                  aria-label={`Remove requirement ${i + 1}`}
                  disabled={form.requirements.length === 1}
                  onClick={() => setForm((f) => ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }))}
                >
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ul>
          {errors.requirements && <p className="mt-1.5 text-xs text-error">{errors.requirements}</p>}
          <Button variant="secondary" size="xs" className="mt-2" onClick={() => setForm((f) => ({ ...f, requirements: [...f.requirements, { ...NEW_REQ }] }))}>
            <Plus aria-hidden="true" size={14} /> Add requirement
          </Button>
          <p className="mt-2 text-[11px] text-gray-500">
            “Skill test passed” requires a passed Link test. “Evidence on profile” accepts résumé evidence or a candidate-confirmed skill.
          </p>
        </fieldset>
      </form>
    </Dialog>
  );
}
