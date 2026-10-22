import { priceDisplay } from "../../domain/pricing.js";
import Badge from "./Badge.jsx";

// A plan's current price, with the regular price struck through and a badge while a promotion runs.
export default function PlanPrice({ plan, size = "lg" }) {
  const { price, regular, badge, note } = priceDisplay(plan);
  const large = size === "lg";
  return (
    <div className={large ? "mt-3" : ""}>
      {badge && (
        <Badge tone="success" className={large ? "mb-1.5" : "mb-1"}>
          {badge}
        </Badge>
      )}
      <p className="flex flex-wrap items-baseline gap-x-2">
        {regular && (
          <s className={`text-gray-400 ${large ? "text-sm" : "text-[11px]"}`}>
            <span className="sr-only">Prix normal </span>
            {regular}
          </s>
        )}
        <span className={large ? "text-xl font-semibold text-gray-900" : "text-xs font-semibold text-gray-900"}>{price}</span>
      </p>
      {note && <p className={`text-gray-600 ${large ? "mt-1 text-xs" : "text-[11px]"}`}>{note}</p>}
    </div>
  );
}
