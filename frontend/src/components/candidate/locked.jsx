import { Link } from "react-router-dom";
import { Check, Lock } from "lucide-react";
import { PLANS } from "../../domain/permissions.js";
import { buttonClasses } from "../Button.jsx";
import Dialog from "../ui/Dialog.jsx";

// Placeholder for an item the plan doesn't include. It's built from a count only: the service never sends
// the item's details, so there is nothing behind the blur to reveal.
export function LockedCard({ title, hint, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="group relative flex h-full min-h-44 w-full flex-col overflow-hidden rounded-lg border border-dashed border-gray-300 bg-gray-25 p-4 text-left card-interactive hover:border-accent-300 hover:bg-accent-50/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600"
    >
      <div aria-hidden="true" className="space-y-2 blur-[3px] select-none">
        <div className="flex gap-1.5">
          <span className="h-5 w-20 rounded-[6px] bg-gray-200" />
          <span className="h-5 w-24 rounded-[6px] bg-gray-200" />
        </div>
        <span className="block h-4 w-2/5 rounded bg-gray-300" />
        <span className="block h-3 w-full rounded bg-gray-200" />
        <span className="block h-3 w-4/5 rounded bg-gray-200" />
      </div>
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 px-4 text-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-accent-600 shadow-subtle ring-1 ring-accent-100 transition duration-200 ease-standard group-hover:-translate-y-0.5 group-hover:ring-accent-300">
          <Lock aria-hidden="true" size={16} />
        </span>
        <span className="text-[13px] font-semibold text-gray-900">{title}</span>
        <span className="text-xs text-gray-600">{hint}</span>
      </span>
    </button>
  );
}

function PlanColumn({ planKey, highlight }) {
  const plan = PLANS[planKey];
  return (
    <section className={`rounded-lg border p-4 transition-colors duration-200 ease-standard ${highlight ? "border-accent-300 bg-accent-50/50" : "border-gray-200 hover:border-accent-200"}`}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">{plan.label}</h3>
        <span className="text-xs text-gray-500">{plan.price}</span>
      </div>
      <p className="text-xs text-gray-600">{plan.tagline}</p>
      <ul className="mt-3 space-y-1.5">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-xs text-gray-700">
            <Check aria-hidden="true" size={14} className="mt-px shrink-0 text-accent-600" /> {f}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Compares the paid plans and sends the candidate to the existing subscription page.
export function UpgradeDialog({ open, onClose, title, description, highlight = "pro", note }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClasses("secondary", "", "sm")}>
            Not now
          </button>
          <Link to="/candidate/subscription" className={buttonClasses("solid", "", "sm")}>
            See plans
          </Link>
        </>
      }
    >
      <div className="stagger grid gap-3 sm:grid-cols-2">
        <PlanColumn planKey="pro" highlight={highlight === "pro"} />
        <PlanColumn planKey="max" highlight={highlight === "max"} />
      </div>
      {note && <p className="mt-3 text-xs text-gray-500">{note}</p>}
    </Dialog>
  );
}

// The "N more locked" strip shown under a grid of locked cards. It reveals as it scrolls into view.
export function UnlockBanner({ icon: Icon, children, action, onClick }) {
  return (
    <div data-reveal="up" className="mt-4 flex flex-col gap-3 rounded-lg border border-accent-100 bg-accent-50/60 px-4 py-3.5 sm:flex-row sm:items-center">
      <Icon aria-hidden="true" size={18} className="shrink-0 text-accent-600" />
      <p className="flex-1 text-[13px] text-gray-700">{children}</p>
      <button type="button" onClick={onClick} className={buttonClasses("solid", "", "sm")}>
        {action}
      </button>
    </div>
  );
}
