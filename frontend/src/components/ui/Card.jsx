import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

// Extra props (e.g. `data-reveal`) go to the outer element.
export default function Card({ title, description, action, children, className = "", bodyClassName = "p-5", as: Tag = "section", ...props }) {
  return (
    <Tag className={`rounded-lg border border-gray-200 bg-white shadow-subtle ${className}`} {...props}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold text-gray-900">{title}</h2>}
            {description && <p className="mt-0.5 text-xs text-gray-500">{description}</p>}
          </div>
          {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </Tag>
  );
}

export function PageHeader({ title, description, actions, eyebrow }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {eyebrow}
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-gray-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

// Not clickable, so hover only warms the border and icon instead of lifting the tile.
export function StatTile({ label, value, hint, icon: Icon }) {
  return (
    <div className="group rounded-lg border border-gray-200 bg-white p-4 shadow-subtle transition-colors duration-200 ease-standard hover:border-accent-200">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        {Icon && <Icon aria-hidden="true" size={16} strokeWidth={1.8} className="text-gray-400 transition-colors duration-200 ease-standard group-hover:text-accent-500" />}
      </div>
      <p className="mt-2 text-2xl font-semibold text-gray-900 tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  );
}

// Headline figure for dashboards. With `to`, the whole card links to the page behind the number.
export function KpiCard({ label, value, hint, icon: Icon, to }) {
  const body = (
    <>
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-50 text-accent-600 transition-colors duration-200 ease-standard group-hover:bg-accent-100">
          <Icon aria-hidden="true" size={16} strokeWidth={1.9} />
        </span>
        <p className="min-w-0 flex-1 text-xs font-medium text-gray-600">{label}</p>
        {to && (
          <ArrowUpRight
            aria-hidden="true"
            size={16}
            className="shrink-0 text-gray-300 transition-[color,transform] duration-200 ease-standard group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent-600"
          />
        )}
      </div>
      <p className="mt-3 text-[28px] leading-none font-semibold tracking-tight text-gray-900 tabular-nums">{value}</p>
      {hint && <p className="mt-2 text-xs text-gray-500">{hint}</p>}
    </>
  );
  const className = "group block rounded-lg border border-gray-200 bg-white p-4 shadow-subtle transition-[border-color,box-shadow] duration-200 ease-standard hover:border-accent-200 hover:shadow-card";
  return to ? (
    <Link to={to} className={`${className} focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}
