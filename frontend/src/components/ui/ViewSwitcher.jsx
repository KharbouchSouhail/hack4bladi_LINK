import { useSearchParams } from "react-router-dom";
import { CalendarDays, LayoutGrid } from "lucide-react";

export const CARD_CALENDAR_VIEWS = [
  { value: "cards", label: "Cards", icon: LayoutGrid },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
];

// Segmented control: one pressed button per option. `hideLabels` keeps only the icons below `sm`.
export default function ViewSwitcher({ label, options, value, onChange, hideLabels = false, className = "" }) {
  return (
    <div role="group" aria-label={label} className={`inline-flex shrink-0 items-center gap-0.5 rounded-control border border-gray-200 bg-gray-100/70 p-0.5 ${className}`}>
      {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
        const active = optionValue === value;
        return (
          <button
            key={optionValue}
            type="button"
            aria-pressed={active}
            title={optionLabel}
            onClick={() => onChange(optionValue)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-[8px] px-3 text-xs font-semibold transition duration-200 ease-standard focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent-500 active:scale-[0.97] ${
              active ? "bg-white text-accent-700 shadow-[0_1px_3px_rgba(41,45,62,0.12)]" : "text-gray-600 hover:bg-white/60 hover:text-gray-900"
            }`}
          >
            {Icon && <Icon aria-hidden="true" size={15} strokeWidth={1.9} />}
            <span className={hideLabels ? "sr-only sm:not-sr-only" : ""}>{optionLabel}</span>
          </button>
        );
      })}
    </div>
  );
}

// The page's current view, kept in the URL (?view=calendar) so it survives opening a detail page and coming back.
export function useViewParam(fallback = "cards", allowed = CARD_CALENDAR_VIEWS.map((o) => o.value)) {
  const [params, setParams] = useSearchParams();
  const current = params.get("view");
  const view = allowed.includes(current) ? current : fallback;

  function setView(next) {
    setParams(
      (prev) => {
        const updated = new URLSearchParams(prev);
        if (next === fallback) updated.delete("view");
        else updated.set("view", next);
        return updated;
      },
      { replace: true },
    );
  }

  return [view, setView];
}
