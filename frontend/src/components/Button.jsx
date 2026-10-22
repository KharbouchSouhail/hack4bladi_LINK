// Filled buttons use the primary blue with white text, darkening to the hover blue.
const FILLED = "bg-accent-500 text-white shadow-[0_4px_12px_rgba(98,125,245,0.25)] hover:bg-accent-600 active:bg-accent-700";

const VARIANTS = {
  primary: FILLED,
  solid: FILLED,
  secondary: "border border-gray-200 bg-white text-gray-800 hover:border-accent-200 hover:bg-accent-50 hover:text-accent-700",
  ghost: "text-gray-700 hover:bg-accent-50 hover:text-accent-700",
  danger: "bg-error text-white hover:brightness-110",
  onDark: "border border-white/30 bg-transparent text-white hover:bg-white/10",
};

const SIZES = {
  md: "h-11 px-5 text-[13px]",
  sm: "h-9 px-3.5 text-[13px]",
  xs: "h-8 px-2.5 text-xs",
};

// Shared so router links can look like buttons.
export function buttonClasses(variant = "primary", className = "", size = "md") {
  return `inline-flex shrink-0 items-center justify-center gap-2 rounded-control font-semibold whitespace-nowrap transition duration-[180ms] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-60 ${SIZES[size]} ${VARIANTS[variant]} ${className}`;
}

export default function Button({ variant = "primary", size = "md", className = "", type = "button", ...props }) {
  return <button type={type} className={buttonClasses(variant, className, size)} {...props} />;
}
