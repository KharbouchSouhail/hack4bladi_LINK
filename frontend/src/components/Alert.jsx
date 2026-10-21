import { AlertCircle, CheckCircle2 } from "lucide-react";

const TONES = {
  error: { box: "border-error/20 bg-error-bg text-error", Icon: AlertCircle },
  success: { box: "border-success/20 bg-success-bg text-success", Icon: CheckCircle2 },
};

export default function Alert({ tone = "error", children }) {
  const { box, Icon } = TONES[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2 rounded-control border px-3.5 py-3 text-[13px] ${box}`}>
      <Icon aria-hidden="true" size={18} strokeWidth={1.8} className="mt-px shrink-0" />
      <span>{children}</span>
    </div>
  );
}
