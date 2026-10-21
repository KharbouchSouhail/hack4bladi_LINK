import { Link as RouterLink, useLocation } from "react-router-dom";
import background from "../assets/background.jpg";
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

      <main
        className="flex flex-1 items-center justify-center bg-black bg-cover bg-center px-4 py-10 sm:px-7 lg:py-16"
        style={{ backgroundImage: `url(${background})` }}
      >
        {/* Dark frosted glass over the black photo; text inside inherits white. */}
        <div className="w-full max-w-md rounded-2xl border border-white/15 bg-navy-950/45 p-6 text-white shadow-modal backdrop-blur-2xl backdrop-saturate-150 sm:p-8">
          <h1 className="font-display text-3xl leading-tight font-bold tracking-tight sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-navy-200">{subtitle}</p>
          <div className="mt-8">{children}</div>
          {footer && (
            <p className="mt-6 border-t border-white/15 pt-6 text-center text-[13px] text-navy-200">{footer}</p>
          )}
        </div>
      </main>
    </div>
  );
}
