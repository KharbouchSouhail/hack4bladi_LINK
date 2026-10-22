import { useState } from "react";
import { CalendarPlus, CheckCircle2, CircleDashed, EyeOff, FileText, FlaskConical, Info, Lock, Mail, MapPin, PartyPopper, Send, Star } from "lucide-react";
import { EligibilityBadge } from "../candidate/shared.jsx";
import Badge, { StatusBadge } from "../ui/Badge.jsx";
import Card from "../ui/Card.jsx";
import { ProgressBar } from "../ui/Progress.jsx";
import { APPLICATION_STATUSES, REQUIREMENT_RULES } from "../../domain/constants.js";
import { useAction } from "../../hooks/useQuery.js";
import { formatMoney, PLACEMENT_STATUSES, RECOMMENDATIONS } from "../../domain/recruitment.js";
import { formatDate, formatDateTime, initials } from "../../lib/format.js";
import { CancelInterviewDialog, CompleteInterviewDialog, ConfirmHireDialog, ExtendOfferDialog, RejectDialog, ScheduleInterviewDialog } from "../recruitment/RecruiterDialogs.jsx";
import { InterviewDetails, InterviewStatusBadge, JoinInterviewButton, MeetingLinkNote, StageTracker } from "../recruitment/shared.jsx";
import Button from "../Button.jsx";

function NotShared() {
  return (
    <p className="flex items-center gap-2 text-[13px] text-gray-500">
      <EyeOff aria-hidden="true" size={16} /> The candidate chose not to share this.
    </p>
  );
}

const STRENGTH_TEXT = { professional: "Work experience", demonstrated: "Project", mentioned: "Listed" };

const STAGE_ACTION_LABELS = { under_review: "Move to review", shortlisted: "Shortlist" };

// Only the moves the workflow allows from the current stage are offered.
function StageActions({ detail, api, onOpen }) {
  const [run, pending] = useAction();
  const { actions } = detail;
  const name = detail.candidate.name;
  const scheduled = detail.interviews.find((i) => i.status === "scheduled");

  const move = (status) => run(() => api.updateApplicationStatus(detail.id, status, ""), { success: `${name} moved to ${APPLICATION_STATUSES[status].label}.` });

  const buttons = [];
  if (actions.canHire) {
    buttons.push(
      <Button key="hire" variant="solid" size="sm" className="w-full" onClick={() => onOpen("hire")}>
        <PartyPopper aria-hidden="true" size={16} /> Confirm hire
      </Button>,
    );
  }
  if (actions.canOffer) {
    buttons.push(
      <Button key="offer" variant="solid" size="sm" className="w-full" onClick={() => onOpen("offer")}>
        <Send aria-hidden="true" size={16} /> Extend offer
      </Button>,
    );
  }
  if (actions.canSchedule) {
    buttons.push(
      <Button key="schedule" variant={actions.canOffer ? "secondary" : "solid"} size="sm" className="w-full" onClick={() => onOpen("schedule")}>
        <CalendarPlus aria-hidden="true" size={16} /> {detail.status === "interview_completed" ? "Schedule another round" : "Schedule interview"}
      </Button>,
    );
  }
  for (const status of actions.stages) {
    buttons.push(
      <Button key={status} loading={pending} variant={status === "shortlisted" ? "solid" : "secondary"} size="sm" className="w-full" onClick={() => move(status)}>
        {STAGE_ACTION_LABELS[status] ?? APPLICATION_STATUSES[status].label}
      </Button>,
    );
  }

  if (!actions.canReject && buttons.length === 0) {
    return <p className="text-[13px] text-gray-600">This application is closed. No further stage changes are possible.</p>;
  }

  return (
    <div className="space-y-2">
      {scheduled && (
        <p className="text-xs text-gray-600">
          Interview on {formatDateTime(scheduled.scheduledAt, scheduled.timeZone)}. Complete, reschedule or cancel it in Interviews.
        </p>
      )}
      {buttons}
      {actions.canReject && (
        <Button variant="ghost" size="sm" className="w-full text-error! hover:bg-error-bg!" onClick={() => onOpen("reject")}>
          Reject application
        </Button>
      )}
      <p className="pt-1 text-[11px] text-gray-500">The candidate is notified of every change. Hiring decisions are always yours; CareerBridge only records them.</p>
    </div>
  );
}

function InterviewItem({ interview, onAction }) {
  const started = new Date(interview.scheduledAt).getTime() <= Date.now();
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-gray-900">
          Round {interview.round} <InterviewStatusBadge interview={interview} />
          {interview.candidateConfirmedAt && interview.status === "scheduled" && (
            <Badge tone="success" icon={CheckCircle2}>
              Candidate confirmed
            </Badge>
          )}
        </p>
        {interview.status === "scheduled" && (
          <div className="flex flex-wrap gap-1.5">
            <JoinInterviewButton interview={interview} size="xs" />
            <Button variant="secondary" size="xs" onClick={() => onAction("complete", interview)} disabled={!started} title={started ? undefined : "Available once the interview has started"}>
              Mark completed
            </Button>
            <Button variant="secondary" size="xs" onClick={() => onAction("reschedule", interview)}>
              Reschedule
            </Button>
            <Button variant="ghost" size="xs" className="text-error! hover:bg-error-bg!" onClick={() => onAction("cancel", interview)}>
              Cancel
            </Button>
          </div>
        )}
      </div>
      <InterviewDetails interview={interview} />
      <div className="mt-2">
        <MeetingLinkNote interview={interview} />
      </div>
      {interview.status === "scheduled" && !started && <p className="mt-2 text-[11px] text-gray-500">You can mark it completed once its start time has passed.</p>}
      {interview.status === "cancelled" && interview.cancelReason && <p className="mt-3 text-xs text-gray-600">Cancellation message: “{interview.cancelReason}”</p>}
      {interview.feedback && (
        <div className="mt-3 rounded-md border border-gray-200 bg-gray-50/70 px-3.5 py-3">
          <p className="mb-1.5 flex flex-wrap items-center gap-2 text-xs font-semibold text-gray-800">
            <Lock aria-hidden="true" size={13} /> Internal feedback
            <span className="inline-flex" role="img" aria-label={`${interview.feedback.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} aria-hidden="true" size={13} className={n <= interview.feedback.rating ? "fill-warning text-warning" : "text-gray-300"} />
              ))}
            </span>
            <StatusBadge map={RECOMMENDATIONS} value={interview.feedback.recommendation} />
          </p>
          <p className="text-[13px] whitespace-pre-line text-gray-700">{interview.feedback.notes}</p>
          <p className="mt-1.5 text-[11px] text-gray-500">
            {interview.feedback.by} · {formatDate(interview.feedback.at)} · not visible to the candidate
          </p>
        </div>
      )}
    </li>
  );
}

function InterviewsCard({ detail, onAction }) {
  return (
    <Card
      title="Interviews"
      description="Scheduling, logistics and private feedback."
      action={
        detail.actions.canSchedule && (
          <Button variant="secondary" size="xs" onClick={() => onAction("schedule")}>
            <CalendarPlus aria-hidden="true" size={14} /> Schedule
          </Button>
        )
      }
    >
      {detail.interviews.length === 0 ? (
        <p className="text-[13px] text-gray-500">{detail.actions.canSchedule ? "No interviews yet." : "Shortlist the candidate to schedule an interview."}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {detail.interviews.map((i) => (
            <InterviewItem key={i.id} interview={i} onAction={onAction} />
          ))}
        </ul>
      )}
    </Card>
  );
}

const OFFER_STATUSES = {
  extended: { label: "Awaiting hire confirmation", tone: "accent" },
  accepted: { label: "Hire confirmed", tone: "success" },
  withdrawn: { label: "Withdrawn", tone: "neutral" },
};

function OfferCard({ offer, placement }) {
  const rows = [
    ["Extended", formatDate(offer.extendedAt)],
    offer.startDate && ["Start date", formatDate(offer.startDate)],
    offer.annualSalary && ["Annual salary", formatMoney(offer.annualSalary, offer.currency)],
  ].filter(Boolean);
  return (
    <Card title="Offer and hire" action={<StatusBadge map={OFFER_STATUSES} value={offer.status} />}>
      <dl className="space-y-2 text-[13px]">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <dt className="text-gray-500">{label}</dt>
            <dd className="text-gray-900 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <blockquote className="mt-3 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-700">“{offer.message}”</blockquote>
      {placement && (
        <div className="mt-4 border-t border-gray-100 pt-3 text-[13px]">
          <p className="flex items-center justify-between gap-2">
            <span className="font-medium text-gray-900">Placement recorded</span>
            <StatusBadge map={PLACEMENT_STATUSES} value={placement.status} />
          </p>
          <p className="mt-0.5 text-xs text-gray-500">Hire date {formatDate(placement.hireDate)}</p>
          {placement.commission && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-gray-600">
              <FlaskConical aria-hidden="true" size={13} className="mt-px shrink-0 text-cyan-600" />
              Illustrative commission {formatMoney(placement.commission.amount, placement.commission.currency)}. Demo figure, not invoiced.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// Full review of one application, shared by the company pipeline and the admin console.
// `api` holds the role's recruitment functions (company or admin); each enforces access itself.
export default function ApplicationReview({ detail, api }) {
  const confirmed = detail.evidence?.filter((e) => e.confirmed) ?? [];
  const [dialog, setDialog] = useState(null);
  const open = (kind, interview = null) => setDialog({ kind, interview });
  const close = () => setDialog(null);

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

        <InterviewsCard detail={detail} onAction={open} />

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
          <div className="mt-4">
            <StageTracker status={detail.status} history={detail.history} compact />
          </div>
          <div className="mt-4 border-t border-gray-100 pt-4">
            <StageActions detail={detail} api={api} onOpen={open} />
          </div>
        </Card>

        {detail.offer && <OfferCard offer={detail.offer} placement={detail.placement} />}

        {detail.match && (
          <Card title="Profile alignment">
            <p className="text-2xl font-semibold text-gray-900 tabular-nums">{detail.match.score}<span className="text-sm font-normal text-gray-500"> / 100</span></p>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] text-gray-500">
              <Info aria-hidden="true" size={13} className="mt-px shrink-0" />
              Estimated from résumé evidence and tests for {detail.match.profileTitle}. Not a measure of professional ability, and never a sole basis for a decision.
            </p>
          </Card>
        )}

        <Card title="History" description="Notes are internal and never shown to the candidate.">
          <ol className="space-y-2.5">
            {[...detail.history].reverse().map((h, i) => (
              <li key={i} className="text-[13px]">
                <span className="font-medium text-gray-900">{APPLICATION_STATUSES[h.status]?.label ?? h.status}</span>
                <span className="text-xs text-gray-500">
                  {" "}
                  · {formatDate(h.at)}
                  {h.by && ` · ${h.by}`}
                </span>
                {h.note && <p className="text-xs text-gray-600">{h.note}</p>}
              </li>
            ))}
          </ol>
        </Card>
      </div>
      {dialog?.kind === "schedule" && <ScheduleInterviewDialog open onClose={close} application={detail} api={api} />}
      {dialog?.kind === "reschedule" && <ScheduleInterviewDialog open onClose={close} application={detail} interview={dialog.interview} api={api} />}
      {dialog?.kind === "cancel" && <CancelInterviewDialog open onClose={close} application={detail} interview={dialog.interview} api={api} />}
      {dialog?.kind === "complete" && <CompleteInterviewDialog open onClose={close} interview={dialog.interview} api={api} />}
      {dialog?.kind === "offer" && <ExtendOfferDialog open onClose={close} application={detail} api={api} />}
      {dialog?.kind === "hire" && <ConfirmHireDialog open onClose={close} application={detail} api={api} />}
      {dialog?.kind === "reject" && <RejectDialog open onClose={close} application={detail} api={api} />}
    </div>
  );
}
