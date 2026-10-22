import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Briefcase, CheckCircle2, CircleDashed, MapPin } from "lucide-react";
import Button, { buttonClasses } from "../../components/Button.jsx";
import { CompanyMark, EligibilityBadge } from "../../components/candidate/shared.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import Dialog from "../../components/ui/Dialog.jsx";
import { Checkbox, FormError, Textarea } from "../../components/ui/form.jsx";
import { QueryBoundary, UpgradeCard } from "../../components/ui/states.jsx";
import { APPLICATION_STATUSES, REQUIREMENT_RULES } from "../../domain/constants.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDate } from "../../lib/format.js";
import { applyToJob, getJob } from "../../services/candidateApi.js";

const INITIAL = { note: "", consent: { profile: false, evidence: true, tests: true, learning: false } };

function ApplyDialog({ job, open, onClose }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const setConsent = (key) => (e) => setForm((f) => ({ ...f, consent: { ...f.consent, [key]: e.target.checked } }));

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => applyToJob(job.id, form), { success: `Application sent to ${job.company.name}.` });
    if (result.ok) onClose();
    else setErrors(result.fieldErrors);
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Apply to ${job.title}`}
      description={`${job.company.name} reviews applications and makes all hiring decisions.`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button loading={pending} variant="solid" size="sm" type="submit" form="apply-form" disabled={pending}>
            {pending ? "Sending…" : "Submit application"}
          </Button>
        </>
      }
    >
      <form id="apply-form" onSubmit={submit} noValidate className="space-y-5">
        <Textarea
          label="Note to the employer (optional)"
          rows={4}
          maxLength={1000}
          placeholder="Why this role interests you"
          value={form.note}
          onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          error={errors.note}
        />
        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-medium text-gray-800">What {job.company.name} can see</legend>
          <Checkbox label="My profile and résumé file name (required)" checked={form.consent.profile} onChange={setConsent("profile")} />
          <Checkbox label="Skills found in my résumé and my alignment score" checked={form.consent.evidence} onChange={setConsent("evidence")} />
          <Checkbox label="My skill-test results" checked={form.consent.tests} onChange={setConsent("tests")} />
          <Checkbox label="My learning progress" checked={form.consent.learning} onChange={setConsent("learning")} />
          {errors.consent && <p className="text-xs text-error">{errors.consent}</p>}
        </fieldset>
        <FormError>{errors.form}</FormError>
      </form>
    </Dialog>
  );
}

function ApplyPanel({ job }) {
  const [open, setOpen] = useState(false);

  if (job.application) {
    return (
      <Card title="Your application">
        <StatusBadge map={APPLICATION_STATUSES} value={job.application.status} />
        <p className="mt-2 text-xs text-gray-500">Submitted {formatDate(job.application.createdAt)}</p>
        <Link to={`/candidate/applications/${job.application.id}`} className={buttonClasses("secondary", "mt-3 w-full", "sm")}>Track application</Link>
      </Card>
    );
  }
  if (job.eligibilityLocked) {
    return (
      <Card bodyClassName="">
        <UpgradeCard plan="max" compact>Max checks your eligibility for this job and lets you apply.</UpgradeCard>
      </Card>
    );
  }

  const eligible = job.eligibility.status === "eligible";
  return (
    <Card title="Eligibility">
      <EligibilityBadge status={job.eligibility.status} />
      <ul className="mt-4 space-y-2.5">
        {job.eligibility.checklist.map((c) => (
          <li key={c.skillId} className="flex items-start gap-2 text-[13px]">
            {c.met ? (
              <CheckCircle2 aria-label="Met" size={16} className="mt-px shrink-0 text-success" />
            ) : (
              <CircleDashed aria-label="Not met" size={16} className="mt-px shrink-0 text-gray-400" />
            )}
            <span>
              <span className="font-medium text-gray-900">{c.name}</span>
              <span className="block text-xs text-gray-500">
                {REQUIREMENT_RULES[c.rule]} · {c.mandatory ? "mandatory" : "preferred"}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {eligible ? (
        <Button variant="solid" size="sm" className="mt-4 w-full" onClick={() => setOpen(true)}>
          Apply now
        </Button>
      ) : (
        <Link to="/candidate/learning" className={buttonClasses("secondary", "mt-4 w-full", "sm")}>
          Work on missing requirements
        </Link>
      )}
      <p className="mt-3 text-[11px] text-gray-500">Eligibility means you can apply. It doesn't guarantee an interview or an offer.</p>
      {eligible && <ApplyDialog job={job} open={open} onClose={() => setOpen(false)} />}
    </Card>
  );
}

export default function JobDetailPage() {
  const { jobId } = useParams();
  const query = useQuery(() => getJob(jobId), [jobId]);

  return (
    <div>
      <Link to="/candidate/jobs" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> Job opportunities
      </Link>
      <QueryBoundary query={query} rows={6}>
        {(job) => (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="stagger space-y-5">
              <div className="flex items-start gap-4">
                <CompanyMark name={job.company.name} size="lg" />
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{job.title}</h1>
                  <p className="text-sm text-gray-600">{job.company.name}</p>
                  <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
                    <span className="inline-flex items-center gap-1"><MapPin aria-hidden="true" size={13} /> {job.location} · {job.workMode}</span>
                    <span className="inline-flex items-center gap-1"><Briefcase aria-hidden="true" size={13} /> {job.employmentType}</span>
                    <span>Posted {formatDate(job.createdAt)}</span>
                  </p>
                </div>
              </div>
              <Card title="About the role">
                <p className="text-[13px] leading-relaxed text-gray-700">{job.description}</p>
                <p className="mt-3 text-xs text-gray-500">Based on the employer-defined profile: {job.profileTitle}</p>
              </Card>
              <Card title="Requirements">
                <ul className="flex flex-wrap gap-2">
                  {job.skills.map((s) => (
                    <li key={s.skillId}>
                      <Badge tone={s.mandatory ? "accent" : "neutral"}>
                        {s.name} · {s.rule === "test_passed" ? "test" : "evidence"}
                        {!s.mandatory && " · preferred"}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card title={`About ${job.company.name}`}>
                <p className="text-[13px] text-gray-700">{job.company.description}</p>
                <p className="mt-2 text-xs text-gray-500">{job.company.sector} · {job.company.city}</p>
              </Card>
            </div>
            <div>
              <ApplyPanel job={job} />
            </div>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
