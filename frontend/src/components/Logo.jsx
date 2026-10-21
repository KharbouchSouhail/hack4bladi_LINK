import wordmark from "../assets/logo-wordmark.png";

// Cropped from logo.jpeg; its background is brand-navy, so place it on brand-navy surfaces.
export default function Logo() {
  return <img src={wordmark} alt="Link" className="h-9 w-auto" />;
}
