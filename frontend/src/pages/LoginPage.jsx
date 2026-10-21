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

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const registeredUsername = location.state?.registered;

  const [username, setUsername] = useState(registeredUsername ?? "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const session = getSession();
  if (session) return <Navigate to={HOME_BY_ROLE[session.role]} replace />;

  function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    const user = login(username, password);
    if (user) {
      navigate(HOME_BY_ROLE[user.role], { replace: true });
    } else {
      setError("Incorrect username or password.");
    }
  }

  function fillDemo(account) {
    setUsername(account.username);
    setPassword(account.password);
    setError("");
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue to your Link space."
      footer={
        <>
          New to Link?{" "}
          <Link to="/register" className="font-semibold text-accent-300 hover:underline">
            Create an account
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
          label="Username"
          icon={User}
          autoComplete="username"
          placeholder="e.g. yassine jahjah"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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

        <Button type="submit" className="w-full">
          Sign in
        </Button>
      </form>

      <div className="mt-8 border-t border-white/15 pt-6">
        <p className="text-xs font-medium text-navy-200">Demo accounts — click to fill</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {DEMO_BUTTONS.map(({ account, label, Icon }) => (
            <button
              key={label}
              type="button"
              onClick={() => fillDemo(account)}
              className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-control border border-white/20 bg-white/10 px-2 py-2 text-[11px] font-medium text-white transition-colors hover:border-accent-300 hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-accent-400"
            >
              <Icon aria-hidden="true" size={18} strokeWidth={1.8} className="text-accent-300" />
              {label}
            </button>
          ))}
        </div>
      </div>
    </AuthLayout>
  );
}
