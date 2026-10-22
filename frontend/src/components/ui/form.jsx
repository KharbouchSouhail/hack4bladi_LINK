import { useId } from "react";
import { AlertCircle, Search } from "lucide-react";

const CONTROL_BASE =
  "rounded-control border bg-white text-[13px] text-gray-900 outline-none transition-shadow placeholder:text-gray-400 focus:border-accent-500 focus:ring-[3px] focus:ring-accent-500/20 disabled:bg-gray-50 disabled:text-gray-500";
const CONTROL = `w-full ${CONTROL_BASE}`;

function borderFor(error) {
  return error ? "border-error" : "border-gray-300";
}

// Label, hint and error wiring shared by every form control.
function Field({ label, hint, error, className = "", children }) {
  const id = useId();
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-gray-800">
          {label}
        </label>
      )}
      {children({ id, describedBy })}
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-gray-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-xs text-error">
          <AlertCircle aria-hidden="true" size={14} strokeWidth={1.8} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({ label, hint, error, className, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} h-10 px-3 ${borderFor(error)}`}
          {...props}
        />
      )}
    </Field>
  );
}

export function Textarea({ label, hint, error, className, rows = 4, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          rows={rows}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} px-3 py-2 leading-relaxed ${borderFor(error)}`}
          {...props}
        />
      )}
    </Field>
  );
}

export function Select({ label, hint, error, className, options, placeholder, ...props }) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${CONTROL} h-10 px-2.5 ${borderFor(error)}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

export function Checkbox({ label, description, className = "", ...props }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 text-[13px] text-gray-800 ${className}`}>
      <input type="checkbox" className="mt-0.5 h-4 w-4 shrink-0 accent-accent-500" {...props} />
      <span>
        {label}
        {description && <span className="block text-xs text-gray-500">{description}</span>}
      </span>
    </label>
  );
}

export function SearchInput({ label = "Search", className = "", ...props }) {
  return (
    <div className={`relative ${className}`}>
      <Search aria-hidden="true" size={16} strokeWidth={1.8} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400" />
      <input type="search" aria-label={label} className={`${CONTROL} h-9 border-gray-300 pr-3 pl-9`} {...props} />
    </div>
  );
}

// Compact select for toolbars, labelled for screen readers only.
export function FilterSelect({ label, options, className = "", ...props }) {
  return (
    <select aria-label={label} className={`${CONTROL_BASE} h-9 max-w-full border-gray-300 pr-8 pl-2.5 ${className}`} {...props}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function FormError({ children }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-control border border-error/20 bg-error-bg px-3 py-2.5 text-[13px] text-error">
      <AlertCircle aria-hidden="true" size={16} strokeWidth={1.8} className="mt-px shrink-0" />
      {children}
    </p>
  );
}
