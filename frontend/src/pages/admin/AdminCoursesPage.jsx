import { useMemo, useState } from "react";
import { Archive, Pencil, Plus, Send, Trash2 } from "lucide-react";
import Button from "../../components/Button.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import DataTable, { Toolbar } from "../../components/ui/DataTable.jsx";
import Dialog from "../../components/ui/Dialog.jsx";
import { FilterSelect, Input, SearchInput, Select, Textarea } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { DIFFICULTIES, PUBLISH_STATUSES } from "../../domain/constants.js";
import { useConfirm } from "../../hooks/useConfirm.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDuration } from "../../lib/format.js";
import { deleteCourse, getReferenceData, listCourses, saveCourse, setCourseStatus } from "../../services/adminApi.js";

const NEW_LESSON = { title: "", minutes: 20 };

function CourseDialog({ course, skills, onClose }) {
  const [form, setForm] = useState(
    course ?? { title: "", skillId: skills[0]?.id ?? "", difficulty: "Beginner", order: 1, provider: "", videoUrl: "", description: "", lessons: [{ ...NEW_LESSON }] },
  );
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setLesson = (i, key) => (e) =>
    setForm((f) => ({ ...f, lessons: f.lessons.map((l, j) => (j === i ? { ...l, [key]: key === "minutes" ? Number(e.target.value) : e.target.value } : l)) }));

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => saveCourse(form), { success: course ? "Course saved." : "Course added as a draft." });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open
      onClose={onClose}
      size="xl"
      title={course ? `Edit ${course.title}` : "Add course"}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button loading={pending} variant="solid" size="sm" type="submit" form="course-form" disabled={pending}>{pending ? "Saving…" : "Save course"}</Button>
        </>
      }
    >
      <form id="course-form" onSubmit={submit} noValidate className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Title" value={form.title} onChange={set("title")} error={errors.title} className="sm:col-span-2" />
          <Select label="Target skill" value={form.skillId} onChange={set("skillId")} error={errors.skillId} options={skills.map((s) => ({ value: s.id, label: s.name }))} />
          <Select label="Difficulty" value={form.difficulty} onChange={set("difficulty")} error={errors.difficulty} options={DIFFICULTIES.map((d) => ({ value: d, label: d }))} />
          <Input label="Order within the skill" type="number" min={1} value={form.order} onChange={set("order")} error={errors.order} hint="1 is taken first in the learning path." />
          <Input label="Provider" value={form.provider} onChange={set("provider")} placeholder="Link Academy" />
          <Input label="Video URL" value={form.videoUrl} onChange={set("videoUrl")} error={errors.videoUrl} placeholder="https://www.youtube.com/watch?v=…" className="sm:col-span-2" hint="YouTube links are embedded on the course page." />
        </div>
        <Textarea label="Description" rows={2} value={form.description} onChange={set("description")} />
        <fieldset>
          <legend className="mb-2 text-xs font-medium text-gray-800">Lessons (completion criteria: every lesson marked complete)</legend>
          <ol className="space-y-2">
            {form.lessons.map((l, i) => (
              <li key={l.id ?? i} className="grid grid-cols-[1fr_6rem_auto] items-center gap-2">
                <Input aria-label={`Lesson ${i + 1} title`} value={l.title} onChange={setLesson(i, "title")} placeholder={`Lesson ${i + 1}`} />
                <Input aria-label={`Lesson ${i + 1} minutes`} type="number" min={1} value={l.minutes} onChange={setLesson(i, "minutes")} />
                <Button variant="ghost" size="xs" aria-label={`Remove lesson ${i + 1}`} disabled={form.lessons.length === 1} onClick={() => setForm((f) => ({ ...f, lessons: f.lessons.filter((_, j) => j !== i) }))}>
                  <Trash2 size={15} />
                </Button>
              </li>
            ))}
          </ol>
          {errors.lessons && <p className="mt-1.5 text-xs text-error">{errors.lessons}</p>}
          <Button variant="secondary" size="xs" className="mt-2" onClick={() => setForm((f) => ({ ...f, lessons: [...f.lessons, { ...NEW_LESSON }] }))}>
            <Plus aria-hidden="true" size={14} /> Add lesson
          </Button>
        </fieldset>
      </form>
    </Dialog>
  );
}

function CourseTable({ courses, skills, onEdit }) {
  const [search, setSearch] = useState("");
  const [skill, setSkill] = useState("");
  const [status, setStatus] = useState("");
  const [run] = useAction();
  const [askDelete, deleteDialog] = useConfirm({
    title: (c) => `Delete ${c.title}?`,
    message: (c) => `${c.title} and all learner progress on it (${c.learners} learner${c.learners === 1 ? "" : "s"}) will be removed permanently.`,
    action: (c) => deleteCourse(c.id),
    success: (c) => `${c.title} deleted.`,
  });
  const rows = useMemo(
    () => courses.filter((c) => (!skill || c.skillId === skill) && (!status || c.status === status) && c.title.toLowerCase().includes(search.trim().toLowerCase())),
    [courses, skill, status, search],
  );

  const columns = [
    {
      key: "title",
      header: "Course",
      sortValue: (c) => c.title,
      render: (c) => (
        <div>
          <p className="font-medium text-gray-900">{c.title}</p>
          <p className="text-xs text-gray-500">{c.provider} · {c.lessons.length} lessons{c.videoUrl ? " · video" : ""}</p>
        </div>
      ),
    },
    { key: "skill", header: "Skill", sortValue: (c) => c.skillName, render: (c) => <Badge tone="accent">{c.skillName}</Badge> },
    { key: "order", header: "Order", align: "right", sortValue: (c) => c.order, render: (c) => c.order },
    { key: "difficulty", header: "Difficulty", sortValue: (c) => DIFFICULTIES.indexOf(c.difficulty), render: (c) => c.difficulty },
    { key: "duration", header: "Duration", align: "right", sortValue: (c) => c.minutes, render: (c) => formatDuration(c.minutes) },
    { key: "learners", header: "Learners", align: "right", sortValue: (c) => c.learners, render: (c) => c.learners },
    { key: "status", header: "Status", sortValue: (c) => c.status, render: (c) => <StatusBadge map={PUBLISH_STATUSES} value={c.status} /> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      render: (c) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="xs" aria-label={`Edit ${c.title}`} title="Edit" onClick={() => onEdit(c)}><Pencil size={15} /></Button>
          <Button
            variant="ghost"
            size="xs"
            title={c.status === "published" ? "Archive" : "Publish"}
            aria-label={`${c.status === "published" ? "Archive" : "Publish"} ${c.title}`}
            onClick={() => run(() => setCourseStatus(c.id, c.status === "published" ? "archived" : "published"), { success: `${c.title} ${c.status === "published" ? "archived" : "published"}.` })}
          >
            {c.status === "published" ? <Archive size={15} /> : <Send size={15} />}
          </Button>
          <Button variant="ghost" size="xs" aria-label={`Delete ${c.title}`} title="Delete" onClick={() => askDelete(c)}><Trash2 size={15} /></Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <Toolbar>
        <SearchInput label="Search courses" placeholder="Search courses" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        <FilterSelect label="Skill" value={skill} onChange={(e) => setSkill(e.target.value)} options={[{ value: "", label: "All skills" }, ...skills.map((s) => ({ value: s.id, label: s.name }))]} />
        <FilterSelect label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: "", label: "All statuses" }, ...Object.entries(PUBLISH_STATUSES).map(([value, s]) => ({ value, label: s.label }))]} />
      </Toolbar>
      <DataTable columns={columns} rows={rows} caption="Courses" initialSort={{ key: "skill", dir: "asc" }} empty={<EmptyState title="No courses match" />} />
      {deleteDialog}
    </>
  );
}

export default function AdminCoursesPage() {
  const query = useQuery(listCourses);
  const ref = useQuery(getReferenceData);
  const [editing, setEditing] = useState(null);

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Learning resources mapped to skills. Published courses appear in candidates' learning paths in order."
        actions={<Button variant="solid" size="sm" onClick={() => setEditing({})} disabled={!ref.data}><Plus aria-hidden="true" size={16} /> Add course</Button>}
      />
      <Card bodyClassName="">
        <QueryBoundary query={query} rows={6}>
          {(courses) => <CourseTable courses={courses} skills={ref.data?.skills ?? []} onEdit={setEditing} />}
        </QueryBoundary>
      </Card>
      {editing && ref.data && <CourseDialog course={editing.id ? editing : null} skills={ref.data.skills} onClose={() => setEditing(null)} />}
    </div>
  );
}
