import { useMemo, useState } from "react";
import { Briefcase } from "lucide-react";
import { LockedCard, UnlockBanner, UpgradeDialog } from "../../components/candidate/locked.jsx";
import { JobCard } from "../../components/candidate/shared.jsx";
import Card, { PageHeader } from "../../components/ui/Card.jsx";
import { FilterSelect, SearchInput } from "../../components/ui/form.jsx";
import { EmptyState, QueryBoundary, UpgradeCard } from "../../components/ui/states.jsx";
import { WORK_MODES } from "../../domain/constants.js";
import { ELIGIBILITY } from "../../domain/eligibility.js";
import { useQuery } from "../../hooks/useQuery.js";
import { plural } from "../../lib/format.js";
import { listJobs } from "../../services/candidateApi.js";

function JobList({ data }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [mode, setMode] = useState("");
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const jobs = useMemo(
    () =>
      data.jobs.filter(
        (j) =>
          (!status || j.eligibility?.status === status) &&
          (!mode || j.workMode === mode) &&
          `${j.title} ${j.company.name} ${j.location}`.toLowerCase().includes(search.trim().toLowerCase()),
      ),
    [data.jobs, search, status, mode],
  );

  return (
    <div className="space-y-5">
      {data.eligibilityLocked && (
        <Card>
          <UpgradeCard plan="max" compact title="See where you're eligible and apply with Max">
            Max checks each job's requirements against your validated skills and lets you apply.
          </UpgradeCard>
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <SearchInput label="Search jobs" placeholder="Title, company or city" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-64" />
        {!data.eligibilityLocked && (
          <FilterSelect
            label="Eligibility"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            options={[{ value: "", label: "Any eligibility" }, ...Object.entries(ELIGIBILITY).map(([value, e]) => ({ value, label: e.label }))]}
          />
        )}
        <FilterSelect label="Work arrangement" value={mode} onChange={(e) => setMode(e.target.value)} options={[{ value: "", label: "Any arrangement" }, ...WORK_MODES.map((m) => ({ value: m, label: m }))]} />
      </div>
      {jobs.length === 0 ? (
        <Card>
          <EmptyState icon={Briefcase} title={data.jobs.length ? "No jobs match these filters" : "No job opportunities right now"} />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} eligibilityLocked={data.eligibilityLocked} />
          ))}
        </div>
      )}

      {data.lockedCount > 0 && (
        <section aria-label="Locked job opportunities">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: data.lockedCount }, (_, i) => (
              <LockedCard
                key={i}
                title="Locked opportunity"
                hint="Upgrade to see this job"
                label={`Locked job opportunity ${i + 1}. Upgrade to see it.`}
                onClick={() => setUpgradeOpen(true)}
              />
            ))}
          </div>
          <UnlockBanner icon={Briefcase} action="Unlock more opportunities" onClick={() => setUpgradeOpen(true)}>
            <span className="font-semibold text-gray-900">Unlock more job opportunities with an upgrade.</span>{" "}
            {plural(data.lockedCount, "more opening")} from partner companies {data.lockedCount === 1 ? "is" : "are"} listed.
          </UnlockBanner>
        </section>
      )}

      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        title="See every job opportunity"
        description={`${plural(data.lockedCount, "more opening")} ${data.lockedCount === 1 ? "is" : "are"} hidden on your plan.`}
        note="Pro lets you browse every opening. Max also checks your eligibility and lets you apply when you meet an employer's requirements. Upgrading doesn't make you eligible or guarantee an interview or an offer."
      />
    </div>
  );
}

export default function JobsPage() {
  const query = useQuery(listJobs);
  return (
    <div>
      <PageHeader title="Job opportunities" description="Openings from partner companies. Employers review applications and make every hiring decision." />
      <QueryBoundary query={query} rows={6}>
        {(data) => <JobList data={data} />}
      </QueryBoundary>
    </div>
  );
}
