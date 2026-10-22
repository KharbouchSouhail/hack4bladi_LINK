import { useId } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Users, XCircle } from "lucide-react";
import { APPLICATION_STATUSES } from "../../domain/constants.js";
import { STAGE_ORDER } from "../../domain/recruitment.js";
import { percentages } from "../../domain/analytics.js";
import { EmptyState } from "../ui/states.jsx";
import { APPLICATION_STATUS_COLORS } from "./statusColors.js";

// Where every application stands right now: one count per workflow stage, each application counted once
// (in its current status). Rejected and unrecognised statuses sit outside the stages, so the stages plus
// those add up to the total. Each stage opens the candidate pipeline filtered to that status.
function Stage({ stage, index, max, last }) {
  const tooltipId = useId();
  const width = max ? (100 * stage.count) / max : 0;
  return (
    <li className="relative min-w-0">
      <Link
        to={`/company/candidates?status=${stage.status}`}
        aria-describedby={tooltipId}
        className="group/stage relative flex h-full items-center gap-3 rounded-md border border-gray-200 bg-white px-3 py-2.5 transition-[border-color,box-shadow,transform] duration-200 ease-standard hover:border-accent-200 hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 active:scale-[0.99] lg:flex-col lg:items-stretch lg:gap-2 lg:px-3.5 lg:py-3.5"
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 lg:min-h-8 lg:flex-none lg:items-start">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full lg:mt-[3px]" style={{ background: APPLICATION_STATUS_COLORS[stage.status] }} />
          <span className="truncate text-xs leading-4 font-medium text-gray-600 lg:whitespace-normal">
            <span className="mr-1 text-gray-400 tabular-nums">{index + 1}.</span>
            {APPLICATION_STATUSES[stage.status].label}
          </span>
        </span>
        <span className="order-last w-10 text-right text-lg leading-none font-semibold text-gray-900 tabular-nums lg:order-none lg:w-auto lg:text-left lg:text-2xl">{stage.count}</span>
        {/* Relative volume against the busiest stage. */}
        <span aria-hidden="true" className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-gray-100 sm:w-40 lg:w-full">
          <span className="block h-full origin-left animate-grow-x rounded-full transition-[width] duration-500 ease-emphasized" style={{ width: `${width}%`, background: APPLICATION_STATUS_COLORS[stage.status], animationDelay: `${index * 50}ms` }} />
        </span>
        <span
          id={tooltipId}
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-max -translate-x-1/2 animate-pop-in rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-600 shadow-dropdown group-hover/stage:block group-focus-visible/stage:block"
        >
          <span className="block font-medium text-gray-800">{APPLICATION_STATUSES[stage.status].label}</span>
          <span className="font-semibold text-gray-900 tabular-nums">{stage.count}</span> {stage.count === 1 ? "candidate" : "candidates"} · {stage.share}% of applications
        </span>
      </Link>
      {!last && (
        <ChevronRight aria-hidden="true" size={16} strokeWidth={2.2} className="absolute top-1/2 -right-[13px] z-10 hidden -translate-y-1/2 rounded-full bg-gray-50 text-gray-300 lg:block" />
      )}
    </li>
  );
}

export default function HiringPipeline({ statusCounts, total }) {
  if (total === 0) {
    return (
      <EmptyState icon={Users} title="No applications yet">
        Publish a job listing; each application will appear here at its current stage.
      </EmptyState>
    );
  }

  const countOf = (status) => statusCounts.find((s) => s.status === status)?.count ?? 0;
  const known = statusCounts.reduce((sum, s) => sum + s.count, 0);
  const rejected = countOf("rejected");
  const other = Math.max(0, total - known);
  const counts = STAGE_ORDER.map(countOf);
  const shares = percentages([...counts, rejected, other]);
  const stages = STAGE_ORDER.map((status, i) => ({ status, count: counts[i], share: shares[i] }));
  const max = Math.max(...counts);

  return (
    <div>
      <ol aria-label="Hiring stages, from application to hire" className="stagger grid gap-2 lg:grid-cols-7 lg:gap-3">
        {stages.map((stage, i) => (
          <Stage key={stage.status} stage={stage} index={i} max={max} last={i === stages.length - 1} />
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3 text-xs text-gray-600">
        <Link
          to="/company/candidates?status=rejected"
          className="inline-flex items-center gap-1.5 rounded-xs hover:text-gray-900 hover:underline focus-visible:outline-2 focus-visible:outline-accent-500"
        >
          <XCircle aria-hidden="true" size={14} style={{ color: APPLICATION_STATUS_COLORS.rejected }} />
          Not moving forward (rejected): <span className="font-semibold text-gray-900 tabular-nums">{rejected}</span>
        </Link>
        {other > 0 && <span>Other status: {other}</span>}
        <span>
          Total applications: <span className="font-semibold text-gray-900 tabular-nums">{total}</span>
        </span>
      </div>
    </div>
  );
}
