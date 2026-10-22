import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Briefcase, Check, CheckCircle2, Circle, Clock, FileText, FileUp, Loader2, MapPin, RotateCcw } from "lucide-react";
import { ELIGIBILITY } from "../../domain/eligibility.js";
import { SKILL_STATES } from "../../domain/evidence.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDuration, initials, plural } from "../../lib/format.js";
import { listTargetProfiles, setTargetProfile, uploadResume } from "../../services/candidateApi.js";
import { ValidationError } from "../../services/errors.js";
import Button, { buttonClasses } from "../Button.jsx";
import Badge, { ELIGIBILITY_ICONS, SKILL_STATE_ICONS, StatusBadge } from "../ui/Badge.jsx";
import Dialog from "../ui/Dialog.jsx";
import { Checkbox, FormError, Textarea } from "../ui/form.jsx";
import { ProgressBar } from "../ui/Progress.jsx";
import { LoadingState } from "../ui/states.jsx";
import { useToast } from "../ui/Toast.jsx";

export function SkillStateBadge({ state }) {
  return <StatusBadge map={SKILL_STATES} value={state} icon={SKILL_STATE_ICONS[state]} />;
}

export function EligibilityBadge({ status }) {
  return <StatusBadge map={ELIGIBILITY} value={status} icon={ELIGIBILITY_ICONS[status]} />;
}

export function CompanyMark({ name, size = "md" }) {
  const box = size === "lg" ? "h-12 w-12 text-sm" : "h-10 w-10 text-xs";
  return (
    <span aria-hidden="true" className={`flex shrink-0 items-center justify-center rounded-md border border-accent-100 bg-accent-50 font-semibold text-accent-700 ${box}`}>
      {initials(name)}
    </span>
  );
}

export function JobCard({ job, eligibilityLocked }) {
  return (
    <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-subtle transition-shadow duration-200 hover:shadow-card">
      <div className="flex items-start gap-3">
        <CompanyMark name={job.company.name} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-gray-900">{job.title}</h3>
          <p className="truncate text-xs text-gray-600">{job.company.name}</p>
        </div>
      </div>
      <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
        <span className="inline-flex items-center gap-1">
          <MapPin aria-hidden="true" size={13} /> {job.location} · {job.workMode}
        </span>
        <span className="inline-flex items-center gap-1">
          <Briefcase aria-hidden="true" size={13} /> {job.employmentType}
        </span>
      </p>
      <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Required skills">
        {job.skills.map((s) => (
          <li key={s.skillId}>
            <Badge>
              {s.name}
              {!s.mandatory && " (preferred)"}
            </Badge>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
        {job.application ? (
          <Badge tone="info" icon={Check}>
            Applied
          </Badge>
        ) : eligibilityLocked ? (
          <span className="text-[11px] text-gray-500">Eligibility shown with Max</span>
        ) : (
          <EligibilityBadge status={job.eligibility.status} />
        )}
        <Link to={`/candidate/jobs/${job.id}`} className={buttonClasses("secondary", "", "xs")}>
          View job
        </Link>
      </div>
    </article>
  );
}

// A course is locked when the plan doesn't open it; the service marks each course with `accessible`.
export function LearningCard({ course, locked = course.accessible === false }) {
  const status = course.progress === 100 ? "Completed" : course.progress > 0 ? "In progress" : "Not started";
  return (
    <article className="flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-subtle transition-shadow duration-200 hover:shadow-card">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="accent">{course.skillName}</Badge>
        <Badge>{course.difficulty}</Badge>
      </div>
      <h3 className="mt-2.5 text-sm font-semibold text-gray-900">{course.title}</h3>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500">
        <Clock aria-hidden="true" size={13} /> {formatDuration(course.minutes)}
      </p>
      <div className="mt-auto pt-4">
        {locked ? (
          <Link to="/candidate/subscription" className={buttonClasses("secondary", "w-full", "xs")}>
            Unlock with Max
          </Link>
        ) : (
          <>
            <div className="mb-1 flex justify-between text-[11px] text-gray-600">
              <span>{status}</span>
              <span className="tabular-nums">{course.progress}%</span>
            </div>
            <ProgressBar value={course.progress} label={`${course.title} progress`} />
            <Link to={`/candidate/courses/${course.id}`} className={buttonClasses(course.progress === 100 ? "secondary" : "solid", "mt-3 w-full", "xs")}>
              {course.progress === 100 ? "Review course" : course.progress > 0 ? "Continue learning" : "Start learning"}
            </Link>
          </>
        )}
      </div>
    </article>
  );
}

export function TargetRoleDialog({ open, onClose, currentId }) {
  const query = useQuery(listTargetProfiles);
  const [selected, setSelected] = useState(currentId ?? "");
  const [run, pending] = useAction();

  async function save() {
    const { ok } = await run(() => setTargetProfile(selected), { success: (title) => `Target role set to ${title}.` });
    if (ok) onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Choose your target role"
      description="Roles are defined with partner companies; requirements differ between employers."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="solid" size="sm" onClick={save} disabled={!selected || pending}>
            {pending ? "Saving…" : "Use this role"}
          </Button>
        </>
      }
    >
      {query.loading ? (
        <LoadingState />
      ) : (
        <fieldset className="space-y-2">
          <legend className="sr-only">Target role</legend>
          {query.data.map((p) => (
            <label
              key={p.id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-600 ${
                selected === p.id ? "border-accent-500 bg-accent-50/70" : "border-gray-200 hover:bg-gray-50"
              }`}
            >
              <input type="radio" name="target" value={p.id} checked={selected === p.id} onChange={() => setSelected(p.id)} className="mt-1 accent-accent-500" />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">
                  {p.title} <span className="font-normal text-gray-500">· {p.companyName}</span>
                </span>
                <span className="mt-0.5 block text-xs text-gray-600">{p.description}</span>
                <span className="mt-2 flex flex-wrap gap-1">
                  {p.skills.map((s) => (
                    <Badge key={s.name} tone={s.importance === "required" ? "accent" : "neutral"}>
                      {s.name}
                    </Badge>
                  ))}
                </span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </Dialog>
  );
}

const UPLOAD_STAGES = [
  { key: "upload", label: "Uploading your résumé" },
  { key: "extract", label: "Reading the document" },
  { key: "analyse", label: "Analysing skills and experience" },
  { key: "save", label: "Comparing with your target role" },
];
const SLOW_AFTER_MS = 8000;
const EMPTY_UPLOAD = { file: null, text: "", consent: false, needsText: false };

function StageList({ stage }) {
  const current = UPLOAD_STAGES.findIndex((s) => s.key === stage);
  return (
    <ol className="space-y-2.5" aria-label="Analysis progress">
      {UPLOAD_STAGES.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li key={s.key} className="flex items-center gap-2.5 text-[13px]" aria-current={state === "active" ? "step" : undefined}>
            {state === "done" ? (
              <CheckCircle2 aria-hidden="true" size={18} className="shrink-0 text-success" />
            ) : state === "active" ? (
              <Loader2 aria-hidden="true" size={18} className="shrink-0 animate-spin text-accent-600" />
            ) : (
              <Circle aria-hidden="true" size={18} className="shrink-0 text-gray-300" />
            )}
            <span className={state === "todo" ? "text-gray-500" : "font-medium text-gray-900"}>{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

// Choosing a file starts the analysis immediately; there is no separate "analyse" step.
// Closing the dialog mid-analysis is safe: the analysis keeps running and its status is saved.
export function ResumeUploadDialog({ open, onClose }) {
  const [form, setForm] = useState(EMPTY_UPLOAD);
  const [errors, setErrors] = useState({});
  const [stage, setStage] = useState(null);
  const [slow, setSlow] = useState(false);
  const closed = useRef(false);
  const navigate = useNavigate();
  const toast = useToast();
  const running = stage !== null;

  useEffect(() => {
    if (open) closed.current = false;
  }, [open]);

  function close() {
    if (running) toast.success("Your résumé is still being analysed. Results will appear on your Skill Gaps page.");
    closed.current = true;
    setForm(EMPTY_UPLOAD);
    setErrors({});
    onClose();
  }

  async function analyse(file, text) {
    if (!form.consent) {
      setErrors({ consent: "Please confirm before we analyse your résumé." });
      return;
    }
    setErrors({});
    setStage("upload");
    setSlow(false);
    const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    try {
      const result = await uploadResume({ file, text }, { onStage: setStage });
      if (closed.current) return;
      toast.success(
        result.reused
          ? "We've already analysed this résumé, so your saved results are shown."
          : `Résumé analysed: ${plural(result.skillsFound, "skill")} found, ${plural(result.gapsFound, "skill gap")} to review.`,
      );
      closed.current = true;
      setForm(EMPTY_UPLOAD);
      onClose();
      navigate("/candidate/skill-gaps");
    } catch (error) {
      if (closed.current) {
        toast.error(error.message);
        return;
      }
      const fieldErrors = error instanceof ValidationError ? error.fieldErrors : {};
      if (fieldErrors.text) setForm((f) => ({ ...f, needsText: true }));
      setErrors(Object.keys(fieldErrors).length ? fieldErrors : { form: error.message, retry: true });
    } finally {
      clearTimeout(timer);
      setStage(null);
    }
  }

  function pickFile(file) {
    setForm((f) => ({ ...f, file, text: "", needsText: false }));
    if (file) analyse(file, "");
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Upload your résumé"
      description="Analysis starts as soon as you choose a file: we extract your skills and experience and compare them with your target role."
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={close}>
            {running ? "Continue in background" : "Cancel"}
          </Button>
          {!running && errors.retry && form.file && (
            <Button variant="solid" size="sm" onClick={() => analyse(form.file, form.text)}>
              <RotateCcw aria-hidden="true" size={16} /> Try again
            </Button>
          )}
          {!running && form.needsText && (
            <Button variant="solid" size="sm" disabled={!form.text.trim()} onClick={() => analyse(form.file, form.text)}>
              Analyse pasted text
            </Button>
          )}
        </>
      }
    >
      {running ? (
        <div className="space-y-4" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-[13px] text-gray-700">
            <FileText aria-hidden="true" size={16} className="text-accent-600" />
            <span className="truncate font-medium">{form.file?.name}</span>
          </p>
          <StageList stage={stage} />
          {slow && (
            <p className="rounded-md bg-info-bg px-3 py-2 text-xs text-info">
              This is taking longer than usual. You can keep waiting or continue in the background — your results will be saved.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <Checkbox
              label="I agree that my résumé is analysed to estimate my alignment with the selected role."
              description="We keep the file name, a fingerprint to avoid analysing the same file twice, and the extracted information. The file itself is not stored."
              checked={form.consent}
              onChange={(e) => {
                const consent = e.target.checked;
                setForm((f) => ({ ...f, consent }));
                if (consent) setErrors((err) => ({ ...err, consent: undefined }));
              }}
            />
            {errors.consent && <p className="mt-1.5 text-xs text-error">{errors.consent}</p>}
          </div>

          <div>
            <label
              className={`flex flex-col items-center rounded-lg border border-dashed px-4 py-6 text-center has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-600 ${
                !form.consent
                  ? "cursor-not-allowed border-gray-200 bg-gray-50 opacity-60"
                  : errors.file
                    ? "cursor-pointer border-error bg-error-bg/40"
                    : "cursor-pointer border-gray-300 bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <FileUp aria-hidden="true" size={22} className="text-accent-600" />
              <span className="mt-2 text-sm font-medium text-gray-900">{form.file ? form.file.name : "Choose a PDF or DOCX file"}</span>
              <span className="text-xs text-gray-500">
                {form.file ? `${Math.round(form.file.size / 1024)} KB · choose another file to replace it` : "Up to 5 MB · analysis starts automatically"}
              </span>
              <input
                type="file"
                disabled={!form.consent}
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="sr-only"
                onChange={(e) => {
                  pickFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
            </label>
            {errors.file && <p className="mt-1.5 text-xs text-error">{errors.file}</p>}
            {!form.consent && <p className="mt-1.5 text-[11px] text-gray-500">Tick the box above to choose a file.</p>}
          </div>

          {form.needsText && (
            <Textarea
              label="Paste your résumé text"
              rows={6}
              value={form.text}
              onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
              error={errors.text}
            />
          )}
          <FormError>{errors.form}</FormError>
        </div>
      )}
    </Dialog>
  );
}

export const SOURCE_LABELS = {
  sample: { label: "Sample résumé · demo analysis", tone: "warning" },
  text: { label: "Pasted text · keyword analysis", tone: "info" },
  keyword: { label: "Keyword analysis", tone: "info" },
  ai: { label: "AI analysis", tone: "accent" },
};
