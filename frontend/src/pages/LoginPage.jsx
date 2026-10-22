import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Building2, Lock, ShieldCheck, User, UserRound } from "lucide-react";
import { DEMO_ACCOUNTS, getSession, HOME_BY_ROLE, login } from "../auth/auth.js";
import Alert from "../components/Alert.jsx";
import AuthLayout from "../components/AuthLayout.jsx";
import Button from "../components/Button.jsx";
import TextField from "../components/TextField.jsx";

const DEMO_BUTTONS = [
  { account: DEMO_ACCOUNTS.candidate, label: "Candidate", Icon: UserRound },
  { account: DEMO_ACCOUNTS.company, label: "Company", Icon: Building2 },
  { account: DEMO_ACCOUNTS.admin, label: "Admin", Icon: ShieldCheck },
];

const ASIDE = {
  heading: "Your career starts here",
  text: "Link your skills to the jobs that need them, and join a community of candidates and partner companies.",
  points: ["Match a real company-defined role", "Close your gaps with targeted lessons", "Prove it and apply to partner jobs"],
};

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const registeredUsername = location.state?.registered;

  const [identifier, setIdentifier] = useState(registeredUsername ?? "");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [showResetNote, setShowResetNote] = useState(false);

  const session = getSession();
  if (session) return <Navigate to={HOME_BY_ROLE[session.role]} replace />;

  function handleSubmit(event) {
    event.preventDefault();

    if (!identifier.trim() || !password) {
      setError("Enter your username or email and your password.");
      return;
    }

    const user = login(identifier, password, remember);
    if (user) {
      navigate(HOME_BY_ROLE[user.role], { replace: true });
    } else {
      setError("Incorrect username, email or password.");
    }
  }

  function fillDemo(account) {
    setIdentifier(account.username);
    setPassword(account.password);
    setError("");
  }

  return (
    <AuthLayout
      title="Hello! Welcome back"
      subtitle="Sign in to continue to your Link space."
      aside={ASIDE}
      footer={
        <>
          Don't have an account?{" "}
          <Link to="/register" className="font-semibold text-accent-600 hover:underline">
            Create account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {registeredUsername && !error && (
          <Alert tone="success">Account created. Sign in with your new password.</Alert>
        )}
        {error && <Alert>{error}</Alert>}

        <TextField
          label="Username or email"
          icon={User}
          autoComplete="username"
          placeholder="Enter your username or email"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
        />
        <TextField
          label="Password"
          type="password"
          icon={Lock}
          autoComplete="current-password"
          placeholder="Your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex items-center justify-between gap-3">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs text-gray-700">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded-xs accent-accent-500"
            />
            Remember me
          </label>
          <button
            type="button"
            onClick={() => setShowResetNote((v) => !v)}
            aria-expanded={showResetNote}
            className="min-h-11 rounded-sm text-xs font-medium text-accent-600 hover:underline focus-visible:outline-2 focus-visible:outline-accent-600"
          >
            Forgot password?
          </button>
        </div>
        {showResetNote && (
          <Alert tone="info">Password reset isn't available in this demo. Use one of the demo accounts below.</Alert>
        )}

        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <div className="mt-6 flex items-center gap-3 text-xs text-gray-500">
        <span className="h-px flex-1 bg-gray-200" />
        or try a demo account
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <div className="mt-4 flex justify-center gap-3">
        {DEMO_BUTTONS.map(({ account, label, Icon }) => (
          <button
            key={label}
            type="button"
            onClick={() => fillDemo(account)}
            title={`Fill in the ${label.toLowerCase()} demo account`}
            className="flex h-16 w-20 flex-col items-center justify-center gap-1 rounded-control bg-white text-[11px] font-medium text-gray-700 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover focus-visible:outline-2 focus-visible:outline-accent-600"
          >
            <Icon aria-hidden="true" size={20} strokeWidth={1.8} className="text-accent-600" />
            {label}
          </button>
        ))}
      </div>
    </AuthLayout>
  );
}
