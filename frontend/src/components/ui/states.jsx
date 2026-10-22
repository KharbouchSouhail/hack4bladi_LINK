import { Link } from "react-router-dom";
import { AlertTriangle, Inbox, Lock, SearchX } from "lucide-react";
import { PLANS } from "../../domain/permissions.js";
import { AccessError, NotFoundError } from "../../services/errors.js";
import Button, { buttonClasses } from "../Button.jsx";

export function LoadingState({ rows = 3, label = "Loading" }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 p-5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-4 animate-pulse rounded bg-gray-100" style={{ width: `${90 - i * 15}%` }} />
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="flex animate-fade-in flex-col items-center px-6 py-10 text-center">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-500">
        <Icon aria-hidden="true" size={20} strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-gray-600">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function UpgradeCard({ plan, title, children, compact = false }) {
  const info = PLANS[plan];
  return (
    <div className={`flex animate-reveal flex-col items-center text-center ${compact ? "px-5 py-6" : "px-6 py-10"}`}>
      <span className="flex h-10 w-10 animate-pop-in items-center justify-center rounded-full bg-accent-50 text-accent-600 [animation-delay:160ms]">
        <Lock aria-hidden="true" size={18} strokeWidth={1.8} />
      </span>
      <p className="mt-3 text-sm font-semibold text-gray-900">{title ?? `Available with ${info.label}`}</p>
      {children && <p className="mt-1 max-w-sm text-[13px] text-gray-600">{children}</p>}
      <Link to="/candidate/subscription" className={buttonClasses("solid", "mt-4", "sm")}>
        Upgrade to {info.label}
      </Link>
    </div>
  );
}

// Maps service errors to the right state: upgrade prompt, not found, forbidden or generic failure.
export function ErrorState({ error, onRetry, upgradeText }) {
  if (error instanceof AccessError && error.requiredPlan) {
    return <UpgradeCard plan={error.requiredPlan}>{upgradeText ?? error.message}</UpgradeCard>;
  }
  if (error instanceof NotFoundError) {
    return <EmptyState icon={SearchX} title="Not found">{error.message}</EmptyState>;
  }
  return (
    <EmptyState
      icon={error instanceof AccessError ? Lock : AlertTriangle}
      title={error instanceof AccessError ? "Access denied" : "Something went wrong"}
      action={
        onRetry && !(error instanceof AccessError) ? (
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Try again
          </Button>
        ) : null
      }
    >
      {error.message}
    </EmptyState>
  );
}

// Standard loading / error / content switch for a useQuery result.
export function QueryBoundary({ query, children, rows, upgradeText }) {
  if (query.loading) return <LoadingState rows={rows} />;
  if (query.error) return <ErrorState error={query.error} onRetry={query.reload} upgradeText={upgradeText} />;
  // Fades in once when data first arrives; background refreshes keep it mounted, so nothing flickers.
  return <div className="animate-fade-in">{children(query.data)}</div>;
}
