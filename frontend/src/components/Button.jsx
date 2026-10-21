const VARIANTS = {
  primary: "bg-linear-to-r from-brand-blue to-brand-cyan text-brand-navy hover:brightness-110 active:brightness-95",
  secondary: "border border-accent-200 bg-white text-accent-600 hover:bg-accent-50",
  onDark: "border border-white/25 bg-transparent text-white hover:bg-white/10",
};

// Shared so router links can look like buttons.
export function buttonClasses(variant = "primary", className = "") {
  return `inline-flex h-11 items-center justify-center gap-2 rounded-control px-5 text-[13px] font-semibold transition duration-[180ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`;
}

export default function Button({ variant = "primary", className = "", type = "button", ...props }) {
  return <button type={type} className={buttonClasses(variant, className)} {...props} />;
}
