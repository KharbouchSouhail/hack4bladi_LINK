// Single-series column chart in HTML/CSS: one hue, recessive grid, a tooltip per column on hover or focus,
// and a screen-reader table with the same numbers. Items: { key, label, fullLabel, value }.

const SHORT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const LONG = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" });
const MONTH = new Intl.DateTimeFormat("en-GB", { month: "short", year: "2-digit" });
const MONTH_LONG = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });

// Chart items from a countByPeriod() result: short axis labels, full labels for tooltips.
export function periodItems({ unit, buckets }) {
  return buckets.map((b) => {
    const start = new Date(b.start);
    return {
      key: b.start,
      value: b.count,
      label: unit === "month" ? MONTH.format(start) : SHORT.format(start),
      fullLabel: unit === "month" ? MONTH_LONG.format(start) : unit === "week" ? `Week of ${LONG.format(start)}` : LONG.format(start),
    };
  });
}

// Whole-number axis with at most 4 steps.
function niceScale(max) {
  if (max <= 4) return { top: Math.max(1, max), step: 1 };
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 5, 10].map((m) => m * magnitude).find((s) => s >= raw);
  return { top: Math.ceil(max / step) * step, step };
}

export default function ColumnChart({ items, unit = "applications", caption, height = 240, maxLabels = 8 }) {
  const { top, step } = niceScale(Math.max(0, ...items.map((i) => i.value)));
  const ticks = Array.from({ length: Math.floor(top / step) + 1 }, (_, i) => i * step).reverse();
  const labelEvery = Math.max(1, Math.ceil(items.length / maxLabels));

  return (
    <figure>
      <div className="flex gap-2">
        <div aria-hidden="true" className="relative w-7 shrink-0 text-right text-[10px] text-gray-400 tabular-nums" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (100 * t) / top}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height }}>
            {ticks.map((t) => (
              <span key={t} aria-hidden="true" className={`absolute inset-x-0 border-t ${t === 0 ? "border-gray-300" : "border-dashed border-gray-100"}`} style={{ top: `${100 - (100 * t) / top}%` }} />
            ))}
            <div className="absolute inset-0 flex items-stretch gap-[2px]">
              {items.map((item, i) => {
                const pct = (100 * item.value) / top;
                const align = i < items.length / 4 ? "left-0" : i > (3 * items.length) / 4 ? "right-0" : "left-1/2 -translate-x-1/2";
                return (
                  <div
                    key={item.key}
                    tabIndex={0}
                    aria-label={`${item.fullLabel ?? item.label}: ${item.value} ${unit}`}
                    className="group/col relative flex flex-1 items-end justify-center rounded-t-[4px] outline-none hover:bg-accent-50/50 focus-visible:bg-accent-50/70 focus-visible:ring-2 focus-visible:ring-accent-500"
                  >
                    {item.value > 0 && (
                      <span
                        aria-hidden="true"
                        className="w-full max-w-10 origin-bottom animate-grow-y rounded-t-[4px] bg-accent-500 transition-colors duration-150 ease-standard group-hover/col:bg-accent-600"
                        style={{ height: `${pct}%`, animationDelay: `${Math.min(i * 15, 300)}ms` }}
                      />
                    )}
                    <span
                      role="tooltip"
                      className={`pointer-events-none absolute z-20 mb-2 hidden w-max max-w-44 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-600 shadow-dropdown group-hover/col:block group-focus-visible/col:block ${align}`}
                      style={{ bottom: `${pct}%` }}
                    >
                      <span className="block font-medium text-gray-800">{item.fullLabel ?? item.label}</span>
                      <span className="font-semibold text-gray-900 tabular-nums">{item.value}</span> {unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          <div aria-hidden="true" className="mt-1.5 flex gap-[2px] text-[10px] text-gray-500">
            {items.map((item, i) => (
              <span key={item.key} className="flex-1 overflow-visible text-center whitespace-nowrap">
                {i % labelEvery === 0 ? item.label : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">{unit}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.key}>
              <th scope="row">{item.fullLabel ?? item.label}</th>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
