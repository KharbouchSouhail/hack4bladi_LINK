import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { percentages } from "../../domain/analytics.js";

// Pie with a legend beside it (stacked when the card is narrow). Items: { key, label, value, color, to? }.
// The legend carries every label, count and share, so the pie itself is decorative for screen readers.
// Hovering a segment or a legend row highlights the pair; with `to`, both open the filtered list.

const R = 92;
const C = 100;

// "1 application", "3 applications".
function units(count, unit) {
  return count === 1 ? unit.replace(/s$/, "") : unit;
}

function point(angle, radius = R) {
  return [C + radius * Math.cos(angle), C + radius * Math.sin(angle)];
}

function slicePath(start, end) {
  const [x0, y0] = point(start);
  const [x1, y1] = point(end);
  return `M${C},${C} L${x0},${y0} A${R},${R} 0 ${end - start > Math.PI ? 1 : 0} 1 ${x1},${y1} Z`;
}

export default function PieChart({ items, unit = "applications", label, size = 152 }) {
  const navigate = useNavigate();
  const [active, setActive] = useState(null);
  const total = items.reduce((sum, i) => sum + i.value, 0);
  const shares = percentages(items.map((i) => i.value));

  let angle = -Math.PI / 2;
  const slices = items
    .map((item, i) => ({ ...item, share: shares[i] }))
    .map((item) => {
      const start = angle;
      angle += total ? (2 * Math.PI * item.value) / total : 0;
      return { ...item, start, end: angle, mid: (start + angle) / 2 };
    })
    .filter((s) => s.value > 0);
  const hovered = slices.find((s) => s.key === active);

  return (
    <div className="@container">
      <div className="flex flex-col items-center gap-6 @xs:flex-row @xs:items-center @xs:gap-6">
        <div className="relative shrink-0" style={{ width: size, height: size }} onMouseLeave={() => setActive(null)}>
          <svg viewBox="0 0 200 200" width={size} height={size} aria-hidden="true" className="animate-[reveal-scale_500ms_var(--ease-reveal)_backwards] overflow-visible">
            {slices.length === 1 ? (
              <circle cx={C} cy={C} r={R} fill={slices[0].color} stroke="white" strokeWidth="2" onMouseEnter={() => setActive(slices[0].key)} onClick={() => slices[0].to && navigate(slices[0].to)} className={slices[0].to ? "cursor-pointer" : ""} />
            ) : (
              slices.map((s) => {
                const lifted = s.key === active;
                const [dx, dy] = lifted ? [4 * Math.cos(s.mid), 4 * Math.sin(s.mid)] : [0, 0];
                return (
                  <path
                    key={s.key}
                    d={slicePath(s.start, s.end)}
                    fill={s.color}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    onMouseEnter={() => setActive(s.key)}
                    onClick={() => s.to && navigate(s.to)}
                    style={{ transform: `translate(${dx}px, ${dy}px)`, opacity: active && !lifted ? 0.55 : 1 }}
                    className={`transition-[transform,opacity] duration-200 ease-standard ${s.to ? "cursor-pointer" : ""}`}
                  />
                );
              })
            )}
          </svg>
          {hovered && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-20 w-max -translate-x-1/2 -translate-y-[calc(100%+8px)] animate-pop-in rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] text-gray-600 shadow-dropdown"
              style={{ left: `${((C + 0.55 * R * Math.cos(hovered.mid)) / 200) * 100}%`, top: `${((C + 0.55 * R * Math.sin(hovered.mid)) / 200) * 100}%` }}
            >
              <span className="flex items-center gap-1.5 font-medium text-gray-800">
                <span aria-hidden="true" className="h-2 w-2 rounded-xs" style={{ background: hovered.color }} />
                {hovered.label}
              </span>
              <span className="font-semibold text-gray-900 tabular-nums">{hovered.value}</span> {units(hovered.value, unit)} · {hovered.share}%
            </div>
          )}
        </div>

        <ul aria-label={label} className="w-full min-w-0 flex-1 space-y-0.5">
          {items.map((item, i) => {
            const row = (
              <>
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-xs" style={{ background: item.color }} />
                <span className="min-w-0 flex-1 truncate" title={item.label}>
                  {item.label}
                </span>
                <span className="font-semibold text-gray-900 tabular-nums">{item.value}</span>
                <span className="w-10 text-right text-gray-500 tabular-nums">{shares[i]}%</span>
              </>
            );
            const className = `flex items-center gap-2.5 rounded-sm px-2 py-1.5 text-xs transition-colors duration-150 ease-standard ${item.value === 0 ? "text-gray-400" : "text-gray-700"} ${active === item.key ? "bg-gray-50" : ""}`;
            const hover = { onMouseEnter: () => setActive(item.key), onMouseLeave: () => setActive(null), onFocus: () => setActive(item.key), onBlur: () => setActive(null) };
            return (
              <li key={item.key}>
                {item.to ? (
                  <Link
                    to={item.to}
                    aria-label={`${item.label}: ${item.value} ${units(item.value, unit)}, ${shares[i]}%`}
                    className={`${className} hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-accent-500`}
                    {...hover}
                  >
                    {row}
                  </Link>
                ) : (
                  <div className={className} {...hover}>
                    {row}
                  </div>
                )}
              </li>
            );
          })}
          <li className="mt-1.5 flex items-center justify-between border-t border-gray-100 px-2 pt-2 text-xs text-gray-600">
            Total <span className="font-semibold text-gray-900 tabular-nums">{total}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
