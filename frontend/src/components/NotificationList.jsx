import { useNavigate } from "react-router-dom";
import { Bell, CalendarClock, CalendarX2, CircleArrowRight, FileText, PartyPopper, RefreshCw, Send, UserX } from "lucide-react";
import { useAction } from "../hooks/useQuery.js";
import { formatRelative } from "../lib/format.js";
import { markNotificationRead } from "../services/core.js";

const TYPE_ICONS = {
  interview: { icon: CalendarClock, tone: "bg-accent-50 text-accent-600" },
  interview_changed: { icon: RefreshCw, tone: "bg-warning-bg text-warning" },
  interview_cancelled: { icon: CalendarX2, tone: "bg-error-bg text-error" },
  offer: { icon: Send, tone: "bg-accent-50 text-accent-600" },
  hired: { icon: PartyPopper, tone: "bg-success-bg text-success" },
  rejected: { icon: UserX, tone: "bg-gray-100 text-gray-600" },
  application: { icon: FileText, tone: "bg-cyan-50 text-cyan-700" },
  status: { icon: CircleArrowRight, tone: "bg-info-bg text-info" },
};
const FALLBACK = { icon: Bell, tone: "bg-gray-100 text-gray-600" };

// One list for the bell popover and the full page. Opening an item marks it read and follows its link.
export default function NotificationList({ items, onNavigate, dense = false }) {
  const navigate = useNavigate();
  const [run] = useAction();

  async function open(n) {
    if (!n.read) await run(() => markNotificationRead(n.id));
    onNavigate?.();
    if (n.link) navigate(n.link);
  }

  return (
    <ul className={dense ? "max-h-96 overflow-y-auto" : "divide-y divide-gray-100"}>
      {items.map((n) => {
        const { icon: Icon, tone } = TYPE_ICONS[n.type] ?? FALLBACK;
        return (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => open(n)}
              className={`flex w-full gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-50 focus-visible:bg-accent-50 focus-visible:outline-none ${n.read ? "" : "bg-accent-50/30"}`}
            >
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${tone}`}>
                <Icon aria-hidden="true" size={15} strokeWidth={1.9} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] ${n.read ? "text-gray-700" : "font-medium text-gray-900"}`}>{n.text}</span>
                <span className="text-[11px] text-gray-500">{formatRelative(n.at)}</span>
              </span>
              {!n.read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-600">
                  <span className="sr-only">Unread</span>
                </span>
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
