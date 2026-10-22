import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BadgeCheck, Briefcase, XCircle } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import TestRunner from "../../components/TestRunner.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { getTest, submitAttempt } from "../../services/candidateApi.js";

function ResultPanel({ result, skillName }) {
  const delta = result.scoreAfter - result.scoreBefore;
  return (
    <section
      aria-live="polite"
      className={`rounded-lg border p-5 ${result.passed ? "border-success/25 bg-success-bg" : "border-warning/25 bg-warning-bg"}`}
    >
      <div className="flex flex-wrap items-center gap-4">
        {result.passed ? (
          <BadgeCheck aria-hidden="true" size={32} className="text-success" />
        ) : (
          <XCircle aria-hidden="true" size={32} className="text-warning" />
        )}
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900">
            {result.passed ? `Passed — ${skillName} is now validated` : "Not passed this time"}
          </p>
          <p className="text-[13px] text-gray-700">
            You scored <span className="font-semibold tabular-nums">{result.score}%</span> ({result.correct}/{result.total} correct). The pass mark is{" "}
            {result.passThreshold}%.
          </p>
        </div>
        {result.scoreBefore !== null && (
          <div className="rounded-md bg-white px-4 py-2 text-center shadow-subtle">
            <p className="text-[11px] text-gray-500">Compatibility</p>
            <p className="text-lg font-semibold text-gray-900 tabular-nums">
              {result.scoreBefore} <ArrowRight aria-label="to" size={14} className="inline" /> {result.scoreAfter}
              {delta > 0 && <span className="ml-1 text-xs font-semibold text-success">+{delta}</span>}
            </p>
          </div>
        )}
      </div>
      {result.newlyEligible.length > 0 && (
        <div className="mt-4 rounded-md bg-white p-3 shadow-subtle">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-900">
            <Briefcase aria-hidden="true" size={16} className="text-accent-600" /> You're now eligible to apply:
          </p>
          <ul className="mt-1.5 space-y-1">
            {result.newlyEligible.map((j) => (
              <li key={j.id}>
                <Link to={`/candidate/jobs/${j.id}`} className="text-[13px] font-medium text-accent-600 hover:underline">
                  {j.title} · {j.companyName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {!result.passed && <p className="mt-3 text-xs text-gray-600">Review the related course, then try again. Every attempt is recorded.</p>}
    </section>
  );
}

export default function TestTakePage() {
  const { testId } = useParams();
  const query = useQuery(() => getTest(testId), [testId]);
  const [run, pending] = useAction();
  const [result, setResult] = useState(null);
  const [round, setRound] = useState(0);

  async function submit(answers) {
    const { ok, result: graded } = await run(() => submitAttempt(testId, answers));
    if (ok) {
      setResult(graded);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/candidate/tests" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> Skill tests
      </Link>
      <QueryBoundary query={query} rows={6} upgradeText="Graded skill tests are part of Max.">
        {(test) => (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{test.title}</h1>
              <p className="mt-1 text-sm text-gray-600">
                {test.questions.length} questions · pass mark {test.passThreshold}% · graded automatically
              </p>
            </div>
            {result && <ResultPanel result={result} skillName={test.skillName} />}
            <TestRunner
              key={round}
              test={test}
              onSubmit={submit}
              pending={pending}
              result={result}
              onRetry={() => {
                setResult(null);
                setRound((r) => r + 1);
              }}
            />
            {result && (
              <div className="flex flex-wrap gap-2">
                <Link to="/candidate/learning" className={buttonClasses("secondary", "", "sm")}>Back to learning path</Link>
                <Link to="/candidate/jobs" className={buttonClasses("secondary", "", "sm")}>See job eligibility</Link>
              </div>
            )}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
