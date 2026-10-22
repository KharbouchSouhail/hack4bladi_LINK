import { useMemo, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import Button from "../../components/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import DataTable, { Toolbar } from "../../components/ui/DataTable.jsx";
import Dialog from "../../components/ui/Dialog.jsx";
import { Checkbox, FilterSelect, Input, SearchInput, Select, Textarea } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { LEVELS, SKILL_CATEGORIES } from "../../domain/constants.js";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { deleteSkill, listSkills, saveSkill } from "../../services/adminApi.js";

function SkillDialog({ skill, allSkills, onClose }) {
  const [form, setForm] = useState(skill ?? { name: "", category: SKILL_CATEGORIES[0], description: "", dependsOn: [] });
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const others = allSkills.filter((s) => s.id !== skill?.id);
  // Live duplicate hint; the service enforces it.
  const duplicate = form.name.trim() && others.find((s) => s.name.toLowerCase() === form.name.trim().toLowerCase());

  function toggleDep(id) {
    setForm((f) => ({ ...f, dependsOn: f.dependsOn.includes(id) ? f.dependsOn.filter((d) => d !== id) : [...f.dependsOn, id] }));
  }

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => saveSkill(form), { success: skill ? "Skill saved." : "Skill added." });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={skill ? `Edit ${skill.name}` : "Add skill"}
      description="Canonical skills are shared by profiles, courses, tests and résumé extraction."
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button loading={pending} variant="solid" size="sm" type="submit" form="skill-form" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      <form id="skill-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Canonical name" value={form.name} onChange={set("name")} error={errors.name ?? (duplicate ? `“${duplicate.name}” already exists.` : undefined)} />
          <Select label="Category" value={form.category} onChange={set("category")} error={errors.category} options={SKILL_CATEGORIES.map((c) => ({ value: c, label: c }))} />
        </div>
        <Textarea label="Description" rows={3} value={form.description} onChange={set("description")} error={errors.description} />
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-gray-800">Prerequisites (used to order learning paths)</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {others.map((s) => (
              <Checkbox key={s.id} label={s.name} checked={form.dependsOn.includes(s.id)} onChange={() => toggleDep(s.id)} />
            ))}
          </div>
        </fieldset>
        <p className="text-xs text-gray-500">Proficiency levels are shared by all skills: {Object.values(LEVELS).join(", ")}.</p>
      </form>
    </Dialog>
  );
}

function SkillTable({ skills, onEdit }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [askDelete, deleteDialog] = useConfirm({
    title: (s) => `Delete ${s.name}?`,
    message: (s) => `${s.name} will be removed permanently. Skills used by profiles, courses, tests or jobs can't be deleted.`,
    action: (s) => deleteSkill(s.id),
    success: (s) => `${s.name} deleted.`,
  });
  const rows = useMemo(
    () => skills.filter((s) => (!category || s.category === category) && `${s.name} ${s.description}`.toLowerCase().includes(search.trim().toLowerCase())),
    [skills, category, search],
  );

  const columns = [
    {
      key: "name",
      header: "Skill",
      sortValue: (s) => s.name,
      render: (s) => (
        <div className="max-w-sm">
          <p className="font-medium text-gray-900">{s.name}</p>
          <p className="text-xs text-gray-500">{s.description}</p>
        </div>
      ),
    },
    { key: "category", header: "Category", sortValue: (s) => s.category, render: (s) => <Badge>{s.category}</Badge> },
    {
      key: "profiles",
      header: "Used in profiles",
      sortValue: (s) => s.profiles.length,
      render: (s) => (s.profiles.length ? <span className="text-xs">{s.profiles.join(", ")}</span> : <span className="text-xs text-gray-500">None</span>),
    },
    { key: "courses", header: "Courses", align: "right", sortValue: (s) => s.courses, render: (s) => s.courses },
    { key: "tests", header: "Tests", align: "right", sortValue: (s) => s.tests, render: (s) => s.tests },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (s) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="xs" aria-label={`Edit ${s.name}`} onClick={() => onEdit(s)}><Pencil size={15} /></Button>
          <Button variant="ghost" size="xs" aria-label={`Delete ${s.name}`} onClick={() => askDelete(s)}><Trash2 size={15} /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput label="Search skills" placeholder="Search skills" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        <FilterSelect label="Category" value={category} onChange={(e) => setCategory(e.target.value)} options={[{ value: "", label: "All categories" }, ...SKILL_CATEGORIES.map((c) => ({ value: c, label: c }))]} />
      </Toolbar>
      <DataTable columns={columns} rows={rows} caption="Skills" initialSort={{ key: "name", dir: "asc" }} empty={<EmptyState title="No skills match" />} />
      {deleteDialog}
    </>
  );
}

export default function AdminSkillsPage() {
  const query = useQuery(listSkills);
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <PageHeader
        title="Skills"
        description="The canonical competency list. Duplicate names are rejected so evidence always maps to one skill."
        actions={<Button variant="solid" size="sm" onClick={() => setEditing({})} disabled={!query.data}><Plus aria-hidden="true" size={16} /> Add skill</Button>}
      />
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(skills) => <SkillTable skills={skills} onEdit={setEditing} />}
        </QueryBoundary>
      </Card>
      {editing && query.data && <SkillDialog skill={editing.id ? editing : null} allSkills={query.data} onClose={() => setEditing(null)} />}
    </div>
  );
}
