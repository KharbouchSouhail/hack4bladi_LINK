import { describe, expect, it } from "vitest";
import { bucketUnit, countByPeriod, percentages, stageFunnel } from "./analytics.js";

describe("countByPeriod", () => {
  it("counts per day with empty days included", () => {
    const now = new Date(2026, 9, 10, 12);
    const since = new Date(2026, 9, 8, 12);
    const { unit, buckets } = countByPeriod([new Date(2026, 9, 8, 15).toISOString(), new Date(2026, 9, 10, 9).toISOString(), new Date(2026, 9, 10, 10).toISOString()], { since, now });
    expect(unit).toBe("day");
    expect(buckets.map((b) => b.count)).toEqual([1, 0, 2]);
  });

  it("ignores dates outside the range", () => {
    const now = new Date(2026, 9, 10, 12);
    const { buckets } = countByPeriod([new Date(2026, 0, 1).toISOString()], { since: new Date(2026, 9, 9), now });
    expect(buckets.reduce((sum, b) => sum + b.count, 0)).toBe(0);
  });

  it("switches to weeks and months for longer spans", () => {
    expect(bucketUnit(30)).toBe("day");
    expect(bucketUnit(90)).toBe("week");
    expect(bucketUnit(365)).toBe("month");
  });
});

describe("percentages", () => {
  it("always adds up to 100", () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(percentages([1, 0, 3])).toEqual([25, 0, 75]);
    expect(percentages([2, 2, 2, 1]).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("handles an empty dataset without dividing by zero", () => {
    expect(percentages([0, 0])).toEqual([0, 0]);
    expect(percentages([])).toEqual([]);
  });
});

describe("stageFunnel", () => {
  it("counts rejected applications at the furthest stage they reached", () => {
    const funnel = stageFunnel([
      { status: "submitted", history: [{ status: "submitted" }] },
      { status: "rejected", history: [{ status: "submitted" }, { status: "under_review" }, { status: "shortlisted" }, { status: "rejected" }] },
      { status: "hired", history: [{ status: "submitted" }, { status: "hired" }] },
    ]);
    const count = Object.fromEntries(funnel.map((s) => [s.status, s.count]));
    expect(count.submitted).toBe(3);
    expect(count.shortlisted).toBe(2);
    expect(count.hired).toBe(1);
  });
});
