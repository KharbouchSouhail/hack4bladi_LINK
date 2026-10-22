import { Link as RouterLink } from "react-router-dom";
import { CheckCircle2, X } from "lucide-react";
import logoMark from "../assets/logo-mark.png";

// Dot grids are a background pattern so they stay crisp at any size; color comes from `text-*`.
const DOTS = {
  backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
  backgroundSize: "14px 14px",
};

// Purely decorative shapes for the blue panel, after the reference mockup.
function PanelDecorations() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <span className="absolute -top-10 left-10 h-20 w-20 rounded-full bg-white/90" />
      <span className="absolute top-16 left-8 h-12 w-24 text-white/40" style={DOTS} />
      <span className="absolute top-0 left-40 h-24 w-5 rounded-b-full bg-white/25" />
      <span className="absolute top-0 left-48 h-36 w-5 rounded-b-full bg-white/15" />
      <span className="absolute top-12 right-1/3 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/70">
        <span className="h-2.5 w-2.5 rounded-full bg-white" />
      </span>
      <span className="absolute top-10 right-[28%] h-3 w-3 rounded-full bg-brand-cyan" />

      {/* Two interlocking rings: the Link mark, as an outline. */}
      <span className="absolute top-20 -right-10 h-28 w-28 rounded-full border-[6px] border-white/15" />
      <span className="absolute top-32 right-6 h-28 w-28 rounded-full border-[6px] border-white/10" />

      <span className="absolute bottom-24 left-10 h-8 w-8 rounded-full bg-linear-to-br from-cyan-100 to-brand-cyan shadow-card" />
      <span className="absolute bottom-8 left-12 h-12 w-16 text-white/40" style={DOTS} />
      <X className="absolute bottom-10 left-1/3 text-white/80" size={22} strokeWidth={3} />

      <span className="absolute -bottom-40 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full border-4 border-white/80" />
      <span className="absolute -bottom-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-linear-to-b from-brand-cyan to-accent-300" />
      <span className="absolute bottom-24 left-[63%] h-9 w-9 rounded-full bg-linear-to-br from-white to-cyan-300 shadow-card" />
    </div>
  );
}

export default function AuthLayout({ title, subtitle, aside, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 py-8 sm:px-8">
      {/* Page backdrop: blue left half, soft circles on the right. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute inset-y-0 left-0 hidden w-1/2 bg-accent-500 md:block" />
        <span className="absolute -top-28 -right-28 h-[26rem] w-[26rem] rounded-full bg-accent-300/60" />
        <span className="absolute -right-40 -bottom-40 h-[30rem] w-[30rem] rounded-full border-[56px] border-accent-300/45" />
        <span className="absolute right-8 bottom-8 h-16 w-24 text-accent-200" style={DOTS} />
      </div>

      <div className="relative z-10 grid w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_30px_80px_rgba(66,85,201,0.25)] md:max-w-5xl md:grid-cols-2">
        <aside className="relative hidden min-h-[600px] flex-col justify-center overflow-hidden bg-linear-135 from-accent-500 via-accent-600 to-accent-700 px-10 py-16 text-white md:flex lg:px-14">
          <PanelDecorations />
          <div className="relative">
            <h2 className="max-w-sm font-display text-4xl leading-[1.1] font-bold tracking-tight lg:text-5xl">
              {aside.heading}
            </h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/90">{aside.text}</p>
            {aside.points && (
              <ul className="mt-6 space-y-2">
                {aside.points.map((point) => (
                  <li key={point} className="flex items-center gap-2 text-[13px] text-white/95">
                    <CheckCircle2 aria-hidden="true" size={16} strokeWidth={2} className="shrink-0 text-brand-cyan" />
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex flex-col justify-center bg-gray-50 px-6 py-10 text-gray-900 sm:px-12">
          <RouterLink
            to="/"
            aria-label="Link home"
            className="mx-auto rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-500"
          >
            <img src={logoMark} alt="" className="h-14 w-14 rounded-xl shadow-card" />
          </RouterLink>
          <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-center text-[13px] text-gray-600">{subtitle}</p>
          <div className="mt-7">{children}</div>
          {footer && <p className="mt-6 text-center text-[13px] text-gray-600">{footer}</p>}
        </main>
      </div>
    </div>
  );
}
