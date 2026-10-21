import { useNavigate } from "react-router-dom";
import { Building2, LogOut, ShieldCheck, UserRound } from "lucide-react";
import { getSession, logout } from "../auth/auth.js";
import Button from "../components/Button.jsx";
import Navbar from "../components/Navbar.jsx";

// Placeholder landing pages per role, until the real dashboards are built.
const ROLE_CONTENT = {
  candidate: {
    label: "Candidate",
    Icon: UserRound,
    intro: "Pick a target role, upload your résumé and see how well you match.",
    next: ["Choose a target job profile", "Upload your résumé", "Review your compatibility score"],
  },
  company: {
    label: "Company",
    Icon: Building2,
    intro: "Define the profiles you hire for and publish job offers to eligible candidates.",
    next: ["Create a job profile with required skills", "Post a job offer", "Review applications"],
  },
  admin: {
    label: "Administrator",
    Icon: ShieldCheck,
    intro: "Manage companies, profiles, skills, courses, tests and jobs.",
    next: ["Manage companies and profiles", "Manage courses and tests", "Review candidates and applications"],
  },
};

export default function RoleHome() {
  const navigate = useNavigate();
  const session = getSession();
  const { label, Icon, intro, next } = ROLE_CONTENT[session.role];

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen">
      <Navbar>
        <Button variant="onDark" onClick={handleLogout}>
          <LogOut aria-hidden="true" size={18} strokeWidth={1.8} />
          Sign out
        </Button>
      </Navbar>

      <main className="mx-auto max-w-[1440px] px-4 py-10 sm:px-7 sm:py-14">
        <span className="inline-flex items-center gap-1.5 rounded-[6px] bg-navy-100 px-2 py-1 text-[11px] font-semibold text-primary">
          <Icon aria-hidden="true" size={14} strokeWidth={1.8} />
          {label}
        </span>
        <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          Welcome, {session.name}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-gray-600">{intro}</p>

        <section className="mt-10 max-w-xl rounded-lg border border-gray-100 bg-white p-6 shadow-card">
          <h2 className="text-lg font-semibold text-gray-900">Coming next</h2>
          <ol className="mt-4 space-y-3">
            {next.map((item, i) => (
              <li key={item} className="flex items-center gap-3 text-sm text-gray-700">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-50 text-xs font-semibold text-accent tabular-nums">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  );
}
