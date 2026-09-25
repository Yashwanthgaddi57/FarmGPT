/**
 * Transparent profit math — single source of truth used by the UI.
 * Kept dependency-free and pure so it can be unit-tested directly.
 */
export interface ProfitInput {
  farmSizeAcres: number;
  /** Cost rows in INR for the whole farm, one season. */
  costs: {
    seed: number;
    fertilizer: number;
    pesticide: number;
    labor: number;
    irrigation: number;
    machinery: number;
    other: number;
  };
  yieldQuintalsPerAcre: number;
  pricePerQuintal: number;
}

export interface ProfitResult {
  totalCost: number;
  productionQuintals: number;
  revenue: number;
  profit: number;
  profitPerAcre: number;
  breakEvenPerQuintal: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateProfit(input: ProfitInput): ProfitResult {
  const acres = Math.max(input.farmSizeAcres, 0);
  const costValues = Object.values(input.costs).map((c) => Math.max(c, 0));
  const totalCost = costValues.reduce((s, c) => s + c, 0);
  const yieldPerAcre = Math.max(input.yieldQuintalsPerAcre, 0);
  const price = Math.max(input.pricePerQuintal, 0);

  const productionQuintals = acres * yieldPerAcre;
  const revenue = productionQuintals * price;
  const profit = revenue - totalCost;
  const profitPerAcre = acres > 0 ? profit / acres : 0;
  const breakEvenPerQuintal = productionQuintals > 0 ? totalCost / productionQuintals : 0;

  return {
    totalCost: round2(totalCost),
    productionQuintals: round2(productionQuintals),
    revenue: round2(revenue),
    profit: round2(profit),
    profitPerAcre: round2(profitPerAcre),
    breakEvenPerQuintal: round2(breakEvenPerQuintal),
  };
}
