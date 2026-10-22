import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { GAP_KINDS, GAP_PRIORITIES } from "../../domain/analysis.js";
import { LEVELS } from "../../domain/constants.js";
import { StatusBadge } from "../ui/Badge.jsx";
import { LockedCard, UpgradeDialog } from "./locked.jsx";

export function GapKindBadge({ kind }) {
  return <StatusBadge map={GAP_KINDS} value={kind} />;
}

export function GapPriorityBadge({ priority }) {
  return <StatusBadge map={GAP_PRIORITIES} value={priority} />;
}

// A skill gap the candidate's plan lets them see. The whole card links to the skill's learning page.
export function GapCard({ gap }) {
  return (
    <Link
      to={`/candidate/skill-gaps/${gap.skillId}`}
      className="group flex h-full flex-col rounded-lg border border-gray-200 bg-white p-4 shadow-subtle card-interactive hover:border-accent-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <GapPriorityBadge priority={gap.priority} />
        <GapKindBadge kind={gap.kind} />
      </div>
      <h3 className="mt-2.5 text-sm font-semibold text-gray-900">{gap.name}</h3>
      <p className="mt-1 text-[13px] text-gray-600">{gap.explanation}</p>
      <p className="mt-2 text-xs text-gray-500">{gap.relevance}</p>
      {gap.level && (
        <p className="mt-1 text-xs text-gray-500">
          Expected level: <span className="font-medium text-gray-700">{LEVELS[gap.level]}</span>
          {gap.gain > 0 && ` · up to +${gap.gain} pts when validated`}
        </p>
      )}
      <span className="mt-auto inline-flex items-center gap-1 pt-3 text-xs font-semibold text-accent-600 group-hover:underline">
        View learning resources <ArrowRight aria-hidden="true" size={14} className="transition-transform duration-200 ease-standard group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

export function LockedGapCard({ index, onClick }) {
  return <LockedCard title="Locked skill gap" hint="Upgrade to Pro to see it" label={`Locked skill gap ${index}. Upgrade to see it.`} onClick={onClick} />;
}

export function GapUpgradeDialog({ open, onClose, lockedCount }) {
  return (
    <UpgradeDialog
      open={open}
      onClose={onClose}
      title="Unlock your complete skill-gap analysis"
      description={
        lockedCount > 0
          ? `${lockedCount} more ${lockedCount === 1 ? "skill gap was" : "skill gaps were"} found in your analysis. Upgrade to see every one.`
          : "Upgrade to see every skill gap in your analysis."
      }
      note="Pro shows the full report. Max adds the courses, practice tests and progress tracking for each skill."
    />
  );
}
