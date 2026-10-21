import { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { Menu, X } from "lucide-react";
import Logo from "./Logo.jsx";

const LINK_CLASS =
  "rounded-sm py-2 text-[13px] font-medium text-navy-200 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-accent-400";

// Each link is either an in-page anchor ({ href }) or an app route ({ to }).
function NavItem({ link, className = "", onClick }) {
  if (link.href) {
    return (
      <a href={link.href} onClick={onClick} className={`${LINK_CLASS} ${className}`}>
        {link.label}
      </a>
    );
  } else {
    return (
      <RouterLink to={link.to} onClick={onClick} className={`${LINK_CLASS} ${className}`}>
        {link.label}
      </RouterLink>
    );
  }
}

export default function Navbar({ links = [], children }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-brand-navy shadow-dropdown">
      <div className="mx-auto flex h-[76px] max-w-[1440px] items-center justify-between gap-6 px-4 sm:px-7">
        <RouterLink
          to="/"
          aria-label="Link home"
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400"
        >
          <Logo />
        </RouterLink>

        {links.length > 0 && (
          <nav aria-label="Main" className="hidden md:flex md:items-center md:gap-8">
            {links.map((link) => (
              <NavItem key={link.label} link={link} />
            ))}
          </nav>
        )}

        <div className="flex items-center gap-2">
          {children}
          {links.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              className="flex h-11 w-11 items-center justify-center rounded-control text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-accent-400 md:hidden"
            >
              {open ? <X size={20} strokeWidth={1.8} /> : <Menu size={20} strokeWidth={1.8} />}
            </button>
          )}
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-white/10 px-4 pb-4 md:hidden">
          {links.map((link) => (
            <NavItem key={link.label} link={link} onClick={() => setOpen(false)} className="block py-3" />
          ))}
        </nav>
      )}
    </header>
  );
}
