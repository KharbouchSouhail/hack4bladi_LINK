import { Link as RouterLink } from "react-router-dom";
import { Check } from "lucide-react";
import logoMark from "../assets/logo-new.png";

// Dot grids are a background pattern so they stay crisp at any size; color comes from `text-*`.
const DOTS = {
  backgroundImage: "radial-gradient(currentColor 1.5px, transparent 1.5px)",
  backgroundSize: "14px 14px",
};

// Purely decorative shapes for the light brand panel: a few soft rings and dots that settle in once.
function PanelDecorations() {
  return (
    <div aria-hidden="true" className="stagger pointer-events-none absolute inset-0">
      <span className="absolute -top-24 -left-20 h-64 w-64 rounded-full bg-accent-100/70 blur-2xl" />
      <span className="absolute top-14 left-10 h-12 w-24 text-accent-300/60" style={DOTS} />
      <span className="absolute top-12 right-1/3 flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent-200">
        <span className="h-2 w-2 rounded-full bg-accent-400" />
      </span>
      <span className="absolute top-10 right-[26%] h-2.5 w-2.5 rounded-full bg-brand-cyan/80" />

      {/* Two interlocking rings: the Link mark, as an outline. */}
      <span className="absolute top-20 -right-10 h-28 w-28 rounded-full border-[6px] border-accent-200/60" />
      <span className="absolute top-32 right-6 h-28 w-28 rounded-full border-[6px] border-cyan-100" />

      <span className="absolute bottom-10 left-12 h-12 w-16 text-accent-200" style={DOTS} />
      <span className="absolute -bottom-36 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full border-[3px] border-accent-200/70" />
      <span className="absolute -bottom-24 left-1/2 h-44 w-44 -translate-x-1/2 rounded-full bg-linear-to-b from-cyan-100 to-accent-100" />
      <span className="absolute bottom-24 left-[63%] h-7 w-7 rounded-full bg-linear-to-br from-white to-cyan-300 shadow-card" />
    </div>
  );
}

export default function AuthLayout({ title, subtitle, aside, children, footer }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gray-50 px-4 py-8 sm:px-8">
      {/* Page backdrop: a light periwinkle tint on the left, soft circles on the right. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="absolute inset-y-0 left-0 hidden w-1/2 bg-linear-to-br from-accent-100 to-accent-50 md:block" />
        <span className="absolute -top-28 -right-28 h-[26rem] w-[26rem] rounded-full bg-accent-100" />
        <span className="absolute -right-40 -bottom-40 h-[30rem] w-[30rem] rounded-full border-[56px] border-accent-100/80" />
        <span className="absolute right-8 bottom-8 h-16 w-24 text-accent-200" style={DOTS} />
      </div>

      <div className="relative z-10 grid w-full max-w-md animate-[reveal-scale_600ms_var(--ease-reveal)_backwards] overflow-hidden rounded-2xl border border-white bg-white shadow-[0_24px_64px_rgba(66,85,201,0.14)] md:max-w-5xl md:grid-cols-2">
        <aside className="relative hidden min-h-[600px] flex-col justify-center overflow-hidden border-r border-accent-100 bg-linear-160 from-accent-50 via-white to-cyan-50 px-10 py-16 text-navy-900 md:flex lg:px-14">
          <PanelDecorations />
          <div className="relative">
            <h2 className="max-w-sm font-display text-4xl leading-[1.1] font-bold tracking-tight lg:text-5xl">
              <span className="mask-line">
                <span className="block animate-rise [animation-delay:120ms]">{aside.heading}</span>
              </span>
            </h2>
            <p className="mt-4 max-w-sm animate-reveal text-sm leading-relaxed text-gray-600 [animation-delay:280ms]">{aside.text}</p>
            {aside.points && (
              <ul className="mt-7 space-y-2.5">
                {aside.points.map((point, i) => (
                  <li key={point} className="flex animate-reveal items-center gap-2.5 text-[13px] font-medium text-gray-800" style={{ animationDelay: `${380 + i * 70}ms` }}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white shadow-[0_2px_6px_rgba(98,125,245,0.3)]">
                      <Check aria-hidden="true" size={12} strokeWidth={3} />
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        <main className="flex flex-col justify-center bg-white px-6 py-10 text-gray-900 sm:px-12">
          <RouterLink
            to="/"
            aria-label="Link home"
            className="mx-auto rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-500"
          >
            <img src={logoMark} alt="" width="90" height="56" className="h-14 w-auto animate-[reveal-scale_500ms_var(--ease-reveal)_backwards] transition-transform duration-200 ease-standard hover:-translate-y-0.5" />
          </RouterLink>
          <h1 className="mt-4 text-center text-2xl font-semibold tracking-tight">
            <span className="mask-line">
              <span className="block animate-rise [animation-delay:80ms]">{title}</span>
            </span>
          </h1>
          <p className="mt-1 animate-reveal text-center text-[13px] text-gray-600 [animation-delay:180ms]">{subtitle}</p>
          {/* The form follows quickly and is usable straight away: only opacity and position animate. */}
          <div className="mt-7 animate-reveal [animation-delay:240ms]">{children}</div>
          {footer && <p className="mt-6 text-center text-[13px] text-gray-600">{footer}</p>}
        </main>
      </div>
    </div>
  );
}
