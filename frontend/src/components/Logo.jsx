import logoMark from "../assets/logo-new.png";

// The mark has a transparent background, so it sits on any surface; only the name's color changes.
function LogoLockup({ textClassName }) {
  return (
    <span className="flex items-center gap-2.5">
      <img src={logoMark} alt="" width="48" height="30" className="h-7 w-auto" />
      <span className={`text-lg font-bold tracking-[0.12em] ${textClassName}`}>LINK</span>
    </span>
  );
}

// For dark surfaces such as the public navbar.
export default function Logo() {
  return <LogoLockup textClassName="text-white" />;
}

// For light surfaces such as the dashboard sidebar.
export function LogoOnLight() {
  return <LogoLockup textClassName="text-gray-900" />;
}
