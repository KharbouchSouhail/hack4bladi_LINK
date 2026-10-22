import { describe, expect, it } from "vitest";
import { amountDue, priceDisplay, PRICING } from "./pricing.js";

describe("pricing", () => {
  it("bills Pro at the promotional price every month", () => {
    expect(amountDue("pro", 1)).toBe(15);
    expect(amountDue("pro", 6)).toBe(15);
  });

  it("bills Max 55 DH for the first month, then the regular price", () => {
    expect(amountDue("max", 1)).toBe(55);
    expect(amountDue("max", 2)).toBe(PRICING.max.monthly);
  });

  it("shows the same amounts that are billed", () => {
    expect(priceDisplay("pro")).toMatchObject({ price: "15 DH / mois", regular: "49 DH", badge: "Promotion" });
    expect(priceDisplay("max")).toMatchObject({ price: "55 DH", regular: "99 DH", badge: "Offre 1er mois", note: "55 DH le premier mois, puis 99 DH/mois" });
    expect(priceDisplay("free")).toMatchObject({ price: "0 DH", badge: null });
  });
});
