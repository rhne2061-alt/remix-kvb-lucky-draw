import { describe, expect, it } from "vitest";

import { buildSpinPlan, getSpinDelay } from "./gridSpin";

describe("grid spin helpers", () => {
  it("ends on the target tile after enough travel", () => {
    const plan = buildSpinPlan({
      currentIndex: 0,
      targetIndex: 5,
      perimeterSize: 8,
      fullLaps: 4,
      slowdownSteps: 8,
    });

    expect(plan.at(-1)).toBe(5);
    expect(plan.length).toBeGreaterThan(30);
  });

  it("slows down near the end of the run", () => {
    const early = getSpinDelay({ step: 2, totalSteps: 40 });
    const late = getSpinDelay({ step: 38, totalSteps: 40 });

    expect(early).toBeLessThan(late);
    expect(late).toBeGreaterThanOrEqual(220);
  });
});
