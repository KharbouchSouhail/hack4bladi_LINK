import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { EligibilityBadge } from "../../components/candidate/shared.jsx";
import { PageHeader } from "../../components/ui/Card.jsx";
import { FilterSelect } from "../../components/ui/form.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { manualTransitions } from "../../domain/recruitment.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { formatDate, formatDateTime } from "../../lib/format.js";
import { listApplications, updateApplicationStatus } from "../../services/companyApi.js";

// Plain moves only; interviews, offers and hires are recorded from the candidate's page.
function moveOptions(status) {
  // The column already names the current stage, so the first option is a prompt.
  return [{ value: status, label: "Move to…" }, ...manualTransitions(status).map((value) => ({ value, label: APPLICATION_STATUSES[value].label }))];
}

// Applications grouped by stage. Moving a card is a status change, recorded in the application history.
function Board({ rows }) {
  const [run, pending] = useAction();

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="grid min-w-[1440px] grid-cols-8 gap-3">
        {Object.entries(APPLICATION_STATUSES).map(([status, info]) => {
          const column = rows.filter((r) => r.status === status);
          return (
            <section key={status} aria-label={info.label} className="flex flex-col rounded-lg bg-gray-100/70 p-2.5">
              <h2 className="mb-2 flex items-center justify-between px-1 text-xs font-semibold text-gray-700">
                {info.label}
                <span className="rounded-full bg-white px-2 py-0.5 text-[11px] text-gray-600 tabular-nums">{column.length}</span>
              </h2>
              <ul className="space-y-2">
                {column.map((r) => (
                  <li key={r.id} className="rounded-md border border-gray-200 bg-white p-3 shadow-subtle">
                    <Link to={`/company/candidates/${r.id}`} className="text-[13px] font-semibold text-gray-900 hover:underline">
                      {r.candidate.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-gray-500">{r.job.title}</p>
                    <p className="text-[11px] text-gray-500">Applied {formatDate(r.createdAt)}</p>
                    <div className="mt-2">
                      <EligibilityBadge status={r.eligibility} />
                    </div>
                    {r.nextInterviewAt && (
                      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-warning">
                        <CalendarClock aria-hidden="true" size={12} /> {formatDateTime(r.nextInterviewAt)}
                      </p>
                    )}
                    {manualTransitions(r.status).length > 0 && (
                    <FilterSelect
                      label={`Move ${r.candidate.name} to`}
                      value={r.status}
                      disabled={pending}
                      onChange={(e) =>
                        run(() => updateApplicationStatus(r.id, e.target.value, ""), {
                          success: `${r.candidate.name} moved to ${APPLICATION_STATUSES[e.target.value].label}.`,
                        })
                      }
                      options={moveOptions(r.status)}
                      className="mt-2 h-8 w-full text-xs!"
                    />
                    )}
                    {NEXT_STEP[r.status] && (
                      <Link to={`/company/candidates/${r.id}`} className="mt-2 block text-[11px] font-semibold text-accent-600 hover:underline">
                        {NEXT_STEP[r.status]}
                      </Link>
                    )}
                  </li>
                ))}
                {column.length === 0 && <li className="px-1 py-3 text-center text-[11px] text-gray-500">Empty</li>}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

const NEXT_STEP = {
  shortlisted: "Schedule interview →",
  interview_scheduled: "Manage interview →",
  interview_completed: "Record decision →",
  offer_extended: "Confirm hire →",
};

export default function CompanyApplicationsBoard() {
  const query = useQuery(listApplications);
  return (
    <div>
      <PageHeader title="Applications" description="Every application by stage. Interviews, offers and hires are managed from each candidate's page; the candidate is notified of every change." />
      <QueryBoundary query={query} rows={6}>
        {(rows) => <Board rows={rows} />}
      </QueryBoundary>
    </div>
  );
}
