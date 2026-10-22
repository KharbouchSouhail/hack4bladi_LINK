import { useState } from "react";
import { CheckCircle2, CircleDashed, EyeOff, FileText, Info, Mail, MapPin } from "lucide-react";
import { EligibilityBadge } from "../candidate/shared.jsx";
import Badge, { StatusBadge } from "../ui/Badge.jsx";
import Card from "../ui/Card.jsx";
import { Select, Textarea } from "../ui/form.jsx";
import { ProgressBar } from "../ui/Progress.jsx";
import { APPLICATION_STATUSES, REQUIREMENT_RULES } from "../../domain/constants.js";
import { useAction } from "../../hooks/useQuery.js";
import { formatDate, initials } from "../../lib/format.js";
import Button from "../Button.jsx";

function NotShared() {
  return (
    <p className="flex items-center gap-2 text-[13px] text-gray-500">
      <EyeOff aria-hidden="true" size={16} /> The candidate chose not to share this.
    </p>
  );
}

const STRENGTH_TEXT = { professional: "Work experience", demonstrated: "Project", mentioned: "Listed" };

function StatusForm({ detail, onStatusChange }) {
  const [status, setStatus] = useState(detail.status);
  const [note, setNote] = useState("");
  const [run, pending] = useAction();

  async function submit(event) {
    event.preventDefault();
    const { ok } = await run(() => onStatusChange(detail.id, status, note), { success: `Status updated to ${APPLICATION_STATUSES[status].label}.` });
    if (ok) setNote("");
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <Select label="Application status" value={status} onChange={(e) => setStatus(e.target.value)} options={Object.entries(APPLICATION_STATUSES).map(([value, s]) => ({ value, label: s.label }))} />
      <Textarea label="Internal note (optional)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button loading={pending} type="submit" variant="solid" size="sm" className="w-full" disabled={pending || status === detail.status}>
        {pending ? "Updating…" : "Update status"}
      </Button>
      <p className="text-[11px] text-gray-500">The candidate is notified. Hiring decisions are always yours; Link only records them.</p>
    </form>
  );
}

// Full review of one application, shared by the company pipeline and the admin console.
export default function ApplicationReview({ detail, onStatusChange }) {
  const confirmed = detail.evidence?.filter((e) => e.confirmed) ?? [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent-100 text-sm font-semibold text-accent-700">{initials(detail.candidate.name)}</span>
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{detail.candidate.name}</h1>
            <p className="text-sm text-gray-600">{detail.candidate.headline}</p>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
              {detail.candidate.location && <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={13} /> {detail.candidate.location}</span>}
              {detail.candidate.email && <span className="inline-flex items-center gap-1"><Mail aria-hidden="true" size={13} /> {detail.candidate.email}</span>}
              {detail.candidate.resume && <span className="inline-flex items-center gap-1"><FileText aria-hidden="true" size={13} /> {detail.candidate.resume.fileName}</span>}
            </p>
          </div>
        </div>

        <Card title="Job requirements" description={`${detail.job.title} · eligibility from recorded evidence`} action={<EligibilityBadge status={detail.eligibility} />}>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {detail.checklist.map((c) => (
              <li key={c.skillId} className="flex items-start gap-2 text-[13px]">
                {c.met ? <CheckCircle2 aria-label="Met" size={16} className="mt-px shrink-0 text-success" /> : <CircleDashed aria-label="Not met" size={16} className="mt-px shrink-0 text-gray-400" />}
                <span>
                  <span className="font-medium text-gray-900">{c.name}</span>
                  <span className="block text-xs text-gray-500">{REQUIREMENT_RULES[c.rule]} · {c.mandatory ? "mandatory" : "preferred"}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Skill-test results" description="Validated evidence, graded automatically.">
          {detail.assessments === null ? (
            <NotShared />
          ) : detail.assessments.length === 0 ? (
            <p className="text-[13px] text-gray-500">No tests taken yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {detail.assessments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-[13px] font-medium text-gray-900">{a.skillName}</p>
                    <p className="text-xs text-gray-500">{formatDate(a.createdAt)} · {a.score}%</p>
                  </div>
                  <Badge tone={a.passed ? "success" : "warning"}>{a.passed ? "Passed" : "Not passed"}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Résumé evidence" description="Extracted from the résumé — not verified.">
          {detail.evidence === null ? (
            <NotShared />
          ) : (
            <ul className="space-y-3">
              {detail.evidence.filter((e) => e.strength).map((e) => (
                <li key={e.skillId} className="text-[13px]">
                  <span className="font-medium text-gray-900">{e.name}</span> <span className="text-xs text-gray-500">· {STRENGTH_TEXT[e.strength]}</span>
                  {e.quote && <p className="mt-0.5 text-xs text-gray-600 italic">“{e.quote}”</p>}
                </li>
              ))}
            </ul>
          )}
          {confirmed.length > 0 && (
            <div className="mt-4 border-t border-gray-100 pt-3">
              <p className="text-xs font-medium text-gray-700">Confirmed by the candidate</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {confirmed.map((e) => <Badge key={e.skillId} tone="accent">{e.name}</Badge>)}
              </div>
            </div>
          )}
        </Card>

        <Card title="Learning progress">
          {detail.learning === null ? (
            <NotShared />
          ) : detail.learning.length === 0 ? (
            <p className="text-[13px] text-gray-500">No courses started.</p>
          ) : (
            <ul className="space-y-3">
              {detail.learning.map((c) => (
                <li key={c.id}>
                  <div className="mb-1 flex justify-between text-[13px]">
                    <span className="text-gray-900">{c.title}</span>
                    <span className="text-gray-500 tabular-nums">{c.progress}%</span>
                  </div>
                  <ProgressBar value={c.progress} label={`${c.title} progress`} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="space-y-5">
        <Card title="Application">
          <StatusBadge map={APPLICATION_STATUSES} value={detail.status} />
          <p className="mt-2 text-xs text-gray-500">Applied {formatDate(detail.createdAt)} to {detail.job.title}</p>
          {detail.note && <blockquote className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-[13px] text-gray-700">“{detail.note}”</blockquote>}
          <div className="mt-4 border-t border-gray-100 pt-4">
            <StatusForm key={detail.status} detail={detail} onStatusChange={onStatusChange} />
          </div>
        </Card>

        {detail.match && (
          <Card title="Profile alignment">
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">{detail.match.score}<span className="text-sm font-normal text-gray-500"> / 100</span></p>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-gray-500">
              <Info aria-hidden="true" size={13} className="mt-px shrink-0" />
              Estimated from résumé evidence and tests for {detail.match.profileTitle}. Not a measure of professional ability, and never a sole basis for a decision.
            </p>
          </Card>
        )}

        <Card title="History">
          <ol className="space-y-2.5">
            {[...detail.history].reverse().map((h, i) => (
              <li key={i} className="text-[13px]">
                <span className="font-medium text-gray-900">{APPLICATION_STATUSES[h.status].label}</span>
                <span className="text-xs text-gray-500"> · {formatDate(h.at)}</span>
                {h.note && <p className="text-xs text-gray-600">{h.note}</p>}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </div>
  );
}
