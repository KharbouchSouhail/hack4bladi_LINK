import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { buttonClasses } from "../../components/Button.jsx";
import { EligibilityBadge, SkillStateBadge } from "../../components/candidate/shared.jsx";
import Badge, { StatusBadge } from "../../components/ui/Badge.jsx";
import Card from "../../components/ui/Card.jsx";
import { ProgressBar } from "../../components/ui/Progress.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { STRENGTHS } from "../../domain/evidence.js";
import { PLANS } from "../../domain/permissions.js";
import { useQuery } from "../../hooks/useQuery.js";
import { formatDate } from "../../lib/format.js";
import { getCandidate } from "../../services/adminApi.js";

export default function AdminCandidateDetail() {
  const { candidateId } = useParams();
  const query = useQuery(() => getCandidate(candidateId), [candidateId]);

  return (
    <div>
      <Link to="/admin/candidates" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-gray-600 hover:text-gray-900">
        <ArrowLeft aria-hidden="true" size={16} /> Candidates
      </Link>
      <QueryBoundary query={query} rows={8}>
        {(c) => (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{c.name}</h1>
              <Badge tone={c.plan === "free" ? "neutral" : "accent"}>{PLANS[c.plan].label}</Badge>
              <p className="w-full text-sm text-gray-600">
                {[c.headline, c.location, c.email].filter(Boolean).join(" · ")} · joined {formatDate(c.createdAt)}
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card title={`Assessment · ${c.targetTitle ?? "no target role"}`} description={c.resume ? `${c.resume.fileName} · analysed ${formatDate(c.analyzedAt)}` : "No résumé uploaded"} bodyClassName="">
                {c.match ? (
                  <>
                    <p className="px-5 pt-4 text-2xl font-semibold text-gray-900 tabular-nums">
                      {c.match.score}<span className="text-sm font-normal text-gray-500"> / 100 · evidence for {c.match.coverage.withEvidence}/{c.match.coverage.total} skills</span>
                    </p>
                    <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                      {c.match.rows.map((r) => (
                        <li key={r.skillId} className="flex items-center justify-between gap-3 px-5 py-2.5">
                          <div>
                            <p className="text-[13px] font-medium text-gray-900">{c.skillNames[r.skillId]}</p>
                            <p className="text-xs text-gray-500">{STRENGTHS[r.strength].label} · weight {r.weight}%</p>
                          </div>
                          <SkillStateBadge state={r.state} />
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="px-5 py-4 text-[13px] text-gray-500">No assessment yet.</p>
                )}
              </Card>

              <div className="space-y-6">
                <Card title="Test attempts" bodyClassName="">
                  {c.attempts.length === 0 ? (
                    <p className="px-5 py-4 text-[13px] text-gray-500">No attempts.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {c.attempts.map((a) => (
                        <li key={a.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                          <div>
                            <p className="text-[13px] text-gray-900">{a.title}</p>
                            <p className="text-xs text-gray-500">{formatDate(a.createdAt)} · {a.score}%</p>
                          </div>
                          <Badge tone={a.passed ? "success" : "warning"}>{a.passed ? "Passed" : "Not passed"}</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
                <Card title="Learning progress">
                  {c.learning.length === 0 ? (
                    <p className="text-[13px] text-gray-500">No courses started.</p>
                  ) : (
                    <ul className="space-y-3">
                      {c.learning.map((l) => (
                        <li key={l.id}>
                          <div className="mb-1 flex justify-between text-[13px]"><span>{l.title}</span><span className="text-gray-500 tabular-nums">{l.progress}%</span></div>
                          <ProgressBar value={l.progress} label={`${l.title} progress`} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </div>
            </div>

            <Card title="Applications" bodyClassName="">
              {c.applications.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-gray-500">No applications.</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {c.applications.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                      <div>
                        <p className="text-[13px] font-medium text-gray-900">{a.job.title}</p>
                        <p className="text-xs text-gray-500">{a.job.companyName} · {formatDate(a.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <EligibilityBadge status={a.eligibility} />
                        <StatusBadge map={APPLICATION_STATUSES} value={a.status} />
                        <Link to={`/admin/applications/${a.id}`} className={buttonClasses("secondary", "", "xs")}>Review</Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
