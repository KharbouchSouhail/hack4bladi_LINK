import logoMark from "../assets/logo-mark.png";
import wordmark from "../assets/logo-wordmark.png";

// Cropped from logo.jpeg; its background is brand-navy, so place it on dark surfaces.
export default function Logo({ className = "h-9 w-auto" }) {
  return <img src={wordmark} alt="Link" className={className} />;
}

// For light surfaces: the original app-icon tile plus the name set in text, logo colors untouched.
export function LogoOnLight() {
  return (
    <span className="flex items-center gap-2.5">
      <img src={logoMark} alt="" className="h-8 w-8 rounded-[9px] shadow-card" />
      <span className="text-lg font-bold tracking-[0.12em] text-gray-900">LINK</span>
    </span>
  );
}
