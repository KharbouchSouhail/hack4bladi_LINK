import { useId, useState } from "react";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

export default function TextField({ label, error, icon: Icon, type = "text", className = "", ...inputProps }) {
  const id = useId();
  const errorId = `${id}-error`;
  const isPassword = type === "password";
  const [visible, setVisible] = useState(false);

  return (
    <div className={className}>
      {/* Label inherits its color so it reads on both white and dark-glass surfaces. */}
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium">
        {label}
      </label>
      <div className="relative">
        {Icon && (
          <Icon
            aria-hidden="true"
            size={18}
            strokeWidth={1.8}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-navy-500"
          />
        )}
        <input
          id={id}
          type={isPassword && visible ? "text" : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 w-full rounded-control border bg-white text-[13px] text-gray-900 outline-none placeholder:text-gray-400 transition-shadow focus:border-accent-500 focus:ring-[3px] focus:ring-accent-500/20 ${
            Icon ? "pl-10" : "pl-3.5"
          } ${isPassword ? "pr-11" : "pr-3.5"} ${error ? "border-error" : "border-gray-300"}`}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            className="absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-sm text-gray-500 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent-600"
          >
            {visible ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 flex w-fit items-center gap-1.5 rounded-xs bg-error-bg px-2 py-1 text-xs text-error">
          <AlertCircle aria-hidden="true" size={14} strokeWidth={1.8} />
          {error}
        </p>
      )}
    </div>
  );
}
