import { Link as RouterLink, useLocation } from "react-router-dom";
import { buttonClasses } from "./Button.jsx";
import Navbar from "./Navbar.jsx";

const NAV_LINKS = [
  { label: "For candidates", to: "/register?role=candidate" },
  { label: "For companies", to: "/register?role=company" },
];

export default function AuthLayout({ title, subtitle, children, footer }) {
  const { pathname } = useLocation();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar links={NAV_LINKS}>
        {pathname === "/login" ? (
          <RouterLink to="/register" className={buttonClasses("primary")}>
            Create account
          </RouterLink>
        ) : (
          <RouterLink to="/login" className={buttonClasses("onDark")}>
            Sign in
          </RouterLink>
        )}
      </Navbar>

      <main className="flex flex-1 items-center justify-center bg-white px-4 py-10 sm:px-7 lg:py-16">
        <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-gray-900 shadow-card sm:p-8">
          <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && (
            <p className="mt-6 border-t border-gray-100 pt-6 text-center text-[13px] text-gray-600">{footer}</p>
          )}
        </div>
      </main>
    </div>
  );
}
