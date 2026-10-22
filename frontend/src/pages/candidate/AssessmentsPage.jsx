import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, Info, Plus, Target, UserCheck } from "lucide-react";
import Button, { buttonClasses } from "../../components/Button.jsx";
import { ResumeUploadDialog, SOURCE_LABELS, TargetRoleDialog } from "../../components/candidate/shared.jsx";
import Badge from "../../components/ui/Badge.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { FilterSelect } from "../../components/ui/form.jsx";
import { ScoreRing } from "../../components/ui/Progress.jsx";
import { EmptyState, QueryBoundary } from "../../components/ui/states.jsx";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDate } from "../../lib/format.js";
import { getAssessment, getMe, listSkillCatalog, setSkillConfirmed } from "../../services/candidateApi.js";

const SOURCE_TEXT = {
  sample: "The file's contents were not read: this demo analysed a sample résumé. Results are illustrative.",
  text: "Skills were found by keyword matching on the text you pasted.",
  keyword: "Text was read from your file and skills were found by keyword matching against the skill catalogue.",
  ai: "Text was read from your file and analysed by AI. Every skill was checked against your résumé's own words.",
};

const SECTIONS = [
  ["education", "Education"],
  ["experience", "Experience"],
  ["projects", "Projects"],
  ["certifications", "Certifications"],
  ["achievements", "Achievements"],
];

function ExtractionSummary({ extraction }) {
  const filled = SECTIONS.filter(([key]) => extraction[key]?.length);
  return (
    <Card title="What we extracted" description="Sections recognised in your résumé.">
      {filled.length === 0 && extraction.softSkills.length === 0 ? (
        <p className="text-xs text-gray-500">We couldn't recognise section headings such as Education or Experience in this résumé.</p>
      ) : (
        <dl className="space-y-3">
          {filled.map(([key, label]) => (
            <div key={key}>
              <dt className="text-xs font-medium text-gray-500">{label}</dt>
              <dd>
                <ul className="mt-1 space-y-1">
                  {extraction[key].map((item, i) => (
                    <li key={i} className="text-[13px] text-gray-800">{item.text}</li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
          {extraction.softSkills.length > 0 && (
            <div>
              <dt className="text-xs font-medium text-gray-500">Soft skills</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                {extraction.softSkills.map((s) => <Badge key={s}>{s}</Badge>)}
              </dd>
            </div>
          )}
        </dl>
      )}
    </Card>
  );
}

const STRENGTH_TEXT = {
  professional: "Used in work experience",
  demonstrated: "Used in a project",
  mentioned: "Listed in résumé",
};

function ExtractedSkills({ extracted }) {
  const [run, pending] = useAction();
  const [adding, setAdding] = useState("");
  const catalog = useQuery(listSkillCatalog);
  const known = new Set(extracted.map((e) => e.skillId));
  const options = (catalog.data ?? []).filter((s) => !known.has(s.id));

  function toggle(skillId, confirmed) {
    run(() => setSkillConfirmed(skillId, confirmed), { success: confirmed ? "Skill confirmed." : "Confirmation removed." });
  }

  return (
    <Card
      title="Skills found in your résumé"
      description="Review what we extracted. Confirming a skill records that you claim it — it doesn't validate it."
      bodyClassName=""
    >
      {extracted.length === 0 ? (
        <EmptyState icon={FileText} title="No skills found yet" />
      ) : (
        <ul className="divide-y divide-gray-100">
          {extracted.map((e) => (
            <li key={e.skillId} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-gray-900">{e.name}</p>
                <p className="text-xs text-gray-500">{e.strength ? STRENGTH_TEXT[e.strength] : "Added by you"}</p>
                {e.quote && <blockquote className="mt-1.5 border-l-2 border-gray-200 pl-2.5 text-xs text-gray-600 italic">“{e.quote}”</blockquote>}
              </div>
              <Button variant={e.confirmed ? "secondary" : "ghost"} size="xs" disabled={pending} onClick={() => toggle(e.skillId, !e.confirmed)} aria-pressed={e.confirmed}>
                <UserCheck aria-hidden="true" size={14} className={e.confirmed ? "text-accent-600" : ""} />
                {e.confirmed ? "Confirmed" : "Confirm"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-5 py-3">
        <FilterSelect
          label="Add a skill we missed"
          value={adding}
          onChange={(e) => setAdding(e.target.value)}
          options={[{ value: "", label: "Add a skill we missed…" }, ...options.map((s) => ({ value: s.id, label: s.name }))]}
        />
        <Button
          variant="secondary"
          size="sm"
          disabled={!adding || pending}
          onClick={async () => {
            await run(() => setSkillConfirmed(adding, true), { success: "Skill added as candidate-confirmed." });
            setAdding("");
          }}
        >
          <Plus aria-hidden="true" size={16} /> Add
        </Button>
      </div>
    </Card>
  );
}

export default function AssessmentsPage() {
  const [params, setParams] = useSearchParams();
  const [roleOpen, setRoleOpen] = useState(false);
  const me = useQuery(getMe);
  const query = useQuery(getAssessment);
  const uploadOpen = params.get("upload") === "1";
  const setUploadOpen = (open) => setParams(open ? { upload: "1" } : {}, { replace: true });

  return (
    <div>
      <PageHeader
        title="My assessments"
        description="Your résumé compared with your target role's employer-defined requirements."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRoleOpen(true)}>
              <Target aria-hidden="true" size={16} /> Change role
            </Button>
            <Button variant="solid" size="sm" onClick={() => setUploadOpen(true)}>
              Upload résumé
            </Button>
          </>
        }
      />

      <QueryBoundary query={query} rows={6}>
        {(a) =>
          !a.hasResume ? (
            <Card>
              <EmptyState icon={FileText} title="No résumé yet" action={<Button variant="solid" size="sm" onClick={() => setUploadOpen(true)}>Upload résumé</Button>}>
                Upload your résumé to get a compatibility estimate for {a.profile?.title ?? "your target role"}.
              </EmptyState>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div className="space-y-6">
                <Card title="Assessment summary">
                  <div className="flex items-center gap-5">
                    <ScoreRing value={a.score} />
                    <dl className="space-y-2 text-[13px]">
                      <div>
                        <dt className="text-xs text-gray-500">Target role</dt>
                        <dd className="font-semibold text-gray-900">{a.profile.title}</dd>
                        <dd className="text-xs text-gray-500">{a.profile.companyName} · profile v{a.profile.version}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Evidence coverage</dt>
                        <dd className="font-semibold text-gray-900 tabular-nums">
                          {a.coverage.withEvidence} of {a.coverage.total} skills
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <p className="mt-4 flex items-start gap-2 text-xs text-gray-600">
                    <Info aria-hidden="true" size={14} className="mt-px shrink-0 text-info" />
                    An estimate of alignment with this role, calculated with scoring rules {a.scoringVersion}. It is not a probability of being hired.
                  </p>
                  <Link to="/candidate/skill-gaps" className={buttonClasses("solid", "mt-4 w-full", "sm")}>
                    {a.gapsLocked ? "View my top skill gaps" : "View skill-gap report"}
                  </Link>
                </Card>

                <Card title="Résumé">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600">
                      <FileText aria-hidden="true" size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-gray-900">{a.resume.fileName}</p>
                      <p className="text-xs text-gray-500">Uploaded {formatDate(a.resume.uploadedAt)} · analysed {formatDate(a.analyzedAt)}</p>
                      <Badge tone={SOURCE_LABELS[a.source].tone} className="mt-2">{SOURCE_LABELS[a.source].label}</Badge>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">{SOURCE_TEXT[a.source]}</p>
                  {a.fallbackReason && <p className="mt-1 text-xs text-warning">{a.fallbackReason} The keyword analysis was used instead.</p>}
                </Card>
                {a.extraction && <ExtractionSummary extraction={a.extraction} />}
              </div>
              <ExtractedSkills extracted={a.extracted} />
            </div>
          )
        }
      </QueryBoundary>

      <ResumeUploadDialog open={uploadOpen} onClose={() => setUploadOpen(false)} />
      {me.data && <TargetRoleDialog open={roleOpen} onClose={() => setRoleOpen(false)} currentId={me.data.targetProfileId} />}
    </div>
  );
}
