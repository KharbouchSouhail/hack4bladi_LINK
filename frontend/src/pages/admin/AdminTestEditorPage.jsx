import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Eye, Plus, Trash2 } from "lucide-react";
import Button from "../../components/Button.jsx";
import TestRunner from "../../components/TestRunner.jsx";
import Card from "../../components/ui/Card.jsx";
import { FormError, Input, Select, Textarea } from "../../components/ui/form.jsx";
import { LoadingState, QueryBoundary } from "../../components/ui/states.jsx";
import { gradeAttempt } from "../../domain/learning.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { getReferenceData, getTest, saveTest } from "../../services/adminApi.js";

const newQuestion = () => ({ prompt: "", code: "", options: ["", "", "", ""], correctIndex: 0 });

function QuestionEditor({ question, index, onChange, onRemove, canRemove }) {
  const set = (key, value) => onChange({ ...question, [key]: value });
  return (
    <fieldset className="rounded-lg border border-gray-200 p-4">
      <legend className="px-1 text-xs font-semibold text-gray-700">Question {index + 1}</legend>
      <div className="space-y-3">
        <Textarea label="Prompt" rows={2} value={question.prompt} onChange={(e) => set("prompt", e.target.value)} />
        <Textarea label="Code snippet (optional)" rows={2} value={question.code} onChange={(e) => set("code", e.target.value)} className="font-mono" />
        <div>
          <p className="mb-1.5 text-xs font-medium text-gray-800">Options — select the correct answer</p>
          <ul className="space-y-2">
            {question.options.map((option, oi) => (
              <li key={oi} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`correct-${index}`}
                  aria-label={`Option ${oi + 1} is correct`}
                  checked={question.correctIndex === oi}
                  onChange={() => set("correctIndex", oi)}
                  className="accent-accent-500"
                />
                <Input
                  aria-label={`Option ${oi + 1}`}
                  value={option}
                  placeholder={`Option ${oi + 1}${oi > 1 ? " (optional)" : ""}`}
                  onChange={(e) => set("options", question.options.map((o, j) => (j === oi ? e.target.value : o)))}
                  className="flex-1"
                />
              </li>
            ))}
          </ul>
        </div>
        <Button variant="ghost" size="xs" onClick={onRemove} disabled={!canRemove}>
          <Trash2 aria-hidden="true" size={14} /> Remove question
        </Button>
      </div>
    </fieldset>
  );
}

function Editor({ test, skills }) {
  const navigate = useNavigate();
  const [form, setForm] = useState(() =>
    test
      ? { ...test, questions: test.questions.map((q) => ({ ...q, options: [...q.options, "", "", "", ""].slice(0, Math.max(4, q.options.length)) })) }
      : { title: "", skillId: skills[0]?.id ?? "", passThreshold: 70, questions: [newQuestion()] },
  );
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);
  const [run, pending] = useAction();
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Preview uses only filled-in options, exactly as candidates will see them.
  const previewTest = {
    ...form,
    questions: form.questions.map((q, i) => {
      const options = q.options.filter((o) => o.trim());
      return { ...q, id: q.id ?? `preview-${i}`, options, correctIndex: options.indexOf(q.options[q.correctIndex]) };
    }),
  };

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => saveTest(form), { success: test ? "Test saved." : "Test created as a draft." });
    if (result.ok) navigate("/admin/assessments");
    else setErrors(result.fieldErrors);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={submit} noValidate className="space-y-5">
        <Card title="Test settings">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Title" value={form.title} onChange={set("title")} error={errors.title} className="sm:col-span-2" />
            <Select label="Skill" value={form.skillId} onChange={set("skillId")} error={errors.skillId} options={skills.map((s) => ({ value: s.id, label: s.name }))} />
            <Input label="Pass mark (%)" type="number" min={1} max={100} value={form.passThreshold} onChange={set("passThreshold")} error={errors.passThreshold} />
          </div>
        </Card>
        <Card title={`Questions (${form.questions.length})`}>
          <div className="space-y-4">
            {form.questions.map((q, i) => (
              <QuestionEditor
                key={q.id ?? i}
                question={q}
                index={i}
                canRemove={form.questions.length > 1}
                onChange={(next) => setForm((f) => ({ ...f, questions: f.questions.map((x, j) => (j === i ? next : x)) }))}
                onRemove={() => setForm((f) => ({ ...f, questions: f.questions.filter((_, j) => j !== i) }))}
              />
            ))}
          </div>
          <Button variant="secondary" size="xs" className="mt-3" onClick={() => setForm((f) => ({ ...f, questions: [...f.questions, newQuestion()] }))}>
            <Plus aria-hidden="true" size={14} /> Add question
          </Button>
          <div className="mt-3">
            <FormError>{errors.questions}</FormError>
          </div>
        </Card>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" variant="solid" size="sm" disabled={pending}>{pending ? "Saving…" : "Save test"}</Button>
          <Button variant="secondary" size="sm" className="xl:hidden" onClick={() => setPreview((p) => !p)}>
            <Eye aria-hidden="true" size={16} /> {preview ? "Hide preview" : "Preview"}
          </Button>
        </div>
      </form>

      <div className={`${preview ? "" : "hidden"} xl:block`}>
        <div className="xl:sticky xl:top-24">
          <Card title="Candidate preview" description={`Graded locally · pass mark ${form.passThreshold}%`}>
            <TestRunner
              key={JSON.stringify(previewTest.questions.map((q) => [q.prompt, q.options]))}
              test={previewTest}
              result={previewResult}
              submitLabel="Check answers"
              onSubmit={(answers) => setPreviewResult(gradeAttempt({ ...previewTest, passThreshold: Number(form.passThreshold) }, answers))}
              onRetry={() => setPreviewResult(null)}
            >
              {previewResult && (
                <p className="text-[13px] font-semibold text-gray-900">
                  Preview score: {previewResult.score}% — {previewResult.passed ? "pass" : "fail"}
                </p>
              )}
            </TestRunner>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminTestEditorPage() {
  const { testId } = useParams();
  const isNew = testId === "new";
  const test = useQuery(() => (isNew ? Promise.resolve(null) : getTest(testId)), [testId]);
  const ref = useQuery(getReferenceData);

  return (
    <div>
      <Link to="/admin/assessments" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> Assessments and tests
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-gray-900">{isNew ? "New skill test" : "Edit skill test"}</h1>
      {ref.loading ? (
        <LoadingState rows={6} />
      ) : (
        <QueryBoundary query={test} rows={6}>
          {(data) => <Editor test={data} skills={ref.data.skills} />}
        </QueryBoundary>
      )}
    </div>
  );
}
