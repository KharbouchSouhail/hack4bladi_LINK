import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { IMPORTANCE, LEVELS } from "../../domain/constants.js";
import { useAction } from "../../hooks/useQuery.js";
import Button from "../Button.jsx";
import Dialog from "../ui/Dialog.jsx";
import { FormError, Input, Select, Textarea } from "../ui/form.jsx";

const NEW_ROW = { skillId: "", weight: 10, level: 2, importance: "required" };

function initialForm(profile, companies) {
  if (profile) return { ...profile, skills: profile.skills.map(({ skillId, weight, level, importance }) => ({ skillId, weight, level, importance })) };
  return { companyId: companies?.[0]?.id ?? "", title: "", description: "", education: "", experience: "", skills: [{ ...NEW_ROW }] };
}

// Create or edit an employer-defined job profile. `companies` is only passed by admins.
export default function ProfileEditorDialog({ profile, skills, companies, onSave, onClose }) {
  const [form, setForm] = useState(() => initialForm(profile, companies));
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const totalWeight = form.skills.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setRow = (index, key) => (e) =>
    setForm((f) => ({ ...f, skills: f.skills.map((row, i) => (i === index ? { ...row, [key]: e.target.value } : row)) }));

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => onSave(form), { success: profile ? "Job profile saved." : "Job profile created as a draft." });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  const skillOptions = skills.map((s) => ({ value: s.id, label: s.name }));

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={profile ? `Edit ${profile.title}` : "New job profile"}
      description="The competencies, levels and weights used to assess candidates for this role."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button loading={pending} variant="solid" size="sm" type="submit" form="profile-form" disabled={pending}>
            {pending ? "Saving…" : "Save profile"}
          </Button>
        </>
      }
    >
      <form id="profile-form" onSubmit={submit} noValidate className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          {companies && (
            <Select label="Company" value={form.companyId} onChange={set("companyId")} error={errors.companyId} options={companies.map((c) => ({ value: c.id, label: c.name }))} />
          )}
          <Input label="Role title" value={form.title} onChange={set("title")} error={errors.title} placeholder="e.g. Junior Data Scientist" />
        </div>
        <Textarea label="Role description" rows={3} value={form.description} onChange={set("description")} error={errors.description} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Education requirements" value={form.education} onChange={set("education")} />
          <Input label="Experience requirements" value={form.experience} onChange={set("experience")} />
        </div>

        <fieldset>
          <legend className="mb-2 flex w-full flex-wrap items-baseline justify-between gap-2 text-xs font-medium text-gray-800">
            Competencies
            <span className={`font-normal tabular-nums ${totalWeight === 100 ? "text-gray-500" : "text-warning"}`}>
              Total weight {totalWeight}%{totalWeight !== 100 && " · weights are normalised, but 100% is easier to read"}
            </span>
          </legend>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-[13px]">
              <thead>
                <tr className="text-[11px] text-gray-500">
                  <th className="pb-1.5 font-medium">Skill</th>
                  <th className="pb-1.5 font-medium">Importance</th>
                  <th className="pb-1.5 font-medium">Expected level</th>
                  <th className="pb-1.5 font-medium">Weight %</th>
                  <th className="pb-1.5"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {form.skills.map((row, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <Select aria-label={`Skill ${i + 1}`} value={row.skillId} onChange={setRow(i, "skillId")} placeholder="Choose…" options={skillOptions} />
                    </td>
                    <td className="py-1 pr-2">
                      <Select aria-label={`Importance ${i + 1}`} value={row.importance} onChange={setRow(i, "importance")} options={Object.entries(IMPORTANCE).map(([value, x]) => ({ value, label: x.label }))} />
                    </td>
                    <td className="py-1 pr-2">
                      <Select aria-label={`Level ${i + 1}`} value={row.level} onChange={setRow(i, "level")} options={Object.entries(LEVELS).map(([value, label]) => ({ value, label }))} />
                    </td>
                    <td className="w-24 py-1 pr-2">
                      <Input aria-label={`Weight ${i + 1}`} type="number" min={1} max={100} value={row.weight} onChange={setRow(i, "weight")} />
                    </td>
                    <td className="w-10 py-1">
                      <Button
                        variant="ghost"
                        size="xs"
                        aria-label={`Remove row ${i + 1}`}
                        disabled={form.skills.length === 1}
                        onClick={() => setForm((f) => ({ ...f, skills: f.skills.filter((_, j) => j !== i) }))}
                      >
                        <Trash2 size={15} />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors.skills && <p className="mt-1.5 text-xs text-error">{errors.skills}</p>}
          <Button variant="secondary" size="xs" className="mt-2" onClick={() => setForm((f) => ({ ...f, skills: [...f.skills, { ...NEW_ROW }] }))}>
            <Plus aria-hidden="true" size={14} /> Add competency
          </Button>
        </fieldset>
        {profile && <p className="text-xs text-gray-500">Changing competencies creates version {profile.version + 1}; existing scores remain traceable to version {profile.version}.</p>}
        <FormError>{errors.form}</FormError>
      </form>
    </Dialog>
  );
}
