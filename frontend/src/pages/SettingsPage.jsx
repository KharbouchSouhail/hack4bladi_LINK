import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, RotateCcw } from "lucide-react";
import { getSession, logout } from "../auth/auth.js";
import Button, { buttonClasses } from "../components/Button.jsx";
import Card, { PageHeader } from "../components/ui/Card.jsx";
import { ConfirmDialog } from "../components/ui/Dialog.jsx";
import { Input } from "../components/ui/form.jsx";
import { LoadingState } from "../components/ui/states.jsx";
import { useAction, useQuery } from "../hooks/useQuery.js";
import { getMe, updateMyProfile } from "../services/candidateApi.js";
import { resetDemoData } from "../services/core.js";

function CandidateProfileForm() {
  const query = useQuery(getMe);
  if (!query.data) return <LoadingState />;
  return <ProfileFields me={query.data} />;
}

function ProfileFields({ me }) {
  const [form, setForm] = useState({ name: me.name, email: me.email, location: me.location, headline: me.headline });
  const [errors, setErrors] = useState({});
  const [run, pending] = useAction();
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    const result = await run(() => updateMyProfile(form), { success: "Profile saved." });
    setErrors(result.ok ? {} : result.fieldErrors);
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Input label="Full name" value={form.name} onChange={update("name")} error={errors.name} autoComplete="name" />
      <Input label="Email" type="email" value={form.email} onChange={update("email")} error={errors.email} autoComplete="email" />
      <Input label="Location" value={form.location} onChange={update("location")} autoComplete="address-level2" />
      <Input label="Headline" value={form.headline} onChange={update("headline")} error={errors.headline} placeholder="e.g. Final-year engineering student" />
      <div className="sm:col-span-2">
        <Button type="submit" variant="solid" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save profile"}
        </Button>
      </div>
    </form>
  );
}

export default function SettingsPage({ role }) {
  const session = getSession();
  const navigate = useNavigate();
  const [confirmReset, setConfirmReset] = useState(false);
  const [run, pending] = useAction();

  async function reset() {
    const { ok } = await run(resetDemoData, { success: "Demo data restored." });
    if (ok) setConfirmReset(false);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={role === "candidate" ? "Profile and settings" : "Settings"} />

      {role === "candidate" && (
        <Card title="Profile" description="Shared with employers only when you apply and agree to share it.">
          <CandidateProfileForm />
        </Card>
      )}

      <Card title="Account">
        <dl className="grid gap-3 text-[13px] sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">Signed in as</dt>
            <dd className="font-medium text-gray-900">{session.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Username</dt>
            <dd className="font-medium text-gray-900">{session.username}</dd>
          </div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {role === "company" && (
            <Link to="/company/profile" className={buttonClasses("secondary", "", "sm")}>
              Edit company profile
            </Link>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut aria-hidden="true" size={16} /> Sign out
          </Button>
        </div>
      </Card>

      <Card title="Demo environment" description="All companies, people and results are fictional and stored in this browser.">
        <p className="text-[13px] text-gray-600">
          Resetting restores the seeded dataset for every role: résumé analyses, test attempts, progress, jobs and applications.
        </p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={() => setConfirmReset(true)}>
          <RotateCcw aria-hidden="true" size={16} /> Reset demo data
        </Button>
      </Card>

      <ConfirmDialog open={confirmReset} onClose={() => setConfirmReset(false)} onConfirm={reset} title="Reset demo data?" confirmLabel="Reset" danger pending={pending}>
        Every change made in this browser will be lost, for all roles. This can't be undone.
      </ConfirmDialog>
    </div>
  );
}
