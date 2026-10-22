import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, ChevronDown, FlaskConical, LogOut, Menu, Settings, X } from "lucide-react";
import { getSession, logout } from "../auth/auth.js";
import { LogoOnLight } from "../components/Logo.jsx";
import { useQuery } from "../hooks/useQuery.js";
import { formatRelative, initials } from "../lib/format.js";
import { getNotifications, markNotificationsRead } from "../services/core.js";

// Closes a popover on outside click or Escape.
function useDismiss(ref, open, onClose) {
  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => !ref.current?.contains(e.target) && onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, onClose]);
}

const ICON_BUTTON =
  "relative flex h-10 w-10 items-center justify-center rounded-control text-gray-600 transition-colors duration-150 hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-2 focus-visible:outline-accent-500";

function Notifications() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const query = useQuery(getNotifications);
  const items = query.data ?? [];
  const unread = items.filter((n) => !n.read).length;
  useDismiss(ref, open, () => setOpen(false));

  function toggle() {
    setOpen((o) => !o);
    if (!open && unread) markNotificationsRead();
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={toggle} aria-expanded={open} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className={ICON_BUTTON}>
        <Bell size={18} strokeWidth={1.8} />
        {unread > 0 && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-error ring-2 ring-white" />}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] origin-top-right animate-pop-in rounded-lg border border-gray-200 bg-white shadow-dropdown">
          <p className="border-b border-gray-100 px-4 py-3 text-sm font-semibold text-gray-900">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-gray-500">You're all caught up.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      if (n.link) navigate(n.link);
                    }}
                    className="flex w-full gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-gray-50 focus-visible:bg-accent-50 focus-visible:outline-none"
                  >
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-accent-600"}`} />
                    <span>
                      <span className="block text-[13px] text-gray-800">{n.text}</span>
                      <span className="text-[11px] text-gray-500">{formatRelative(n.at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ session, settingsPath, roleLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  useDismiss(ref, open, () => setOpen(false));

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-10 items-center gap-2 rounded-control pr-1.5 pl-1 transition-colors duration-150 hover:bg-gray-100 active:bg-gray-200 focus-visible:outline-2 focus-visible:outline-accent-500"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-700">{initials(session.name)}</span>
        <span className="hidden max-w-[10rem] truncate text-[13px] font-medium text-gray-800 sm:block">{session.name}</span>
        <ChevronDown aria-hidden="true" size={16} className={`text-gray-500 transition-transform duration-200 ease-standard ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-56 origin-top-right animate-pop-in rounded-lg border border-gray-200 bg-white py-1 shadow-dropdown">
          <div className="border-b border-gray-100 px-4 py-2.5">
            <p className="truncate text-[13px] font-semibold text-gray-900">{session.name}</p>
            <p className="text-xs text-gray-500">{roleLabel}</p>
          </div>
          <Link role="menuitem" to={settingsPath} onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2.5 text-[13px] text-gray-700 transition-colors duration-150 hover:bg-gray-50 focus-visible:bg-accent-50 focus-visible:outline-none">
            <Settings aria-hidden="true" size={16} strokeWidth={1.8} /> Settings
          </Link>
          <button role="menuitem" type="button" onClick={handleLogout} className="flex w-full items-center gap-2 px-4 py-2.5 text-[13px] text-gray-700 transition-colors duration-150 hover:bg-gray-50 focus-visible:bg-accent-50 focus-visible:outline-none">
            <LogOut aria-hidden="true" size={16} strokeWidth={1.8} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function SidebarNav({ sections, onNavigate }) {
  return (
    <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
      {sections.map((section) => (
        <div key={section.label ?? "main"} className="mb-5">
          {section.label && <p className="mb-1.5 px-3 text-[10px] font-semibold tracking-wider text-gray-500 uppercase">{section.label}</p>}
          <ul className="space-y-0.5">
            {section.items.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    `relative flex items-center gap-2.5 rounded-control px-3 py-2 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-accent-500 ${
                      isActive
                        ? "bg-accent-50 text-accent-600 before:absolute before:inset-y-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-accent-500"
                        : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon aria-hidden="true" size={17} strokeWidth={1.8} className={isActive ? "text-accent-500" : "text-gray-500"} />
                      {label}
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

// One shell for the three roles; each passes its own navigation and optional topbar extras.
export default function DashboardLayout({ sections, roleLabel, settingsPath, topbarExtra }) {
  const session = getSession();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = sections.flatMap((s) => s.items);
  const current = items.filter((i) => pathname.startsWith(i.to)).sort((a, b) => b.to.length - a.to.length)[0];

  const sidebar = (
    <>
      <div className="flex h-16 items-center justify-between gap-2 px-5">
        <Link to={items[0].to} aria-label="Link home" className="rounded-md focus-visible:outline-2 focus-visible:outline-accent-500">
          <LogoOnLight />
        </Link>
        <span className="rounded-[6px] bg-accent-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-700 uppercase">{roleLabel}</span>
      </div>
      <SidebarNav sections={sections} onNavigate={() => setMobileOpen(false)} />
      <p className="flex items-center gap-2 border-t border-gray-200 px-5 py-3 text-[11px] text-gray-500">
        <FlaskConical aria-hidden="true" size={14} className="text-cyan-600" />
        Demo environment · fictional data
      </p>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">{sidebar}</aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 animate-fade-in bg-navy-950/50" />
          <aside className="relative flex h-full w-72 max-w-[85%] animate-slide-in-left flex-col bg-white pt-[env(safe-area-inset-top,0px)] shadow-modal">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute top-3 -right-12 flex h-10 w-10 items-center justify-center rounded-control bg-white text-gray-700"
            >
              <X size={18} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-[env(safe-area-inset-top,0px)] z-20 flex h-16 items-center gap-2 border-b border-gray-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button type="button" onClick={() => setMobileOpen(true)} aria-label="Open menu" className={`${ICON_BUTTON} -ml-2 lg:hidden`}>
            <Menu size={20} strokeWidth={1.8} />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm text-gray-500">
            <span className="hidden sm:inline">{roleLabel} / </span>
            <span className="font-semibold text-gray-900">{current?.label ?? "Page"}</span>
          </p>
          {topbarExtra}
          <Notifications />
          <ProfileMenu session={session} settingsPath={settingsPath} roleLabel={roleLabel} />
        </header>
        <main className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 lg:py-8">
          {/* Keyed by path so each page fades up as it opens; it never delays the content. */}
          <div key={pathname} className="animate-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
