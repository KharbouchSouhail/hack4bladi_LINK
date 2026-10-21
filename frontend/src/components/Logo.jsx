import { Link as LinkIcon } from "lucide-react";

export default function Logo({ tone = "dark" }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent text-white">
        <LinkIcon aria-hidden="true" size={18} strokeWidth={1.8} />
      </span>
      <span className={`text-lg font-bold ${tone === "light" ? "text-white" : "text-primary"}`}>Link</span>
    </span>
  );
}
