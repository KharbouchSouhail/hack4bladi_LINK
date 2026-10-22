import { useId } from "react";

export function ProgressBar({ value, label, className = "" }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`h-1.5 w-full overflow-hidden rounded-full bg-accent-50 ${className}`}
    >
      <div className="bg-gradient-brand-cyan h-full rounded-full transition-[width] duration-300" style={{ width: `${clamped}%` }} />
    </div>
  );
}

export function ScoreRing({ value, size = 112, label = "Compatibility score" }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  // React ids contain characters that break url(#…) references.
  const gradientId = `ring${useId().replace(/[^\w-]/g, "")}`;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0" role="img" aria-label={`${label}: ${value} out of 100`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-blue)" />
          <stop offset="100%" stopColor="var(--color-brand-cyan)" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-accent-50" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
        transform="rotate(-90 50 50)"
        stroke={`url(#${gradientId})`}
        className="transition-[stroke-dashoffset] duration-500"
      />
      <text x="50" y="52" textAnchor="middle" className="fill-gray-900 text-[24px] font-semibold tabular-nums">
        {value}
      </text>
      <text x="50" y="67" textAnchor="middle" className="fill-gray-500 text-[9px]">
        / 100
      </text>
    </svg>
  );
}

// Single-series horizontal bars with direct value labels, so no legend or color key is needed.
export function BarList({ items, total, emptyLabel = "No data yet." }) {
  const max = total ?? Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="text-sm text-gray-500">{emptyLabel}</p>;

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.key} title={`${item.label}: ${item.display ?? item.value}`}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-gray-700">{item.label}</span>
            <span className="font-semibold text-gray-900 tabular-nums">{item.display ?? item.value}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-r-[4px] bg-accent-50">
            <div className="h-full rounded-r-[4px] bg-accent-500" style={{ width: `${(100 * item.value) / max}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
