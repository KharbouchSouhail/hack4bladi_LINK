import { useId, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarX2, ChevronLeft, ChevronRight } from "lucide-react";
import { formatTime } from "../../lib/format.js";
import { addDays, addMonths, dayKey, groupByDay, isSameDay, monthGrid, startOfDay, weekDays } from "../../lib/calendar.js";
import ViewSwitcher from "../ui/ViewSwitcher.jsx";

// Event: { id, start: Date, allDay?, title, subtitle?, kind, tone, muted?, to, details?: string[], actions?: node }.
// Pages build events from their own data and permissions; this component only lays them out.

const TONES = {
  neutral: { chip: "border-gray-400 bg-gray-50 text-gray-800", dot: "bg-gray-400" },
  accent: { chip: "border-accent-500 bg-accent-50 text-accent-800", dot: "bg-accent-500" },
  cyan: { chip: "border-cyan-500 bg-cyan-50 text-cyan-700", dot: "bg-cyan-500" },
  success: { chip: "border-success bg-success-bg text-success", dot: "bg-success" },
  warning: { chip: "border-warning bg-warning-bg text-warning", dot: "bg-warning" },
  error: { chip: "border-error bg-error-bg text-error", dot: "bg-error" },
  info: { chip: "border-info bg-info-bg text-info", dot: "bg-info" },
};

const MODES = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
];

const MONTH_TITLE = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" });
const DAY_TITLE = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const SHORT_DAY = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });
const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short" });

function tone(event) {
  return TONES[event.tone] ?? TONES.neutral;
}

function timeLabel(event) {
  return event.allDay ? "All day" : formatTime(event.start.toISOString());
}

function titleFor(mode, cursor) {
  if (mode === "month") return MONTH_TITLE.format(cursor);
  if (mode === "day") return DAY_TITLE.format(cursor);
  const days = weekDays(cursor);
  return `${SHORT_DAY.format(days[0])} – ${SHORT_DAY.format(days[6])} ${days[6].getFullYear()}`;
}

function Tooltip({ id, event, align }) {
  return (
    <span
      id={id}
      role="tooltip"
      className={`pointer-events-none absolute bottom-full z-30 mb-1.5 hidden w-60 animate-pop-in rounded-md border border-gray-200 bg-white p-3 text-left text-xs text-gray-700 shadow-dropdown group-hover/event:block group-focus-visible/event:block ${align === "right" ? "right-0" : "left-0"}`}
    >
      <span className="block font-semibold text-gray-900">{event.title}</span>
      {event.subtitle && <span className="block text-gray-600">{event.subtitle}</span>}
      <span className="mt-1.5 flex items-center gap-1.5 font-medium text-gray-800">
        <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${tone(event).dot}`} />
        {event.kind} · {timeLabel(event)}
      </span>
      {event.details?.map((line) => (
        <span key={line} className="mt-0.5 block text-gray-500">
          {line}
        </span>
      ))}
    </span>
  );
}

// Compact entry in a month cell: tone bar, time and title, with a tooltip on hover or keyboard focus.
function EventChip({ event, align }) {
  const tooltipId = useId();
  return (
    <Link
      to={event.to}
      aria-describedby={tooltipId}
      className={`group/event relative flex min-w-0 items-center gap-1 rounded-[5px] border-l-[3px] px-1.5 py-0.5 text-[11px] leading-4 transition duration-150 ease-standard hover:brightness-[0.97] focus-visible:outline-2 focus-visible:outline-accent-500 ${tone(event).chip}`}
    >
      {!event.allDay && <span className="shrink-0 font-semibold tabular-nums">{timeLabel(event)}</span>}
      <span className={`truncate ${event.muted ? "line-through opacity-70" : ""}`}>{event.title}</span>
      <Tooltip id={tooltipId} event={event} align={align} />
    </Link>
  );
}

// Full-width entry for the day list and the selected day: time, details and any actions the page provides.
function AgendaItem({ event }) {
  return (
    <li className="flex flex-wrap items-center gap-3 rounded-md border border-gray-100 bg-white px-3 py-2.5 transition-colors duration-150 ease-standard hover:border-accent-200">
      <span className="w-14 shrink-0 text-xs font-semibold text-gray-700 tabular-nums">{timeLabel(event)}</span>
      <span aria-hidden="true" className={`h-9 w-1 shrink-0 rounded-full ${tone(event).dot}`} />
      <Link to={event.to} className="min-w-0 flex-1 rounded-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500">
        <span className={`block truncate text-[13px] font-semibold text-gray-900 hover:underline ${event.muted ? "line-through decoration-gray-400" : ""}`}>{event.title}</span>
        <span className="block truncate text-xs text-gray-600">
          {event.kind}
          {event.subtitle && ` · ${event.subtitle}`}
          {event.details?.length > 0 && ` · ${event.details.join(" · ")}`}
        </span>
      </Link>
      {event.actions && <div className="flex shrink-0 items-center gap-1.5">{event.actions}</div>}
    </li>
  );
}

function AgendaList({ events, emptyLabel = "Nothing on this day." }) {
  if (events.length === 0) return <p className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-500">{emptyLabel}</p>;
  return (
    <ul className="space-y-2">
      {events.map((event) => (
        <AgendaItem key={event.id} event={event} />
      ))}
    </ul>
  );
}

function MonthView({ cursor, selected, today, byDay, onSelect }) {
  const days = monthGrid(cursor);
  const selectedEvents = byDay.get(dayKey(selected)) ?? [];

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-gray-200 text-center text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
        {days.slice(0, 7).map((d) => (
          <span key={dayKey(d)} className="py-2">
            <span className="sm:hidden">{WEEKDAY.format(d).slice(0, 1)}</span>
            <span className="hidden sm:inline">{WEEKDAY.format(d)}</span>
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const list = byDay.get(dayKey(d)) ?? [];
          const inMonth = d.getMonth() === cursor.getMonth();
          const isSelected = isSameDay(d, selected);
          const isToday = isSameDay(d, today);
          return (
            <div
              key={dayKey(d)}
              onClick={() => onSelect(d)}
              className={`min-h-14 cursor-pointer border-gray-100 p-1 transition-colors duration-150 ease-standard sm:min-h-24 sm:p-1.5 ${i % 7 ? "border-l" : ""} ${i >= 7 ? "border-t" : ""} ${
                isSelected ? "bg-accent-50/60" : inMonth ? "bg-white hover:bg-gray-25" : "bg-gray-25/80"
              }`}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(d);
                }}
                aria-pressed={isSelected}
                aria-label={`${DAY_TITLE.format(d)}${list.length ? `, ${list.length} ${list.length === 1 ? "event" : "events"}` : ""}`}
                className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs tabular-nums transition-colors duration-150 ease-standard focus-visible:outline-2 focus-visible:outline-accent-500 sm:mx-0 ${
                  isToday ? "bg-accent-500 font-semibold text-white" : isSelected ? "font-semibold text-accent-700 ring-1 ring-accent-300" : inMonth ? "text-gray-800 hover:bg-gray-100" : "text-gray-400"
                }`}
              >
                {d.getDate()}
              </button>
              {/* Phones get dots; the selected day's list below carries the details. */}
              {list.length > 0 && (
                <div aria-hidden="true" className="mt-1 flex justify-center gap-0.5 sm:hidden">
                  {list.slice(0, 3).map((event) => (
                    <span key={event.id} className={`h-1.5 w-1.5 rounded-full ${tone(event).dot}`} />
                  ))}
                </div>
              )}
              <div className="mt-1 hidden space-y-0.5 sm:block">
                {list.slice(0, 2).map((event) => (
                  <EventChip key={event.id} event={event} align={i % 7 > 3 ? "right" : "left"} />
                ))}
                {list.length > 2 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(d);
                    }}
                    className="w-full rounded-[5px] px-1.5 text-left text-[11px] font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-2 focus-visible:outline-accent-500"
                  >
                    +{list.length - 2} more
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <section aria-live="polite" className="border-t border-gray-100 bg-gray-25 p-4">
        <h3 className="mb-2.5 text-xs font-semibold text-gray-800">{DAY_TITLE.format(selected)}</h3>
        <AgendaList events={selectedEvents} />
      </section>
    </div>
  );
}

function WeekView({ cursor, today, byDay, onOpenDay }) {
  return (
    <div className="grid divide-y divide-gray-100 md:grid-cols-7 md:divide-x md:divide-y-0">
      {weekDays(cursor).map((d, i) => {
        const list = byDay.get(dayKey(d)) ?? [];
        const isToday = isSameDay(d, today);
        return (
          <div key={dayKey(d)} className="flex min-h-0 flex-col gap-1.5 p-2 md:min-h-72">
            <button
              type="button"
              onClick={() => onOpenDay(d)}
              aria-label={`Open ${DAY_TITLE.format(d)} in day view`}
              className="flex items-center gap-2 rounded-sm px-1 py-1 text-left transition-colors duration-150 ease-standard hover:bg-gray-50 focus-visible:outline-2 focus-visible:outline-accent-500 md:flex-col md:items-start md:gap-0"
            >
              <span className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase">{WEEKDAY.format(d)}</span>
              <span className={`flex h-7 min-w-7 items-center justify-center rounded-full text-sm tabular-nums ${isToday ? "bg-accent-500 px-1.5 font-semibold text-white" : "font-medium text-gray-900"}`}>{d.getDate()}</span>
            </button>
            {list.length === 0 ? (
              <p className="px-1 text-[11px] text-gray-400 md:hidden">No events</p>
            ) : (
              list.map((event) => <EventChip key={event.id} event={event} align={i > 3 ? "right" : "left"} />)
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Calendar({ events, legend = [], label = "Calendar", emptyMessage = "Nothing to show yet." }) {
  const today = startOfDay(new Date());
  const [mode, setMode] = useState("month");
  const [cursor, setCursor] = useState(today);
  const [selected, setSelected] = useState(today);
  const byDay = useMemo(() => groupByDay(events), [events]);

  function move(step) {
    if (mode === "month") {
      const next = addMonths(cursor, step);
      setCursor(next);
      setSelected(next.getMonth() === today.getMonth() && next.getFullYear() === today.getFullYear() ? today : next);
    } else {
      const next = addDays(cursor, step * (mode === "week" ? 7 : 1));
      setCursor(next);
      setSelected(next);
    }
  }

  function goToday() {
    setCursor(today);
    setSelected(today);
  }

  function changeMode(next) {
    setMode(next);
    setCursor(selected);
  }

  function openDay(d) {
    setSelected(d);
    setCursor(d);
    setMode("day");
  }

  const navButton =
    "flex h-8 w-8 items-center justify-center rounded-control border border-gray-200 bg-white text-gray-700 transition duration-150 ease-standard hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-accent-500 active:scale-95";
  const unit = mode === "month" ? "month" : mode;

  return (
    <section aria-label={label}>
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <button type="button" onClick={goToday} className="h-8 rounded-control border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-800 transition duration-150 ease-standard hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700 focus-visible:outline-2 focus-visible:outline-accent-500 active:scale-95">
            Today
          </button>
          <button type="button" onClick={() => move(-1)} aria-label={`Previous ${unit}`} className={navButton}>
            <ChevronLeft aria-hidden="true" size={16} />
          </button>
          <button type="button" onClick={() => move(1)} aria-label={`Next ${unit}`} className={navButton}>
            <ChevronRight aria-hidden="true" size={16} />
          </button>
          <h2 aria-live="polite" className="ml-1 text-sm font-semibold text-gray-900 sm:text-base">
            {titleFor(mode, cursor)}
          </h2>
        </div>
        <ViewSwitcher label="Calendar range" options={MODES} value={mode} onChange={changeMode} />
      </header>

      {(legend.length > 0 || events.length === 0) && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-gray-100 px-4 py-2.5 text-[11px] text-gray-600">
          {events.length === 0 ? (
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <CalendarX2 aria-hidden="true" size={14} className="text-gray-400" /> {emptyMessage}
            </span>
          ) : (
            legend.map((item) => (
              <span key={item.label} className="flex items-center gap-1.5">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${TONES[item.tone]?.dot ?? TONES.neutral.dot}`} />
                {item.label}
              </span>
            ))
          )}
        </div>
      )}

      <div key={`${mode}-${mode === "month" ? MONTH_TITLE.format(cursor) : dayKey(cursor)}`} className="animate-fade-in">
        {mode === "month" && <MonthView cursor={cursor} selected={selected} today={today} byDay={byDay} onSelect={setSelected} />}
        {mode === "week" && <WeekView cursor={cursor} today={today} byDay={byDay} onOpenDay={openDay} />}
        {mode === "day" && (
          <div className="p-4">
            <AgendaList events={byDay.get(dayKey(cursor)) ?? []} />
          </div>
        )}
      </div>
    </section>
  );
}
