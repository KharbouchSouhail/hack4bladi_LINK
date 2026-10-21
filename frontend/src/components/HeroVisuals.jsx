import { BadgeCheck, Briefcase, CircleDashed, CircleDot, FileText, GraduationCap, MapPin } from "lucide-react";

const STEPS = [
  { Icon: FileText, title: "Upload your résumé", text: "Matched to a company-defined role." },
  { Icon: GraduationCap, title: "Close your gaps", text: "Targeted lessons and real tests." },
  { Icon: BadgeCheck, title: "Get eligible", text: "Apply to partner jobs that fit." },
];

// Each status pairs color with an icon and a label, so it never relies on color alone.
const SKILLS = [
  { name: "Python", status: "Demonstrated", Icon: BadgeCheck, tone: "bg-success-bg text-success" },
  { name: "SQL", status: "Mentioned", Icon: CircleDot, tone: "bg-warning-bg text-warning" },
  { name: "Statistics", status: "Learning", Icon: GraduationCap, tone: "bg-info-bg text-info" },
  { name: "Docker", status: "No evidence yet", Icon: CircleDashed, tone: "bg-gray-100 text-gray-600" },
];

const CARD = "rounded-lg border border-white/70 bg-white/75 p-5 shadow-card";

function ScoreRing({ value }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0" role="img" aria-label={`Compatibility score ${value} out of 100`}>
      <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="9" className="stroke-navy-100" />
      <circle
        cx="50"
        cy="50"
        r={radius}
        fill="none"
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value / 100)}
        transform="rotate(-90 50 50)"
        className="stroke-accent-600"
      />
      <text x="50" y="52" textAnchor="middle" className="fill-gray-900 text-[24px] font-bold tabular-nums">
        {value}
      </text>
      <text x="50" y="66" textAnchor="middle" className="fill-gray-500 text-[9px]">
        / 100
      </text>
    </svg>
  );
}

export default function HeroVisuals() {
  return (
    <section
      id="how-it-works"
      aria-labelledby="hero-title"
      className="scroll-mt-24 rounded-2xl border border-white/60 bg-white/45 p-6 shadow-modal backdrop-blur-xl backdrop-saturate-150 sm:p-8"
    >
      <span className="inline-flex rounded-[6px] bg-navy-100 px-2 py-1 text-[11px] font-semibold text-primary">
        For candidates and companies
      </span>
      <h2
        id="hero-title"
        className="mt-4 max-w-[540px] font-display text-3xl leading-[1.15] font-bold tracking-tight text-gray-900 sm:text-[44px]"
      >
        Link your skills to the jobs that <span className="text-accent">need them</span>.
      </h2>
      <p className="mt-3 max-w-[480px] text-sm leading-relaxed text-gray-700">
        See how you match a real company role, learn exactly what's missing, and prove it with tests employers defined.
      </p>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map(({ Icon, title, text }, i) => (
          <li key={title} className="flex gap-3 rounded-md bg-white/60 p-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-navy-900 text-accent-300">
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
            </span>
            <span>
              <span className="block text-xs font-semibold text-gray-900">
                {i + 1}. {title}
              </span>
              <span className="block text-[11px] leading-snug text-gray-600">{text}</span>
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <figure className={CARD}>
          <figcaption>
            <span className="block text-[11px] font-medium text-gray-500">Compatibility</span>
            <span className="block text-sm font-semibold text-gray-900">Junior Data Scientist</span>
          </figcaption>
          <div className="mt-4 flex items-center gap-4">
            <ScoreRing value={78} />
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-gray-500">Evidence coverage</dt>
                <dd className="font-semibold text-gray-900 tabular-nums">85%</dd>
              </div>
              <div>
                <dt className="text-gray-500">Biggest gain</dt>
                <dd className="font-semibold text-gray-900">Validate SQL +12</dd>
              </div>
            </dl>
          </div>
        </figure>

        <figure className={CARD}>
          <figcaption className="text-[11px] font-medium text-gray-500">Skill evidence</figcaption>
          <ul className="mt-3 space-y-2">
            {SKILLS.map(({ name, status, Icon, tone }) => (
              <li key={name} className="flex items-center justify-between gap-3 text-xs">
                <span className="font-medium text-gray-900">{name}</span>
                <span className={`inline-flex items-center gap-1 rounded-[6px] px-2 py-1 text-[10px] font-semibold ${tone}`}>
                  <Icon aria-hidden="true" size={12} strokeWidth={2} />
                  {status}
                </span>
              </li>
            ))}
          </ul>
        </figure>

        <figure className={`${CARD} sm:col-span-2`}>
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-navy-900 text-white">
              <Briefcase aria-hidden="true" size={20} strokeWidth={1.8} />
            </span>
            <figcaption className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-gray-900">Junior Data Scientist</span>
              <span className="flex items-center gap-1 text-[11px] text-gray-600">
                Atlas Analytics
                <MapPin aria-hidden="true" size={12} strokeWidth={1.8} className="ml-2" />
                Hybrid · Full-time
              </span>
            </figcaption>
            <span className="inline-flex items-center gap-1 rounded-[6px] bg-success-bg px-2 py-1 text-[11px] font-semibold text-success">
              <BadgeCheck aria-hidden="true" size={14} strokeWidth={2} />
              Eligible to apply
            </span>
          </div>
        </figure>
      </div>

      <p className="mt-4 text-[11px] text-gray-600">Example preview. Your results are calculated from your own résumé.</p>
    </section>
  );
}
