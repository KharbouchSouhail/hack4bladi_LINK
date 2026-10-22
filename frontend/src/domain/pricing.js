// Single source of truth for plan prices. The subscription page, the upgrade dialog, the admin
// view and the (demo) billing step all read from here, so what is shown is what is charged.
// To end a promotion, set its `active` to false: every screen falls back to the regular price.

export const CURRENCY = "DH";

export const PRICING = {
  free: { monthly: 0, promo: null },
  pro: {
    monthly: 49,
    // Applies to every month while active.
    promo: { active: true, price: 15, months: null, badge: "Promotion" },
  },
  max: {
    monthly: 99,
    // Applies to the first month only, then the regular price.
    promo: { active: true, price: 55, months: 1, badge: "Offre 1er mois" },
  },
};

export function formatPrice(amount) {
  return `${amount} ${CURRENCY}`;
}

function activePromo(plan) {
  const promo = PRICING[plan]?.promo;
  return promo?.active ? promo : null;
}

// Amount billed for a given month of the subscription (1 = the first month).
export function amountDue(plan, month = 1) {
  const pricing = PRICING[plan];
  if (!pricing) throw new Error(`Unknown plan: ${plan}`);
  const promo = activePromo(plan);
  return promo && (promo.months === null || month <= promo.months) ? promo.price : pricing.monthly;
}

// Everything a screen needs to display a plan's price, including the promotion if one is running.
export function priceDisplay(plan) {
  const { monthly } = PRICING[plan];
  const promo = activePromo(plan);
  if (monthly === 0) return { price: formatPrice(0), regular: null, badge: null, note: null };
  if (!promo) return { price: `${formatPrice(monthly)} / mois`, regular: null, badge: null, note: null };
  if (promo.months === null) return { price: `${formatPrice(promo.price)} / mois`, regular: formatPrice(monthly), badge: promo.badge, note: null };
  const period = promo.months === 1 ? "le premier mois" : `les ${promo.months} premiers mois`;
  return {
    price: formatPrice(promo.price),
    regular: formatPrice(monthly),
    badge: promo.badge,
    note: `${formatPrice(promo.price)} ${period}, puis ${formatPrice(monthly)}/mois`,
  };
}

// One-line version for compact places such as the admin stat tiles.
export function priceSummary(plan) {
  const { price, note } = priceDisplay(plan);
  return note ?? price;
}
