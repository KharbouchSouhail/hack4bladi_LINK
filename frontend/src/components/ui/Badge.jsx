import {
  BadgeCheck,
  BookOpen,
  CircleDashed,
  CircleDot,
  FileSearch,
  RotateCcw,
  UserCheck,
} from "lucide-react";

const TONES = {
  neutral: "bg-gray-100 text-gray-700 ring-gray-200",
  accent: "bg-accent-50 text-accent-700 ring-accent-100",
  cyan: "bg-cyan-50 text-cyan-700 ring-cyan-100",
  success: "bg-success-bg text-success ring-success/15",
  warning: "bg-warning-bg text-warning ring-warning/15",
  error: "bg-error-bg text-error ring-error/15",
  info: "bg-info-bg text-info ring-info/15",
  dark: "bg-navy-900 text-white ring-navy-900",
};

export default function Badge({ tone = "neutral", icon: Icon, children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-0.5 text-[11px] leading-5 font-semibold whitespace-nowrap ring-1 ring-inset ${TONES[tone]} ${className}`}
    >
      {Icon && <Icon aria-hidden="true" size={12} strokeWidth={2.2} />}
      {children}
    </span>
  );
}

// Renders one entry of a { key: { label, tone } } vocabulary from domain/constants.
export function StatusBadge({ map, value, icon }) {
  const entry = map[value] ?? { label: value, tone: "neutral" };
  return (
    <Badge tone={entry.tone} icon={icon}>
      {entry.label}
    </Badge>
  );
}

// Skill states always pair color with an icon and a label.
export const SKILL_STATE_ICONS = {
  passed: BadgeCheck,
  learning: BookOpen,
  retry: RotateCcw,
  confirmed: UserCheck,
  identified: FileSearch,
  missing: CircleDashed,
};

export const ELIGIBILITY_ICONS = {
  eligible: BadgeCheck,
  validate: CircleDot,
  not_met: CircleDashed,
};
