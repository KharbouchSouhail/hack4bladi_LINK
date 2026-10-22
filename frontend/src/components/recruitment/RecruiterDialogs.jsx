import { useState } from "react";
import { FlaskConical, Lock, Star, Wand2 } from "lucide-react";
import { DURATIONS, INTERVIEW_TYPES, RECOMMENDATIONS, TIME_ZONES, utcToZoned } from "../../domain/recruitment.js";
import { useAction } from "../../hooks/useQuery.js";
import { formatDate, formatDateTime, formatDuration } from "../../lib/format.js";
import { demoMeetingLink } from "../../services/recruitment.js";
import Button from "../Button.jsx";
import Dialog from "../ui/Dialog.jsx";
import { Input, Select, Textarea } from "../ui/form.jsx";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowIso() {
  return new Date(Date.now() + 86400000).toISOString().slice(0, 10);
}

function Footer({ onClose, pending, form, label, pendingLabel, danger = false }) {
  return (
    <>
      <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
      <Button loading={pending} variant={danger ? "danger" : "solid"} size="sm" type="submit" form={form} disabled={pending}>
        {pending ? pendingLabel : label}
      </Button>
    </>
  );
}

function PrivateNote({ children }) {
  return (
    <p className="flex items-start gap-1.5 rounded-md bg-gray-50 px-3 py-2 text-[11px] text-gray-600">
      <Lock aria-hidden="true" size={13} className="mt-px shrink-0" />
      {children}
    </p>
  );
}

// Schedules a new interview, or reschedules `interview` when given.
export function ScheduleInterviewDialog({ open, onClose, application, interview, api }) {
  const initial = interview
    ? { ...interview, ...utcToZoned(interview.scheduledAt, interview.timeZone) }
    : {
        date: tomorrowIso(),
        time: "10:00",
        timeZone: "Africa/Casablanca",
        durationMinutes: 45,
        type: "video",
        interviewer: "",
        meetingUrl: "",
        location: "",
        instructions: "",
      };
  const [form, setForm] = useState({
    date: initial.date,
    time: initial.time,
    timeZone: initial.timeZone,
    durationMinutes: initial.durationMinutes,
    type: initial.type,
    interviewer: initial.interviewer,
    meetingUrl: initial.meetingUrl,
    location: initial.location,
    instructions: initial.instructions,
  });
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    const input = { ...form, durationMinutes: Number(form.durationMinutes) };
    const result = await run(
      () => (interview ? api.rescheduleInterview(interview.id, input) : api.scheduleInterview(application.id, input)),
      { success: interview ? `Interview updated. ${application.candidate.name} has been notified.` : `Interview scheduled. ${application.candidate.name} has been notified.` },
    );
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title={interview ? "Reschedule interview" : "Schedule an interview"}
      description={`${application.candidate.name} · ${application.job.title}`}
      footer={<Footer onClose={onClose} pending={pending} form="interview-form" label={interview ? "Save and notify" : "Schedule and notify"} pendingLabel="Saving…" />}
    >
      <form id="interview-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {interview && (
          <p className="rounded-md bg-warning-bg px-3 py-2 text-xs text-warning sm:col-span-2">
            Currently {formatDateTime(interview.scheduledAt, interview.timeZone)} ({interview.timeZone}). Changing the time resets the candidate's attendance confirmation.
          </p>
        )}
        <Input label="Date" type="date" min={todayIso()} value={form.date} onChange={update("date")} error={errors.date} />
        <Input label="Start time" type="time" value={form.time} onChange={update("time")} error={errors.time} />
        <Select label="Time zone" value={form.timeZone} onChange={update("timeZone")} error={errors.timeZone} options={TIME_ZONES.map((z) => ({ value: z, label: z }))} />
        <Select
          label="Duration"
          value={form.durationMinutes}
          onChange={update("durationMinutes")}
          error={errors.durationMinutes}
          options={DURATIONS.map((d) => ({ value: d, label: formatDuration(d) }))}
        />
        <Select label="Interview type" value={form.type} onChange={update("type")} error={errors.type} options={Object.entries(INTERVIEW_TYPES).map(([value, t]) => ({ value, label: t.label }))} />
        <Input label="Interviewer" placeholder="e.g. Nadia Berrada, Lead Data Scientist" value={form.interviewer} onChange={update("interviewer")} error={errors.interviewer} />
        {form.type === "onsite" ? (
          <Input label="Address" className="sm:col-span-2" value={form.location} onChange={update("location")} error={errors.location} placeholder="Office address and floor" />
        ) : (
          <div className="sm:col-span-2">
            <div className="flex items-end gap-2">
              <Input
                label={form.type === "video" ? "Meeting link" : "Meeting link (optional)"}
                className="flex-1"
                type="url"
                placeholder="https://"
                value={form.meetingUrl}
                onChange={update("meetingUrl")}
                error={errors.meetingUrl}
              />
              <Button variant="secondary" size="sm" className={errors.meetingUrl ? "mb-6" : ""} onClick={() => setForm((f) => ({ ...f, meetingUrl: demoMeetingLink() }))}>
                <Wand2 aria-hidden="true" size={15} /> Demo link
              </Button>
            </div>
            <p className="mt-1 flex items-start gap-1.5 text-[11px] text-gray-500">
              <FlaskConical aria-hidden="true" size={13} className="mt-px shrink-0 text-cyan-600" />
              Paste your own Meet, Teams or Zoom link, or generate a demo room. Demo rooms are labelled as such for the candidate.
            </p>
          </div>
        )}
        <Textarea
          label="Instructions for the candidate (optional)"
          className="sm:col-span-2"
          rows={3}
          maxLength={1000}
          placeholder="What to prepare, who they'll meet, how to join"
          value={form.instructions}
          onChange={update("instructions")}
          error={errors.instructions}
        />
      </form>
    </Dialog>
  );
}

export function CancelInterviewDialog({ open, onClose, interview, application, api }) {
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => api.cancelInterview(interview.id, reason), { success: `Interview cancelled. ${application.candidate.name} has been notified.` });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Cancel this interview?"
      description={formatDateTime(interview.scheduledAt, interview.timeZone)}
      footer={<Footer onClose={onClose} pending={pending} form="cancel-form" label="Cancel interview" pendingLabel="Cancelling…" danger />}
    >
      <form id="cancel-form" onSubmit={submit} noValidate className="space-y-3">
        <p className="text-[13px] text-gray-700">The application returns to its previous stage, so you can schedule a new time.</p>
        <Textarea label="Message to the candidate (optional)" rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} error={errors.reason} />
        <p className="text-[11px] text-gray-500">This message is shown to the candidate.</p>
      </form>
    </Dialog>
  );
}

function RatingInput({ value, onChange, error }) {
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-gray-800">Overall rating</legend>
      <div className="flex gap-1" role="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} out of 5`}
            onClick={() => onChange(n)}
            className="rounded-control p-1 text-gray-300 transition-colors duration-150 hover:text-warning focus-visible:outline-2 focus-visible:outline-accent-500"
          >
            <Star aria-hidden="true" size={24} strokeWidth={1.6} className={n <= value ? "fill-warning text-warning" : ""} />
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </fieldset>
  );
}

export function CompleteInterviewDialog({ open, onClose, interview, api }) {
  const [form, setForm] = useState({ rating: 0, recommendation: "", notes: "" });
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => api.completeInterview(interview.id, form), { success: "Interview completed and feedback saved." });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Mark interview as completed"
      description={`Round ${interview.round} · ${formatDateTime(interview.scheduledAt, interview.timeZone)} · ${interview.interviewer}`}
      footer={<Footer onClose={onClose} pending={pending} form="feedback-form" label="Save feedback" pendingLabel="Saving…" />}
    >
      <form id="feedback-form" onSubmit={submit} noValidate className="space-y-4">
        <PrivateNote>Internal HR feedback. It is never shown to the candidate.</PrivateNote>
        <RatingInput value={form.rating} onChange={(rating) => setForm((f) => ({ ...f, rating }))} error={errors.rating} />
        <Select
          label="Hiring recommendation"
          placeholder="Choose a recommendation"
          value={form.recommendation}
          onChange={(e) => setForm((f) => ({ ...f, recommendation: e.target.value }))}
          error={errors.recommendation}
          options={Object.entries(RECOMMENDATIONS).map(([value, r]) => ({ value, label: r.label }))}
        />
        <Textarea
          label="Feedback"
          rows={5}
          maxLength={2000}
          placeholder="Strengths, concerns and evidence from the conversation"
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          error={errors.notes}
        />
      </form>
    </Dialog>
  );
}

export function ExtendOfferDialog({ open, onClose, application, api }) {
  const [form, setForm] = useState({ startDate: "", annualSalary: "", message: `We're pleased to offer you the ${application.job.title} position.` });
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => api.extendOffer(application.id, form), { success: `Offer sent to ${application.candidate.name}.` });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Extend an offer"
      description={`${application.candidate.name} · ${application.job.title}`}
      footer={<Footer onClose={onClose} pending={pending} form="offer-form" label="Send offer" pendingLabel="Sending…" />}
    >
      <form id="offer-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Proposed start date (optional)" type="date" min={todayIso()} value={form.startDate} onChange={update("startDate")} error={errors.startDate} />
        <Input
          label="Annual salary, MAD (optional)"
          type="number"
          min="0"
          inputMode="numeric"
          value={form.annualSalary}
          onChange={update("annualSalary")}
          error={errors.annualSalary}
          hint="Shown to the candidate. Used as the commission reference amount."
        />
        <Textarea label="Message to the candidate" className="sm:col-span-2" rows={4} maxLength={1000} value={form.message} onChange={update("message")} error={errors.message} />
      </form>
    </Dialog>
  );
}

export function ConfirmHireDialog({ open, onClose, application, api }) {
  const [hireDate, setHireDate] = useState(todayIso());
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => api.confirmHire(application.id, { hireDate }), { success: `${application.candidate.name}'s hire is confirmed.` });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Confirm the hire?"
      description={`${application.candidate.name} · ${application.job.title}`}
      footer={<Footer onClose={onClose} pending={pending} form="hire-form" label="Confirm hire" pendingLabel="Confirming…" />}
    >
      <form id="hire-form" onSubmit={submit} noValidate className="space-y-3">
        <p className="text-[13px] text-gray-700">
          This closes the application as hired, notifies the candidate and records one placement for CareerBridge. It can't be undone from here.
        </p>
        {application.offer?.startDate && <p className="text-xs text-gray-500">Offer start date: {formatDate(application.offer.startDate)}</p>}
        <Input label="Hire date" type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} error={errors.hireDate} />
      </form>
    </Dialog>
  );
}

export function RejectDialog({ open, onClose, application, api }) {
  const [note, setNote] = useState("");
  const [run, pending] = useAction();

  async function submit(event) {
    event.preventDefault();
    const { ok } = await run(() => api.updateApplicationStatus(application.id, "rejected", note), { success: `${application.candidate.name}'s application was closed.` });
    if (ok) onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="sm"
      title="Reject this application?"
      description={`${application.candidate.name} · ${application.job.title}`}
      footer={<Footer onClose={onClose} pending={pending} form="reject-form" label="Reject" pendingLabel="Rejecting…" danger />}
    >
      <form id="reject-form" onSubmit={submit} noValidate className="space-y-3">
        <p className="text-[13px] text-gray-700">
          The candidate receives a neutral notification. Any scheduled interview is cancelled and an open offer is withdrawn.
        </p>
        <Textarea label="Internal reason (optional)" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
        <PrivateNote>Only your team and administrators can see this reason.</PrivateNote>
      </form>
    </Dialog>
  );
}
