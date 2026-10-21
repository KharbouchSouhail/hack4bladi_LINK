import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { AtSign, Building2, Lock, Mail, User, UserRound } from "lucide-react";
import { getSession, HOME_BY_ROLE, isUsernameTaken, register } from "../auth/auth.js";
import AuthLayout from "../components/AuthLayout.jsx";
import Button from "../components/Button.jsx";
import TextField from "../components/TextField.jsx";

const ROLES = [
  { value: "candidate", label: "Candidate", hint: "Assess, learn and apply", Icon: UserRound },
  { value: "company", label: "Company", hint: "Post profiles and offers", Icon: Building2 },
];

const EMPTY_FORM = { name: "", username: "", email: "", password: "", confirm: "" };

function validate(role, form) {
  const errors = {};

  if (!form.name.trim()) {
    errors.name = role === "company" ? "Enter your company name." : "Enter your full name.";
  }

  if (!form.username.trim()) {
    errors.username = "Choose a username.";
  } else if (isUsernameTaken(form.username)) {
    errors.username = "This username is already taken.";
  }

  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  if (form.password.length < 8 || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = "Use at least 8 characters, including an uppercase letter and a number.";
  }

  if (form.confirm !== form.password) {
    errors.confirm = "Passwords don't match.";
  }

  return errors;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  // The role lives in the URL so the navbar's "For candidates" / "For companies" links can preselect it.
  const [searchParams, setSearchParams] = useSearchParams();
  const role = searchParams.get("role") === "company" ? "company" : "candidate";
  const setRole = (value) => setSearchParams({ role: value }, { replace: true });
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});

  const session = getSession();
  if (session) return <Navigate to={HOME_BY_ROLE[session.role]} replace />;

  function update(field) {
    return (event) => setForm((f) => ({ ...f, [field]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    const found = validate(role, form);
    setErrors(found);

    if (Object.keys(found).length === 0) {
      const user = register({ role, ...form });
      navigate("/login", { state: { registered: user.username } });
    }
  }

  const isCompany = role === "company";

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join as a candidate to close your skill gaps, or as a company to define the profiles you hire for."
      footer={
        <>
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-accent-300 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <fieldset>
          <legend className="mb-1.5 block text-xs font-medium">I am a</legend>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(({ value, label, hint, Icon }) => {
              const selected = role === value;
              return (
                <label
                  key={value}
                  className={`flex cursor-pointer flex-col gap-1 rounded-control border p-3 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent-400 ${
                    selected ? "border-accent-400 bg-accent-500/25" : "border-white/20 bg-white/10 hover:bg-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    checked={selected}
                    onChange={() => setRole(value)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                    <Icon aria-hidden="true" size={18} strokeWidth={1.8} className="text-accent-300" />
                    {label}
                  </span>
                  <span className="text-[11px] text-navy-200">{hint}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <TextField
          label={isCompany ? "Company name" : "Full name"}
          icon={isCompany ? Building2 : User}
          autoComplete={isCompany ? "organization" : "name"}
          placeholder={isCompany ? "e.g. Atlas Analytics" : "e.g. Yassine Jahjah"}
          value={form.name}
          onChange={update("name")}
          error={errors.name}
        />
        <TextField
          label="Username"
          icon={AtSign}
          autoComplete="username"
          placeholder="Choose a username"
          value={form.username}
          onChange={update("username")}
          error={errors.username}
        />
        <TextField
          label={isCompany ? "Work email" : "Email"}
          type="email"
          icon={Mail}
          autoComplete="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={update("email")}
          error={errors.email}
        />
        <TextField
          label="Password"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
        />
        <TextField
          label="Confirm password"
          type="password"
          icon={Lock}
          autoComplete="new-password"
          placeholder="Repeat your password"
          value={form.confirm}
          onChange={update("confirm")}
          error={errors.confirm}
        />

        <Button type="submit" className="w-full">
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
