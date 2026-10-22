import { useState } from "react";
import { Check, FlaskConical } from "lucide-react";
import Button from "../../components/Button.jsx";
import Badge from "../../components/ui/Badge.jsx";
import { PageHeader } from "../../components/ui/Card.jsx";
import { QueryBoundary } from "../../components/ui/states.jsx";
import { PLAN_ORDER, PLANS } from "../../domain/permissions.js";
import { useAction, useQuery } from "../../hooks/useQuery.js";
import { getMe, setPlan } from "../../services/candidateApi.js";

export default function SubscriptionPage() {
  const query = useQuery(getMe);
  const [run, pending] = useAction();
  const [switching, setSwitching] = useState(null);

  return (
    <div>
      <PageHeader title="Subscription" description="Choose how much of the path from assessment to application you want to unlock." />
      <p className="mb-5 flex items-start gap-2 rounded-md border border-warning/20 bg-warning-bg px-3 py-2.5 text-[13px] text-warning">
        <FlaskConical aria-hidden="true" size={16} className="mt-px shrink-0" />
        Demo mode: switching plans is instant and free. No payment is taken. Access is still enforced by the service layer on every request.
      </p>
      <QueryBoundary query={query} rows={4}>
        {(me) => (
          <div className="stagger grid gap-4 md:grid-cols-3">
            {PLAN_ORDER.map((key) => {
              const plan = PLANS[key];
              const current = me.plan === key;
              return (
                <section
                  key={key}
                  aria-label={`${plan.label} plan`}
                  className={`flex flex-col rounded-lg border bg-white p-5 shadow-subtle transition duration-200 ease-standard ${current ? "border-accent-500 ring-1 ring-accent-500" : "border-gray-200 hover:border-accent-200 hover:shadow-card"}`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-gray-900">{plan.label}</h2>
                    {current && <Badge tone="accent">Current plan</Badge>}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{plan.tagline}</p>
                  <p className="mt-3 text-xl font-semibold text-gray-900">{plan.price}</p>
                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-[13px] text-gray-700">
                        <Check aria-hidden="true" size={16} className="mt-px shrink-0 text-accent-600" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={current ? "secondary" : "solid"}
                    size="sm"
                    className="mt-5 w-full"
                    disabled={current || pending}
                    loading={pending && switching === key}
                    onClick={() => {
                      setSwitching(key);
                      run(() => setPlan(key), { success: `You're now on ${plan.label} (demo).` });
                    }}
                  >
                    {current ? "Current plan" : `Switch to ${plan.label}`}
                  </Button>
                </section>
              );
            })}
          </div>
        )}
      </QueryBoundary>
    </div>
  );
}
