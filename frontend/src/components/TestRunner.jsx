import { useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import Button from "./Button.jsx";
import { FormError } from "./ui/form.jsx";

// Renders a multiple-choice test. Grading happens in onSubmit (the service for candidates,
// a local preview for admins); the result only says which answers were right, not the solutions.
export default function TestRunner({ test, onSubmit, pending, result, onRetry, submitLabel = "Submit answers", children }) {
  const [answers, setAnswers] = useState({});
  const [error, setError] = useState("");
  const answered = Object.keys(answers).length;
  const outcome = result ? Object.fromEntries(result.results.map((r) => [r.questionId, r.correct])) : null;

  function submit(event) {
    event.preventDefault();
    if (answered < test.questions.length) {
      setError(`Answer every question before submitting (${test.questions.length - answered} left).`);
      return;
    }
    setError("");
    onSubmit(answers);
  }

  function retry() {
    setAnswers({});
    onRetry();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      {test.questions.map((q, qi) => (
        <fieldset key={q.id} disabled={Boolean(result)} className="rounded-lg border border-gray-200 bg-white p-5 shadow-subtle">
          <legend className="sr-only">Question {qi + 1}</legend>
          <div className="flex items-start justify-between gap-3">
            <p className="text-[13px] font-semibold text-gray-900">
              <span className="mr-1.5 text-gray-400 tabular-nums">{qi + 1}.</span>
              {q.prompt}
            </p>
            {outcome &&
              (outcome[q.id] ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-success">
                  <CheckCircle2 aria-hidden="true" size={16} /> Correct
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-error">
                  <XCircle aria-hidden="true" size={16} /> Incorrect
                </span>
              ))}
          </div>
          {q.code && (
            <div className="mt-3 overflow-x-auto rounded-md bg-navy-950 px-4 py-3">
              <pre className="font-mono text-xs leading-relaxed text-navy-100">{q.code}</pre>
            </div>
          )}
          <div className="mt-3 grid gap-2">
            {q.options.map((option, oi) => {
              const checked = answers[q.id] === oi;
              return (
                <label
                  key={oi}
                  className={`flex cursor-pointer items-center gap-3 rounded-control border px-3 py-2.5 text-[13px] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-600 has-[:disabled]:cursor-default ${
                    checked ? "border-accent-500 bg-accent-50/70 text-gray-900" : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.id}
                    checked={checked}
                    onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                    className="accent-accent-500"
                  />
                  <span>{option}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      <FormError>{error}</FormError>
      {children}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-gray-500 tabular-nums">
          {answered} of {test.questions.length} answered
        </p>
        {result ? (
          <Button variant="secondary" size="sm" onClick={retry}>
            Try again
          </Button>
        ) : (
          <Button variant="solid" size="sm" type="submit" disabled={pending}>
            {pending ? "Grading…" : submitLabel}
          </Button>
        )}
      </div>
    </form>
  );
}
