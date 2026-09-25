import { describe, expect, it } from "vitest";

import { calculateProfit } from "@/lib/profit-math";

const baseInput = {
  farmSizeAcres: 2.5,
  costs: {
    seed: 5000,
    fertilizer: 8000,
    pesticide: 3000,
    labor: 15000,
    irrigation: 4000,
    machinery: 2500,
    other: 0,
  },
  yieldQuintalsPerAcre: 8,
  pricePerQuintal: 6000,
};

describe("calculateProfit", () => {
  it("computes the canonical example correctly", () => {
    // Total cost = 5000+8000+3000+15000+4000+2500+0 = 37500
    // Production = 2.5 * 8 = 20 q; Revenue = 20 * 6000 = 120000
    const r = calculateProfit(baseInput);
    expect(r.totalCost).toBe(37500);
    expect(r.productionQuintals).toBe(20);
    expect(r.revenue).toBe(120000);
    expect(r.profit).toBe(82500);
    expect(r.profitPerAcre).toBe(33000);
    expect(r.breakEvenPerQuintal).toBe(1875);
  });

  it("returns a loss when revenue < cost", () => {
    const r = calculateProfit({ ...baseInput, pricePerQuintal: 1000 });
    expect(r.revenue).toBe(20000);
    expect(r.profit).toBe(-17500);
    expect(r.profitPerAcre).toBe(-7000);
  });

  it("computes break-even price from costs alone", () => {
    const r = calculateProfit({ ...baseInput, pricePerQuintal: 0 });
    expect(r.breakEvenPerQuintal).toBe(1875);
    expect(r.revenue).toBe(0);
  });

  it("handles zero farm size without dividing by zero", () => {
    const r = calculateProfit({ ...baseInput, farmSizeAcres: 0 });
    expect(r.productionQuintals).toBe(0);
    expect(r.revenue).toBe(0);
    expect(r.profit).toBe(-37500);
    expect(r.profitPerAcre).toBe(0);
    expect(r.breakEvenPerQuintal).toBe(0);
  });

  it("handles zero yield without dividing by zero", () => {
    const r = calculateProfit({ ...baseInput, yieldQuintalsPerAcre: 0 });
    expect(r.productionQuintals).toBe(0);
    expect(r.breakEvenPerQuintal).toBe(0);
    expect(r.profit).toBe(-37500);
  });

  it("clamps negative inputs to zero (no negative costs produce fake profit)", () => {
    const r = calculateProfit({
      ...baseInput,
      costs: { ...baseInput.costs, seed: -10000 },
      yieldQuintalsPerAcre: -5,
      pricePerQuintal: -100,
    });
    // seed clamped to 0 -> total cost drops by 5000
    expect(r.totalCost).toBe(32500);
    expect(r.productionQuintals).toBe(0);
    expect(r.revenue).toBe(0);
  });

  it("rounds to 2 decimals", () => {
    const r = calculateProfit({
      ...baseInput,
      farmSizeAcres: 1,
      yieldQuintalsPerAcre: 3,
      pricePerQuintal: 333.333,
    });
    // 3 q × 333.333 = 999.999 → rounds to 1000
    expect(r.revenue).toBe(1000);
    expect(r.profit).toBe(r.revenue - r.totalCost);
  });
});
